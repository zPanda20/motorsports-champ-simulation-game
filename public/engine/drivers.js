// Drivers: eleven stats (ten visible plus hidden Potential), a fixed driving
// style, a career curve, and the fixed legend roster.

import { makeRng, clamp } from './rng.js';
import { PARAMS } from './params.js';
import { makePersonName, nationalityWeights } from './names.js';

export const STAT_KEYS = ['braking', 'cornering', 'smoothness', 'overtaking', 'consistency', 'adaptability', 'fitness', 'feedback', 'focus', 'throttle'];

export const STAT_LABELS = {
  braking: 'Braking', cornering: 'Cornering', smoothness: 'Smoothness', overtaking: 'Overtaking',
  consistency: 'Consistency', adaptability: 'Adaptability', fitness: 'Fitness', feedback: 'Feedback',
  focus: 'Focus', throttle: 'Throttle control',
};

// Where each stat sits on the career curve: how far below peak a young driver
// starts, and how fast it fades after the peak (per year).
const CURVE = {
  braking: { youth: 0.72, decline: 0.006 },
  cornering: { youth: 0.72, decline: 0.005 },
  throttle: { youth: 0.72, decline: 0.007 },
  fitness: { youth: 0.80, decline: 0.014 },
  smoothness: { youth: 0.62, decline: 0.003 },
  overtaking: { youth: 0.66, decline: 0.004 },
  consistency: { youth: 0.58, decline: 0.002 },
  adaptability: { youth: 0.62, decline: 0.003 },
  feedback: { youth: 0.55, decline: 0.001 },
  focus: { youth: 0.62, decline: 0.004 },
};

export function ageAt(driver, year) { return year - driver.birthYear; }

export function statsAt(driver, year) {
  const age = ageAt(driver, year);
  const out = {};
  for (const k of STAT_KEYS) {
    const c = CURVE[k];
    let f;
    if (age < 18) f = c.youth - 0.06 * (18 - age);
    else if (age < driver.peakAge) f = c.youth + (1 - c.youth) * ((age - 18) / (driver.peakAge - 18));
    else if (age <= driver.peakAge + 3) f = 1;
    else f = 1 - (age - driver.peakAge - 3) * c.decline;
    out[k] = clamp(Math.round(driver.peak[k] * f), 5, 99);
  }
  return out;
}

export function overallAt(driver, year) {
  const s = statsAt(driver, year);
  let t = 0;
  for (const k of STAT_KEYS) t += s[k];
  return t / STAT_KEYS.length;
}

export function peakOverall(driver) {
  let t = 0;
  for (const k of STAT_KEYS) t += driver.peak[k];
  return t / STAT_KEYS.length;
}

// ---- the fixed legend roster ----
// Same names, birth years, nationalities, styles and strengths in every save.
// Only the overall talent level is nudged +/-5-10% per save.

const LEGEND_SEED = 'legends-v1';
let legendCache = null;

export function legendRoster() {
  if (legendCache) return legendCache;
  const rng = makeRng(LEGEND_SEED, 'roster');
  const used = new Set();
  const list = [];
  for (let by = PARAMS.world.birthStart; by <= 2008; by++) {
    let n = 0;
    if (rng.chance(0.5)) n++;
    if (rng.chance(0.18)) n++;
    for (let i = 0; i < n; i++) {
      const natW = nationalityWeights(by + 24);
      const nat = rng.weighted(natW, (x) => x.w).n;
      const nm = makePersonName(rng, nat, used);
      const bias = {};
      for (const k of STAT_KEYS) bias[k] = rng.gauss(0, 7);
      list.push({
        legendId: 'L' + String(list.length + 1).padStart(3, '0'),
        ...nm, nat, birthYear: by,
        baseTalent: clamp(rng.gauss(80, 5), 68, 95),
        bias,
        style: clamp(rng.gauss(0, 0.6), -1, 1),
        peakAge: rng.int(25, 31),
      });
    }
  }
  legendCache = list;
  return list;
}

export function makeDriverFromLegend(rng, id, leg) {
  const sign = rng.chance(0.5) ? 1 : -1;
  const [lo, hi] = PARAMS.world.legendTalentRoll;
  const roll = 1 + sign * rng.float(lo, hi);
  const peak = {};
  for (const k of STAT_KEYS) peak[k] = clamp(Math.round((leg.baseTalent + leg.bias[k]) * roll), 20, 99);
  return {
    id, name: leg.full, first: leg.first, last: leg.last, nat: leg.nat, birthYear: leg.birthYear,
    peak, peakAge: leg.peakAge, style: Math.round(leg.style * 100) / 100,
    legend: leg.legendId, status: 'active', tier: null, retiredYear: null, wins: 0, titles: 0, starts: 0,
  };
}

export function makeDriver(rng, id, nat, birthYear, used) {
  const nm = makePersonName(rng, nat, used);
  const talent = clamp(rng.gauss(50, 11), 20, 82);
  const peak = {};
  for (const k of STAT_KEYS) peak[k] = clamp(Math.round(talent + rng.gauss(0, 9)), 10, 97);
  return {
    id, name: nm.full, first: nm.first, last: nm.last, nat, birthYear,
    peak, peakAge: rng.int(25, 31), style: Math.round(clamp(rng.gauss(0, 0.55), -1, 1) * 100) / 100,
    legend: null, status: 'active', tier: null, retiredYear: null, wins: 0, titles: 0, starts: 0,
  };
}

// Chance a driver retires this year (checked once at the end of each season).
export function retirementChance(driver, year) {
  const age = ageAt(driver, year);
  const { retireAgeMin, retireAgeMax } = PARAMS.world;
  if (age < retireAgeMin) return 0;
  if (age >= retireAgeMax) return 1;
  return 0.04 + 0.9 * ((age - retireAgeMin) / (retireAgeMax - retireAgeMin)) * ((age - retireAgeMin) / (retireAgeMax - retireAgeMin));
}
