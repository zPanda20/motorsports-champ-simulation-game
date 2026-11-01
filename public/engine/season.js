// Seasons: attendance, pre-qualifying, qualifying, the race, standings, rollover.

import { makeRng, clamp } from './rng.js';
import { PARAMS as P } from './params.js';
import { TRACK_BY_ID } from './data/tracks.js';
import { statsAt, STAT_KEYS, retirementChance, overallAt, peakOverall } from './drivers.js';
import { qualifyingTime, raceGenerator, simulateRace, lapsFor } from './race.js';
import {
  startSeason, entryById, driverById, teamById, brandById, tyreById, activeDrivers, buildAllCars,
} from './world.js';

// ---- standings ----

function blank() { return { pts: 0, wins: 0, places: [], starts: 0 }; }

function sortStandings(map) {
  return Object.entries(map)
    .map(([id, v]) => ({ id: isNaN(+id) ? id : +id, ...v }))
    .sort((a, b) => b.pts - a.pts || b.wins - a.wins || compareCountback(a.places, b.places) || String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
}

// places is [wins, seconds, thirds, ...] counts; more of the better places wins.
function compareCountback(a, b) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i] || 0, y = b[i] || 0;
    if (x !== y) return y - x;
  }
  return 0;
}

export function entryStandings(world) { return sortStandings(world.season.standings.entries); }
export function driverStandings(world) { return sortStandings(world.season.standings.drivers); }
export function brandStandings(world) { return sortStandings(world.season.standings.brands); }

// ---- preparing a round ----

function starterFor(world, entry, year) {
  const team = teamById(world, entry.teamId);
  const driver = driverById(world, entry.driverId);
  const tyre = tyreById(world, team.tyreId);
  return {
    entryId: entry.id, number: entry.number, teamId: team.id, brandId: team.brandId, driverId: driver.id,
    driverName: driver.name,
    stats: statsAt(driver, year), style: driver.style,
    car: entry.car, tyre, staff: team.staff, control: team.control,
  };
}

export function attendingEntries(world) {
  const s = world.season;
  return world.entries.filter((e) => {
    if (e.driverId == null) return false;
    if (e.type === 'full') return true;
    return (s.partialPlan[e.id] || []).indexOf(s.round) >= 0;
  });
}

// The full pre-race process for the next round. Returns everything the race needs.
export function prepareRound(world) {
  const s = world.season;
  const year = world.year;
  const round = s.round;
  const track = TRACK_BY_ID[s.calendar[round]];
  const laps = lapsFor(track, world.regs);
  const seed = world.seed;

  const attending = attendingEntries(world);
  const standing = entryStandings(world);
  const exemptIds = new Set();
  if (round > 0) {
    const ranked = standing.filter((r) => {
      const e = entryById(world, r.id);
      return e && e.type === 'full' && attending.indexOf(e) >= 0;
    });
    for (const r of ranked.slice(0, world.regs.exemptTop)) exemptIds.add(r.id);
  }
  const exempt = attending.filter((e) => exemptIds.has(e.id));
  const trying = attending.filter((e) => !exemptIds.has(e.id));
  const slots = Math.max(0, world.regs.gridCap - exempt.length);

  const rngPre = makeRng(seed, 'race', year, round, 'prequal');
  const pre = trying.map((e) => {
    const st = starterFor(world, e, year);
    return { entryId: e.id, time: qualifyingTime(st, track, year, rngPre.fork(e.id), P.prequal.noise, 0) };
  }).sort((a, b) => a.time - b.time || a.entryId - b.entryId);
  const through = pre.slice(0, slots).map((r) => r.entryId);
  const failed = pre.slice(slots).map((r) => r.entryId);

  const startEntries = [...exempt.map((e) => e.id), ...through].map((id) => entryById(world, id));
  const rngQ = makeRng(seed, 'race', year, round, 'qual');
  const qual = startEntries.map((e) => {
    const st = starterFor(world, e, year);
    return { st, time: qualifyingTime(st, track, year, rngQ.fork(e.id), P.qual.noise, 0) };
  }).sort((a, b) => a.time - b.time || a.st.entryId - b.st.entryId);

  const setup = {
    seed, year, round, track, laps, totalKm: laps * track.lengthKm, regs: world.regs,
    starters: qual.map((q) => q.st),
  };
  return {
    setup,
    prequal: { exempt: exempt.map((e) => e.id), tried: pre.map((r) => ({ entryId: r.entryId, time: Math.round(r.time * 10) / 10, through: through.indexOf(r.entryId) >= 0 })), failed, slots },
    qualifying: qual.map((q, i) => ({ pos: i + 1, entryId: q.st.entryId, time: Math.round(q.time * 10) / 10 })),
  };
}

// ---- applying a result ----

export function applyRoundResult(world, prep, result) {
  const s = world.season;
  const st = s.standings;
  const regsScoring = world.regs.scoring;
  for (const row of result.classification) {
    const e = entryById(world, row.entryId);
    const d = driverById(world, row.driverId);
    const brand = brandById(world, row.brandId);
    for (const [map, id] of [[st.entries, row.entryId], [st.drivers, row.driverId], [st.brands, row.brandId]]) {
      if (!map[id]) map[id] = blank();
      map[id].starts++;
      if (row.points) {
        map[id].pts += row.points;
      }
      if (row.pos && row.pos <= regsScoring.length) {
        while (map[id].places.length < regsScoring.length) map[id].places.push(0);
        map[id].places[row.pos - 1] += 1;
        if (row.pos === 1) map[id].wins++;
      }
    }
    d.starts++;
    if (row.pos === 1) { d.wins++; brand.wins++; teamById(world, row.teamId).wins++; }
    void e;
  }

  // in-season development: technical director plus driver Feedback, capped
  for (const e of world.entries) {
    if (e.driverId == null) continue;
    const team = teamById(world, e.teamId);
    const d = driverById(world, e.driverId);
    const fb = statsAt(d, world.year).feedback;
    const gain = P.dev.perRound * (team.staff.techDirector.rating / 100) * (0.6 + 0.8 * fb / 100);
    e.car.dev = Math.min(P.dev.cap, e.car.dev + gain);
  }

  const summary = {
    round: result.round, trackId: result.trackId, laps: result.laps, distanceKm: result.distanceKm, rain: result.rain,
    starters: result.starters, finishers: result.finishers, winnerEntryId: result.winnerEntryId, winnerTime: result.winnerTime,
    fastest: result.fastest,
    prequal: { exempt: prep.prequal.exempt, failed: prep.prequal.failed, slots: prep.prequal.slots },
    qualifying: prep.qualifying,
    classification: result.classification,
    events: result.events,
    lapOrders: result.laps_order,
  };
  s.results.push(summary);
  s.round++;
  if (s.round >= s.calendar.length) s.done = true;
  return summary;
}

export function runRound(world) {
  const prep = prepareRound(world);
  const result = simulateRace(prep.setup);
  const summary = applyRoundResult(world, prep, result);
  return { prep, result, summary };
}

export function runSeason(world) {
  const out = [];
  while (!world.season.done) out.push(runRound(world));
  return out;
}

// ---- year rollover ----

export function endSeason(world) {
  const s = world.season;
  const ds = driverStandings(world);
  const es = entryStandings(world);
  const bs = brandStandings(world);
  const champ = ds[0] ? driverById(world, ds[0].id) : null;
  if (champ) champ.titles++;
  const champBrand = bs[0] ? brandById(world, bs[0].id) : null;
  if (champBrand) champBrand.titles++;
  const champEntry = es[0] ? entryById(world, es[0].id) : null;
  if (champEntry) teamById(world, champEntry.teamId).titles++;
  const record = {
    year: s.year,
    calendar: s.calendar,
    champion: champ ? { id: champ.id, name: champ.name, pts: ds[0].pts } : null,
    championBrand: champBrand ? { id: champBrand.id, name: champBrand.name, pts: bs[0].pts } : null,
    drivers: ds.slice(0, 10).map((r) => ({ id: r.id, name: driverById(world, r.id).name, pts: r.pts, wins: r.wins })),
    entries: es.slice(0, 10).map((r) => ({ id: r.id, number: entryById(world, r.id).number, pts: r.pts })),
    winners: s.results.map((r) => r.winnerEntryId),
    finisherCounts: s.results.map((r) => r.finishers),
    results: s.results.map((r) => ({ round: r.round, trackId: r.trackId, winnerEntryId: r.winnerEntryId, starters: r.starters, finishers: r.finishers, classification: r.classification.slice(0, 10) })),
  };
  world.history.seasons.push(record);
  return record;
}

export function advanceYear(world) {
  if (!world.season.done) throw new Error('Season is not finished');
  const record = endSeason(world);
  const nextYear = world.year + 1;
  const rng = makeRng(world.seed, 'rollover', nextYear);

  // brands drift a little (emergent)
  for (const b of world.brands) {
    b.strength = clamp(Math.round((b.strength + rng.fork('b', b.id).gauss(0, 0.025)) * 1000) / 1000, 0.2, 0.95);
    b.chassisStrength = clamp(Math.round((b.chassisStrength + rng.fork('bc', b.id).gauss(0, 0.03)) * 1000) / 1000, 0.15, 0.97);
    b.engineStrength = clamp(Math.round((b.engineStrength + rng.fork('be', b.id).gauss(0, 0.03)) * 1000) / 1000, 0.15, 0.97);
    b.reliability = clamp(Math.round((b.reliability + rng.fork('br', b.id).gauss(0, 0.03)) * 1000) / 1000, 0.1, 0.97);
  }

  // retirements, then fill vacant seats from the free pool
  for (const d of world.drivers) {
    if (d.status !== 'active' || d.birthYear > world.year - P.world.startAge) continue;
    const p = retirementChance(d, nextYear);
    if (p > 0 && rng.fork('retire', d.id).next() < p) {
      d.status = 'retired';
      d.retiredYear = nextYear;
      for (const e of world.entries) if (e.driverId === d.id) e.driverId = null;
    }
  }
  world.year = nextYear;
  fillVacancies(world, rng.fork('hire'));
  buildAllCars(world, makeRng(world.seed, 'cars', nextYear));
  startSeason(world);
  return record;
}

function fillVacancies(world, rng) {
  const used = new Set(world.entries.map((e) => e.driverId).filter((x) => x != null));
  let pool = activeDrivers(world).filter((d) => !used.has(d.id) && world.year - d.birthYear <= 44);
  const scored = () => pool.map((d) => ({ d, s: overallAt(d, world.year) * 0.5 + peakOverall(d) * 0.5 + rng.gauss(0, 4) })).sort((a, b) => b.s - a.s);
  const vacant = world.entries.filter((e) => e.driverId == null);
  const teamRank = (e) => teamById(world, e.teamId).wealth;
  vacant.sort((a, b) => teamRank(b) - teamRank(a) || a.id - b.id);
  for (const e of vacant) {
    const ranked = scored();
    if (!ranked.length) break;
    const idx = Math.min(ranked.length - 1, Math.floor(Math.abs(rng.gauss(0, 3))));
    const d = ranked[idx].d;
    e.driverId = d.id;
    d.tier = 1;
    pool = pool.filter((x) => x.id !== d.id);
  }
}

export { raceGenerator, STAT_KEYS };
