// The industry between seasons: brands are founded, develop, enter and leave the
// championship, go dormant, die and are revived; privateer teams come and go;
// drivers retire and move between teams. Fixed history (data/events.js) changes
// the odds, never the results of races.

import { makeRng, clamp } from './rng.js';
import { PARAMS as P } from './params.js';
import { BRANDS, engineOnlyAt } from './data/brands.js';
import { worksTargetFor, privTargetFor, sellOffChance, buyInChance } from './data/curve.js';
import { corporateYear } from './corp.js';
import { foundersYear, sellOffWorks, candidatesToBuy } from './founders.js';
import { stability, eraFor } from './data/eras.js';
import { eventsFor } from './data/events.js';
import {
  newBrandObject, activateWorks, deactivateTeam, addPrivateerTeam, addEntry, syncEntries, pickSupplier,
  logEvent, activeEntries, brandById, teamById, driverById, eligibleDriver, ensureCohorts, applyEraRegs,
} from './world.js';
import { overallAt, peakOverall, retirementChance } from './drivers.js';
import { adoptTechs } from './techs.js';
import { orgYear, signContract, makeOwner, supplierDeals } from './org.js';
import { tiersTransition, scoutEstimate } from './tiers.js';
import { propose, governorYear, settle, traits } from './governor.js';
import { assignTyres, developTyres, activateTeam, makeStaff, usedNames, ensureOils, developOils, assignOil } from './world.js';
import { nationalityWeights as natW } from './names.js';

const r3 = (x) => Math.round(x * 1000) / 1000;

function racingBrands(world) { return world.brands.filter((b) => b.status === 'racing'); }

// ---------------------------------------------------------------- brands

function foundBrands(world, year, rng) {
  for (const def of BRANDS) {
    if (def.founded > year || brandById(world, def.id)) continue;
    // brands made by a merger, and brands that have merged away, are handled in corp.js
    if (def.via === 'merge' || (def.until !== undefined && def.until <= year)) continue;
    const b = newBrandObject(def, makeRng(world.seed, 'brand', def.id), year);
    if (def.engineOnly) b.sellsCustomers = true;
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

const isEngineOnly = (b, year) => engineOnlyAt(b.id, year);

function brandLifecycle(world, year, rng, ev, last) {
  const target = worksTargetFor(year);
  void last;
  const worksBrands = () => world.brands.filter((b) => b.status === 'racing' && !isEngineOnly(b, year));
  let W = worksBrands().length;
  const sorted = world.brands.slice().sort((a, c) => a.id.localeCompare(c.id));

  // makers that are only allowed to build engines can no longer run a works team
  for (const b of sorted) {
    if (!isEngineOnly(b, year)) continue;
    const team = world.teams.find((t) => t.kind === 'works' && t.brandId === b.id && t.active);
    if (!team) continue;
    sellOrClose(world, team, b, year, rng.fork('eo', b.id), true);
    logEvent(world, year, 'brand', `${b.name} closes its works team to concentrate on building engines for others.`);
  }

  // exits
  for (const b of sorted) {
    if (b.status !== 'racing' || isEngineOnly(b, year)) continue;
    const r = rng.fork('exit', b.id);
    let p = (0.006 + ev.brandExit) * (0.4 + 0.6 * stability(year));
    if (b.strength < 0.38) p += 0.06;
    if (b.badYears >= 3) p += 0.08;
    if (b.health !== undefined && b.health < 0.3) p += 0.07;
    if (b.raceYears > 25) p *= 0.5;
    p *= 1 - Math.min(0.5, b.titles * 0.03 + b.raceYears * 0.006); // legacy buffers bad patches
    p *= clamp(W / target, 0.6, 2.2);
    if (W > target + 1) p += 0.14 * (W - target - 1);          // the sport settles around its target
    if (b.corp) p *= 0.8;                                      // a group stands behind its brands
    if (W <= 2) p *= 0.2;
    if (r.next() < p) {
      b.status = 'dormant';
      const team = world.teams.find((t) => t.kind === 'works' && t.brandId === b.id && t.active);
      if (team) sellOrClose(world, team, b, year, r.fork('sell'), false);
      else logEvent(world, year, 'brand', `${b.name} withdraws from the championship.`);
      W--;
      if (team && team.kind === 'works') logEvent(world, year, 'brand', `${b.name} withdraws its works team${ev.names.length ? ' (' + ev.names[0] + ')' : ''}.`);
    }
  }

  // engine builders decide whether to supply the grid
  const suppliers = () => world.brands.filter((b) => b.status === 'racing' && (b.sellsCustomers || isEngineOnly(b, year))).length;
  for (const b of sorted) {
    if (!isEngineOnly(b, year) || b.status === 'defunct' || b.founded > year) continue;
    const r = rng.fork('supply', b.id);
    const n = suppliers();
    if (b.status === 'racing') {
      if (n > 3 && r.chance(0.02 + (b.strength < 0.4 ? 0.05 : 0))) { b.status = 'dormant'; logEvent(world, year, 'brand', `${b.name} stops supplying engines to the championship.`); }
    } else if (b.status === 'dormant') {
      const p = clamp(0.3 - 0.06 * n, 0.04, 0.3) * (b.strength > 0.5 ? 1.3 : 0.8) * Math.max(0.3, ev.brandEntry);
      if (r.chance(p) || (b.foundedInGame === year && b.founded === year && n < 4)) { b.status = 'racing'; b.raceYears = 0; logEvent(world, year, 'brand', `${b.name} begins supplying engines to the championship.`); }
    }
  }

  // entries: a dormant maker wants in, by founding a works team or by buying an independent one
  const wantBuy = candidatesToBuy(world, year);
  for (const b of sorted) {
    if (b.status !== 'dormant' || isEngineOnly(b, year)) continue;
    const r = rng.fork('enter', b.id);
    let p = 0.03 * (b.strength > 0.5 ? 1.5 : 0.6) * clamp((target - W) / 3 + 0.5, 0.1, 3) * ev.brandEntry;
    if (b.foundedInGame === year && b.founded === year) p = Math.max(p, 0.4 * ev.brandEntry);
    if (b.corp) p *= 1.2;
    if (W >= target + 2) p *= 0.1;
    if (r.next() < p) {
      const buyable = wantBuy.filter((t) => !world.inbox.some((i) => i.status === 'pending' && i.payload && i.payload.buyTeamId === t.id));
      if (buyable.length && r.fork('buy').chance(buyInChance(year))) {
        const t = r.fork('which').weighted(buyable.slice(0, 6), (x) => 10 + x.prestige);
        propose(world, year, 'entry-works', { brandId: b.id, buyTeamId: t.id }, `${b.name} asks to buy ${t.name}`, `${b.name} (${b.country}) wants to buy the independent team ${t.name} and run it as a factory effort. Strength ${Math.round(b.strength * 100)}, ${b.titles} titles in the past.`);
      } else {
        propose(world, year, 'entry-works', { brandId: b.id }, `${b.name} asks to enter`, `${b.name} (${b.country}) wants to enter the championship with a works team. Strength ${Math.round(b.strength * 100)}, ${b.titles} titles in the past.`);
      }
      W++;
    }
  }

  // death and revival
  for (const b of sorted) {
    const r = rng.fork('life', b.id);
    if (b.status === 'dormant') {
      const age = year - b.founded;
      const p = (age > 40 ? 0.004 : 0.01) * (b.corp ? 0.4 : 1) * (isEngineOnly(b, year) ? 0.3 : 1);
      if (r.next() < p) {
        b.status = 'defunct'; b.defunctSince = year;
        logEvent(world, year, 'brand', `${b.name} ceases trading.`);
      }
    } else if (b.status === 'defunct' && !b.mergedInto && year - b.defunctSince >= 3) {
      if (r.next() < 0.004) {
        b.status = 'dormant'; b.defunctSince = null;
        b.strength = r3(clamp(0.45 + r.gauss(0, 0.1), 0.25, 0.8));
        logEvent(world, year, 'brand', `${b.name} is revived under new ownership.`);
      }
    }
  }
}

// a works team of a maker that is leaving: sold on, or closed
function sellOrClose(world, team, brand, year, rng, keepRacingStatus) {
  const sell = rng.fork('chance').chance(sellOffChance(year)) && world.teams.filter((t) => t.active).length >= 6;
  if (sell) { sellOffWorks(world, team, brand, year, rng.fork('sale')); return true; }
  deactivateTeam(world, team, year);
  if (keepRacingStatus) team.closed = { year, why: 'maker became an engine supplier', peakPrestige: team.legacy.peakPrestige, peakFacilities: team.legacy.peakFacilities };
  return false;
}

// ---------------------------------------------------------------- teams

function privateerTeams(world, year, rng, ev, last) {
  const era = eraFor(year);
  let count = world.teams.filter((t) => t.kind === 'privateer' && t.active).length;

  for (const t of world.teams.filter((x) => x.kind === 'privateer' && x.active)) {
    const r = rng.fork('team', t.id);
    const rank = last && last.teamRank ? last.teamRank[t.id] : 0.5;
    if (!t.partner) t.brandId = pickSupplier(world, r.fork('supplier'), t.brandId);
    syncEntries(world, t, r.fork('entries'));
    const hasPartial = world.entries.some((e) => e.teamId === t.id && e.type === 'partial' && e.active);
    if (!hasPartial && era.entries.partial >= 1 && t.wealth > 0.45 && r.chance(0.08)) addEntry(world, t, 'partial', r.fork('partial'));
    void rank;
  }

  for (let i = 0; i < 2; i++) {
    const pt = privTargetFor(year);
    const p = clamp((pt - count) * 0.22 + 0.06, 0, 0.7) * ev.teamFound * stability(year) * (count >= pt + 1 ? 0.25 : 1);
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
        const nm = makeStaff(r.fork('new', k), t.nat, used, t.wealth, year)[k];
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
  corporateYear(world, year, rng.fork('corp'));
  developBrands(world, rng.fork('develop'), last);
  brandLifecycle(world, year, rng.fork('life'), ev, last);
  for (const note of adoptTechs(world, year, rng.fork('tech'))) logEvent(world, year, 'tech', note);
  orgYear(world, year, rng.fork('org'), last, {
    ev, deactivate: deactivateTeam, addTeam: (w, r, y, opts) => addPrivateerTeam(w, r, y, opts), activate: activateTeam,
  });
  privateerTeams(world, year, rng.fork('priv'), ev, last);
  foundersYear(world, year, rng.fork('founders'), ev, (kind, payload, title, text) => propose(world, year, kind, payload, title, text));
  const gov = traits(world);
  tiersTransition(world, year, rng.fork('tiers'), gov, (kind, payload, title, text) => propose(world, year, kind, payload, title, text));
  governorYear(world, year, last, ev);
  settle(world);
  developTyres(world, year, rng.fork('tyres'));
  assignTyres(world, rng.fork('tyre-assign'), year);
  ensureOils(world, year);
  developOils(world, year, rng.fork('oils'));
  assignOil(world, rng.fork('oil-assign'), year);
  supplierDeals(world, year); // the sponsor rows follow the deals just signed, not last year's
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
