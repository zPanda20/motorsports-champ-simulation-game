// The ladder below the global championship (design document, tier ladder and guides).
// Periods are guides only: the governor can bring a tier forward or delay it.

export const KINDS = {
  scene:        { name: 'Local racing scene', guide: 1919, grid: [8, 14], rounds: [3, 8], km: [60, 110], speed: 0.9, rel: 1.35, scoring: [5, 3, 2, 1] },
  continental:  { name: 'Continental series', guide: 1940, grid: [14, 28], rounds: [6, 16], km: [120, 260], speed: 0.95, rel: 1.15, notable: true },
  feeder:       { name: 'Continental feeder series', guide: 1950, grid: [14, 28], rounds: [6, 14], km: [100, 200], speed: 0.9, rel: 1.25 },
  localDev:     { name: 'Local development series', guide: 1940, grid: [10, 26], rounds: [6, 12], km: [80, 150], speed: 0.85, rel: 1.4 },
  globalJunior: { name: 'Global junior series', guide: 1990, grid: [24, 30], rounds: [14, 18], km: [150, 230], speed: 0.93, rel: 1.1, notable: true },
  lowerJunior:  { name: 'Lower global junior series', guide: 2010, grid: [24, 30], rounds: [14, 18], km: [140, 210], speed: 0.88, rel: 1.2 },
};

// Which tier a kind occupies in a given year (design document ladder table).
export function tierOf(kind, year) {
  if (kind === 'scene') return 2;
  if (kind === 'continental') return 2;
  if (kind === 'globalJunior') return 3;
  if (kind === 'lowerJunior') return 4;
  if (kind === 'feeder') return year >= 2010 ? 5 : year >= 1990 ? 4 : 3;
  if (kind === 'localDev') return year >= 2010 ? 6 : year >= 1990 ? 5 : year >= 1950 ? 4 : 3;
  return 2;
}

function lerp(a, b, t) { return a + (b - a) * t; }
// early-to-modern interpolation: early at the guide year, modern by 2020
export function growth(kind, year) {
  const k = KINDS[kind];
  const t = Math.max(0, Math.min(1, (year - k.guide) / Math.max(1, 2020 - k.guide)));
  return {
    grid: Math.round(lerp(k.grid[0], k.grid[1], t)),
    rounds: Math.round(lerp(k.rounds[0], k.rounds[1], t)),
    km: Math.round(lerp(k.km[0], k.km[1], t)),
  };
}

export const TIER_SPEED = (tier) => 1 - 0.055 * (tier - 1);
export const GRASS = { club: 1919, karting: 1955 };
