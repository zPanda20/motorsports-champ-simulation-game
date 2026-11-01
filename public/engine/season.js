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
import { industryTransition, fillVacantSeats } from './industry.js';
import { tiersAfterRound, startTierSeasons, endTierSeasons } from './tiers.js';
import { settleAll, clearInbox, pendingItems } from './governor.js';
import { regionOf } from './data/regions.js';
import { teamSeason } from './org.js';

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
    noPoints: team.scope === 'local',
  };
}

export function attendingEntries(world) {
  const s = world.season;
  const trackCountry = TRACK_BY_ID[s.calendar[s.round]] ? TRACK_BY_ID[s.calendar[s.round]].country : null;
  const here = trackCountry ? regionOf(trackCountry) : null;
  return activeEntries(world).filter((e) => {
    if (e.driverId == null) return false;
    const tm = teamById(world, e.teamId);
    // local teams only race at nearby venues; global teams go everywhere
    if (tm.scope === 'local' && here && tm.region !== here) return false;
    if (e.type === 'full') return true;
    return (s.partialPlan[e.id] || []).indexOf(s.round) >= 0;
  });
}

export function currentTrack(world) {
  const s = world.season;
  return trackAt(TRACK_BY_ID[s.calendar[s.round]], world.year);
}

// The relief driver for an endurance round: a partial-entry driver of the same team, one
// of its academy drivers, or a one-off guest.
function reliefFor(world, st, used, rng) {
  const year = world.year;
  const mine = world.entries.filter((e) => e.active && e.teamId === st.teamId && e.type === 'partial' && e.driverId != null && !used.has(e.driverId));
  if (mine.length) return driverById(world, mine[0].driverId);
  const acad = world.drivers.find((d) => d.status === 'active' && d.academy === st.teamId && !used.has(d.id) && year - d.birthYear >= 18);
  if (acad) return acad;
  const guests = world.drivers.filter((d) => d.status === 'active' && year - d.birthYear >= 20 && year - d.birthYear <= 42 && d.tier >= 2 && d.tier !== null && !used.has(d.id)).sort((a, b) => a.id - b.id);
  return guests.length ? guests[rng.int(0, Math.min(guests.length, 30) - 1)] : null;
}

// The full pre-race process for the next round. Returns everything the race needs.
export function prepareRound(world) {
  const s = world.season;
  const year = world.year;
  const round = s.round;
  const track = currentTrack(world);
  const endurance = (s.endurance || []).indexOf(round) >= 0;
  const regsNow = endurance ? { ...world.regs, raceKm: world.regs.raceKm * 2.5 } : world.regs;
  const laps = lapsFor(track, regsNow);
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
  if (world.regs.preQual === false) exemptIds.clear();
  const exempt = attending.filter((e) => exemptIds.has(e.id));
  const trying = attending.filter((e) => !exemptIds.has(e.id));
  const slots = Math.max(0, world.regs.gridCap - exempt.length);
  const skipPre = world.regs.preQual === false;

  const rngPre = makeRng(seed, 'race', year, round, 'prequal');
  const pre = trying.map((e) => {
    const st = starterFor(world, e, year);
    return { entryId: e.id, time: qualifyingTime(st, track, year, rngPre.fork(e.id), P.prequal.noise, 0) };
  }).sort((a, b) => a.time - b.time || a.entryId - b.entryId);
  const through = skipPre ? pre.map((r) => r.entryId) : pre.slice(0, slots).map((r) => r.entryId);
  const failed = skipPre ? [] : pre.slice(slots).map((r) => r.entryId);

  const startEntries = [...exempt.map((e) => e.id), ...through].map((id) => entryById(world, id));
  const rngQ = makeRng(seed, 'race', year, round, 'qual');
  const qual = startEntries.map((e) => {
    const st = starterFor(world, e, year);
    return { st, time: qualifyingTime(st, track, year, rngQ.fork(e.id), P.qual.noise, 0) };
  }).sort((a, b) => a.time - b.time || a.st.entryId - b.st.entryId);

  let grid = qual.map((q) => q.st);
  let cutQual = [];
  if (skipPre && grid.length > world.regs.gridCap) { cutQual = grid.slice(world.regs.gridCap).map((x) => x.entryId); grid = grid.slice(0, world.regs.gridCap); }
  const setup = {
    seed, year, round, track, laps, totalKm: laps * track.lengthKm, regs: world.regs,
    starters: grid,
  };
  if (endurance) {
    setup.endurance = { multiplier: world.regs.endurance.multiplier };
    const used = new Set(grid.map((x) => x.driverId));
    for (const st of grid) {
      const rd = reliefFor(world, st, used, makeRng(seed, 'race', year, round, 'relief', st.entryId));
      if (rd) { used.add(rd.id); st.relief = { driverId: rd.id, driverName: rd.name, stats: statsAt(rd, year) }; }
    }
  }
  void cutQual;
  return {
    setup,
    endurance,
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
    if (row.reliefDriverId) {
      const rid = row.reliefDriverId;
      if (!st.drivers[rid]) st.drivers[rid] = blank();
      st.drivers[rid].starts++;
      if (row.points) st.drivers[rid].pts += Math.round(row.points * 0.5 * 10) / 10;
      if (row.pos === 1) st.drivers[rid].wins++;
    }
  }

  // in-season development: technical director plus driver Feedback, capped
  for (const e of activeEntries(world)) {
    if (e.driverId == null || !e.car) continue;
    const team = teamById(world, e.teamId);
    const d = driverById(world, e.driverId);
    const fb = statsAt(d, world.year).feedback;
    const gain = P.dev.perRound * (team.staff.techDirector.rating / 100) * (0.6 + 0.8 * fb / 100) * (team.finance ? team.finance.devPower : 1);
    e.car.dev = Math.min(P.dev.cap, e.car.dev + gain);
  }

  const summary = {
    round: result.round, trackId: result.trackId, laps: result.laps, distanceKm: result.distanceKm, lengthKm: result.lengthKm, rain: result.rain,
    starters: result.starters, finishers: result.finishers, winnerEntryId: result.winnerEntryId, winnerTime: result.winnerTime,
    fastest: result.fastest, endurance: !!prep.endurance,
    prequal: { exempt: prep.prequal.exempt, failed: prep.prequal.failed, slots: prep.prequal.slots },
    qualifying: prep.qualifying,
    classification: result.classification,
    events: result.events,
    lapOrders: result.laps_order,
  };
  s.results.push(summary);
  s.round++;
  if (s.round >= s.calendar.length) s.done = true;
  tiersAfterRound(world);
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

const slim = (rows, stats) => rows.map((r) => ({ id: r.id, pts: r.pts, wins: r.wins, podiums: stats && stats[r.id] ? stats[r.id].podiums : undefined, starts: stats && stats[r.id] ? stats[r.id].starts : undefined, poles: stats && stats[r.id] ? stats[r.id].poles : undefined }));

// drops empty fields from a result row to keep long saves small
function compact(row) {
  const o = {};
  for (const k of Object.keys(row)) { const v = row[k]; if (v !== null && v !== false && v !== undefined) o[k] = v; }
  return o;
}

// wins, podiums and poles per driver and per maker, from the season's race reports
export function seasonTallies(results) {
  const drivers = {}, brands = {};
  for (const r of results) {
    for (const row of r.classification) {
      const d = drivers[row.driverId] = drivers[row.driverId] || { podiums: 0, starts: 0, poles: 0 };
      const b = brands[row.brandId] = brands[row.brandId] || { podiums: 0, starts: 0, poles: 0 };
      d.starts++; b.starts++;
      if (row.pos && row.pos <= 3) { d.podiums++; b.podiums++; }
      if (row.grid === 1) { d.poles++; b.poles++; }
    }
  }
  return { drivers, brands };
}

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
  const tallies = seasonTallies(s.results);
  const available = s.results.reduce((a, r) => { const w = r.classification.find((x) => x.pos === 1); return a + (w ? w.points : 0); }, 0);
  const cs = champ ? tallies.drivers[champ.id] || { podiums: 0, starts: 0, poles: 0 } : null;

  // reputations and fans from the top flight
  for (const row of ds.slice(0, 10)) {
    const d = driverById(world, row.id);
    if (d) { d.rep = Math.min(100, (d.rep || 0) * 0.8 + (ds.indexOf(row) === 0 ? 30 : ds.indexOf(row) < 3 ? 15 : 6) + row.wins * 1.2); }
  }

  // the storylines that make a chronicle
  if (champ) {
    const margin = ds[1] ? ds[0].pts - ds[1].pts : ds[0].pts;
    const prior = world.history.seasons.filter((h) => h.champion && h.champion.id === champ.id).length;
    if (prior === 0) logEvent(world, s.year, 'event', `${champ.name} wins a first championship.`);
    else if (prior >= 2) logEvent(world, s.year, 'event', `${champ.name} wins a ${prior + 1}${['th', 'st', 'nd', 'rd'][(prior + 1) % 10 > 3 || ((prior + 1) % 100 > 10 && (prior + 1) % 100 < 14) ? 0 : (prior + 1) % 10]} title.`);
    if (ds[1] && margin <= Math.max(2, Math.round(world.regs.scoring[0] * 0.2))) logEvent(world, s.year, 'event', `A close title fight: ${champ.name} beats ${driverById(world, ds[1].id).name} by ${margin} point${margin === 1 ? '' : 's'}.`);
    if (cs && s.results.length && cs.wins === undefined && ds[0].wins >= Math.ceil(s.results.length * 0.7)) logEvent(world, s.year, 'event', `${champ.name} dominates the season with ${ds[0].wins} wins from ${s.results.length}.`);
  }
  for (const row of ds.slice(0, 20)) {
    const d = driverById(world, row.id);
    if (d && d.legend && !d.debutLogged) { d.debutLogged = true; logEvent(world, s.year, 'event', `Legend ${d.name} makes a first top-series appearance this year and finishes ${ds.indexOf(row) + 1}${['th', 'st', 'nd', 'rd'][ds.indexOf(row) + 1 > 3 ? 0 : ds.indexOf(row) + 1]}.`); }
    else if (d && !d.legend && d.starts <= 1 + (s.results.length) && row.wins > 0 && !d.debutLogged) { d.debutLogged = true; logEvent(world, s.year, 'event', `Rookie ${d.name} wins on debut season.`); }
  }
  world.history.seasons.push({
    year: s.year,
    calendar: s.calendar,
    scoring: world.regs.scoring.slice(),
    maxPoints: available,
    champion: champ ? { id: champ.id, name: champ.name, pts: ds[0].pts, wins: ds[0].wins, podiums: cs.podiums, poles: cs.poles, starts: cs.starts, margin: ds[1] ? ds[0].pts - ds[1].pts : ds[0].pts } : null,
    championBrand: champBrand ? { id: champBrand.id, name: champBrand.name, pts: bs[0].pts, wins: bs[0].wins } : null,
    championTeam: champEntry ? { id: champEntry.teamId, name: teamById(world, champEntry.teamId).name } : null,
    final: { drivers: slim(ds.slice(0, 20), tallies.drivers), entries: slim(es.slice(0, 30)), brands: slim(bs, tallies.brands) },
    // full race reports; the lap-by-lap order and overtake lines of past seasons are dropped to keep saves small
    results: s.results.map((r) => ({ ...r, lapOrders: undefined, classification: r.classification.map(compact), events: r.events.filter((e) => e.kind !== 'pass') })),
  });
  // old seasons keep the story but lose the small print
  for (const h of world.history.seasons) {
    if (h.year >= s.year - 15 || h.pruned || !h.results) continue;
    for (const r of h.results) r.events = (r.events || []).filter((e) => ['out', 'limp', 'safety', 'repair'].indexOf(e.kind) >= 0).slice(0, 12);
    h.pruned = true;
  }
  // very old seasons keep the story and the podium and points places, not the whole field
  for (const h of world.history.seasons) {
    if (h.year >= s.year - 30 || h.pruned2 || !h.results) continue;
    for (const r of h.results) {
      r.classification = (r.classification || []).slice(0, 12);
      r.qualifying = (r.qualifying || []).slice(0, 8);
      if (r.prequal) r.prequal = { exempt: r.prequal.exempt || [], failed: [], slots: r.prequal.slots };
      r.events = (r.events || []).slice(0, 6);
    }
    h.pruned2 = true;
  }
  for (const sr of world.series) for (const h of sr.history) {
    if (h.year < s.year - 6 && h.races && h.races.length) h.races = [];
    if (h.year < s.year - 20 && h.standings && h.standings.length > 5) { h.standings = h.standings.slice(0, 5); h.teams = (h.teams || []).slice(0, 3); }
  }

  // the lower tiers finish their seasons
  const notes = endTierSeasons(world, s.year, makeRng(world.seed, 'tier-end', s.year));
  for (const n of notes.filter((x) => x.tier <= 2)) logEvent(world, s.year, 'series', `${n.champ.name} wins the ${n.series.name}.`);

  // what the industry reads at the turn of the year
  const brandRank = {};
  bs.forEach((r, i) => { brandRank[r.id] = bs.length > 1 ? i / (bs.length - 1) : 0; });
  const teamRank = {};
  const tsr = teamSeason(world);
  const order = Object.keys(tsr).map(Number).sort((a, b) => tsr[b].pts - tsr[a].pts || tsr[b].wins - tsr[a].wins || a - b);
  order.forEach((id, i) => { teamRank[id] = order.length > 1 ? i / (order.length - 1) : 0; });
  for (const t of world.teams) if (t.active && teamRank[t.id] === undefined) teamRank[t.id] = 1;
  return { brandRank, teamRank, titleBrandId: champBrand ? champBrand.id : null };
}

// Starts the new season: seats filled, cars built, calendar chosen, lower tiers started.
export function beginSeason(world) {
  settleAll(world);
  clearInbox(world);
  fillVacantSeats(world, world.year);
  buildAllCars(world, makeRng(world.seed, 'cars', world.year));
  startSeason(world);
  startTierSeasons(world, world.year);
  world.phase = 'season';
}

// Closes the season and turns the year. In hands-on mode, decisions for the player wait in
// the inbox and the new season starts when they are settled (beginSeason).
export function advanceYear(world) {
  if (!world.season.done) throw new Error('Season is not finished');
  let last = endSeason(world);
  const record = world.history.seasons[world.history.seasons.length - 1];

  for (;;) {
    world.year++;
    const ev = industryTransition(world, world.year, last);
    if (!ev.cancel) break;
    settleAll(world);
    clearInbox(world);
    world.history.seasons.push({ year: world.year, cancelled: { name: ev.names.join(', ') }, champion: null, championBrand: null, final: null, results: [] });
    logEvent(world, world.year, 'event', 'No championship is held.');
    world.season.results = [];
    last = null;
  }
  if (pendingItems(world).length) { world.phase = 'offseason'; return record; }
  beginSeason(world);
  return record;
}

export { raceGenerator, STAT_KEYS, eventsFor };
