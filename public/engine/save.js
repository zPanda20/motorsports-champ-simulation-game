// Saves are one portable JSON file. A world is plain data, so a save is simply
// the world plus a small header. Races are deterministic functions of the seed and
// the state, so nothing about random streams needs saving.

import { SAVE_VERSION, ensureCohorts } from './world.js';
import { defaultRegs, eraFor } from './data/eras.js';
import { fillVacantSeats } from './industry.js';

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
    // the old regulations were the 1919 defaults; the next year turn applies the new era's
    world.regs = { ...defaultRegs(world.year), ...world.regs, eraFrom: world.regs.eraFrom || eraFor(world.startYear || 1919).from, touched: !!world.regs.touched };
    for (const h of world.history.seasons) {
      if (!h.champion && !h.cancelled && (!h.results || !h.results.length)) h.empty = true;
      if (!h.results) h.results = [];
      if (!h.final) h.final = null;
    }
    ensureCohorts(world, world.year + 16);
    fillVacantSeats(world, world.year);
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
