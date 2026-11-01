// Records and legacies, computed from the history the world already keeps.
// Pure functions of the world: nothing here changes the simulation.

import { driverById, teamById, brandById } from './world.js';

function seasons(world) { return world.history.seasons.filter((h) => !h.cancelled && !h.empty && h.champion); }

// title counts by driver / team / maker, with the years
export function titleTables(world) {
  const dr = {}, tm = {}, br = {};
  for (const h of seasons(world)) {
    if (h.champion) (dr[h.champion.id] = dr[h.champion.id] || []).push(h.year);
    if (h.championTeam) (tm[h.championTeam.id] = tm[h.championTeam.id] || []).push(h.year);
    if (h.championBrand) (br[h.championBrand.id] = br[h.championBrand.id] || []).push(h.year);
  }
  const rows = (m) => Object.entries(m).map(([id, years]) => ({ id: isNaN(+id) ? id : +id, years, n: years.length })).sort((a, b) => b.n - a.n || a.years[0] - b.years[0]);
  return { drivers: rows(dr), teams: rows(tm), brands: rows(br) };
}

// the points a champion needed, season by season, against the points on offer
export function pointsToWin(h) {
  if (!h.champion) return null;
  const max = h.maxPoints || null;
  return { pts: h.champion.pts, max, share: max ? h.champion.pts / max : null, margin: h.champion.margin === undefined ? null : h.champion.margin };
}

// single-season and career bests
export function recordBook(world) {
  const hs = seasons(world);
  let mostWins = null, mostPts = null, bigMargin = null, longestStreak = null, closest = null;
  let run = null;
  for (const h of hs) {
    const c = h.champion;
    if (c.wins !== undefined && (!mostWins || c.wins > mostWins.n)) mostWins = { n: c.wins, id: c.id, year: h.year };
    if (!mostPts || c.pts > mostPts.n) mostPts = { n: c.pts, id: c.id, year: h.year };
    if (c.margin !== undefined && c.margin !== null) {
      if (!bigMargin || c.margin > bigMargin.n) bigMargin = { n: c.margin, id: c.id, year: h.year };
      if (c.margin >= 0 && (!closest || c.margin < closest.n)) closest = { n: c.margin, id: c.id, year: h.year };
    }
    if (run && run.id === c.id) run.n++; else run = { id: c.id, n: 1, from: h.year };
    if (!longestStreak || run.n > longestStreak.n) longestStreak = { ...run };
  }
  const careerWins = world.drivers.filter((d) => d.wins > 0).sort((a, b) => b.wins - a.wins).slice(0, 10).map((d) => ({ id: d.id, n: d.wins }));
  const careerStarts = world.drivers.filter((d) => d.starts > 0).sort((a, b) => b.starts - a.starts).slice(0, 10).map((d) => ({ id: d.id, n: d.starts }));
  const teamWins = world.teams.filter((t) => t.wins > 0).sort((a, b) => b.wins - a.wins).slice(0, 10).map((t) => ({ id: t.id, n: t.wins }));
  const brandWins = world.brands.filter((b) => b.wins > 0).sort((a, b) => b.wins - a.wins).slice(0, 10).map((b) => ({ id: b.id, n: b.wins }));
  return { mostWins, mostPts, bigMargin, closest, longestStreak, careerWins, careerStarts, teamWins, brandWins };
}

// who has won at a venue
export function trackHistory(world, trackId) {
  const out = [];
  for (const h of world.history.seasons) {
    for (const r of h.results || []) {
      if (r.trackId !== trackId) continue;
      const w = (r.classification || []).find((x) => x.pos === 1);
      if (w) out.push({ year: h.year, round: r.round, driverId: w.driverId, teamId: w.teamId, brandId: w.brandId });
    }
  }
  return out;
}

// a driver's seasons in the top series, from the season records
export function driverSeasons(world, driverId) {
  const out = [];
  for (const h of seasons(world)) {
    const f = h.final && h.final.drivers.find((r) => r.id === driverId);
    if (f) out.push({ year: h.year, pos: h.final.drivers.indexOf(f) + 1, pts: f.pts, wins: f.wins, podiums: f.podiums, poles: f.poles, champion: h.champion.id === driverId });
  }
  return out;
}

// the teams a driver has raced for, from team histories
export function driverTeams(world, driverId) {
  const out = [];
  for (const t of world.teams) {
    const yrs = (t.history || []).filter((h) => (h.entries || []).some((e) => e.driverId === driverId));
    if (yrs.length) out.push({ teamId: t.id, from: yrs[0].year, to: yrs[yrs.length - 1].year, seasons: yrs.length });
  }
  return out.sort((a, b) => a.from - b.from);
}

// drivers who shared a team the longest with this team
export function teamDriverTenure(world, team) {
  const m = {};
  for (const h of team.history || []) for (const e of h.entries || []) if (e.driverId != null) {
    const r = (m[e.driverId] = m[e.driverId] || { driverId: e.driverId, seasons: 0, first: h.year, last: h.year });
    r.seasons++; r.last = h.year;
  }
  return Object.values(m).sort((a, b) => b.seasons - a.seasons || a.first - b.first);
}

// rivalries: pairs of drivers who finished 1-2 in the championship more than once
export function rivalries(world) {
  const m = {};
  for (const h of seasons(world)) {
    const d = h.final && h.final.drivers;
    if (!d || d.length < 2) continue;
    const k = [d[0].id, d[1].id].sort((a, b) => a - b).join('-');
    (m[k] = m[k] || []).push(h.year);
  }
  return Object.entries(m).filter(([, y]) => y.length >= 2).map(([k, years]) => ({ a: +k.split('-')[0], b: +k.split('-')[1], years })).sort((x, y) => y.years.length - x.years.length).slice(0, 10);
}
export { driverById, teamById, brandById };
