// Draft regulation defaults by era (from the design doc). These are starting
// values only: the governor or the player can change any of them during a save.
// scoring: points for finishing positions (only the listed places score).
// entries: per-team cap {full, partial}; the hard maximum is 4+2, minimum 1.

const S3 = [6, 4, 2];
const S5 = [8, 6, 4, 3, 2];
const S6 = [8, 6, 5, 4, 3, 2];
const S8 = [10, 8, 6, 5, 4, 3, 2, 1];
const S10 = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

export const ERAS = [
  { from: 1919, to: 1939, name: 'Pioneer years', scoring: S3, entries: { full: 4, partial: 2 }, safetyCar: 'none', minWeight: false, chassisSupply: 'customer', commonOwnership: 'free', costCap: false, style: 'De Stijl into Bauhaus' },
  { from: 1940, to: 1949, name: 'Wartime and recovery', scoring: S5, entries: { full: 4, partial: 1 }, safetyCar: 'none', minWeight: false, chassisSupply: 'customer', commonOwnership: 'free', costCap: false, style: 'Wartime austerity print' },
  { from: 1950, to: 1959, name: 'Atomic age', scoring: S5, entries: { full: 4, partial: 1 }, safetyCar: 'none', minWeight: false, chassisSupply: 'customer', commonOwnership: 'free', costCap: false, style: 'Atomic age' },
  { from: 1960, to: 1969, name: 'Pop and Op', scoring: S6, entries: { full: 3, partial: 1 }, safetyCar: 'none', minWeight: true, chassisSupply: 'hybrid', commonOwnership: 'free', costCap: false, style: 'Pop and Op art' },
  { from: 1970, to: 1979, name: 'Swiss', scoring: S6, entries: { full: 3, partial: 1 }, safetyCar: 'pace car', minWeight: true, chassisSupply: 'strict', commonOwnership: 'free', costCap: false, style: 'Swiss' },
  { from: 1980, to: 1989, name: 'PC-98', scoring: S8, entries: { full: 2, partial: 1 }, safetyCar: 'pace car', minWeight: 'ballast', chassisSupply: 'strict', commonOwnership: 'free', costCap: false, style: 'PC-98' },
  { from: 1990, to: 1999, name: 'Vaporwave', scoring: S8, entries: { full: 2, partial: 1 }, safetyCar: 'pace car', minWeight: 'ballast', chassisSupply: 'hybrid', commonOwnership: 'free', costCap: false, style: 'Vaporwave' },
  { from: 2000, to: 2009, name: 'Y2K', scoring: S10, entries: { full: 2, partial: 1 }, safetyCar: 'pace car', minWeight: 'ballast', chassisSupply: 'hybrid', commonOwnership: 'limited', costCap: false, style: 'Y2K glossy aqua' },
  { from: 2010, to: 2019, name: 'Memphis to duotone', scoring: S10, entries: { full: 2, partial: 1 }, safetyCar: 'pace car', minWeight: 'ballast', chassisSupply: 'hybrid', commonOwnership: 'limited', costCap: false, style: 'Memphis revival to duotone' },
  { from: 2020, to: 2029, name: 'Abstract Tech', scoring: S10, entries: { full: 2, partial: 1 }, safetyCar: 'pace car', minWeight: 'ballast', chassisSupply: 'hybrid', commonOwnership: 'limited', costCap: true, style: 'Abstract Tech' },
  { from: 2030, to: 9999, name: 'Acid', scoring: S10, entries: { full: 2, partial: 1 }, safetyCar: 'pace car', minWeight: 'ballast', chassisSupply: 'hybrid', commonOwnership: 'limited', costCap: true, style: 'Acid design' },
];

export function eraFor(year) {
  for (const e of ERAS) if (year >= e.from && year <= e.to) return e;
  return ERAS[ERAS.length - 1];
}

// Regulations at the start of a save: the era defaults, copied so they can be edited.
export function defaultRegs(year) {
  const e = eraFor(year);
  return {
    scoring: e.scoring.slice(),
    entries: { full: e.entries.full, partial: e.entries.partial },
    exemptTop: 10,
    gridCap: 14,
    raceKm: 300,
    minLaps: 5,
    chassisSupply: e.chassisSupply,
    commonOwnership: e.commonOwnership,
    safetyCar: e.safetyCar,
    costCap: e.costCap,
  };
}

// Crude placeholders until later eras get their own data.
export function eraSpeedFactor(year) {
  return 1 + 0.012 * (year - 1919);
}
export function eraReliabilityFactor(year, gain) {
  const y = year - 1919;
  return 1 / (1 + gain * y);
}
