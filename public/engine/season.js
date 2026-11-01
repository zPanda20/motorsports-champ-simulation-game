// Seasons: attendance, pre-qualifying, qualifying, the race, standings, archive, rollover.

import { makeRng } from './rng.js';
import { PARAMS as P } from './params.js';
import { TRACK_BY_ID, trackAt } from './data/tracks.js';
import { eventsFor } from './data/events.js';
import { statsAt, STAT_KEYS } from './drivers.js';
import { qualifyingTime, raceGenerator, simulateRace, lapsFor } from './race.js';
import {
  startSeason, entryById, driverById, teamById, brandById, tyreById, activeEntries, buildAllCars, logEvent,
} from './world.js';
import { industryTransition } from './industry.js';

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
  return activeEntries(world).filter((e) => {
    if (e.driverId == null) return false;
    if (e.type === 'full') return true;
    return (s.partialPlan[e.id] || []).indexOf(s.round) >= 0;
  });
}

export function currentTrack(world) {
  const s = world.season;
  return trackAt(TRACK_BY_ID[s.calendar[s.round]], world.year);
}

// The full pre-race process for the next round. Returns everything the race needs.
export function prepareRound(world) {
  const s = world.season;
  const year = world.year;
  const round = s.round;
  const track = currentTrack(world);
  const laps = lapsFor(track, world.regs);
  const seed = world.seed;

  const attending = attendingEntries(world);
  const standing = entryStandings(world);
  const exemptIds = new Set();
  if (round > 0) {
    const ranked = standing.filter((r) => {
      const e = entryById(world, r.id);
      return e && e.active && e.type === 'full' && attending.indexOf(e) >= 0;
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
    const d = driverById(world, row.driverId);
    const brand = brandById(world, row.brandId);
    for (const [map, id] of [[st.entries, row.entryId], [st.drivers, row.driverId], [st.brands, row.brandId]]) {
      if (!map[id]) map[id] = blank();
      map[id].starts++;
      if (row.points) map[id].pts += row.points;
      if (row.pos && row.pos <= regsScoring.length) {
        while (map[id].places.length < regsScoring.length) map[id].places.push(0);
        map[id].places[row.pos - 1] += 1;
        if (row.pos === 1) map[id].wins++;
      }
    }
    d.starts++;
    if (row.pos === 1) { d.wins++; brand.wins++; teamById(world, row.teamId).wins++; }
  }

  // in-season development: technical director plus driver Feedback, capped
  for (const e of activeEntries(world)) {
    if (e.driverId == null || !e.car) continue;
    const team = teamById(world, e.teamId);
    const d = driverById(world, e.driverId);
    const fb = statsAt(d, world.year).feedback;
    const gain = P.dev.perRound * (team.staff.techDirector.rating / 100) * (0.6 + 0.8 * fb / 100);
    e.car.dev = Math.min(P.dev.cap, e.car.dev + gain);
  }

  const summary = {
    round: result.round, trackId: result.trackId, laps: result.laps, distanceKm: result.distanceKm, lengthKm: result.lengthKm, rain: result.rain,
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

// ---- archive and year rollover ----

const slim = (rows) => rows.map((r) => ({ id: r.id, pts: r.pts, wins: r.wins }));

// Files the finished season into history. Returns what the industry needs to know.
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

  world.history.seasons.push({
    year: s.year,
    calendar: s.calendar,
    champion: champ ? { id: champ.id, name: champ.name, pts: ds[0].pts } : null,
    championBrand: champBrand ? { id: champBrand.id, name: champBrand.name, pts: bs[0].pts } : null,
    championTeam: champEntry ? { id: champEntry.teamId, name: teamById(world, champEntry.teamId).name } : null,
    final: { drivers: slim(ds.slice(0, 20)), entries: slim(es.slice(0, 30)), brands: slim(bs) },
    // full race reports; the lap-by-lap order and overtake lines of past seasons are dropped to keep saves small
    results: s.results.map((r) => ({ ...r, lapOrders: undefined, events: r.events.filter((e) => e.kind !== 'pass') })),
  });

  // what the industry reads at the turn of the year
  const brandRank = {};
  bs.forEach((r, i) => { brandRank[r.id] = bs.length > 1 ? i / (bs.length - 1) : 0; });
  const teamRank = {};
  es.forEach((r, i) => {
    const e = entryById(world, r.id);
    if (e && teamRank[e.teamId] === undefined) teamRank[e.teamId] = es.length > 1 ? i / (es.length - 1) : 0;
  });
  return { brandRank, teamRank, titleBrandId: champBrand ? champBrand.id : null };
}

export function advanceYear(world) {
  if (!world.season.done) throw new Error('Season is not finished');
  let last = endSeason(world);
  const record = world.history.seasons[world.history.seasons.length - 1];

  for (;;) {
    world.year++;
    const ev = industryTransition(world, world.year, last);
    if (!ev.cancel) break;
    world.history.seasons.push({ year: world.year, cancelled: { name: ev.names.join(', ') }, champion: null, championBrand: null, final: null, results: [] });
    logEvent(world, world.year, 'event', 'No championship is held.');
    last = null;
  }
  buildAllCars(world, makeRng(world.seed, 'cars', world.year));
  startSeason(world);
  return record;
}

export { raceGenerator, STAT_KEYS, eventsFor };
