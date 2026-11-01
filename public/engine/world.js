// World creation and the plain-data model. A world is exactly its save file.

import { makeRng, clamp } from './rng.js';
import { PARAMS } from './params.js';
import { defaultRegs, eraFor } from './data/eras.js';
import { eventsFor } from './data/events.js';
import { BRANDS } from './data/brands.js';
import { tracksOpenIn } from './data/tracks.js';
import { nationalityWeights, makePersonName, makeTeamName } from './names.js';
import { legendRoster, makeDriverFromLegend, makeDriver, statsAt, overallAt, peakOverall } from './drivers.js';
import { buildCar } from './car.js';

export const SAVE_VERSION = 2;

const TYRE_MAKERS = [
  { id: 'dunlop', name: 'Dunlop', country: 'GB', founded: 1889 },
  { id: 'michelin', name: 'Michelin', country: 'FR', founded: 1889 },
  { id: 'goodyear', name: 'Goodyear', country: 'US', founded: 1898 },
  { id: 'firestone', name: 'Firestone', country: 'US', founded: 1900 },
  { id: 'pirelli', name: 'Pirelli', country: 'IT', founded: 1872 },
  { id: 'continental', name: 'Continental', country: 'DE', founded: 1871 },
];

// ---------------------------------------------------------------- small helpers

export function logEvent(world, year, kind, text) {
  world.chronicle.push({ year, kind, text });
}

export const entryById = (world, id) => world.entries.find((e) => e.id === id);
export const driverById = (world, id) => world.drivers.find((d) => d.id === id);
export const teamById = (world, id) => world.teams.find((t) => t.id === id);
export const brandById = (world, id) => world.brands.find((b) => b.id === id);
export const tyreById = (world, id) => world.tyres.find((t) => t.id === id);
export const activeEntries = (world) => world.entries.filter((e) => e.active);
export const activeTeams = (world) => world.teams.filter((t) => t.active);

export function eligibleDriver(d, year) {
  const age = year - d.birthYear;
  return d.status === 'active' && age >= PARAMS.world.startAge && age <= 44;
}
export function activeDrivers(world) {
  return world.drivers.filter((d) => eligibleDriver(d, world.year));
}

// ---------------------------------------------------------------- people

function staffMember(rng, nat, used, centre) {
  const gender = rng.chance(0.5) ? 'F' : 'M';
  const nm = makePersonName(rng, nat, used, gender);
  return { name: nm.full, nat, gender, rating: Math.round(clamp(rng.gauss(centre, 11), 18, 92)) };
}

export function makeStaff(rng, nat, used, wealth) {
  const c = 40 + wealth * 22;
  return {
    principal: staffMember(rng, nat, used, c),
    techDirector: staffMember(rng, nat, used, c),
    raceEngineer: staffMember(rng, nat, used, c),
    chiefMechanic: staffMember(rng, nat, used, c),
  };
}

function usedNames(world) {
  const used = new Set();
  for (const l of legendRoster()) used.add(l.full);
  for (const d of world.drivers) used.add(d.name);
  for (const t of world.teams) {
    for (const k of Object.keys(t.staff)) used.add(t.staff[k].name);
  }
  return used;
}

// Generates every birth cohort up to `throughYear`. Each cohort has its own random
// stream, so the same cohort is the same whenever it is generated.
export function ensureCohorts(world, throughYear) {
  const used = usedNames(world);
  const legends = legendRoster();
  for (let by = world.cohortThrough + 1; by <= throughYear; by++) {
    const born = [];
    for (const l of legends) if (l.birthYear === by) born.push(makeDriverFromLegend(makeRng(world.seed, 'legend', l.legendId), ++world.counters.driver, l));
    const rng = makeRng(world.seed, 'cohort', by);
    const n = rng.int(Math.max(1, PARAMS.world.cohortPerYear - 1), PARAMS.world.cohortPerYear + 1);
    const women = n % 2 === 0 ? n / 2 : (by % 2 === 0 ? (n - 1) / 2 : (n + 1) / 2);
    const genders = rng.shuffle(Array.from({ length: n }, (_, i) => (i < women ? 'F' : 'M')));
    const natW = nationalityWeights(by + 24);
    for (let i = 0; i < n; i++) {
      const nat = rng.weighted(natW, (x) => x.w).n;
      born.push(makeDriver(rng, ++world.counters.driver, nat, by, used, genders[i]));
    }
    for (const d of born) {
      if (world.year - d.birthYear > PARAMS.world.retireAgeMax) { d.status = 'retired'; d.retiredYear = d.birthYear + PARAMS.world.retireAgeMax; }
      world.drivers.push(d);
    }
  }
  world.cohortThrough = Math.max(world.cohortThrough, throughYear);
}

// ---------------------------------------------------------------- brands, teams, entries

export function newBrandObject(def, rng, year) {
  const strength = clamp(rng.gauss(0.55, 0.14), 0.25, 0.9);
  const r3 = (x) => Math.round(x * 1000) / 1000;
  return {
    id: def.id, name: def.name, country: def.country, founded: def.founded, foundedInGame: year,
    strength: r3(strength),
    chassisStrength: r3(clamp(strength + rng.gauss(0, 0.08), 0.2, 0.95)),
    engineStrength: r3(clamp(strength + rng.gauss(0, 0.08), 0.2, 0.95)),
    reliability: r3(clamp(strength + rng.gauss(0, 0.12), 0.15, 0.95)),
    status: 'dormant',        // racing | dormant | defunct
    sellsCustomers: rng.chance(0.55),
    raceYears: 0, badYears: 0, defunctSince: null,
    wins: 0, titles: 0,
  };
}

function freeNumber(world, rng) {
  const used = new Set(activeEntries(world).map((e) => e.number));
  const free = [];
  for (let i = 1; i <= 99; i++) if (!used.has(i)) free.push(i);
  return free.length ? rng.pick(free) : 100 + world.counters.entry;
}

export function addEntry(world, team, type, rng) {
  const e = { id: ++world.counters.entry, number: freeNumber(world, rng), teamId: team.id, type, driverId: null, active: true };
  world.entries.push(e);
  return e;
}

// Gives a team the entries its kind and the regulations call for (reusing dormant ones).
export function syncEntries(world, team, rng) {
  const want = team.kind === 'works' ? Math.min(2, world.regs.entries.full) : 1;
  const mine = world.entries.filter((e) => e.teamId === team.id);
  const fulls = mine.filter((e) => e.type === 'full');
  const activeFull = fulls.filter((e) => e.active);
  for (const e of fulls) {
    if (activeFull.length >= want) break;
    if (!e.active) { e.active = true; e.number = freeNumber(world, rng); activeFull.push(e); }
  }
  while (activeFull.length < want) activeFull.push(addEntry(world, team, 'full', rng));
}

export function pickSupplier(world, rng, currentId) {
  const racing = world.brands.filter((b) => b.status === 'racing');
  let pool = racing.filter((b) => b.sellsCustomers);
  if (!pool.length) pool = racing;
  if (!pool.length) pool = world.brands.filter((b) => b.status !== 'defunct');
  const cur = pool.find((b) => b.id === currentId);
  if (cur && rng.chance(0.75)) return cur.id;
  return rng.weighted(pool, (b) => b.strength + 0.3).id;
}

export function activateWorks(world, brand, rng, year) {
  let team = world.teams.find((t) => t.kind === 'works' && t.brandId === brand.id);
  if (!team) {
    const wealth = clamp(brand.strength + rng.gauss(0, 0.1), 0.2, 1);
    team = {
      id: ++world.counters.team, name: brand.name + ' Works', nat: brand.country, kind: 'works', brandId: brand.id,
      tyreId: rng.pick(world.tyres.map((t) => t.id)), wealth: Math.round(wealth * 100) / 100,
      staff: makeStaff(rng, brand.country, usedNames(world), wealth),
      control: rng.pick(['principal', 'engineer', 'driver']),
      owner: { patience: rng.int(30, 90), pockets: Math.round(wealth * 100) },
      active: true, titles: 0, wins: 0, foundedYear: year, endedYear: null,
    };
    world.teams.push(team);
  } else {
    team.active = true; team.endedYear = null;
  }
  brand.status = 'racing';
  brand.raceYears = 0; brand.badYears = 0;
  syncEntries(world, team, rng);
  return team;
}

export function deactivateTeam(world, team, year) {
  team.active = false;
  team.endedYear = year;
  for (const e of world.entries) if (e.teamId === team.id) { e.active = false; e.driverId = null; }
}

export function addPrivateerTeam(world, rng, year) {
  const nat = rng.weighted(nationalityWeights(year), (x) => x.w).n;
  const used = usedNames(world);
  const names = new Set(world.teams.map((t) => t.name));
  const wealth = clamp(rng.gauss(0.35, 0.12), 0.1, 0.7);
  const team = {
    id: ++world.counters.team, name: makeTeamName(rng, nat, names), nat, kind: 'privateer',
    brandId: pickSupplier(world, rng, null),
    tyreId: rng.pick(world.tyres.map((t) => t.id)), wealth: Math.round(wealth * 100) / 100,
    staff: makeStaff(rng, nat, used, wealth),
    control: rng.pick(['principal', 'engineer', 'driver']),
    owner: { patience: rng.int(25, 80), pockets: Math.round(wealth * 100) },
    active: true, titles: 0, wins: 0, foundedYear: year, endedYear: null,
  };
  world.teams.push(team);
  syncEntries(world, team, rng);
  if (world.regs.entries.partial >= 1 && wealth > 0.3 && rng.chance(0.35)) addEntry(world, team, 'partial', rng);
  return team;
}

// ---------------------------------------------------------------- creation

export function createWorld({ seed, year = 1919 } = {}) {
  seed = seed === undefined || seed === null || seed === '' ? 'default' : String(seed);

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
    chronicle: [],
    cohortThrough: PARAMS.world.birthStart - 1,
    counters: { entry: 0, driver: 0, team: 0 },
    meta: { createdAt: 0, name: 'Series ' + seed },
  };

  // tyre suppliers (exclusive contracts early on)
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

  // every brand already trading
  for (const b of BRANDS) {
    if (b.founded > year) continue;
    world.brands.push(newBrandObject(b, makeRng(seed, 'brand', b.id), year));
  }

  ensureCohorts(world, year + 16);

  // works teams: random but leaning to the stronger brands
  {
    const rng = makeRng(seed, 'world', 'teams');
    const pool = world.brands.slice();
    const chosen = [];
    const target = Math.min(eraFor(year).worksTarget, pool.length);
    while (chosen.length < target) {
      const b = rng.weighted(pool, (x) => x.strength + 0.25);
      chosen.push(b);
      pool.splice(pool.indexOf(b), 1);
    }
    chosen.sort((a, b) => b.strength - a.strength);
    chosen.slice(0, 3).forEach((b) => { b.sellsCustomers = true; });
    for (const b of chosen) activateWorks(world, b, rng.fork('works', b.id), year);
    for (let i = 0; i < PARAMS.world.privateerTeams; i++) addPrivateerTeam(world, rng.fork('priv', i), year);
    // two privateers also run a part-season second car, as in the original grid
    let given = 0;
    for (const t of world.teams.filter((x) => x.kind === 'privateer')) {
      if (given >= 2) break;
      if (!world.entries.some((e) => e.teamId === t.id && e.type === 'partial')) { addEntry(world, t, 'partial', rng.fork('part', t.id)); given++; }
    }
  }

  assignDrivers(world, makeRng(seed, 'world', 'grid'));
  buildAllCars(world, makeRng(seed, 'world', 'cars', year));
  startSeason(world);
  return world;
}

function driverScore(d, year) {
  return overallAt(d, year) * 0.5 + peakOverall(d) * 0.5;
}

// The 1919 grid starts with an even mix of men and women.
function assignDrivers(world, rng) {
  const year = world.year;
  const eligible = activeDrivers(world);
  const scored = eligible.map((d) => ({ d, s: driverScore(d, year) + rng.gauss(0, 5) })).sort((a, b) => b.s - a.s);
  const half = Math.ceil((PARAMS.world.tier1Drivers + 8) / 2);
  const men = scored.filter((x) => x.d.gender === 'M').slice(0, half);
  const women = scored.filter((x) => x.d.gender === 'F').slice(0, half);
  const pool = [...men, ...women].sort((a, b) => b.s - a.s).map((x) => x.d);

  const teamOrder = world.teams.slice().sort((a, b) => b.wealth - a.wealth);
  const entryOrder = [];
  for (const t of teamOrder) for (const e of world.entries) if (e.teamId === t.id && e.type === 'full') entryOrder.push(e);
  for (const t of teamOrder) for (const e of world.entries) if (e.teamId === t.id && e.type === 'partial') entryOrder.push(e);

  const remaining = pool.slice();
  for (const e of entryOrder) {
    const idx = Math.min(remaining.length - 1, Math.floor(Math.abs(rng.gauss(0, 4))));
    e.driverId = remaining[idx].id;
    remaining.splice(idx, 1);
  }
}

export function buildAllCars(world, rng) {
  for (const e of activeEntries(world)) {
    const team = teamById(world, e.teamId);
    const brand = brandById(world, team.brandId);
    e.car = buildCar(rng.fork('entry', e.id), { brand, staff: team.staff, customer: team.kind !== 'works', year: world.year });
  }
}

// ---------------------------------------------------------------- regulations and calendar

// A new era resets the regulations to its defaults unless someone has edited them.
export function applyEraRegs(world, year) {
  const era = eraFor(year);
  if (world.regs.touched || world.regs.eraFrom === era.from) return false;
  const fresh = defaultRegs(year);
  world.regs = { ...fresh, exemptTop: world.regs.exemptTop, raceKm: world.regs.raceKm, minLaps: world.regs.minLaps };
  logEvent(world, year, 'regs', `Regulation reset for the ${era.name} era: top ${fresh.scoring.length} score, grid of ${fresh.gridCap}, ${fresh.rounds} rounds.`);
  return true;
}

export function pickCalendar(world, rng) {
  const open = tracksOpenIn(world.year).map((t) => t.id);
  const rounds = Math.max(1, Math.min(world.regs.rounds, eventsFor(world.year).roundsCap, open.length));
  return rng.shuffle(open).slice(0, rounds);
}

export function startSeason(world) {
  const rng = makeRng(world.seed, 'season', world.year);
  const calendar = pickCalendar(world, rng.fork('calendar'));
  const partialPlan = {};
  const partialRounds = Math.max(1, Math.round(calendar.length * PARAMS.season.partialShare));
  for (const e of activeEntries(world)) {
    if (e.type !== 'partial') continue;
    partialPlan[e.id] = rng.fork('partial', e.id).shuffle(calendar.map((_, i) => i)).slice(0, partialRounds).sort((a, b) => a - b);
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

export { statsAt };
