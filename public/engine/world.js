// World creation: brands, tyre suppliers, teams, staff, entries, drivers, calendar.
// Everything is plain data so a world is exactly its save file.

import { makeRng, clamp } from './rng.js';
import { PARAMS } from './params.js';
import { defaultRegs } from './data/eras.js';
import { BRANDS } from './data/brands.js';
import { tracksOpenIn } from './data/tracks.js';
import { nationalityWeights, makePersonName, makeTeamName } from './names.js';
import { legendRoster, makeDriverFromLegend, makeDriver, statsAt, overallAt, peakOverall } from './drivers.js';
import { buildCar } from './car.js';

export const SAVE_VERSION = 1;

const TYRE_MAKERS = [
  { id: 'dunlop', name: 'Dunlop', country: 'GB', founded: 1889 },
  { id: 'michelin', name: 'Michelin', country: 'FR', founded: 1889 },
  { id: 'goodyear', name: 'Goodyear', country: 'US', founded: 1898 },
  { id: 'firestone', name: 'Firestone', country: 'US', founded: 1900 },
  { id: 'pirelli', name: 'Pirelli', country: 'IT', founded: 1872 },
  { id: 'continental', name: 'Continental', country: 'DE', founded: 1871 },
];

function staffMember(rng, nat, used, centre) {
  const nm = makePersonName(rng, nat, used);
  return { name: nm.full, nat, rating: Math.round(clamp(rng.gauss(centre, 11), 18, 92)) };
}

function makeStaff(rng, nat, used, wealth) {
  const c = 40 + wealth * 22;
  return {
    principal: staffMember(rng, nat, used, c),
    techDirector: staffMember(rng, nat, used, c),
    raceEngineer: staffMember(rng, nat, used, c),
    chiefMechanic: staffMember(rng, nat, used, c),
  };
}

export function createWorld({ seed, year = 1919 } = {}) {
  seed = seed === undefined || seed === null || seed === '' ? 'default' : String(seed);
  const usedPeople = new Set();
  const usedTeams = new Set();

  const world = {
    format: 'msc-world',
    version: SAVE_VERSION,
    seed,
    startYear: year,
    year,
    regs: defaultRegs(year),
    tyres: [],
    brands: [],
    teams: [],
    entries: [],
    drivers: [],
    season: null,
    history: { seasons: [] },
    counters: { entry: 0, driver: 0 },
    meta: { createdAt: 0, name: 'Series ' + seed },
  };

  // ---- tyre suppliers (exclusive contracts early on) ----
  {
    const rng = makeRng(seed, 'world', 'tyres');
    for (const t of TYRE_MAKERS) {
      if (t.founded > year) continue;
      world.tyres.push({
        id: t.id, name: t.name, country: t.country,
        grip: Math.round(clamp(rng.gauss(52, 8), 35, 72)),
        durability: Math.round(clamp(rng.gauss(52, 8), 35, 72)),
        puncture: Math.round(clamp(rng.gauss(50, 9), 30, 72)),
        wet: Math.round(clamp(rng.gauss(45, 9), 25, 65)),
      });
    }
  }

  // ---- brands ----
  {
    const rng = makeRng(seed, 'world', 'brands');
    for (const b of BRANDS) {
      if (b.founded > year) continue;
      const strength = clamp(rng.gauss(0.55, 0.14), 0.25, 0.9);
      world.brands.push({
        id: b.id, name: b.name, country: b.country, founded: b.founded,
        strength: Math.round(strength * 1000) / 1000,
        chassisStrength: Math.round(clamp(strength + rng.gauss(0, 0.08), 0.2, 0.95) * 1000) / 1000,
        engineStrength: Math.round(clamp(strength + rng.gauss(0, 0.08), 0.2, 0.95) * 1000) / 1000,
        reliability: Math.round(clamp(strength + rng.gauss(0, 0.12), 0.15, 0.95) * 1000) / 1000,
        racing: false, active: true, wins: 0, titles: 0,
      });
    }
  }

  // ---- people ----
  {
    const used = usedPeople;
    const legends = legendRoster();
    for (const l of legends) used.add(l.full);
    const rngL = makeRng(seed, 'world', 'legends');
    const rngP = makeRng(seed, 'world', 'cohorts');
    const { birthStart, birthEnd } = PARAMS.world;
    for (let by = birthStart; by <= birthEnd; by++) {
      for (const l of legends.filter((x) => x.birthYear === by)) {
        world.drivers.push(makeDriverFromLegend(rngL.fork(l.legendId), ++world.counters.driver, l));
      }
      const n = rngP.int(Math.max(1, PARAMS.world.cohortPerYear - 1), PARAMS.world.cohortPerYear + 1);
      const natW = nationalityWeights(by + 24);
      for (let i = 0; i < n; i++) {
        const nat = rngP.weighted(natW, (x) => x.w).n;
        world.drivers.push(makeDriver(rngP, ++world.counters.driver, nat, by, used));
      }
    }
  }

  // ---- teams, staff, entries ----
  setupTeams(world, makeRng(seed, 'world', 'teams'), usedPeople, usedTeams);
  assignDrivers(world, makeRng(seed, 'world', 'grid'));
  buildAllCars(world, makeRng(seed, 'world', 'cars', year));

  startSeason(world);
  return world;
}

function setupTeams(world, rng, usedPeople, usedTeams) {
  const { worksBrands, privateerTeams } = PARAMS.world;
  const avail = world.brands.slice();
  // works brands: random but leaning to the stronger ones
  const chosen = [];
  const pool = avail.slice();
  while (chosen.length < Math.min(worksBrands, pool.length)) {
    const b = rng.weighted(pool, (x) => x.strength + 0.25);
    chosen.push(b);
    pool.splice(pool.indexOf(b), 1);
  }
  for (const b of chosen) b.racing = true;

  const tyreIds = world.tyres.map((t) => t.id);
  let teamId = 0;
  for (const b of chosen) {
    const wealth = clamp(b.strength + rng.gauss(0, 0.1), 0.2, 1);
    world.teams.push({
      id: ++teamId, name: b.name + ' Works', nat: b.country, kind: 'works', brandId: b.id,
      tyreId: rng.pick(tyreIds), wealth: Math.round(wealth * 100) / 100,
      staff: makeStaff(rng, b.country, usedPeople, wealth),
      control: rng.pick(['principal', 'engineer', 'driver']),
      owner: { patience: rng.int(30, 90), pockets: Math.round(wealth * 100) },
      active: true, titles: 0, wins: 0, founded: world.year,
    });
  }
  const natW = nationalityWeights(world.year);
  const racingBrands = chosen;
  for (let i = 0; i < privateerTeams; i++) {
    const nat = rng.weighted(natW, (x) => x.w).n;
    const supplier = rng.weighted(racingBrands, (x) => x.strength + 0.3);
    const wealth = clamp(rng.gauss(0.35, 0.12), 0.1, 0.7);
    world.teams.push({
      id: ++teamId, name: makeTeamName(rng, nat, usedTeams), nat, kind: 'privateer', brandId: supplier.id,
      tyreId: rng.pick(tyreIds), wealth: Math.round(wealth * 100) / 100,
      staff: makeStaff(rng, nat, usedPeople, wealth),
      control: rng.pick(['principal', 'engineer', 'driver']),
      owner: { patience: rng.int(25, 80), pockets: Math.round(wealth * 100) },
      active: true, titles: 0, wins: 0, founded: world.year,
    });
  }

  // entries: works run two full-season cars; privateers one, and the first two add a part-season car
  const numbers = rng.shuffle(Array.from({ length: 99 }, (_, i) => i + 1));
  let privateerIdx = 0;
  for (const t of world.teams) {
    const full = t.kind === 'works' ? 2 : 1;
    for (let i = 0; i < full; i++) world.entries.push({ id: ++world.counters.entry, number: numbers.pop(), teamId: t.id, type: 'full', driverId: null });
    if (t.kind === 'privateer') {
      if (privateerIdx < 2) world.entries.push({ id: ++world.counters.entry, number: numbers.pop(), teamId: t.id, type: 'partial', driverId: null });
      privateerIdx++;
    }
  }
}

function driverScore(d, year) {
  return overallAt(d, year) * 0.5 + peakOverall(d) * 0.5;
}

export function activeDrivers(world) {
  return world.drivers.filter((d) => d.status === 'active' && world.year - d.birthYear >= PARAMS.world.startAge);
}

function assignDrivers(world, rng) {
  const year = world.year;
  const eligible = activeDrivers(world).filter((d) => year - d.birthYear <= 44);
  const scored = eligible.map((d) => ({ d, s: driverScore(d, year) + rng.gauss(0, 5) })).sort((a, b) => b.s - a.s);
  const pool = scored.slice(0, PARAMS.world.tier1Drivers + 8).map((x) => x.d);
  for (const d of pool) d.tier = 1;

  const teamOrder = world.teams.slice().sort((a, b) => b.wealth - a.wealth);
  const entryOrder = [];
  for (const t of teamOrder) for (const e of world.entries) if (e.teamId === t.id && e.type === 'full') entryOrder.push(e);
  for (const t of teamOrder) for (const e of world.entries) if (e.teamId === t.id && e.type === 'partial') entryOrder.push(e);

  let remaining = pool.slice();
  for (const e of entryOrder) {
    const idx = Math.min(remaining.length - 1, Math.floor(Math.abs(rng.gauss(0, 4))));
    const d = remaining[idx];
    e.driverId = d.id;
    remaining.splice(idx, 1);
  }
}

export function buildAllCars(world, rng) {
  for (const e of world.entries) {
    const team = world.teams.find((t) => t.id === e.teamId);
    const brand = world.brands.find((b) => b.id === team.brandId);
    e.car = buildCar(rng.fork('entry', e.id), { brand, staff: team.staff, customer: team.kind !== 'works', year: world.year });
  }
}

export function pickCalendar(world, rng) {
  const open = tracksOpenIn(world.year).map((t) => t.id);
  const rounds = Math.min(8, open.length);
  return rng.shuffle(open).slice(0, rounds);
}

export function startSeason(world) {
  const rng = makeRng(world.seed, 'season', world.year);
  const calendar = pickCalendar(world, rng.fork('calendar'));
  const partialPlan = {};
  const partialRounds = Math.max(1, Math.round(calendar.length * PARAMS.season.partialShare));
  for (const e of world.entries) {
    if (e.type !== 'partial') continue;
    const rs = rng.fork('partial', e.id).shuffle(calendar.map((_, i) => i)).slice(0, partialRounds).sort((a, b) => a - b);
    partialPlan[e.id] = rs;
  }
  world.season = {
    year: world.year,
    round: 0,
    calendar,
    partialPlan,
    standings: { entries: {}, drivers: {}, brands: {} },
    results: [],
    done: false,
  };
  return world.season;
}

export function entryById(world, id) { return world.entries.find((e) => e.id === id); }
export function driverById(world, id) { return world.drivers.find((d) => d.id === id); }
export function teamById(world, id) { return world.teams.find((t) => t.id === id); }
export function brandById(world, id) { return world.brands.find((b) => b.id === id); }
export function tyreById(world, id) { return world.tyres.find((t) => t.id === id); }

export { statsAt };
