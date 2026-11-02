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

// a driver's seasons in the top series, from the season records, with the team (or teams) for each year
export function driverSeasons(world, driverId) {
  const out = [];
  for (const h of seasons(world)) {
    const f = h.final && h.final.drivers.find((r) => r.id === driverId);
    if (!f) continue;
    let teamIds = f.teamIds ? f.teamIds.map(Number) : f.teamId !== undefined && f.teamId !== null ? [+f.teamId] : [];
    if (!teamIds.length) { // older saves: read it from the team histories
      for (const t of world.teams) if ((t.history || []).some((x) => x.year === h.year && (x.entries || []).some((e) => e.driverId === driverId))) teamIds.push(t.id);
    }
    const main = f.teamId !== undefined && f.teamId !== null ? +f.teamId : teamIds[0];
    const names = teamIds.map((id) => { const r = (h.final.teams || []).find((x) => String(x.id) === String(id)); return r ? r.name : undefined; });
    out.push({ year: h.year, pos: h.final.drivers.indexOf(f) + 1, pts: f.pts, wins: f.wins, podiums: f.podiums, poles: f.poles, champion: h.champion.id === driverId, teamId: main === undefined ? null : main, teamIds, teamNames: names, brandId: f.brandId || null });
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

// Rivalries. A rivalry is two drivers who were both genuine title contenders in the same season, more than
// once. Each season they share is graded on how close they finished and how serious both were (a fight for
// third place does not count), and the rivalry is graded on all those seasons together: how intense each was
// and how many different seasons it ran.
const CONTENDER = 0.75;   // a contender is within a quarter of the leader's points
const LIVE = 0.25;        // a season counts towards the rivalry from this intensity up
export function seasonFight(a, b, leaderPts, aIsChamp, bIsChamp) {
  if (!leaderPts || leaderPts <= 0) return 0;
  const hi = Math.max(a, b), lo = Math.min(a, b);
  if (lo / leaderPts < CONTENDER) return 0;
  const gap = (hi - lo) / leaderPts;                                  // 0 = level on points
  const close = Math.max(0, 1 - gap / 0.25);                          // 1 level ... 0 a quarter apart
  const serious = Math.min(1, (lo / leaderPts - CONTENDER) / (1 - CONTENDER) * 1.5); // 0 just in range ... 1 at the front
  const x = close * (0.5 + 0.5 * serious) + (aIsChamp || bIsChamp ? 0.1 : 0);
  return Math.round(Math.min(1, x) * 100) / 100;
}
export const RIVALRY_GRADES = [[3.2, 'Legendary'], [2.0, 'Fierce'], [1.1, 'Heated'], [0, 'Simmering']];
export function rivalryGrade(score) { for (const [min, name] of RIVALRY_GRADES) if (score >= min) return name; return 'Simmering'; }

export function rivalries(world, limit = 12) {
  const m = {};
  for (const h of seasons(world)) {
    const d = h.final && h.final.drivers;
    if (!d || d.length < 2) continue;
    const lead = d[0].pts;
    const champ = h.champion.id;
    const field = d.filter((x) => lead > 0 && x.pts / lead >= CONTENDER).slice(0, 6);
    for (let i = 0; i < field.length; i++) {
      for (let j = i + 1; j < field.length; j++) {
        const A = field[i], B = field[j];
        const heat = seasonFight(A.pts, B.pts, lead, A.id === champ, B.id === champ);
        if (heat < LIVE) continue;
        const [x, y] = A.id < B.id ? [A, B] : [B, A];
        const k = x.id + '-' + y.id;
        (m[k] = m[k] || []).push({ year: h.year, aPts: x.pts, bPts: y.pts, gap: Math.abs(A.pts - B.pts), heat, champ: champ === x.id ? 'a' : champ === y.id ? 'b' : null,
          teammates: !!(A.teamId && A.teamId === B.teamId), rankA: d.indexOf(x) + 1, rankB: d.indexOf(y) + 1 });
      }
    }
  }
  return Object.entries(m).filter(([, ss]) => ss.length >= 2).map(([k, ss]) => {
    const score = Math.round(ss.reduce((a, s) => a + s.heat, 0) * 100) / 100;
    const years = ss.map((s) => s.year);
    const closest = ss.slice().sort((p, q) => p.gap - q.gap || p.year - q.year)[0];
    return {
      a: +k.split('-')[0], b: +k.split('-')[1], seasons: ss, years, score, grade: rivalryGrade(score),
      rating: Math.min(100, Math.round(score * 30)), titlesA: ss.filter((s) => s.champ === 'a').length, titlesB: ss.filter((s) => s.champ === 'b').length,
      from: years[0], to: years[years.length - 1], closest, teammates: ss.filter((s) => s.teammates).length,
    };
  }).sort((p, q) => q.score - p.score || q.seasons.length - p.seasons.length || p.from - q.from).slice(0, limit);
}
export { driverById, teamById, brandById };
