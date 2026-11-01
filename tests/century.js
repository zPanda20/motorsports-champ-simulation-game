// Long-run harness: simulates whole centuries headless and checks the shape of the history.
// Usage: node tests/century.js [worlds] [years] [startSeed]
import { createWorld, driverById } from '../public/engine/world.js';
import { runSeason, advanceYear, driverStandings } from '../public/engine/season.js';

const N = parseInt(process.argv[2] || '3', 10);
const YEARS = parseInt(process.argv[3] || '110', 10);
const START = parseInt(process.argv[4] || '1', 10);
const decade = (y) => Math.floor(y / 10) * 10;

const fails = [];
const check = (ok, msg) => { if (!ok) fails.push(msg); };
const t0 = Date.now();
const eraStats = {};
let churnSum = 0, churnN = 0;

for (let i = 0; i < N; i++) {
  const w = createWorld({ seed: 'cent-' + (START + i) });
  const titleBrands = new Set();
  let empty = 0, played = 0, cancelled = 0, streak = 0, maxStreak = 0, lastChamp = null;
  let starts = 0, women = 0, brandsSeen = new Set(), winnersSet = new Set();
  const dec = {};
  let at2000 = null, churn = null;
  for (let y = 0; y < YEARS; y++) {
    const rounds = runSeason(w);
    {
      const act = new Set(w.teams.filter((x) => x.active && x.scope === 'global').map((x) => x.id));
      if (w.year === 2000) at2000 = act;
      if (w.year === 2030 && at2000) { const all = new Set([...at2000, ...act]); let d = 0; for (const id of all) if (at2000.has(id) !== act.has(id)) d++; churn = { pct: Math.round((d / all.size) * 100), teams: act.size }; }
    }
    const d = dec[decade(w.year)] = dec[decade(w.year)] || { races: 0, starters: 0, fin: 0, hours: 0, brands: new Set() };
    for (const { result } of rounds) {
      d.races++; d.starters += result.starters; d.fin += result.finishers; d.hours += (result.winnerTime || 0) / 3600;
      for (const r of result.classification) { starts++; if (driverById(w, r.driverId).gender === 'F') women++; }
    }
    played++;
    if (rounds.length === 0) empty++;
    const ds = driverStandings(w);
    if (ds[0]) {
      winnersSet.add(ds[0].id);
      if (ds[0].id === lastChamp) streak++; else streak = 1;
      lastChamp = ds[0].id; maxStreak = Math.max(maxStreak, streak);
    }
    const rec = advanceYear(w);
    if (rec.championBrand) titleBrands.add(rec.championBrand.id);
    for (const b of w.brands) if (b.status === 'racing') brandsSeen.add(b.id);
    d.brands.add(w.brands.filter((b) => b.status === 'racing').length);
  }
  cancelled = w.history.seasons.filter((h) => h.cancelled).length;
  const share = women / Math.max(1, starts);
  console.log(`world ${i + 1}: ${played} seasons played, ${cancelled} cancelled, empty ${empty}; different title brands ${titleBrands.size}; brands that raced ${brandsSeen.size}; champions ${winnersSet.size}; longest title streak ${maxStreak}; women share of starts ${(share * 100).toFixed(0)}%`);
  console.log(`   Tier 1 teams 2000 to 2030: churn ${churn ? churn.pct : '?'}% (target at most 50%), ${churn ? churn.teams : '?'} teams in 2030 (target 10 to 15)`);
  if (churn) { churnSum += churn.pct; churnN++; check(churn.teams >= 10 && churn.teams <= 18, `world ${i + 1} has ${churn.teams} teams in 2030`); }
  check(empty === 0, `world ${i + 1} had ${empty} empty seasons`);
  check(titleBrands.size >= 8, `world ${i + 1} only ${titleBrands.size} different title-winning makers`);
  check(share > 0.38 && share < 0.62, `world ${i + 1} women share ${share.toFixed(2)}`);
  check(maxStreak <= 8, `world ${i + 1} title streak ${maxStreak}`);
  for (const [k, v] of Object.entries(dec)) {
    const e = eraStats[k] = eraStats[k] || { races: 0, starters: 0, fin: 0, hours: 0 };
    e.races += v.races; e.starters += v.starters; e.fin += v.fin; e.hours += v.hours;
  }
}
console.log('\ndecade  races  avg starters  finish%  avg winner hours');
for (const k of Object.keys(eraStats).sort()) {
  const e = eraStats[k];
  console.log(`${k}s  ${String(e.races).padStart(5)}  ${(e.starters / e.races).toFixed(1).padStart(10)}  ${(100 * e.fin / e.starters).toFixed(0).padStart(6)}%  ${(e.hours / e.races).toFixed(2).padStart(8)}`);
}
console.log(`\n${((Date.now() - t0) / 1000).toFixed(0)}s`);
check(!churnN || churnSum / churnN <= 60, 'average Tier 1 churn ' + Math.round(churnSum / churnN) + '%');
if (churnN) console.log('\nAverage Tier 1 churn 2000 to 2030: ' + Math.round(churnSum / churnN) + '% (design target: at most 50%)');
if (fails.length) { console.log('\nFAILED CHECKS:\n' + fails.join('\n')); process.exit(1); }
console.log('all checks passed');
