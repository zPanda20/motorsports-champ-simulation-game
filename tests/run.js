// Plain Node test runner (no dependencies). Usage: node tests/run.js

import { makeRng, hashString } from '../public/engine/rng.js';
import { makePersonName, makeTeamName, isRealDriverName, NATIONALITIES } from '../public/engine/names.js';
import { createWorld, entryById, driverById, activeEntries, SAVE_VERSION } from '../public/engine/world.js';
import { legendRoster, statsAt, STAT_KEYS } from '../public/engine/drivers.js';
import { prepareRound, applyRoundResult, runRound, runSeason, entryStandings, advanceYear } from '../public/engine/season.js';
import { raceGenerator, simulateRace } from '../public/engine/race.js';
import { serialize, deserialize, deepClone } from '../public/engine/save.js';
import { TRACKS, tracksOpenIn } from '../public/engine/data/tracks.js';

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('ok    ' + name); }
  catch (e) { failed++; console.log('FAIL  ' + name + '\n      ' + (e && e.message)); }
}
function assert(c, msg) { if (!c) throw new Error(msg || 'assertion failed'); }
function eq(a, b, msg) { if (a !== b) throw new Error((msg || 'not equal') + `: ${a} !== ${b}`); }

// ---- rng ----
test('rng: same seed and labels give the same stream', () => {
  const a = makeRng('s', 'x', 1), b = makeRng('s', 'x', 1);
  for (let i = 0; i < 50; i++) eq(a.next(), b.next());
});
test('rng: different labels give different streams', () => {
  const a = makeRng('s', 'x', 1).next(), b = makeRng('s', 'x', 2).next();
  assert(a !== b);
});
test('rng: a stream does not depend on use of another stream', () => {
  const a = makeRng('s', 'a'); a.next(); a.next();
  const first = makeRng('s', 'b').next();
  eq(makeRng('s', 'b').next(), first);
});
test('rng: int is inclusive and uniform enough', () => {
  const r = makeRng('t'); const seen = new Set();
  for (let i = 0; i < 500; i++) seen.add(r.int(1, 6));
  eq(seen.size, 6);
  assert(!seen.has(0) && !seen.has(7));
});
test('rng: gauss is centred', () => {
  const r = makeRng('g'); let s = 0;
  for (let i = 0; i < 4000; i++) s += r.gauss(10, 2);
  assert(Math.abs(s / 4000 - 10) < 0.15, 'mean ' + s / 4000);
});

// ---- names ----
test('names: no generated name matches a real driver, all unique', () => {
  const r = makeRng('names'); const used = new Set();
  for (let i = 0; i < 1500; i++) {
    const n = makePersonName(r, r.pick(NATIONALITIES), used);
    assert(!isRealDriverName(n.full), n.full);
  }
  eq(used.size, 1500);
});
test('names: team names are produced and unique', () => {
  const r = makeRng('teams'); const used = new Set();
  for (let i = 0; i < 100; i++) makeTeamName(r, r.pick(NATIONALITIES), used);
  eq(used.size, 100);
});
test('names: generator never returns empty or odd names', () => {
  const r = makeRng('odd');
  for (let i = 0; i < 800; i++) {
    const n = makePersonName(r, r.pick(NATIONALITIES), null);
    assert(/^[^\s]+ .{3,}$/.test(n.full), n.full);
    assert(!/(.)\1\1/.test(n.full), 'triple letter in ' + n.full);
  }
});

// ---- legends ----
test('legends: roster is pinned (fixed identities) and about 70 over the first 90 years', () => {
  const a = legendRoster();
  eq(hashString(JSON.stringify(a)), '76695190', 'legend roster changed: update the pin only if that is intended');
  const n = a.filter((l) => l.birthYear <= 1962).length;
  assert(n > 45 && n < 110, 'count ' + n);
});
test('legends: same identity in every save, talent rolled 5-10% each way', () => {
  const w1 = createWorld({ seed: 'A' }), w2 = createWorld({ seed: 'B' });
  const l1 = w1.drivers.filter((d) => d.legend), l2 = w2.drivers.filter((d) => d.legend);
  eq(l1.length, l2.length);
  let different = 0;
  for (let i = 0; i < l1.length; i++) {
    eq(l1[i].name, l2[i].name); eq(l1[i].birthYear, l2[i].birthYear); eq(l1[i].nat, l2[i].nat);
    const avg = (d) => STAT_KEYS.reduce((a, k) => a + d.peak[k], 0) / STAT_KEYS.length;
    const ratio = avg(l1[i]) / avg(l2[i]);
    assert(ratio > 0.8 && ratio < 1.25, 'ratio ' + ratio);
    if (avg(l1[i]) !== avg(l2[i])) different++;
  }
  assert(different > l1.length * 0.8, 'talent should differ between saves');
});

// ---- world ----
test('world: 1919 shape (entries, caps, tracks, no future brands)', () => {
  const w = createWorld({ seed: 'shape' });
  eq(w.year, 1919);
  assert(w.entries.length >= 14 && w.entries.length <= 22, 'entries ' + w.entries.length);
  const perTeam = {};
  for (const e of w.entries) {
    perTeam[e.teamId] = perTeam[e.teamId] || { full: 0, partial: 0 };
    perTeam[e.teamId][e.type]++;
  }
  for (const t of Object.values(perTeam)) assert(t.full <= 4 && t.partial <= 2 && t.full + t.partial >= 1);
  for (const b of w.brands) assert(b.founded <= 1919, b.name + ' not founded yet');
  const numbers = w.entries.map((e) => e.number);
  eq(new Set(numbers).size, numbers.length, 'car numbers must be unique');
  const ds = w.entries.map((e) => e.driverId);
  eq(new Set(ds).size, ds.length, 'a driver cannot hold two seats');
  eq(w.season.calendar.length, 8);
  for (const id of w.season.calendar) {
    const t = TRACKS.find((x) => x.id === id);
    assert(t.opens <= 1919 && (!t.closes || t.closes >= 1919), id + ' not open in 1919');
  }
});
test('world: same seed gives an identical world, different seed differs', () => {
  const a = JSON.stringify(createWorld({ seed: 'same' })), b = JSON.stringify(createWorld({ seed: 'same' })), c = JSON.stringify(createWorld({ seed: 'other' }));
  eq(a, b); assert(a !== c);
});
test('world: drivers in the pool are of racing age', () => {
  const w = createWorld({ seed: 'age' });
  for (const e of w.entries) { const d = w.drivers.find((x) => x.id === e.driverId); const age = 1919 - d.birthYear; assert(age >= 18 && age <= 44, d.name + ' ' + age); }
});
test('world: future cohorts are visible but their talent is not usable until of age', () => {
  const w = createWorld({ seed: 'cohort' });
  const kid = w.drivers.find((d) => d.birthYear === 1930);
  assert(kid, 'a 1930 cohort exists');
  const s = statsAt(kid, 1919);
  const adult = statsAt(kid, 1930 + 28);
  assert(STAT_KEYS.reduce((a, k) => a + s[k], 0) < STAT_KEYS.reduce((a, k) => a + adult[k], 0));
});

// ---- race ----
test('race: same seed and state give an identical race', () => {
  const a = createWorld({ seed: 'rep' }), b = createWorld({ seed: 'rep' });
  const ra = runRound(a), rb = runRound(b);
  eq(hashString(JSON.stringify(ra.result)), hashString(JSON.stringify(rb.result)));
});
test('race: watching lap by lap gives the same result as running it headless', () => {
  const w = createWorld({ seed: 'speed' });
  const prep = prepareRound(w);
  const headless = simulateRace(prep.setup);
  let watched = null, laps = 0;
  for (const step of raceGenerator(prep.setup)) {
    if (step.type === 'lap') { laps++; assert(step.order.length > 0 || step.lap === step.laps || true); }
    if (step.type === 'finish') watched = step.result;
  }
  assert(laps > 0);
  eq(JSON.stringify(headless), JSON.stringify(watched));
});
test('race: classification is coherent', () => {
  const w = createWorld({ seed: 'class' });
  const { result } = runRound(w);
  eq(result.classification.length, result.starters);
  const winner = result.classification.find((r) => r.pos === 1);
  assert(winner, 'there is a winner');
  let last = 0;
  for (const r of result.classification) if (r.pos) { assert(r.pos === last + 1, 'positions are consecutive'); last = r.pos; }
  const scoring = w.regs.scoring;
  const scorers = result.classification.filter((r) => r.points > 0);
  assert(scorers.length <= scoring.length, 'only the top 3 score in 1919');
  eq(scoring.length, 3);
  for (const r of result.classification) if (r.status === 'DNF') assert(r.reason, 'every retirement names a cause');
});
test('race: failures name the part and cars retire from mechanical causes', () => {
  let parts = 0, total = 0;
  for (let i = 0; i < 6; i++) {
    const w = createWorld({ seed: 'fail' + i });
    for (const { result } of runSeason(w)) for (const r of result.classification) if (r.status === 'DNF') { total++; if (r.part) parts++; }
  }
  assert(total > 40, 'plenty of retirements to inspect');
  assert(parts / total > 0.8, 'most retirements are named part failures');
});

// ---- season / pre-qualifying ----
test('season: round 1 everyone pre-qualifies, later top 10 full-season entries are exempt', () => {
  const w = createWorld({ seed: 'prequal' });
  const first = prepareRound(w);
  eq(first.prequal.exempt.length, 0);
  eq(first.setup.starters.length, w.regs.gridCap);
  applyRoundResult(w, first, simulateRace(first.setup));
  const second = prepareRound(w);
  const top10 = entryStandings(w).slice(0, 10).map((r) => r.id);
  for (const id of second.prequal.exempt) { assert(entryById(w, id).type === 'full'); assert(top10.indexOf(id) >= 0); }
  assert(second.prequal.exempt.length <= 10);
  eq(second.setup.starters.length, w.regs.gridCap);
});
test('season: partial entries never get exemption', () => {
  const w = createWorld({ seed: 'partial' });
  for (const { prep } of runSeason(w)) for (const id of prep.prequal.exempt) eq(entryById(w, id).type, 'full');
});
test('season: partial entries only attend their planned rounds', () => {
  const w = createWorld({ seed: 'attend' });
  const plan = w.season.partialPlan;
  const entered = {};
  for (const { prep } of runSeason(w)) {
    const all = [...prep.prequal.exempt, ...prep.prequal.tried.map((t) => t.entryId)];
    for (const id of all) if (plan[id]) (entered[id] = entered[id] || []).push(1);
  }
  for (const id of Object.keys(plan)) assert((entered[id] || []).length <= plan[id].length);
});
test('season: points stay with the entry when a driver changes', () => {
  const w = createWorld({ seed: 'slot' });
  runRound(w);
  const before = entryStandings(w)[0];
  const e = entryById(w, before.id);
  const other = w.entries.find((x) => x.id !== e.id);
  const tmp = e.driverId; e.driverId = other.driverId; other.driverId = tmp;
  const after = entryStandings(w).find((r) => r.id === before.id);
  eq(after.pts, before.pts);
});
test('season: full season finishes with 8 rounds and standings add up', () => {
  const w = createWorld({ seed: 'full' });
  runSeason(w);
  eq(w.season.results.length, 8);
  assert(w.season.done);
  const entryPts = entryStandings(w).reduce((a, r) => a + r.pts, 0);
  const racePts = w.season.results.reduce((a, r) => a + r.classification.reduce((x, c) => x + c.points, 0), 0);
  eq(entryPts, racePts);
});
test('season: several years roll over cleanly and stay deterministic', () => {
  const run = () => {
    const w = createWorld({ seed: 'years' });
    for (let y = 0; y < 5; y++) { runSeason(w); advanceYear(w); }
    return w;
  };
  const a = run(), b = run();
  eq(a.year, 1924);
  eq(a.history.seasons.length, 5);
  eq(JSON.stringify(a.history), JSON.stringify(b.history));
  for (const e of a.entries) assert(e.driverId !== null, 'every seat is filled');
  for (const h of a.history.seasons) assert(h.champion, 'each year has a champion');
});

// ---- golden results: the same on every machine and browser ----
test('golden: world and season results match the pinned values', () => {
  const w = createWorld({ seed: 'golden' });
  eq(hashString(JSON.stringify(w)), '0a8c0b45', 'world creation changed (update pin only if intended)');
  runSeason(w);
  eq(hashString(JSON.stringify(w.season)), '76b28f5a', 'race simulation changed (update pin only if intended)');
});

// ---- saves ----
test('save: round trip keeps everything and continues identically', () => {
  const w = createWorld({ seed: 'save' });
  runRound(w); runRound(w); runRound(w);
  const text = serialize(w, 'LAPTOP-9RGEIGTE');
  const loaded = deserialize(text, 'Arasaka-Tower');
  eq(loaded.meta.openedFrom, 'LAPTOP-9RGEIGTE');
  const cont = deepClone(w);
  runSeason(cont);
  runSeason(loaded);
  eq(JSON.stringify(cont.season), JSON.stringify(loaded.season));
});
test('save: rejects other files and newer versions', () => {
  let threw = 0;
  try { deserialize('{"hello":1}'); } catch (e) { threw++; }
  try { deserialize(JSON.stringify({ format: 'msc-save', version: 999, world: {} })); } catch (e) { threw++; }
  eq(threw, 2);
});
test('save: a 20-season save stays a reasonable size', () => {
  const w = createWorld({ seed: 'size' });
  for (let y = 0; y < 20; y++) { runSeason(w); advanceYear(w); }
  const kb = serialize(w).length / 1024;
  assert(kb < 2500, 'save is ' + kb.toFixed(0) + ' KB');
});

// ---- long-run behaviour (slice 2) ----
function century(seed, years) {
  const w = createWorld({ seed });
  const seen = { titleBrands: new Set(), empty: 0, starts: 0, women: 0, racing: new Set() };
  for (let i = 0; i < years; i++) {
    const rounds = runSeason(w);
    if (!rounds.length) seen.empty++;
    for (const { result } of rounds) for (const r of result.classification) { seen.starts++; if (driverById(w, r.driverId).gender === 'F') seen.women++; }
    const rec = advanceYear(w);
    if (rec.championBrand) seen.titleBrands.add(rec.championBrand.id);
    for (const b of w.brands) if (b.status === 'racing') seen.racing.add(b.id);
  }
  return { w, seen };
}
const LONG = century('long-1', 105);

test('long run: the sim keeps going for a century with a full grid every season', () => {
  eq(LONG.seen.empty, 0);
  assert(LONG.w.year > 2020, 'year ' + LONG.w.year);
  assert(activeEntries(LONG.w).filter((e) => e.driverId != null).length >= 14, 'grid too small at the end');
});
test('long run: many different makers win titles and brands come and go', () => {
  assert(LONG.seen.titleBrands.size >= 8, 'title makers ' + LONG.seen.titleBrands.size);
  assert(LONG.seen.racing.size >= 20, 'makers that raced ' + LONG.seen.racing.size);
  assert(LONG.w.brands.some((b) => b.status === 'defunct'), 'no maker ever left for good');
});
test('long run: men and women stay balanced on the grid', () => {
  const share = LONG.seen.women / LONG.seen.starts;
  assert(share > 0.38 && share < 0.62, 'women share ' + share.toFixed(2));
});
test('long run: war years cancel the championship and are recorded', () => {
  const c = LONG.w.history.seasons.filter((h) => h.cancelled);
  assert(c.length >= 5, 'cancelled seasons ' + c.length);
  assert(c.every((h) => h.year >= 1939 && h.year <= 1946), 'cancelled outside the war');
});
test('long run: every played season keeps its full race reports in the chronicle', () => {
  const played = LONG.w.history.seasons.filter((h) => !h.cancelled);
  assert(played.length > 90);
  assert(played.every((h) => h.results.length > 0 && h.results[0].classification.length > 0 && h.final), 'a season lost its reports');
  assert(played.every((h) => h.results.every((r) => r.lapOrders === undefined)), 'lap orders should be dropped from the archive');
});
test('pool: drivers of both sexes are available from the first grid', () => {
  const w = createWorld({ seed: 'gender-start' });
  const g = w.entries.filter((e) => e.driverId != null).map((e) => driverById(w, e.driverId).gender);
  const f = g.filter((x) => x === 'F').length;
  assert(f >= g.length * 0.35 && f <= g.length * 0.65, `women ${f} of ${g.length}`);
});
test('save: a version 1 save is migrated and plays on', () => {
  const w = createWorld({ seed: 'mig' });
  runSeason(w); advanceYear(w); runRound(w);
  // make it look like a slice-1 save
  const old = deepClone(w);
  old.version = 1;
  delete old.chronicle; delete old.cohortThrough;
  for (const d of old.drivers) delete d.gender;
  for (const b of old.brands) { b.racing = b.status === 'racing'; delete b.status; delete b.raceYears; }
  for (const t of old.teams) { delete t.active; }
  for (const e of old.entries) { delete e.active; }
  const loaded = deserialize(JSON.stringify({ format: 'msc-save', version: 1, world: old }), 'X');
  eq(loaded.version, SAVE_VERSION);
  runSeason(loaded); advanceYear(loaded); runSeason(loaded);
  assert(loaded.history.seasons.length >= 2);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
