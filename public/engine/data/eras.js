// Draft regulation defaults by era (from the design doc). These are starting
// values only: the governor or the player can change any of them during a save.
// scoring: points for finishing positions (only the listed places score).
// entries: per-team cap {full, partial}; the hard maximum is 4+2, minimum 1.
// gridCap, rounds: cars per race and races per season at the era start.
// worksTarget, privTarget: how many works and privateer teams the industry settles around.

const S3 = [6, 4, 2];
const S5 = [8, 6, 4, 3, 2];
const S6 = [8, 6, 5, 4, 3, 2];
const S8 = [10, 8, 6, 5, 4, 3, 2, 1];
const S10 = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

export const ERAS = [
  { from: 1919, to: 1939, name: 'Pioneer years', scoring: S3, entries: { full: 4, partial: 2 }, gridCap: 14, rounds: 8, worksTarget: 6, privTarget: 4, safetyCar: 'none', minWeight: false, chassisSupply: 'customer', commonOwnership: 'free', costCap: false, style: 'De Stijl into Bauhaus' },
  { from: 1940, to: 1949, name: 'Wartime and recovery', scoring: S5, entries: { full: 4, partial: 1 }, gridCap: 14, rounds: 8, worksTarget: 5, privTarget: 5, safetyCar: 'none', minWeight: false, chassisSupply: 'customer', commonOwnership: 'free', costCap: false, style: 'Wartime austerity print' },
  { from: 1950, to: 1959, name: 'Atomic age', scoring: S5, entries: { full: 4, partial: 1 }, gridCap: 16, rounds: 9, worksTarget: 7, privTarget: 6, safetyCar: 'none', minWeight: false, chassisSupply: 'customer', commonOwnership: 'free', costCap: false, style: 'Atomic age' },
  { from: 1960, to: 1969, name: 'Pop and Op', scoring: S6, entries: { full: 3, partial: 1 }, gridCap: 18, rounds: 10, worksTarget: 8, privTarget: 6, safetyCar: 'none', minWeight: true, chassisSupply: 'hybrid', commonOwnership: 'free', costCap: false, style: 'Pop and Op art' },
  { from: 1970, to: 1979, name: 'Swiss', scoring: S6, entries: { full: 3, partial: 1 }, gridCap: 18, rounds: 12, worksTarget: 8, privTarget: 6, safetyCar: 'pace car', minWeight: true, chassisSupply: 'strict', commonOwnership: 'free', costCap: false, style: 'Swiss' },
  { from: 1980, to: 1989, name: 'PC-98', scoring: S8, entries: { full: 2, partial: 1 }, gridCap: 20, rounds: 14, worksTarget: 9, privTarget: 6, safetyCar: 'pace car', minWeight: 'ballast', chassisSupply: 'strict', commonOwnership: 'free', costCap: false, style: 'PC-98' },
  { from: 1990, to: 1999, name: 'Vaporwave', scoring: S8, entries: { full: 2, partial: 1 }, gridCap: 20, rounds: 16, worksTarget: 9, privTarget: 6, safetyCar: 'pace car', minWeight: 'ballast', chassisSupply: 'hybrid', commonOwnership: 'free', costCap: false, style: 'Vaporwave' },
  { from: 2000, to: 2009, name: 'Y2K', scoring: S10, entries: { full: 2, partial: 1 }, gridCap: 20, rounds: 16, worksTarget: 9, privTarget: 5, safetyCar: 'pace car', minWeight: 'ballast', chassisSupply: 'hybrid', commonOwnership: 'limited', costCap: false, style: 'Y2K glossy aqua' },
  { from: 2010, to: 2019, name: 'Memphis to duotone', scoring: S10, entries: { full: 2, partial: 1 }, gridCap: 20, rounds: 18, worksTarget: 8, privTarget: 5, safetyCar: 'pace car', minWeight: 'ballast', chassisSupply: 'hybrid', commonOwnership: 'limited', costCap: false, style: 'Memphis revival to duotone' },
  { from: 2020, to: 2029, name: 'Abstract Tech', scoring: S10, entries: { full: 2, partial: 1 }, gridCap: 20, rounds: 18, worksTarget: 8, privTarget: 5, safetyCar: 'pace car', minWeight: 'ballast', chassisSupply: 'hybrid', commonOwnership: 'limited', costCap: true, style: 'Abstract Tech' },
  { from: 2030, to: 9999, name: 'Acid', scoring: S10, entries: { full: 2, partial: 1 }, gridCap: 20, rounds: 18, worksTarget: 8, privTarget: 5, safetyCar: 'pace car', minWeight: 'ballast', chassisSupply: 'hybrid', commonOwnership: 'limited', costCap: true, style: 'Acid design' },
];

export function eraFor(year) {
  for (const e of ERAS) if (year >= e.from && year <= e.to) return e;
  return ERAS[ERAS.length - 1];
}

// Regulations at the start of a save: the era defaults, copied so they can be edited.
export function defaultRegs(year) {
  const e = eraFor(year);
  return {
    eraFrom: e.from,
    touched: false,          // set when the player or governor edits regulations by hand
    scoring: e.scoring.slice(),
    entries: { full: e.entries.full, partial: e.entries.partial },
    exemptTop: 10,
    gridCap: e.gridCap,
    rounds: e.rounds,
    raceKm: 300,
    minLaps: 5,
    chassisSupply: e.chassisSupply,
    commonOwnership: e.commonOwnership,
    safetyCar: e.safetyCar,
    costCap: e.costCap,
  };
}

// ---- how the sport changes over time (piecewise-linear tables) ----

function interp(table, year) {
  if (year <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    if (year <= table[i][0]) {
      const [y0, v0] = table[i - 1], [y1, v1] = table[i];
      return v0 + ((v1 - v0) * (year - y0)) / (y1 - y0);
    }
  }
  return table[table.length - 1][1];
}

// Track speeds are stored as 1919-equivalent figures; this scales them up.
const SPEED = [[1919, 1], [1935, 1.25], [1950, 1.35], [1965, 1.55], [1975, 1.7], [1990, 1.8], [2020, 1.9], [2060, 2.0]];
// Share of 1919 failure rates that remains.
const RELIABILITY = [[1919, 1], [1935, 0.8], [1950, 0.58], [1970, 0.38], [1990, 0.22], [2010, 0.15], [2030, 0.12], [2060, 0.1]];
// Pit-lane and service times.
const PIT = [[1919, 1], [1950, 0.6], [1970, 0.35], [1990, 0.2], [2005, 0.1], [2020, 0.08]];
// Time to repair a breakdown.
const REPAIR = [[1919, 1], [1950, 0.7], [1990, 0.4], [2020, 0.25]];

export const eraSpeedFactor = (year) => interp(SPEED, year);
export const eraReliabilityFactor = (year) => interp(RELIABILITY, year);
export const eraPitFactor = (year) => interp(PIT, year);
export const eraRepairFactor = (year) => interp(REPAIR, year);
