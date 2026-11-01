// Saves are one portable JSON file. A world is plain data, so a save is simply
// the world plus a small header. Races are deterministic functions of the seed and
// the state, so nothing about random streams needs saving.

import { makeRng } from './rng.js';
import { SAVE_VERSION, ensureCohorts, activeEntries, teamById, driverById } from './world.js';
import { defaultRegs, eraFor, scoringFor } from './data/eras.js';
import { fillVacantSeats } from './industry.js';
import { initTeamOrg, initBrandOrg, signContract } from './org.js';
import { bootstrapTiers, startTierSeasons, tiersAfterRound } from './tiers.js';

export function serialize(world, device = '') {
  world.meta = world.meta || {};
  world.meta.savedOn = device;
  world.meta.lastOpenedOn = device;
  world.meta.savedAt = Date.now();
  return JSON.stringify({ format: 'msc-save', version: SAVE_VERSION, world });
}

// Brings an older save up to the current format. Safe to call on a current one.
export function migrate(world) {
  if (world.version >= SAVE_VERSION) return world;

  if (world.version < 2) {
    world.chronicle = world.chronicle || [];
    world.counters.team = world.counters.team || world.teams.reduce((m, t) => Math.max(m, t.id), 0);
    world.cohortThrough = world.cohortThrough === undefined ? 1935 : world.cohortThrough;
    for (const d of world.drivers) if (!d.gender) d.gender = d.id % 2 === 0 ? 'F' : 'M';
    for (const b of world.brands) {
      if (!b.status) b.status = b.racing ? 'racing' : 'dormant';
      delete b.racing; delete b.active;
      if (b.sellsCustomers === undefined) b.sellsCustomers = !!(b.strength > 0.5);
      b.raceYears = b.raceYears || 0; b.badYears = b.badYears || 0; b.defunctSince = b.defunctSince || null;
      b.foundedInGame = b.foundedInGame || world.startYear || 1919;
    }
    for (const t of world.teams) {
      if (t.active === undefined) t.active = true;
      t.foundedYear = t.foundedYear || t.founded || world.startYear || 1919;
      t.endedYear = t.endedYear || null;
    }
    for (const e of world.entries) if (e.active === undefined) e.active = true;
    for (const h of world.history.seasons) {
      if (!h.champion && !h.cancelled && (!h.results || !h.results.length)) h.empty = true;
      if (!h.results) h.results = [];
      if (!h.final) h.final = null;
    }
    ensureCohorts(world, world.year + 16);
    fillVacantSeats(world, world.year);
  }

  if (world.version < 3) {
    const year = world.year;
    const touched = !!(world.regs && world.regs.touched);
    const old = world.regs || {};
    world.regs = touched ? { ...defaultRegs(year), ...old } : { ...defaultRegs(year), exemptTop: old.exemptTop || 10, raceKm: old.raceKm || 300, minLaps: old.minLaps || 5 };
    world.regs.eraFrom = eraFor(year).from;
    world.regs.overridden = world.regs.overridden || {};
    world.regs.scoringFrom = scoringFor(year).from;
    world.epoch = world.epoch || 0;
    world.series = []; world.lowTeams = []; world.grass = {};
    world.governor = world.governor || { personality: 'traditionalist', mode: 'auto', manual: {} };
    world.inbox = []; world.decisions = []; world.phase = 'season'; world.titleSponsor = null; world.academies = {};
    world.counters = { entry: 0, driver: 0, team: 0, series: 0, lowTeam: 0, decision: 0, ...world.counters };
    for (const b of world.brands) { initBrandOrg(b, makeRng(world.seed, 'brand-org', b.id)); if (b.health === undefined) b.health = b.strength; }
    for (const t of world.teams) {
      t.owner = t.owner && t.owner.fortune !== undefined ? t.owner : { patience: (t.owner && t.owner.patience) || 50, pockets: (t.owner && t.owner.pockets) || 50 };
      initTeamOrg(world, t, makeRng(world.seed, 'org-init', t.id), year);
    }
    for (const e of world.entries) {
      if (e.active && e.driverId != null && !e.contract) { const d = driverById(world, e.driverId); if (d) signContract(world, e, d, year, makeRng(world.seed, 'mig-contract', e.id)); }
      if (e.car) { e.car.designYear = e.car.designYear || e.car.year; e.car.maturity = e.car.maturity || 0; e.car.techs = e.car.techs || []; e.car.epoch = 0; }
    }
    for (const d of world.drivers) { if (d.rep === undefined) d.rep = Math.min(90, 10 + (d.wins || 0) * 2 + (d.titles || 0) * 12); if (d.fans === undefined) d.fans = 0; if (d.academy === undefined) d.academy = null; }
    // the ladder the world would have by now
    bootstrapTiers(world, year);
    startTierSeasons(world, year);
    if (world.season && world.season.round > 0) tiersAfterRound(world);
    // in an old save the champion records carry no wins and podiums: the Chronicle derives them
    for (const t of world.teams) void teamById(world, t.id);
    void activeEntries;
  }
  world.version = SAVE_VERSION;
  return world;
}

export function deserialize(text, device = '') {
  const obj = JSON.parse(text);
  if (!obj || obj.format !== 'msc-save') throw new Error('This is not a save file from this game.');
  if (obj.version > SAVE_VERSION) throw new Error('This save was made by a newer version of the game.');
  const world = migrate(obj.world);
  world.meta = world.meta || {};
  const previous = world.meta.lastOpenedOn || '';
  world.meta.openedFrom = previous;
  world.meta.lastOpenedOn = device;
  return world;
}

export function deepClone(world) { return JSON.parse(JSON.stringify(world)); }
