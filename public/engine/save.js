// Saves are one portable JSON file. A world is plain data, so a save is simply
// the world plus a small header. Races are deterministic functions of the seed and
// the state, so nothing about random streams needs saving.

import { SAVE_VERSION } from './world.js';

export function serialize(world, device = '') {
  world.meta = world.meta || {};
  world.meta.savedOn = device;
  world.meta.lastOpenedOn = device;
  world.meta.savedAt = Date.now();
  return JSON.stringify({ format: 'msc-save', version: SAVE_VERSION, world });
}

export function deserialize(text, device = '') {
  const obj = JSON.parse(text);
  if (!obj || obj.format !== 'msc-save') throw new Error('This is not a save file from this game.');
  if (obj.version > SAVE_VERSION) throw new Error('This save was made by a newer version of the game.');
  const world = obj.world;
  const previous = (world.meta && world.meta.lastOpenedOn) || '';
  world.meta.openedFrom = previous;
  world.meta.lastOpenedOn = device;
  return world;
}

export function deepClone(world) { return JSON.parse(JSON.stringify(world)); }
