// The industry between seasons: brands are founded, develop, enter and leave the
// championship, go dormant, die and are revived; privateer teams come and go;
// drivers retire and move between teams. Fixed history (data/events.js) changes
// the odds, never the results of races.

import { makeRng, clamp } from './rng.js';
import { PARAMS as P } from './params.js';
import { BRANDS } from './data/brands.js';
import { eraFor } from './data/eras.js';
import { eventsFor } from './data/events.js';
import {
  newBrandObject, activateWorks, deactivateTeam, addPrivateerTeam, addEntry, syncEntries, pickSupplier,
  logEvent, activeEntries, brandById, teamById, driverById, eligibleDriver, ensureCohorts, applyEraRegs,
} from './world.js';
import { overallAt, peakOverall, retirementChance } from './drivers.js';

const r3 = (x) => Math.round(x * 1000) / 1000;

function racingBrands(world) { return world.brands.filter((b) => b.status === 'racing'); }

// ---------------------------------------------------------------- brands

function foundBrands(world, year, rng) {
  for (const def of BRANDS) {
    if (def.founded > year || brandById(world, def.id)) continue;
    const b = newBrandObject(def, makeRng(world.seed, 'brand', def.id), year);
    world.brands.push(b);
    if (def.founded === year) logEvent(world, year, 'brand', `${b.name} (${b.country}) is founded.`);
  }
  void rng;
}

function developBrands(world, rng, last) {
  for (const b of world.brands) {
    if (b.status === 'defunct') continue;
    const r = rng.fork(b.id);
    let s = b.strength;
    s += P.industry.revert * (P.industry.mean - s) + r.gauss(0, P.industry.noise);
    if (r.chance(P.industry.breakthrough)) {
      s += r.float(0.08, 0.16);
      if (b.status === 'racing') logEvent(world, world.year, 'brand', `${b.name} unveils a major technical breakthrough.`);
    }
    if (r.chance(P.industry.crisis)) {
      s -= r.float(0.08, 0.16);
      if (b.status === 'racing') logEvent(world, world.year, 'brand', `${b.name} is hit by a crisis at the factory.`);
    }
    if (last && last.titleBrandId === b.id) s += 0.012;
    s = clamp(s, 0.15, 0.95);
    for (const k of ['chassisStrength', 'engineStrength', 'reliability']) {
      b[k] = r3(clamp(b[k] + 0.3 * (s + r.gauss(0, 0.06) - b[k]), 0.12, 0.97));
    }
    b.strength = r3(s);
    if (b.status === 'racing') {
      b.raceYears++;
      const rank = last && last.brandRank ? last.brandRank[b.id] : undefined;
      if (rank !== undefined && rank > 0.6 && b.strength < 0.5) b.badYears++; else b.badYears = 0;
    }
  }
}

function brandLifecycle(world, year, rng, ev, last) {
  const era = eraFor(year);
  const target = era.worksTarget;
  void last;
  let W = racingBrands(world).length;

  // exits
  for (const b of world.brands.slice().sort((a, c) => a.id.localeCompare(c.id))) {
    if (b.status !== 'racing') continue;
    const r = rng.fork('exit', b.id);
    let p = 0.006 + ev.brandExit;
    if (b.strength < 0.38) p += 0.06;
    if (b.badYears >= 3) p += 0.08;
    if (b.raceYears > 25) p *= 0.5;
    p *= clamp(W / target, 0.6, 1.8);
    if (W <= 3) p *= 0.2;
    if (r.next() < p) {
      b.status = 'dormant';
      const team = world.teams.find((t) => t.kind === 'works' && t.brandId === b.id && t.active);
      if (team) deactivateTeam(world, team, year);
      W--;
      logEvent(world, year, 'brand', `${b.name} withdraws its works team${ev.names.length ? ' (' + ev.names[0] + ')' : ''}.`);
    }
  }

  // entries
  for (const b of world.brands.slice().sort((a, c) => a.id.localeCompare(c.id))) {
    if (b.status !== 'dormant') continue;
    const r = rng.fork('enter', b.id);
    let p = 0.03 * (b.strength > 0.5 ? 1.5 : 0.6) * clamp((target - W) / 3 + 0.5, 0.1, 3) * ev.brandEntry;
    if (b.foundedInGame === year && b.founded === year) p = Math.max(p, 0.4 * ev.brandEntry);
    if (W >= target + 3) p *= 0.1;
    if (r.next() < p) {
      activateWorks(world, b, r.fork('team'), year);
      W++;
      logEvent(world, year, 'brand', `${b.name} enters the championship with a works team.`);
    }
  }

  // death and revival
  for (const b of world.brands.slice().sort((a, c) => a.id.localeCompare(c.id))) {
    const r = rng.fork('life', b.id);
    if (b.status === 'dormant') {
      const age = year - b.founded;
      const p = age > 40 ? 0.004 : 0.01;
      if (r.next() < p) {
        b.status = 'defunct'; b.defunctSince = year;
        logEvent(world, year, 'brand', `${b.name} ceases trading.`);
      }
    } else if (b.status === 'defunct' && year - b.defunctSince >= 3) {
      if (r.next() < 0.004) {
        b.status = 'dormant'; b.defunctSince = null;
        b.strength = r3(clamp(0.45 + r.gauss(0, 0.1), 0.25, 0.8));
        logEvent(world, year, 'brand', `${b.name} is revived under new ownership.`);
      }
    }
  }
}

// ---------------------------------------------------------------- teams

function privateerTeams(world, year, rng, ev, last) {
  const era = eraFor(year);
  let count = world.teams.filter((t) => t.kind === 'privateer' && t.active).length;

  for (const t of world.teams.filter((x) => x.kind === 'privateer' && x.active)) {
    const r = rng.fork('team', t.id);
    const rank = last && last.teamRank ? last.teamRank[t.id] : 0.5;
    let p = 0.04 + ev.teamFold + (rank > 0.5 ? 0.05 : 0) + ((100 - t.owner.patience) / 100) * 0.05;
    if (t.wealth < 0.2) p += 0.05;
    if (year - t.foundedYear > 25) p *= 0.5;
    if (count <= 2) p *= 0.2;
    if (r.next() < p) {
      deactivateTeam(world, t, year);
      count--;
      logEvent(world, year, 'team', `${t.name} folds.`);
      continue;
    }
    t.brandId = pickSupplier(world, r.fork('supplier'), t.brandId);
    t.wealth = Math.round(clamp(t.wealth + r.gauss(0, 0.03) + (rank < 0.3 ? 0.03 : 0), 0.05, 0.95) * 100) / 100;
    syncEntries(world, t, r.fork('entries'));
    const hasPartial = world.entries.some((e) => e.teamId === t.id && e.type === 'partial' && e.active);
    if (!hasPartial && era.entries.partial >= 1 && t.wealth > 0.45 && r.chance(0.08)) addEntry(world, t, 'partial', r.fork('partial'));
  }

  for (let i = 0; i < 2; i++) {
    const p = clamp((era.privTarget - count) * 0.22 + 0.06, 0, 0.7) * ev.teamFound;
    const r = rng.fork('found', i);
    if (r.next() < p) {
      const t = addPrivateerTeam(world, r.fork('team'), year);
      count++;
      logEvent(world, year, 'team', `${t.name} is founded and joins the grid with ${world.brands.find((b) => b.id === t.brandId).name} cars.`);
    }
  }

  // works teams follow the entry cap in force
  for (const t of world.teams.filter((x) => x.kind === 'works' && x.active)) {
    syncEntries(world, t, rng.fork('works', t.id));
    const r = rng.fork('works-staff', t.id);
    for (const k of Object.keys(t.staff)) t.staff[k].rating = Math.round(clamp(t.staff[k].rating + r.gauss(0, 2), 18, 92));
    t.wealth = Math.round(clamp(t.wealth + r.gauss(0, 0.02), 0.2, 1) * 100) / 100;
  }
  for (const t of world.teams.filter((x) => x.kind === 'privateer' && x.active)) {
    const r = rng.fork('priv-staff', t.id);
    for (const k of Object.keys(t.staff)) t.staff[k].rating = Math.round(clamp(t.staff[k].rating + r.gauss(0, 2), 18, 92));
  }
}

// ---------------------------------------------------------------- drivers

function prestige(world, team, last, rng) {
  const b = brandById(world, team.brandId);
  const rank = last && last.teamRank && last.teamRank[team.id] !== undefined ? last.teamRank[team.id] : 0.5;
  return b.strength * 0.5 + team.wealth * 0.3 + (1 - rank) * 0.2 + rng.gauss(0, 0.04);
}

function driverMarket(world, year, rng, last) {
  // retirements
  for (const d of world.drivers) {
    if (d.status !== 'active' || d.birthYear > year - P.world.startAge) continue;
    const p = retirementChance(d, year);
    if (p > 0 && rng.fork('retire', d.id).next() < p) {
      d.status = 'retired';
      d.retiredYear = year;
    }
  }
  const seats = activeEntries(world);
  const keep = [], open = [];
  for (const e of seats) {
    const d = e.driverId != null ? driverById(world, e.driverId) : null;
    if (d && eligibleDriver(d, year) && rng.fork('contract', e.id).next() > P.industry.contractExpiry) keep.push(e); else { e.driverId = null; open.push(e); }
  }
  const taken = new Set(keep.map((e) => e.driverId));
  const score = (d) => overallAt(d, year) * 0.5 + peakOverall(d) * 0.5;
  const pool = world.drivers.filter((d) => eligibleDriver(d, year) && !taken.has(d.id))
    .map((d) => ({ d, s: score(d) + rng.fork('score', d.id).gauss(0, 4) }))
    .sort((a, b) => b.s - a.s || a.d.id - b.d.id);
  const ranked = open.map((e) => ({ e, p: prestige(world, teamById(world, e.teamId), last, rng.fork('prestige', e.id)) }))
    .sort((a, b) => b.p - a.p || a.e.id - b.e.id);
  const pick = rng.fork('pick');
  for (const { e } of ranked) {
    if (!pool.length) break;
    const idx = Math.min(pool.length - 1, Math.floor(Math.abs(pick.gauss(0, 2.5))));
    e.driverId = pool[idx].d.id;
    pool.splice(idx, 1);
  }
}

// ---------------------------------------------------------------- the yearly transition

// `last` carries what the finished season showed: {brandRank, teamRank, titleBrandId}.
export function industryTransition(world, year, last) {
  const ev = eventsFor(year);
  const rng = makeRng(world.seed, 'industry', year);
  for (const n of ev.starting) logEvent(world, year, 'event', n + '.');
  ensureCohorts(world, year + 16);
  applyEraRegs(world, year);
  foundBrands(world, year, rng.fork('found'));
  developBrands(world, rng.fork('develop'), last);
  brandLifecycle(world, year, rng.fork('life'), ev, last);
  privateerTeams(world, year, rng.fork('priv'), ev, last);
  driverMarket(world, year, rng.fork('drivers'), last);
  return ev;
}

// Seats left empty (a saved game from an older version, a team that just formed)
// are filled from the best drivers not already racing.
export function fillVacantSeats(world, year) {
  const rng = makeRng(world.seed, 'fill', year);
  const seats = activeEntries(world);
  for (const e of seats) {
    const d = e.driverId != null ? driverById(world, e.driverId) : null;
    if (!d || !eligibleDriver(d, year)) e.driverId = null;
  }
  const taken = new Set(seats.map((e) => e.driverId).filter((x) => x != null));
  const score = (d) => overallAt(d, year) * 0.5 + peakOverall(d) * 0.5;
  const pool = world.drivers.filter((d) => eligibleDriver(d, year) && !taken.has(d.id))
    .map((d) => ({ d, s: score(d) + rng.fork('score', d.id).gauss(0, 4) }))
    .sort((a, b) => b.s - a.s || a.d.id - b.d.id);
  const open = seats.filter((e) => e.driverId == null)
    .map((e) => ({ e, p: prestige(world, teamById(world, e.teamId), null, rng.fork('prestige', e.id)) }))
    .sort((a, b) => b.p - a.p || a.e.id - b.e.id);
  const pick = rng.fork('pick');
  for (const { e } of open) {
    if (!pool.length) break;
    const idx = Math.min(pool.length - 1, Math.floor(Math.abs(pick.gauss(0, 2.5))));
    e.driverId = pool[idx].d.id;
    pool.splice(idx, 1);
  }
}
