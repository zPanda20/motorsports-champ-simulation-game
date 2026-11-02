// World creation and the plain-data model. A world is exactly its save file.

import { makeRng, clamp } from './rng.js';
import { PARAMS } from './params.js';
import { defaultRegs, eraFor } from './data/eras.js';
import { eventsFor } from './data/events.js';
import { BRANDS, brandsAtStart, brandNameAt, engineOnlyAt, brandColors } from './data/brands.js';
import { worksTargetFor, privTargetFor } from './data/curve.js';
import { OILS, OIL_FROM, oilsOpenIn } from './data/oils.js';
import { worksTeamName, effectiveBrand, initCorp } from './corp.js';
import { tracksOpenIn, TRACK_BY_ID } from './data/tracks.js';
import { initTiers, startTierSeasons } from './tiers.js';
import { nationalityWeights, makePersonName, makeTeamName } from './names.js';
import { legendRoster, makeDriverFromLegend, makeDriver, statsAt, overallAt, peakOverall } from './drivers.js';
import { buildCar, evolveCar } from './car.js';
import { initTeamOrg, initBrandOrg, avgFac, budgetBase, signContract } from './org.js';
import { adoptionShares, usableTechs, techBonus } from './techs.js';
import { regionOf } from './data/regions.js';

export const SAVE_VERSION = 5;

const TYRE_MAKERS = [
  { id: 'dunlop', name: 'Dunlop', country: 'GB', founded: 1889 },
  { id: 'michelin', name: 'Michelin', country: 'FR', founded: 1889 },
  { id: 'goodyear', name: 'Goodyear', country: 'US', founded: 1898 },
  { id: 'firestone', name: 'Firestone', country: 'US', founded: 1900 },
  { id: 'pirelli', name: 'Pirelli', country: 'IT', founded: 1872 },
  { id: 'continental', name: 'Continental', country: 'DE', founded: 1871 },
  { id: 'avon', name: 'Avon', country: 'GB', founded: 1885 },
  { id: 'yokohama', name: 'Yokohama', country: 'JP', founded: 1917 },
  { id: 'bridgestone', name: 'Bridgestone', country: 'JP', founded: 1931 },
  { id: 'hankook', name: 'Hankook', country: 'KR', founded: 1941 },
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

function staffMember(rng, nat, used, centre, year) {
  const gender = rng.chance(0.5) ? 'F' : 'M';
  const nm = makePersonName(rng, nat, used, gender, typeof year === 'number' ? year - 42 : undefined);
  return { name: nm.full, nat, gender, rating: Math.round(clamp(rng.gauss(centre, 11), 18, 92)) };
}

export function makeStaff(rng, nat, used, wealth, year) {
  const c = 40 + wealth * 22;
  return {
    principal: staffMember(rng, nat, used, c, year),
    techDirector: staffMember(rng, nat, used, c, year),
    raceEngineer: staffMember(rng, nat, used, c, year),
    chiefMechanic: staffMember(rng, nat, used, c, year),
  };
}

export function usedNames(world) {
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
    id: def.id, name: brandNameAt(def, year), names: [brandNameAt(def, year)], country: def.country, founded: def.founded, foundedInGame: year, corp: null,
    strength: r3(strength),
    chassisStrength: r3(clamp(strength + rng.gauss(0, 0.08), 0.2, 0.95)),
    engineStrength: r3(clamp(strength + rng.gauss(0, 0.08), 0.2, 0.95)),
    reliability: r3(clamp(strength + rng.gauss(0, 0.12), 0.15, 0.95)),
    status: 'dormant',        // racing | dormant | defunct
    sellsCustomers: rng.chance(0.55),
    raceYears: 0, badYears: 0, defunctSince: null,
    wins: 0, titles: 0,
    tech: {}, risk: r3(rng.float(0.15, 0.9)), commitment: 1, fans: Math.round(clamp(strength * 40 + rng.gauss(5, 5), 1, 80)),
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
  const want = team.kind === 'works' || team.twoCars ? Math.min(2, world.regs.entries.full) : 1;
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
      id: ++world.counters.team, name: worksTeamName(world, brand, year, rng.fork('name')), nat: brand.country, kind: 'works', brandId: brand.id,
      origin: { type: 'manufacturer', year, by: brand.name },
      tyreId: rng.pick(world.tyres.map((t) => t.id)), wealth: Math.round(wealth * 100) / 100,
      staff: makeStaff(rng, brand.country, usedNames(world), wealth, year),
      control: rng.pick(['principal', 'engineer', 'driver']),
      owner: { patience: rng.int(30, 90), pockets: Math.round(wealth * 100) },
      active: true, titles: 0, wins: 0, foundedYear: year, endedYear: null,
    };
    world.teams.push(team);
    initTeamOrg(world, team, rng.fork('org'), year);
  } else {
    team.active = true; team.endedYear = null; team.closed = null;
    team.finance.cash = Math.max(team.finance.cash, Math.round(budgetBase(year) * 0.3));
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

export function addPrivateerTeam(world, rng, year, opts = {}) {
  const nat = opts.nat || rng.weighted(nationalityWeights(year), (x) => x.w).n;
  const used = usedNames(world);
  const names = new Set(world.teams.map((t) => t.name));
  const wealth = opts.wealth !== undefined ? opts.wealth : clamp(rng.gauss(opts.rich ? 0.6 : 0.35, 0.12), 0.1, opts.rich ? 0.9 : 0.7);
  const team = {
    id: ++world.counters.team, name: opts.name || makeTeamName(rng, nat, names, year), nat, kind: 'privateer',
    brandId: opts.brandId || pickSupplier(world, rng, null),
    tyreId: rng.pick(world.tyres.map((t) => t.id)), wealth: Math.round(wealth * 100) / 100,
    staff: makeStaff(rng, nat, used, wealth, year),
    control: rng.pick(['principal', 'engineer', 'driver']),
    owner: { patience: rng.int(25, 80), pockets: Math.round(wealth * 100) },
    active: true, titles: 0, wins: 0, foundedYear: year, endedYear: null,
    colors: makeLivery(rng.fork('livery'), nat, year),
    origin: opts.origin || { type: 'investors', year },
  };
  if (opts.groupId) { team.groupId = opts.groupId; team.relation = opts.relation; team.parentId = opts.parentId; }
  if (opts.builder) team.constructorTeam = true;
  if (opts.partner) team.partner = opts.partner;
  world.teams.push(team);
  initTeamOrg(world, team, rng.fork('org'), year);
  if (opts.staff) Object.assign(team.staff, opts.staff);
  if (opts.owner) team.owner = { ...team.owner, ...opts.owner };
  if (opts.facilities) Object.assign(team.facilities, opts.facilities);
  if (opts.prestige !== undefined) team.prestige = Math.max(team.prestige, opts.prestige);
  if (opts.fans !== undefined) team.fans = Math.max(team.fans, opts.fans);
  if (opts.twoCars) team.twoCars = true;
  syncEntries(world, team, rng);
  if (world.regs.entries.partial >= 1 && wealth > 0.3 && rng.chance(0.35)) addEntry(world, team, 'partial', rng);
  return team;
}

// National racing colours of the early years, then whatever the sponsors paint.
const NATIONAL = {
  FR: ['#1a3d8f', '#f2f2f2'], IT: ['#b3141c', '#f2f2f2'], DE: ['#aeb4bd', '#222222'], GB: ['#0f5a38', '#e8d44a'], US: ['#1e4fa8', '#e8e8e8'],
  BE: ['#e8c71a', '#111111'], NL: ['#f26b1d', '#1e3f8a'], CH: ['#c8102e', '#f2f2f2'], SE: ['#1b5aa6', '#f2c200'], AT: ['#c8102e', '#f2f2f2'],
  AU: ['#0b7a3b', '#f4c20d'], JP: ['#c8102e', '#f2f2f2'], KR: ['#003478', '#f2f2f2'], ES: ['#c8102e', '#f4c20d'], AR: ['#74acdf', '#f2f2f2'],
  BR: ['#0b7a3b', '#f4c20d'], CA: ['#c8102e', '#f2f2f2'],
  IE: ['#169b62', '#ff883e'], PT: ['#006600', '#ff0000'], FI: ['#f2f2f2', '#003580'], DK: ['#c8102e', '#f2f2f2'], NO: ['#ba0c2f', '#00205b'],
  PL: ['#f2f2f2', '#dc143c'], MX: ['#006847', '#ce1126'], CO: ['#fcd116', '#003893'], ZA: ['#007a4d', '#ffb612'], NZ: ['#101820', '#c8c8c8'],
  IN: ['#ff9933', '#138808'], CN: ['#de2910', '#ffde00'],
};
const PAINTS = [['#d62828', '#f7f7f7'], ['#1d3557', '#f1c453'], ['#2a9d8f', '#264653'], ['#f77f00', '#1b1b1b'], ['#6a4c93', '#f2e9e4'], ['#0b6e4f', '#f2c14e'], ['#e63946', '#1d3557'], ['#118ab2', '#ffd166'], ['#7b2cbf', '#f3f3f3'], ['#222222', '#f4c20d'], ['#ef476f', '#073b4c'], ['#8ac926', '#222222']];
export function makeLivery(rng, nat, year) {
  if (year < 1968 || rng.chance(0.25)) return (NATIONAL[nat] || NATIONAL.GB).slice();
  return rng.pick(PAINTS).slice();
}

// Brings a closed team back under new investors, keeping its record and facilities.
export function activateTeam(world, team, year) {
  const rng = makeRng(world.seed, 'revive', team.id, year);
  team.active = true; team.endedYear = null; team.closed = null;
  team.owner = null;
  initTeamOrg(world, team, rng.fork('org'), year);
  team.finance.cash = Math.round(budgetBase(year) * 0.4);
  team.wealth = Math.max(team.wealth, 0.3);
  team.brandId = pickSupplier(world, rng.fork('supplier'), team.brandId);
  syncEntries(world, team, rng.fork('entries'));
  return team;
}

// ---------------------------------------------------------------- creation

export function createWorld({ seed, year = 1919, governor = 'traditionalist', mode = 'auto' } = {}) {
  seed = seed === undefined || seed === null || seed === '' ? 'default' : String(seed);

  const world = {
    format: 'msc-world',
    version: SAVE_VERSION,
    seed,
    startYear: year,
    year,
    regs: defaultRegs(year),
    tyres: [],
    oils: [],
    programmes: [],
    brands: [],
    teams: [],
    entries: [],
    drivers: [],
    season: null,
    history: { seasons: [] },
    chronicle: [],
    cohortThrough: PARAMS.world.birthStart - 1,
    counters: { entry: 0, driver: 0, team: 0, series: 0, lowTeam: 0, decision: 0 },
    meta: { createdAt: 0, name: 'Series ' + seed },
    epoch: 0,
    series: [], lowTeams: [], grass: {},
    governor: { personality: governor, mode, manual: {} },
    inbox: [], decisions: [], phase: 'season',
    titleSponsor: null,
    academies: {},
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
  for (const b of brandsAtStart(year)) {
    const o = newBrandObject(b, makeRng(seed, 'brand', b.id), year);
    if (b.engineOnly) o.sellsCustomers = true;
    world.brands.push(o);
  }
  initCorp(world, year);
  ensureOils(world, year);

  ensureCohorts(world, year + 16);

  // works teams: random but leaning to the stronger brands
  {
    const rng = makeRng(seed, 'world', 'teams');
    const pool = world.brands.filter((b) => !engineOnlyAt(b.id, year));
    const chosen = [];
    const target = Math.min(worksTargetFor(year), pool.length);
    while (chosen.length < target) {
      const b = rng.weighted(pool, (x) => x.strength + 0.25);
      chosen.push(b);
      pool.splice(pool.indexOf(b), 1);
    }
    chosen.sort((a, b) => b.strength - a.strength);
    chosen.slice(0, 3).forEach((b) => { b.sellsCustomers = true; });
    for (const b of chosen) activateWorks(world, b, rng.fork('works', b.id), year);
    // makers that only build engines: the strongest two already supply the grid
    world.brands.filter((b) => engineOnlyAt(b.id, year)).sort((a, b) => b.strength - a.strength || a.id.localeCompare(b.id)).slice(0, 2).forEach((b) => { b.status = 'racing'; });
    for (let i = 0; i < privTargetFor(year); i++) addPrivateerTeam(world, rng.fork('priv', i), year);
    // two privateers also run a part-season second car, as in the original grid
    let given = 0;
    for (const t of world.teams.filter((x) => x.kind === 'privateer')) {
      if (given >= 2) break;
      if (!world.entries.some((e) => e.teamId === t.id && e.type === 'partial')) { addEntry(world, t, 'partial', rng.fork('part', t.id)); given++; }
    }
  }

  world.regs.overridden = {};
  assignDrivers(world, makeRng(seed, 'world', 'grid'));
  assignTyres(world, makeRng(seed, 'world', 'tyre-assign'), year);
  assignOil(world, makeRng(seed, 'world', 'oil-assign'), year);
  buildAllCars(world, makeRng(seed, 'world', 'cars', year));
  initTiers(world, year, makeRng(seed, 'world', 'tiers'));
  startSeason(world);
  startTierSeasons(world, year);
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
    signContract(world, e, remaining[idx], world.year, rng.fork('contract', e.id));
    remaining.splice(idx, 1);
  }
}

// Which brand-like object a team's car is built from this year. Under strict chassis
// rules a privateer is a constructor: its own chassis (from its people and factory)
// with a bought engine. A team founded as a constructor, or one running an engine-only
// maker's engine, always builds its own chassis. A preferred partner of the engine maker
// gets works-specification engines and the best fit; other customers get a little less.
function carBrandFor(world, team, brandIn) {
  const brand = effectiveBrand(world, brandIn);
  const builder = team.kind !== 'works' && (team.constructorTeam || engineOnlyAt(brand.id, world.year) || world.regs.chassisSupply === 'strict');
  if (!builder) return { b: brand, customer: team.kind !== 'works' };
  const ts = clamp(0.22 + team.wealth * 0.3 + (team.staff.techDirector.rating - 50) / 220 + (avgFac(team) - 40) / 280, 0.2, 0.9);
  const rel = clamp(brand.reliability * 0.5 + ts * 0.5, 0.15, 0.95);
  const pref = team.partner && team.partner.preferred && team.partner.brandId === brand.id;
  const eng = clamp(brand.engineStrength + (pref ? 0.025 : -0.015), 0.1, 0.97);
  return { b: { id: brand.id, chassisStrength: ts, engineStrength: eng, reliability: rel }, customer: false, constructor: true, preferred: !!pref };
}

export function buildAllCars(world, rng) {
  const year = world.year;
  const shares = adoptionShares(world, year);
  const items = [];
  for (const e of activeEntries(world)) {
    const team = teamById(world, e.teamId);
    const brand = brandById(world, team.brandId);
    const { b, customer, constructor, preferred } = carBrandFor(world, team, brand);
    team.builder = !!constructor;
    const ids = usableTechs(world, team, year);
    const bonus = techBonus(ids, shares);
    // the oil deal: a better supplier is worth a little power and a little reliability
    const oil = team.oilId ? world.oils.find((o) => o.id === team.oilId) : null;
    if (oil) { bonus.power += (oil.power - 50) * 0.05; bonus.rel += (oil.rel - 50) * 0.06; }
    items.push({ e, team, b, customer, ids, bonus, preferred });
  }
  // centre the technology bonus on the grid, so only the differences matter
  const keys = ['handling', 'brakes', 'power', 'rel', 'weight'];
  const mean = {};
  for (const k of keys) mean[k] = items.length ? items.reduce((a, it) => a + it.bonus[k], 0) / items.length : 0;
  for (const it of items) for (const k of keys) it.bonus[k] -= mean[k];

  for (const it of items) {
    const { e, team, b, customer, ids, bonus, preferred } = it;
    const r = rng.fork('entry', e.id);
    const fresh = buildCar(r, { brand: b, staff: team.staff, customer, year, bonus, facilities: avgFac(team), techs: ids });
    if (preferred) fresh.fit = Math.min(94, fresh.fit + 6);
    const prev = e.car;
    const redesign = !prev || prev.epoch !== world.epoch || (year - prev.designYear) >= (team.cycle || 4) || (prev.techs && ids.some((id) => prev.techs.indexOf(id) < 0 && ['monocoque', 'rearEngine', 'carbonFibre', 'groundEffect'].indexOf(id) >= 0));
    const devGain = (team.finance ? team.finance.devPower : 1) * (team.staff.techDirector.rating / 100) * 1.1;
    const car = evolveCar(prev, fresh, { newDesign: redesign, devGain, rng: r.fork('evolve') });
    car.epoch = world.epoch;
    car.techs = ids;
    e.car = car;
  }
}

// Tyre contracts follow the rule in force: exclusive deals, a tyre war with a free
// choice each year, a single supplier, or a two-supplier war.
export function assignTyres(world, rng, year) {
  const makers = world.tyres.slice();
  if (!makers.length) return;
  const rule = world.regs.tyreRule;
  const score = (m) => m.grip * 0.35 + m.durability * 0.25 + m.puncture * 0.2 + m.wet * 0.2;
  const ranked = makers.slice().sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id));
  const teams = world.teams.filter((t) => t.active).sort((a, b) => a.id - b.id);
  if (rule === 'single supplier') {
    let id = world.tyreSole && world.tyreSole.until >= year ? world.tyreSole.id : null;
    if (!id || !makers.some((m) => m.id === id)) {
      const m = rng.fork('sole').weighted(ranked.slice(0, 3), (x) => score(x));
      id = m.id; world.tyreSole = { id, until: year + rng.fork('sole-len').int(3, 8) };
      logEvent(world, year, 'tyres', `${m.name} becomes the sole tyre supplier.`);
    }
    for (const t of teams) t.tyreId = id;
  } else if (rule === 'two-supplier war') {
    const two = ranked.slice(0, 2).map((m) => m.id);
    for (const t of teams) if (two.indexOf(t.tyreId) < 0 || rng.fork('two', t.id).chance(0.12)) t.tyreId = rng.fork('two2', t.id).pick(two);
  } else if (rule === 'tyre war') {
    for (const t of teams) {
      const r = rng.fork('war', t.id);
      if (!makers.some((m) => m.id === t.tyreId) || r.chance(0.3)) t.tyreId = r.weighted(makers, (m) => score(m)).id;
    }
  } else {
    // exclusive contracts: stay with the maker unless it has gone
    for (const t of teams) {
      const r = rng.fork('excl', t.id);
      if (!makers.some((m) => m.id === t.tyreId) || r.chance(0.06)) t.tyreId = r.weighted(makers, (m) => score(m)).id;
    }
  }
}

// ---------------------------------------------------------------- oil and fuel suppliers

// Suppliers appear in the year their real company starts supplying (never before 1960).
export function ensureOils(world, year) {
  world.oils = world.oils || [];
  for (const o of oilsOpenIn(year)) {
    if (world.oils.some((x) => x.id === o.id)) continue;
    const r = makeRng(world.seed, 'oil', o.id);
    world.oils.push({ id: o.id, power: Math.round(clamp(r.gauss(50, 8), 32, 70)), rel: Math.round(clamp(r.gauss(50, 8), 32, 70)), since: year });
    if (year > OIL_FROM && o.from === year) logEvent(world, year, 'oil', `${oilNameOf(o, year)} begins supplying teams.`);
  }
  // a supplier whose real company has stopped leaves
  world.oils = world.oils.filter((x) => { const d = OILS.find((o) => o.id === x.id); return !d || year <= d.to; });
}
const oilNameOf = (o, year) => { let n = o.name; for (const [from, name] of (o.names || [])) if (year >= from) n = name; return n; };

export function developOils(world, year, rng) {
  for (const o of world.oils) {
    const r = rng.fork(o.id);
    o.power = Math.round(clamp(o.power + r.gauss(0.2, 2.4), 25, 85));
    o.rel = Math.round(clamp(o.rel + r.gauss(0.2, 2.4), 25, 85));
  }
}

// Every team has an oil deal of one to four years from 1960. Suppliers favour their home
// region and strongest products; no supplier takes more than about a quarter of the grid.
export function assignOil(world, rng, year) {
  if (year < OIL_FROM || !world.oils.length) { for (const t of world.teams) if (year < OIL_FROM) t.oilId = null; return; }
  const open = new Set(world.oils.map((o) => o.id));
  const teams = world.teams.filter((t) => t.active).sort((a, b) => a.id - b.id);
  const cap = Math.max(2, Math.ceil(teams.length * 0.28));
  const load = {};
  for (const t of teams) if (t.oilId && open.has(t.oilId) && (t.oilUntil || 0) >= year) load[t.oilId] = (load[t.oilId] || 0) + 1;
  for (const t of teams) {
    if (t.oilId && open.has(t.oilId) && (t.oilUntil || 0) >= year) continue;
    const r = rng.fork('t', t.id);
    const stay = t.oilId && open.has(t.oilId) && r.chance(0.55) && (load[t.oilId] || 0) < cap;
    if (stay) { t.oilUntil = year + r.int(0, 3); load[t.oilId] = (load[t.oilId] || 0) + 1; continue; }
    const pool = world.oils.filter((o) => (load[o.id] || 0) < cap);
    const pick = r.weighted(pool.length ? pool : world.oils, (o) => {
      const d = OILS.find((x) => x.id === o.id);
      let w = 10 + (o.power + o.rel) / 4 + d.size * 12;
      if (d.home === t.region) w *= 2.4;
      if (d.country === t.nat) w *= 1.6;
      if (t.oilId === o.id) w *= 0.3;
      return w;
    });
    t.oilId = pick.id; t.oilUntil = year + r.int(0, 3);
    load[pick.id] = (load[pick.id] || 0) + 1;
  }
}

// Tyre makers develop; in a war they push harder.
export function developTyres(world, year, rng) {
  const war = world.regs.tyreRule === 'tyre war' || world.regs.tyreRule === 'two-supplier war';
  for (const m of world.tyres) {
    const r = rng.fork(m.id);
    m.engineer = m.engineer || { name: 'Unknown', rating: 50 };
    for (const k of ['grip', 'durability', 'puncture', 'wet']) m[k] = Math.round(clamp(m[k] + r.gauss(war ? 0.8 : 0, 3), 25, 85));
  }
  for (const t of TYRE_MAKERS) {
    if (t.founded === year && !world.tyres.some((m) => m.id === t.id)) {
      const r = rng.fork('new', t.id);
      world.tyres.push({ id: t.id, name: t.name, country: t.country, grip: Math.round(clamp(r.gauss(52, 8), 35, 72)), durability: Math.round(clamp(r.gauss(52, 8), 35, 72)), puncture: Math.round(clamp(r.gauss(50, 9), 30, 72)), wet: Math.round(clamp(r.gauss(45, 9), 25, 65)) });
      logEvent(world, year, 'tyres', `${t.name} enters the tyre business.`);
    }
  }
}

// ---------------------------------------------------------------- regulations and calendar

// A new era resets the regulations to its defaults unless someone has edited them.
export function applyEraRegs(world, year) {
  const era = eraFor(year);
  if (world.regs.touched || world.regs.eraFrom === era.from) return false;
  const fresh = defaultRegs(year);
  world.regs = { ...fresh, exemptTop: world.regs.exemptTop, raceKm: world.regs.raceKm, minLaps: world.regs.minLaps };
  world.epoch = (world.epoch || 0) + 1;
  logEvent(world, year, 'regs', `Regulation reset for the ${era.name} era: top ${fresh.scoring.length} score, grid of ${fresh.gridCap}, ${fresh.rounds} rounds; chassis supply ${fresh.chassisSupply}.`);
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
  // endurance rounds: the longest venues on the calendar
  const endN = Math.max(0, Math.min(world.regs.endurance ? world.regs.endurance.events : 0, calendar.length - 3));
  const byLen = calendar.map((id, i) => ({ i, len: TRACK_BY_ID[id].lengthKm })).sort((a, b) => b.len - a.len || a.i - b.i).slice(0, endN).map((x) => x.i).sort((a, b) => a - b);
  world.season = {
    year: world.year,
    round: 0,
    calendar,
    endurance: byLen,
    partialPlan,
    standings: { entries: {}, drivers: {}, brands: {} },
    results: [],
    done: false,
  };
  return world.season;
}

export { statsAt };
