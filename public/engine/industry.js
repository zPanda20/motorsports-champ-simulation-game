// The industry between seasons: brands are founded, develop, enter and leave the
// championship, go dormant, die and are revived; privateer teams come and go;
// drivers retire and move between teams. Fixed history (data/events.js) changes
// the odds, never the results of races.

import { makeRng, clamp } from './rng.js';
import { PARAMS as P } from './params.js';
import { BRANDS } from './data/brands.js';
import { stability, eraFor } from './data/eras.js';
import { eventsFor } from './data/events.js';
import {
  newBrandObject, activateWorks, deactivateTeam, addPrivateerTeam, addEntry, syncEntries, pickSupplier,
  logEvent, activeEntries, brandById, teamById, driverById, eligibleDriver, ensureCohorts, applyEraRegs,
} from './world.js';
import { overallAt, peakOverall, retirementChance } from './drivers.js';
import { adoptTechs } from './techs.js';
import { orgYear, signContract, makeOwner } from './org.js';
import { tiersTransition, scoutEstimate } from './tiers.js';
import { propose, governorYear, settle, traits } from './governor.js';
import { assignTyres, developTyres, activateTeam, makeStaff, usedNames } from './world.js';
import { nationalityWeights as natW } from './names.js';

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
    // company health is slow and separate from racing commitment (world conditions plus a roll)
    const ev0 = eventsFor(world.year);
    b.health = r3(clamp((b.health === undefined ? s : b.health) + 0.18 * (s - (b.health === undefined ? s : b.health)) - ev0.brandExit * 0.7 + r.gauss(0, 0.03), 0.05, 1));
    const buffer = Math.min(0.3, b.titles * 0.02 + b.raceYears * 0.004);
    b.commitment = r3(clamp(0.45 + b.health * 0.75 + buffer - (last && last.brandRank && last.brandRank[b.id] > 0.7 ? 0.1 : 0), 0.2, 1.2));
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
    let p = (0.006 + ev.brandExit) * (0.4 + 0.6 * stability(year));
    if (b.strength < 0.38) p += 0.06;
    if (b.badYears >= 3) p += 0.08;
    if (b.health !== undefined && b.health < 0.3) p += 0.07;
    if (b.raceYears > 25) p *= 0.5;
    p *= 1 - Math.min(0.5, b.titles * 0.03 + b.raceYears * 0.006); // legacy buffers bad patches
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
      propose(world, year, 'entry-works', { brandId: b.id }, `${b.name} asks to enter`, `${b.name} (${b.country}) wants to enter the championship with a works team. Strength ${Math.round(b.strength * 100)}, ${b.titles} titles in the past.`);
      W++;
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
    t.brandId = pickSupplier(world, r.fork('supplier'), t.brandId);
    syncEntries(world, t, r.fork('entries'));
    const hasPartial = world.entries.some((e) => e.teamId === t.id && e.type === 'partial' && e.active);
    if (!hasPartial && era.entries.partial >= 1 && t.wealth > 0.45 && r.chance(0.08)) addEntry(world, t, 'partial', r.fork('partial'));
    void rank;
  }

  for (let i = 0; i < 2; i++) {
    const p = clamp((era.privTarget - count) * 0.22 + 0.06, 0, 0.7) * ev.teamFound * stability(year) * (count >= era.privTarget + 1 ? 0.25 : 1);
    const r = rng.fork('found', i);
    if (r.next() < p) {
      propose(world, year, 'entry-team', {}, 'A new team applies to enter', 'Investors want to enter a new privateer team with customer cars.');
      count++;
    }
  }

  for (const t of world.teams.filter((x) => x.kind === 'works' && x.active)) {
    syncEntries(world, t, rng.fork('works', t.id));
  }
  staffYear(world, year, rng.fork('staff'));
}

// ---------------------------------------------------------------- staff

function staffYear(world, year, rng) {
  const used = usedNames(world);
  for (const t of world.teams.filter((x) => x.active).sort((a, b) => a.id - b.id)) {
    const r = rng.fork('t', t.id);
    for (const k of Object.keys(t.staff).sort()) {
      const m = t.staff[k];
      if (m.age === undefined) m.age = r.fork('age', k).int(28, 58);
      m.age++;
      const fac = t.facilities ? (t.facilities.workshops - 50) / 100 : 0;
      m.rating = Math.round(clamp(m.rating + (m.age < 46 ? 0.8 : -0.8) + r.fork('d', k).gauss(0, 2) + fac, 18, 95));
      if (m.age >= 64 || (m.age >= 55 && r.fork('ret', k).chance(0.15))) {
        const nm = makeStaff(r.fork('new', k), t.nat, used, t.wealth)[k];
        nm.age = r.fork('na', k).int(30, 45);
        logEvent(world, year, 'staff', `${m.name} retires as ${staffTitle(k)} of ${t.name}; ${nm.name} takes over.`);
        t.staff[k] = nm;
      }
    }
  }
  // a great designer can be poached
  const teams = world.teams.filter((x) => x.active).sort((a, b) => a.id - b.id);
  for (const buyer of teams) {
    const r = rng.fork('poach', buyer.id);
    if (!r.chance(0.07) || buyer.prestige < 30) continue;
    const targets = teams.filter((x) => x.id !== buyer.id && x.prestige < buyer.prestige && x.staff.techDirector.rating > buyer.staff.techDirector.rating + 8);
    if (!targets.length) continue;
    const seller = r.pick(targets);
    const a = buyer.staff.techDirector, b = seller.staff.techDirector;
    buyer.staff.techDirector = b; seller.staff.techDirector = a;
    if (b.rating >= 70) logEvent(world, year, 'staff', `${b.name} leaves ${seller.name} to become technical director of ${buyer.name}.`);
  }
}
const staffTitle = (k) => ({ principal: 'team principal', techDirector: 'technical director', raceEngineer: 'race engineer', chiefMechanic: 'chief mechanic' }[k] || k);

// ---------------------------------------------------------------- drivers

function prestige(world, team, last, rng) {
  const b = brandById(world, team.brandId);
  const rank = last && last.teamRank && last.teamRank[team.id] !== undefined ? last.teamRank[team.id] : 0.5;
  return b.strength * 0.5 + team.wealth * 0.3 + (1 - rank) * 0.2 + rng.gauss(0, 0.04);
}

function seatScore(world, d, year) { return scoutEstimate(world, d, year) + (d.rep || 0) * 0.25 + (d.backer ? 2 : 0); }

function driverMarket(world, year, rng, last) {
  // retirements: every driver, in every tier
  for (const d of world.drivers) {
    if (d.status !== 'active' || d.birthYear > year - P.world.startAge) continue;
    const p = retirementChance(d, year);
    if (p > 0 && rng.fork('retire', d.id).next() < p) { d.status = 'retired'; d.retiredYear = year; d.tier = null; d.academy = null; }
  }
  const seats = activeEntries(world);
  const keep = [], open = [];
  for (const e of seats) {
    const d = e.driverId != null ? driverById(world, e.driverId) : null;
    const running = e.contract && e.contract.until >= year;
    // a contract runs its term; a few are bought out or not renewed
    const stays = d && eligibleDriver(d, year) && (running ? rng.fork('buyout', e.id).next() > 0.06 : rng.fork('renew', e.id).next() > P.industry.contractExpiry);
    if (stays) keep.push(e); else { e.driverId = null; e.contract = null; open.push(e); }
  }
  const taken = new Set(keep.map((e) => e.driverId));
  const pool = world.drivers.filter((d) => eligibleDriver(d, year) && !taken.has(d.id))
    .map((d) => ({ d, s: seatScore(world, d, year) }))
    .sort((a, b) => b.s - a.s || a.d.id - b.d.id);
  const ranked = open.map((e) => ({ e, p: prestige(world, teamById(world, e.teamId), last, rng.fork('prestige', e.id)) }))
    .sort((a, b) => b.p - a.p || a.e.id - b.e.id);
  const pick = rng.fork('pick');
  for (const { e } of ranked) {
    if (!pool.length) break;
    // a group prefers its own academy graduates
    let idx = -1;
    const own = pool.findIndex((x) => x.d.academy === e.teamId && x.s > 52);
    if (own >= 0 && pick.next() < 0.7) idx = own;
    if (idx < 0) idx = Math.min(pool.length - 1, Math.floor(Math.abs(pick.gauss(0, 2.5))));
    e.driverId = pool[idx].d.id;
    pool[idx].d.academy = null;
    signContract(world, e, pool[idx].d, year, pick.fork('c', e.id));
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
  for (const note of adoptTechs(world, year, rng.fork('tech'))) logEvent(world, year, 'tech', note);
  orgYear(world, year, rng.fork('org'), last, {
    ev, deactivate: deactivateTeam, addTeam: (w, r, y, opts) => addPrivateerTeam(w, r, y, opts), activate: activateTeam,
  });
  privateerTeams(world, year, rng.fork('priv'), ev, last);
  const gov = traits(world);
  tiersTransition(world, year, rng.fork('tiers'), gov, (kind, payload, title, text) => propose(world, year, kind, payload, title, text));
  governorYear(world, year, last, ev);
  settle(world);
  developTyres(world, year, rng.fork('tyres'));
  assignTyres(world, rng.fork('tyre-assign'), year);
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
  const pool = world.drivers.filter((d) => eligibleDriver(d, year) && !taken.has(d.id))
    .map((d) => ({ d, s: seatScore(world, d, year) }))
    .sort((a, b) => b.s - a.s || a.d.id - b.d.id);
  const open = seats.filter((e) => e.driverId == null)
    .map((e) => ({ e, p: prestige(world, teamById(world, e.teamId), null, rng.fork('prestige', e.id)) }))
    .sort((a, b) => b.p - a.p || a.e.id - b.e.id);
  const pick = rng.fork('pick');
  for (const { e } of open) {
    if (!pool.length) break;
    const idx = Math.min(pool.length - 1, Math.floor(Math.abs(pick.gauss(0, 2.5))));
    e.driverId = pool[idx].d.id;
    signContract(world, e, pool[idx].d, year, pick.fork('c', e.id));
    pool.splice(idx, 1);
  }
}
