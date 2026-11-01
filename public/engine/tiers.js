// The ladder below the global championship: local racing scenes, continental series,
// feeder series, local development series and the global junior series, with the
// grassroots pipeline underneath and academies running through it. Every race uses the
// same lap-by-lap engine as Tier 1, at lighter fidelity (shorter distance, quiet mode).
// Lower-tier seasons run in step with the Tier 1 season, so any series can be opened
// and its next round watched.

import { makeRng, clamp, round1 } from './rng.js';
import { PARAMS as P } from './params.js';
import { makeTeamName, nationalityWeights } from './names.js';
import { TRACKS, trackAt, tracksOpenIn } from './data/tracks.js';
import { REGIONS, CONTINENTS, regionOf, continentOf, continentName, regionName } from './data/regions.js';
import { KINDS, tierOf, growth, TIER_SPEED } from './data/ladder.js';
import { scoringFor } from './data/eras.js';
import { statsAt, overallAt, peakOverall } from './drivers.js';
import { buildCar } from './car.js';
import { raceGenerator, simulateRace, qualifyingTime, baseLapSeconds } from './race.js';

const LOWER_POINTS = [10, 6, 4, 3, 2, 1];
const MINI = (v) => Math.round(v * 1000) / 1000;

// ---------------------------------------------------------------- lookups

export const seriesById = (world, id) => world.series.find((s) => s.id === id);
export const lowTeamById = (world, id) => world.lowTeams.find((t) => t.id === id);
export const activeSeries = (world) => world.series.filter((s) => s.active);

export function seriesTier(s, year) { return tierOf(s.kind, year); }

// ---------------------------------------------------------------- scouting

// What a scout thinks of a driver: current form and an imperfect read of potential.
// The read sharpens as results accumulate.
export function scoutEstimate(world, d, year) {
  const r = makeRng(world.seed, 'scout', d.id, year);
  const sigma = Math.max(1.5, 10 - (d.starts || 0) / 14 - (d.rep || 0) / 14);
  return overallAt(d, year) * 0.5 + peakOverall(d) * 0.5 + r.gauss(0, sigma);
}

// ---------------------------------------------------------------- series and teams

function lowTeamName(world, rng, nat) {
  const names = new Set(world.teams.map((t) => t.name));
  for (const t of world.lowTeams) names.add(t.name);
  return makeTeamName(rng, nat, names);
}

function pickNat(region, year, rng) {
  const w = nationalityWeights(year).filter((x) => regionOf(x.n) === region);
  return w.length ? rng.weighted(w, (x) => x.w).n : rng.weighted(nationalityWeights(year), (x) => x.w).n;
}

export function addLowTeam(world, rng, region, year, tier, strengthMean) {
  const nat = pickNat(region, year, rng);
  const strength = clamp(rng.gauss(strengthMean, 0.11), 0.12, 0.85);
  const t = {
    id: ++world.counters.lowTeam, name: lowTeamName(world, rng, nat), nat, region,
    strength: MINI(strength), wealth: MINI(clamp(rng.gauss(0.25 + tier * 0.02, 0.1), 0.05, 0.8)),
    founded: year, ended: null, brandId: null, prestige: 5, titles: 0, wins: 0, groupTeamId: null,
  };
  world.lowTeams.push(t);
  return t;
}

function brandForCars(world, rng) {
  const racing = world.brands.filter((b) => b.status !== 'defunct' && b.sellsCustomers);
  return racing.length ? rng.pick(racing).id : null;
}

export function createSeries(world, kind, where, year, rng) {
  const g = growth(kind, year);
  const tier = tierOf(kind, year);
  const region = where.region || null;
  const continent = where.continent || (region ? continentOf(region) : null);
  const name = kind === 'scene' ? `${regionName(region)} local racing`
    : kind === 'continental' ? `${continentName(continent)} Championship${where.rival ? ' (rival series)' : ''}`
    : kind === 'feeder' ? `${continentName(continent)} Feeder Series`
    : kind === 'localDev' ? `${regionName(region)} Development Series`
    : kind === 'globalJunior' ? 'Global Junior Series' : 'Global Junior Trophy';
  const s = {
    id: ++world.counters.series, kind, name, continent, region, founded: year, active: true, endedYear: null, mergedInto: null,
    rival: !!where.rival, owner: kind === 'globalJunior' || kind === 'lowerJunior' ? 'governing body' : 'independent',
    teamIds: [], grid: g.grid, rounds: g.rounds, prestige: kind === 'scene' ? 5 : 20, fans: 10,
    history: [], cur: null, names: [name], sanctioned: false, score: 0,
  };
  world.series.push(s);
  fillSeriesTeams(world, s, year, rng.fork('teams'));
  return s;
}

function fillSeriesTeams(world, s, year, rng) {
  const want = Math.ceil(s.grid / 2);
  s.teamIds = s.teamIds.filter((id) => { const t = lowTeamById(world, id); return t && !t.ended; });
  const tier = seriesTier(s, year);
  const mean = 0.62 - 0.06 * (tier - 2);
  const regions = s.region ? [s.region] : REGIONS.filter((r) => !s.continent || r.continent === s.continent).map((r) => r.id);
  while (s.teamIds.length < want) {
    // sometimes an existing team from another series also runs here (teams run in several tiers)
    const spare = world.lowTeams.filter((t) => !t.ended && regions.indexOf(t.region) >= 0 && s.teamIds.indexOf(t.id) < 0 && t.strength > mean - 0.1 && t.strength < mean + 0.18);
    if (spare.length && rng.chance(0.3)) { s.teamIds.push(rng.pick(spare).id); continue; }
    const t = addLowTeam(world, rng.fork('t', world.counters.lowTeam), rng.pick(regions), year, tier, mean);
    t.brandId = brandForCars(world, rng.fork('b', t.id));
    s.teamIds.push(t.id);
  }
}

// the three scenes that exist in 1919: where the venues are
export function initTiers(world, year, rng) {
  for (const reg of ['WEU', 'CEU', 'NAM']) createSeries(world, 'scene', { region: reg }, year, rng.fork('scene', reg));
}

// A save from before the ladder existed gets the series its year would have: scenes
// before the war, continental, development and feeder series afterwards.
export function bootstrapTiers(world, year) {
  const rng = makeRng(world.seed, 'boot-tiers', year);
  const open = tracksOpenIn(year);
  if (year < 1946) { for (const reg of ['WEU', 'CEU', 'NAM']) createSeries(world, 'scene', { region: reg }, year, rng.fork('scene', reg)); return; }
  for (const c of CONTINENTS) {
    if (!open.some((t) => continentOf(regionOf(t.country)) === c.id)) continue;
    createSeries(world, 'continental', { continent: c.id }, year, rng.fork('c', c.id));
    if (year >= 1950) createSeries(world, 'feeder', { continent: c.id }, year, rng.fork('f', c.id));
  }
  for (const r of REGIONS) if (open.some((t) => regionOf(t.country) === r.id)) createSeries(world, 'localDev', { region: r.id }, year, rng.fork('l', r.id));
  if (year >= 1990) createSeries(world, 'globalJunior', {}, year, rng.fork('g'));
  if (year >= 2010) createSeries(world, 'lowerJunior', {}, year, rng.fork('lg'));
}

// ---------------------------------------------------------------- yearly: teams, series, grassroots

function lightStaff(s) {
  const r = Math.round(30 + s * 45);
  const m = { rating: r };
  return { principal: m, techDirector: m, raceEngineer: m, chiefMechanic: m };
}

export function tierCalendar(world, s, year, rng) {
  let open = tracksOpenIn(year);
  if (s.region) open = open.filter((t) => regionOf(t.country) === s.region);
  else if (s.continent) open = open.filter((t) => continentOf(regionOf(t.country)) === s.continent);
  if (!open.length) open = tracksOpenIn(year);
  const n = Math.max(2, Math.min(s.rounds, year >= 2020 ? s.rounds : s.rounds));
  const ids = rng.shuffle(open.map((t) => t.id));
  const cal = [];
  for (let i = 0; i < n; i++) cal.push(ids[i % ids.length]);
  return cal;
}

export function startTierSeasons(world, year) {
  const rng = makeRng(world.seed, 'tier-start', year);
  for (const s of activeSeries(world)) {
    const r = rng.fork(s.id);
    const g = growth(s.kind, year);
    s.grid = g.grid; s.rounds = g.rounds;
    fillSeriesTeams(world, s, year, r.fork('fill'));
    const teams = s.teamIds.map((id) => lowTeamById(world, id)).sort((a, b) => b.strength - a.strength || a.id - b.id);
    const entries = [];
    let n = 0;
    for (const t of teams) {
      for (let k = 0; k < 2 && entries.length < s.grid; k++) entries.push({ id: ++n, number: 0, teamId: t.id, driverId: null });
    }
    const nums = r.fork('nums').shuffle(Array.from({ length: 99 }, (_, i) => i + 1));
    entries.forEach((e, i) => { e.number = nums[i % nums.length]; });
    s.cur = {
      year, round: 0, calendar: tierCalendar(world, s, year, r.fork('cal')), entries,
      standings: { drivers: {}, teams: {} }, results: [], done: false,
    };
  }
  assignLowerDrivers(world, year, rng.fork('assign'));
}

const MIN_AGE = { scene: 16, continental: 18, feeder: 16, localDev: 16, globalJunior: 16, lowerJunior: 16 };

export function assignLowerDrivers(world, year, rng) {
  const t1 = new Set();
  for (const e of world.entries) if (e.active && e.driverId != null) t1.add(e.driverId);
  const pool = [];
  for (const d of world.drivers) {
    if (d.status !== 'active') continue;
    const age = year - d.birthYear;
    if (age < 16 || age > 44 || t1.has(d.id)) continue;
    pool.push({ d, age, est: scoutEstimate(world, d, year) + (d.rep || 0) * 0.2 });
  }
  pool.sort((a, b) => b.est - a.est || a.d.id - b.d.id);
  for (const p of pool) { p.d.tier = 0; p.d.seriesId = null; }
  for (const d of world.drivers) if (t1.has(d.id)) { d.tier = 1; d.seriesId = null; }
  const taken = new Set();
  let start = 0;
  const order = activeSeries(world).filter((s) => s.cur).sort((a, b) => seriesTier(a, year) - seriesTier(b, year) || a.id - b.id);
  for (const s of order) {
    const minAge = MIN_AGE[s.kind];
    const tier = seriesTier(s, year);
    const jr = rng.fork(s.id);
    for (const e of s.cur.entries) {
      while (start < pool.length && taken.has(pool[start].d.id)) start++;
      let best = null, bestScore = -1e9, seen = 0;
      const team = lowTeamById(world, e.teamId);
      for (let i = start; i < pool.length && seen < 45; i++) {
        const p = pool[i];
        if (taken.has(p.d.id) || p.age < minAge) continue;
        seen++;
        let sc = p.est;
        const reg = regionOf(p.d.nat);
        if (s.region && reg === s.region) sc += 10;
        else if (s.continent && continentOf(reg) === s.continent) sc += 5;
        // a tier's seats go to people roughly at its level, so a ladder forms
        sc -= Math.abs(p.est - (66 - tier * 4)) * 0.35;
        if (p.d.academy && team && team.groupTeamId === p.d.academy) sc += 12;
        sc += jr.fork(p.d.id).gauss(0, 3);
        if (sc > bestScore) { bestScore = sc; best = p; }
      }
      if (!best) { e.driverId = null; continue; }
      taken.add(best.d.id);
      e.driverId = best.d.id;
      best.d.tier = tier; best.d.seriesId = s.id;
    }
    s.cur.entries = s.cur.entries.filter((e) => e.driverId !== null);
  }
}

// ---------------------------------------------------------------- racing

function carFor(world, s, team, year, tier, slot) {
  const rng = makeRng(world.seed, 'tier-car', s.id, year, team.id, slot);
  const st = team.strength;
  const brand = { id: team.brandId || 'none', chassisStrength: st, engineStrength: clamp(st + rng.gauss(0, 0.05), 0.1, 0.9), reliability: clamp(st - 0.05, 0.1, 0.9) };
  return buildCar(rng, { brand, staff: lightStaff(st), customer: tier >= 4, year, techs: [], facilities: 35 });
}

function trackFor(world, s, year, round) {
  const id = s.cur.calendar[round];
  return trackAt(TRACKS.find((t) => t.id === id), year);
}

export function tierRegs(world, s, year) {
  const g = growth(s.kind, year);
  const scoring = s.kind === 'scene' ? KINDS.scene.scoring : s.kind === 'continental' || s.kind === 'globalJunior' ? scoringFor(year).table.slice(0, Math.min(10, scoringFor(year).table.length)) : LOWER_POINTS;
  return { scoring, raceKm: g.km, minLaps: 4, entries: world.regs.entries, safetyCar: world.regs.safetyCar };
}

export function prepareTierRound(world, s) {
  const c = s.cur;
  const year = c.year, round = c.round;
  const track = trackFor(world, s, year, round);
  const tier = seriesTier(s, year);
  const regs = tierRegs(world, s, year);
  const laps = Math.max(track.minLaps || 4, Math.round(regs.raceKm / track.lengthKm));
  const rngV = makeRng(world.seed, 'tier-visit', s.id, year, round);
  const slotCount = {};
  const starters = [];
  for (const e of c.entries) {
    const d = world.drivers.find((x) => x.id === e.driverId);
    if (!d) continue;
    const team = lowTeamById(world, e.teamId);
    const slot = (slotCount[team.id] = (slotCount[team.id] || 0) + 1);
    const car = carFor(world, s, team, year, tier, slot);
    const t = team.strength;
    starters.push({
      entryId: e.id, number: e.number, teamId: team.id, brandId: team.brandId || 'none', driverId: d.id, driverName: d.name,
      stats: statsAt(d, year), style: d.style, car,
      tyre: { grip: Math.round(38 + t * 24), durability: Math.round(40 + t * 20), puncture: Math.round(38 + t * 22), wet: Math.round(36 + t * 20) },
      staff: lightStaff(t), control: 'principal',
    });
  }
  // local scenes sometimes see a visiting star driver in a works car
  if (s.kind === 'scene' && rngV.chance(0.3)) {
    const cand = world.entries.filter((e) => e.active && e.driverId != null && e.car).map((e) => ({ e, d: world.drivers.find((x) => x.id === e.driverId) })).filter((x) => x.d && regionOf(x.d.nat) === s.region);
    if (cand.length) {
      const v = rngV.pick(cand);
      starters.push({
        entryId: 900, number: 99, teamId: v.e.teamId, brandId: v.e.car.brandId, driverId: v.d.id, driverName: v.d.name + ' (visiting)',
        stats: statsAt(v.d, year), style: v.d.style, car: v.e.car,
        tyre: { grip: 55, durability: 55, puncture: 55, wet: 50 },
        staff: lightStaff(0.7), control: 'principal', visitor: true,
      });
    }
  }
  const rq = makeRng(world.seed, 'tier-qual', s.id, year, round);
  starters.forEach((st) => { st.q = qualifyingTime(st, track, year, rq.fork(st.entryId), P.qual.noise, 0); });
  starters.sort((a, b) => a.q - b.q || a.entryId - b.entryId);
  const setup = {
    seed: `${world.seed}/${s.id}`, year, round, track, laps, totalKm: laps * track.lengthKm, regs,
    starters, speedMult: TIER_SPEED(tier) * KINDS[s.kind].speed, relMult: KINDS[s.kind].rel, quiet: false,
  };
  return { setup, tier };
}

function blank() { return { pts: 0, wins: 0, podiums: 0, starts: 0 }; }

export function applyTierRound(world, s, prep, result) {
  const c = s.cur;
  const st = c.standings;
  const notable = KINDS[s.kind].notable;
  for (const row of result.classification) {
    if (row.entryId === 900) continue; // visitors do not score
    for (const [map, id] of [[st.drivers, row.driverId], [st.teams, row.teamId]]) {
      if (!map[id]) map[id] = blank();
      map[id].starts++;
      if (row.points) map[id].pts += row.points;
      if (row.pos === 1) map[id].wins++;
      if (row.pos && row.pos <= 3) map[id].podiums++;
    }
  }
  // race summary at the fidelity the tier deserves
  const rows = result.classification.map((r) => ({ pos: r.pos, driverId: r.driverId, teamId: r.teamId, number: r.number, status: r.status, laps: r.laps, time: r.time, points: r.points, grid: r.grid, reason: r.reason }));
  c.results.push({
    round: c.round, trackId: result.trackId, laps: result.laps, distanceKm: result.distanceKm, rain: result.rain,
    starters: result.starters, finishers: result.finishers, fastest: result.fastest,
    classification: notable ? rows : rows.filter((r) => r.pos && r.pos <= 10),
    events: notable ? result.events.filter((e) => e.kind === 'out' || e.kind === 'repair').slice(0, 30) : [],
  });
  c.round++;
  if (c.round >= c.calendar.length) c.done = true;
}

export function runTierRound(world, s, quiet = true) {
  const prep = prepareTierRound(world, s);
  prep.setup.quiet = quiet;
  const result = simulateRace(prep.setup);
  applyTierRound(world, s, prep, result);
  return result;
}

// After each Tier 1 round, lower series catch up to the same share of their season.
export function tiersAfterRound(world) {
  const t1 = world.season;
  const total = t1.calendar.length;
  const done = t1.round;
  for (const s of activeSeries(world)) {
    const c = s.cur;
    if (!c || c.done) continue;
    const due = t1.done ? c.calendar.length : Math.ceil((done / total) * c.calendar.length);
    while (!c.done && c.round < due) runTierRound(world, s);
  }
}

// ---------------------------------------------------------------- archive and churn

function sortStandings(map) {
  return Object.entries(map).map(([id, v]) => ({ id: +id, ...v })).sort((a, b) => b.pts - a.pts || b.wins - a.wins || a.id - b.id);
}
export const tierStandings = (s) => ({ drivers: sortStandings(s.cur.standings.drivers), teams: sortStandings(s.cur.standings.teams) });

export function endTierSeasons(world, year, rng) {
  const notes = [];
  for (const s of activeSeries(world)) {
    const c = s.cur;
    if (!c) continue;
    while (!c.done) runTierRound(world, s);
    const st = tierStandings(s);
    const champ = st.drivers[0] ? world.drivers.find((d) => d.id === st.drivers[0].id) : null;
    const champTeam = st.teams[0] ? lowTeamById(world, st.teams[0].id) : null;
    const tier = seriesTier(s, year);
    s.history.push({
      year, tier, champion: champ ? { id: champ.id, name: champ.name, pts: st.drivers[0].pts, wins: st.drivers[0].wins } : null,
      team: champTeam ? { id: champTeam.id, name: champTeam.name } : null,
      standings: st.drivers.slice(0, 10), teams: st.teams.slice(0, 8),
      races: c.results.map((r) => ({
        round: r.round, trackId: r.trackId, laps: r.laps, starters: r.starters, finishers: r.finishers, rain: r.rain, fastest: r.fastest,
        top: r.classification.filter((x) => x.pos && x.pos <= 3), full: KINDS[s.kind].notable ? r.classification : undefined,
      })),
    });
    if (s.history.length > 60) s.history.shift();
    for (const h of s.history) if (h.year < year - 12) for (const rc of h.races) if (rc.full) rc.full = undefined;
    // careers and reputations
    for (const row of st.drivers) {
      const d = world.drivers.find((x) => x.id === row.id);
      if (!d) continue;
      const pos = st.drivers.indexOf(row) + 1;
      d.career = d.career || [];
      d.career.push({ y: year, s: s.id, tier, pos, pts: row.pts, w: row.wins });
      if (d.career.length > 40) d.career.shift();
      d.rep = clamp((d.rep || 0) * 0.85 + (pos === 1 ? 22 : pos <= 3 ? 10 : pos <= 6 ? 4 : 0) + row.wins * 1.5 + (4 - tier) * 0, 0, 100);
      d.starts = (d.starts || 0) + row.starts;
    }
    if (champTeam) { champTeam.titles++; }
    for (const r of st.teams) { const t = lowTeamById(world, r.id); if (t) { t.wins += r.wins; t.prestige = Math.round(clamp(t.prestige * 0.8 + (r.pts / Math.max(1, st.teams[0].pts)) * 25, 1, 100)); } }
    s.prestige = Math.round(clamp(s.prestige * 0.9 + 4 + s.teamIds.length * 0.3, 1, 100));
    s.fans = Math.round(clamp(s.fans * 0.92 + 5 + (champ ? 1 : 0), 1, 100));
    if (champ && (tier <= 3)) notes.push({ series: s, champ, tier });
    c.last = { year };
    c.entries = []; c.results = []; c.standings = { drivers: {}, teams: {} }; c.round = 0; c.done = true;
  }
  void rng;
  return notes;
}

// teams come and go; strengths move
function churnLowTeams(world, year, rng) {
  for (const t of world.lowTeams.filter((x) => !x.ended).sort((a, b) => a.id - b.id)) {
    const r = rng.fork('lt', t.id);
    t.strength = MINI(clamp(t.strength + r.gauss(0, 0.03) + (t.prestige - 30) * 0.0005 + (t.ambition ? 0.008 : 0), 0.1, 0.9));
    let p = 0.05 + (t.wealth < 0.15 ? 0.06 : 0) + (t.prestige < 8 ? 0.03 : 0);
    if (year - t.founded > 20) p *= 0.5;
    if (t.ambition) p *= 0.25;
    if (r.next() < p) { t.ended = year; }
  }
}

// yearly grassroots: club racing and karting surface named standouts
function grassroots(world, year, rng) {
  const out = {};
  for (const reg of REGIONS) {
    const kids = world.drivers.filter((d) => d.status === 'active' && year - d.birthYear >= 10 && year - d.birthYear <= 17 && regionOf(d.nat) === reg.id);
    kids.sort((a, b) => (peakOverall(b) + rng.fork('g', b.id).gauss(0, 6)) - (peakOverall(a) + rng.fork('g', a.id).gauss(0, 6)) || a.id - b.id);
    const kind = year >= 1955 ? 'karting' : 'club racing';
    out[reg.id] = kids.slice(0, 3).map((d) => ({ driverId: d.id, kind, age: year - d.birthYear }));
  }
  world.grass[year] = out;
  const keep = Object.keys(world.grass).map(Number).sort((a, b) => a - b);
  while (keep.length > 8) delete world.grass[keep.shift()];
}

// academies: groups sign promising teenagers and fund them up the ladder
function academies(world, year, rng) {
  const cap = world.regs.academyCap || { group: 4, global: 40 };
  if (year < 1950) return;
  const groups = world.teams.filter((t) => t.active && (t.kind === 'works' || t.legacy.legendary || t.wealth > 0.6) && t.wealth > 0.5).sort((a, b) => a.id - b.id);
  let total = 0;
  for (const d of world.drivers) if (d.academy) total++;
  for (const t of groups) {
    const key = t.groupId || 't' + t.id;
    const mine = world.drivers.filter((d) => d.academy === t.id && d.status === 'active');
    for (const d of mine) if (year - d.birthYear > 24) d.academy = null;
    const room = Math.min(cap.group - mine.length, cap.global - total, 2);
    if (room <= 0) continue;
    const prospects = world.drivers.filter((d) => d.status === 'active' && !d.academy && year - d.birthYear >= 14 && year - d.birthYear <= 17)
      .map((d) => ({ d, est: scoutEstimate(world, d, year) })).sort((a, b) => b.est - a.est || a.d.id - b.d.id);
    const r = rng.fork(key);
    for (let i = 0; i < room && i < prospects.length; i++) {
      if (!r.chance(0.6)) continue;
      prospects[i].d.academy = t.id; total++;
    }
  }
  // academy drivers learn a little faster with the group's backing
}

// the ladder grows: which series to found, merge or close
function seriesPlan(world, year, rng, gov, propose) {
  const has = (kind, key) => world.series.some((s) => s.active && s.kind === kind && (s.continent === key || s.region === key));
  const bias = Math.round((0.5 - gov.growth) * 10) + rng.fork('bias').int(-2, 3);
  const guide = (k) => KINDS[k].guide + bias;
  const wars = year > 1946;
  // continental series grow out of the local scenes
  if (wars) for (const c of CONTINENTS) {
    if (year >= guide('continental') && !has('continental', c.id)) {
      const scenes = world.series.filter((s) => s.active && s.kind === 'scene' && s.continent === c.id);
      const regionsOpen = REGIONS.filter((r) => r.continent === c.id && tracksOpenIn(year).some((t) => regionOf(t.country) === r.id)).length;
      if ((scenes.length && scenes.some((s) => s.prestige >= 14 || year - s.founded >= 8)) || (!scenes.length && regionsOpen && year >= 1960)) propose('series', { act: 'found', kind: 'continental', continent: c.id }, `Found the ${continentName(c.id)} Championship`, `Local racing in ${continentName(c.id)} has grown enough to form a continental series, the new Tier 2.`);
    }
  }
  for (const r of REGIONS) {
    if (year >= guide('localDev') && wars && !has('localDev', r.id) && has('continental', r.continent) && tracksOpenIn(year).some((t) => regionOf(t.country) === r.id)) {
      propose('series', { act: 'found', kind: 'localDev', region: r.id }, `Found the ${regionName(r.id)} Development Series`, 'A local development series for young drivers and small teams.');
    }
    // regions without their own scene yet
    if (!world.series.some((s) => s.active && (s.region === r.id || (s.continent === r.continent && s.kind === 'continental'))) && tracksOpenIn(year).some((t) => regionOf(t.country) === r.id) && year >= 1925 && rng.fork('newscene', r.id).chance(0.08)) {
      propose('series', { act: 'found', kind: 'scene', region: r.id }, `Recognise local racing in ${regionName(r.id)}`, 'Enough events and teams now cluster in the region.');
    }
  }
  for (const c of CONTINENTS) {
    if (year >= guide('feeder') && has('continental', c.id) && !has('feeder', c.id)) {
      const cs = world.series.find((s) => s.active && s.kind === 'continental' && s.continent === c.id);
      if (cs && year - cs.founded >= 3) propose('series', { act: 'found', kind: 'feeder', continent: c.id }, `Found the ${continentName(c.id)} Feeder Series`, 'A feeder series below the continental championship (the new Tier 3).');
    }
    // a rival continental series
    const conts = world.series.filter((s) => s.active && s.kind === 'continental' && s.continent === c.id);
    if (conts.length === 1 && year - conts[0].founded >= 6 && year < 2010 && rng.fork('rival', c.id).chance(0.025)) {
      propose('series', { act: 'found', kind: 'continental', continent: c.id, rival: true }, `A rival ${continentName(c.id)} series is proposed`, 'Promoters propose a second continental championship in the same continent.');
    }
    if (conts.length >= 2) {
      const strong = conts.slice().sort((a, b) => (b.prestige + b.teamIds.length) - (a.prestige + a.teamIds.length));
      const w = strong[0], l = strong[1];
      l.weakYears = ((w.prestige + w.teamIds.length) > (l.prestige + l.teamIds.length) * 1.5) ? (l.weakYears || 0) + 1 : 0;
      if (l.weakYears >= 4) mergeSeries(world, w, l, year);
    }
  }
  if (year >= guide('globalJunior') && !world.series.some((s) => s.active && s.kind === 'globalJunior') && world.series.filter((s) => s.active && s.kind === 'continental').length >= 2) {
    propose('series', { act: 'found', kind: 'globalJunior' }, 'Found the Global Junior Series', 'A global junior series, owned by the governing body, as the direct feeder into Tier 1.');
  }
  if (year >= guide('lowerJunior') && !world.series.some((s) => s.active && s.kind === 'lowerJunior') && world.series.some((s) => s.active && s.kind === 'globalJunior')) {
    propose('series', { act: 'found', kind: 'lowerJunior' }, 'Found the Global Junior Trophy', 'A lower-level global junior series, the new Tier 4.');
  }
}

function mergeSeries(world, winner, loser, year) {
  loser.active = false; loser.endedYear = year; loser.mergedInto = winner.id;
  winner.history = [...loser.history.map((h) => ({ ...h, from: loser.name })), ...winner.history].sort((a, b) => a.year - b.year);
  for (const id of loser.teamIds) if (winner.teamIds.indexOf(id) < 0) winner.teamIds.push(id);
  winner.prestige = Math.round(Math.max(winner.prestige, loser.prestige * 0.8));
  if (winner.names.indexOf(winner.name) < 0) winner.names.push(winner.name);
  const old = winner.name;
  if (!winner.rival) winner.name = old; // the name may change in some mergers
  world.chronicle.push({ year, kind: 'series', text: `${loser.name} is absorbed by ${winner.name}; its history carries over.` });
}

// the governor's approval executes here
export function foundSeries(world, payload, year, rng) {
  const s = createSeries(world, payload.kind, payload, year, rng);
  if (payload.kind === 'continental' && !payload.rival) {
    // the local scenes it grew out of are absorbed
    for (const sc of world.series.filter((x) => x.active && x.kind === 'scene' && x.continent === payload.continent)) {
      sc.active = false; sc.endedYear = year; sc.mergedInto = s.id;
      s.history.push(...sc.history.map((h) => ({ ...h, from: sc.name })));
      for (const id of sc.teamIds) if (s.teamIds.indexOf(id) < 0) s.teamIds.push(id);
      s.prestige = Math.max(s.prestige, sc.prestige);
    }
    s.history.sort((a, b) => a.year - b.year);
  }
  world.chronicle.push({ year, kind: 'series', text: `${s.name} is founded${payload.rival ? ' as a rival' : ''} (Tier ${seriesTier(s, year)}).` });
  return s;
}

// ---------------------------------------------------------------- the yearly pass

export function tiersTransition(world, year, rng, gov, propose) {
  churnLowTeams(world, year, rng.fork('churn'));
  for (const s of activeSeries(world)) {
    s.teamIds = s.teamIds.filter((id) => { const t = lowTeamById(world, id); return t && !t.ended; });
    if (s.kind === 'scene') s.score = (s.score || 0) + s.teamIds.length * 0.4;
  }
  grassroots(world, year, rng.fork('grass'));
  academies(world, year, rng.fork('academy'));
  seriesPlan(world, year, rng.fork('plan'), gov, propose);
  // strong continental teams apply for a Tier 1 entry (they pay, and pre-qualify); a team founded
  // by a champion reaches for the top from any series as soon as it is good enough
  const asked = new Set(world.inbox.filter((i) => i.status === 'pending' && i.kind === 'entry-team').map((i) => i.payload.lowTeamId));
  for (const s of activeSeries(world)) {
    for (const id of s.teamIds) {
      const t = lowTeamById(world, id);
      if (!t || t.ended || asked.has(t.id)) continue;
      const amb = !!t.ambition;
      if (!amb && (s.kind !== 'continental' || year < 1950)) continue;
      if (t.strength < (amb ? 0.5 : 0.62) || t.wealth < (amb ? 0.28 : 0.35) || t.prestige < (amb ? 14 : 25)) continue;
      if (amb && year - t.founded < 2) continue;
      if (rng.fork('apply', t.id).chance(amb ? 0.3 : 0.05)) {
        asked.add(t.id);
        propose('entry-team', { lowTeamId: t.id }, `${t.name} applies for a Tier 1 entry`, `${t.name} (${regionName(t.region)})${t.founder ? ', founded by ' + t.founder.name + ',' : ''} has the money and results to try for a Tier 1 entry through pre-qualifying.`);
      }
    }
  }
}

export function tierSummary(world, year) {
  return activeSeries(world).map((s) => ({ id: s.id, name: s.name, kind: s.kind, tier: seriesTier(s, year) })).sort((a, b) => a.tier - b.tier || a.id - b.id);
}

export { round1, baseLapSeconds, raceGenerator };
