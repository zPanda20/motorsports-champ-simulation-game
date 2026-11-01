// Balance harness: runs many seeded 1919 seasons headless and checks the shape of
// the results against targets. Usage: node tests/balance.js [seasons] [startSeed]
//
// Targets (1919 era): heavy attrition (a minority of starters finish), almost every
// race still produces finishers, several different winners per season, and the
// better cars/drivers win more often without it being a foregone conclusion.

import { createWorld, entryById, driverById } from '../public/engine/world.js';
import { runSeason, driverStandings } from '../public/engine/season.js';
import { statsAt, STAT_KEYS } from '../public/engine/drivers.js';
import { COMPONENT_BY_ID } from '../public/engine/data/components.js';

const N = parseInt(process.argv[2] || '300', 10);
const START = parseInt(process.argv[3] || '1', 10);

const agg = {
  races: 0, starters: 0, finishers: 0, zero: 0, one: 0, accidents: 0, mech: 0, repairs: 0, punctures: 0, pits: 0, fastDnf: 0,
  hours: 0, wet: 0, prequalFailed: 0, prequalRounds: 0, ranDry: 0, limps: 0,
  parts: {}, winnersPerSeason: [], champShare: [], titleBest: 0, topCarWins: 0, winsTotal: 0, topDrvWins: 0, lapsTotal: 0,
  brandWinShare: [],
};

const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const w = createWorld({ seed: 'bal-' + (START + i) });
  const carScore = {};
  for (const e of w.entries) carScore[e.id] = (e.car.chassis.handling + e.car.engine.power) / 2;
  const sortedCars = Object.entries(carScore).sort((a, b) => b[1] - a[1]).map((x) => +x[0]);
  const topCars = new Set(sortedCars.slice(0, Math.ceil(sortedCars.length / 4)));
  const drvScore = {};
  for (const e of w.entries) {
    const st = statsAt(driverById(w, e.driverId), w.year);
    drvScore[e.id] = STAT_KEYS.reduce((a, k) => a + st[k], 0) / STAT_KEYS.length;
  }
  const sortedDrv = Object.entries(drvScore).sort((a, b) => b[1] - a[1]).map((x) => +x[0]);
  const topDrv = new Set(sortedDrv.slice(0, Math.ceil(sortedDrv.length / 4)));

  const rounds = runSeason(w);
  const winners = new Set();
  const winsByBrand = {};
  for (const { result } of rounds) {
    agg.races++;
    agg.starters += result.starters;
    agg.finishers += result.finishers;
    if (result.finishers === 0) agg.zero++;
    if (result.finishers <= 1) agg.one++;
    agg.hours += (result.winnerTime || 0) / 3600;
    agg.lapsTotal += result.laps;
    if (result.rain) agg.wet++;
    for (const r of result.classification) {
      if (r.status === 'DNF') {
        if (r.part) { agg.mech++; agg.parts[r.part] = (agg.parts[r.part] || 0) + 1; } else agg.accidents++;
      }
      agg.pits += r.pits;
    }
    for (const e of result.events) {
      if (e.kind === 'repair') {
        if (e.part === 'tyres') agg.punctures++;
        else if (e.part === 'fuel') agg.ranDry++;
        else agg.repairs++;
      }
      if (e.kind === 'limp') agg.limps++;
    }
    const wid = result.winnerEntryId;
    if (wid) {
      winners.add(wid);
      agg.winsTotal++;
      if (topCars.has(wid)) agg.topCarWins++;
      if (topDrv.has(wid)) agg.topDrvWins++;
      const e = entryById(w, wid);
      winsByBrand[e.teamId] = (winsByBrand[e.teamId] || 0) + 1;
    }
  }
  for (const r of rounds) {
    const pq = r.prep.prequal;
    agg.prequalFailed += pq.failed.length;
    agg.prequalRounds++;
  }
  agg.winnersPerSeason.push(winners.size);
  const ds = driverStandings(w);
  const totalPts = ds.reduce((a, r) => a + r.pts, 0) || 1;
  agg.champShare.push(ds[0] ? ds[0].pts / totalPts : 0);
  const best = Math.max(0, ...Object.values(winsByBrand));
  agg.brandWinShare.push(best / rounds.length);
}

const ms = Date.now() - t0;
const per = (x) => x / agg.races;
const pct = (x) => (x * 100).toFixed(1) + '%';
const avgOf = (a) => a.reduce((x, y) => x + y, 0) / a.length;

const finishRate = agg.finishers / agg.starters;
const topCarShare = agg.topCarWins / agg.winsTotal;
const topDrvShare = agg.topDrvWins / agg.winsTotal;
const avgWinners = avgOf(agg.winnersPerSeason);

console.log(`Balance harness: ${N} seasons, ${agg.races} races, ${(ms / 1000).toFixed(1)}s`);
console.log('--------------------------------------------------------------');
console.log(`Starters per race:           ${per(agg.starters).toFixed(1)}`);
console.log(`Finishers per race:          ${per(agg.finishers).toFixed(2)}  (${pct(finishRate)} of starters)`);
console.log(`Races with 0 finishers:      ${pct(agg.zero / agg.races)}`);
console.log(`Races with <=1 finisher:     ${pct(agg.one / agg.races)}`);
console.log(`Retirements per race:        mechanical ${per(agg.mech).toFixed(2)}, accidents ${per(agg.accidents).toFixed(2)}`);
console.log(`Repairs per race:            ${per(agg.repairs).toFixed(2)}  punctures ${per(agg.punctures).toFixed(2)}  ran dry ${per(agg.ranDry).toFixed(3)}  limping ${per(agg.limps).toFixed(2)}`);
console.log(`Pit stops per car per race:  ${(agg.pits / agg.starters).toFixed(2)}`);
console.log(`Winner race time (hours):    ${(agg.hours / agg.races).toFixed(2)}   avg laps ${(agg.lapsTotal / agg.races).toFixed(0)}`);
console.log(`Wet races:                   ${pct(agg.wet / agg.races)}`);
console.log(`Pre-qualifying casualties:   ${(agg.prequalFailed / agg.prequalRounds).toFixed(1)} per round`);
console.log(`Different winners / season:  ${avgWinners.toFixed(2)} (of 8 races)`);
console.log(`Champion share of all pts:   ${pct(avgOf(agg.champShare))}`);
console.log(`Best team's share of wins:   ${pct(avgOf(agg.brandWinShare))}`);
console.log(`Top-quarter cars win:        ${pct(topCarShare)} of races (25% would mean cars do not matter)`);
console.log(`Top-quarter drivers win:     ${pct(topDrvShare)} of races`);
const parts = Object.entries(agg.parts).sort((a, b) => b[1] - a[1]);
console.log('Mechanical retirements by part: ' + parts.map(([k, v]) => `${COMPONENT_BY_ID[k].name} ${pct(v / agg.mech)}`).join(', '));
console.log('--------------------------------------------------------------');

const checks = [
  ['heavy attrition: finish rate 25-45%', finishRate >= 0.25 && finishRate <= 0.45],
  ['almost always a finisher: 0-finisher races < 4%', agg.zero / agg.races < 0.04],
  ['mechanical failures dominate accidents', agg.mech > agg.accidents * 2],
  ['3-6 different winners per season', avgWinners >= 3 && avgWinners <= 6],
  ['good cars matter: top-quarter cars win 35-70%', topCarShare >= 0.35 && topCarShare <= 0.70],
  ['good drivers matter: top-quarter drivers win 30-65% (works teams hire the best, so cars and drivers are correlated)', topDrvShare >= 0.30 && topDrvShare <= 0.65],
  ['no runaway team: best team wins under 60% of races', avgOf(agg.brandWinShare) < 0.60],
  ['pit stops happen: 0.8-3.5 per car per race', agg.pits / agg.starters >= 0.8 && agg.pits / agg.starters <= 3.5],
  ['races last 1.5-4 hours', agg.hours / agg.races >= 1.5 && agg.hours / agg.races <= 4],
];
let fail = 0;
for (const [name, ok] of checks) {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name);
  if (!ok) fail++;
}
process.exit(fail ? 1 : 0);
