// Every tunable number lives here. The balance harness (tests/balance.js) exists
// to tune these. Values are for the 1919 era; later eras scale them through the
// era helpers in data/eras.js.

export const PARAMS = {
  // ---- world creation ----
  world: {
    birthStart: 1873,        // oldest driver cohort generated at creation
    birthEnd: 1935,          // youngest cohort visible in advance
    cohortPerYear: 3,        // non-legend drivers per birth year (early eras)
    legendShare: 0.2,        // top share of talent across 100 years is fixed
    legendTalentRoll: [0.05, 0.10], // each save moves a legend's talent by 5-10% either way
    tier1Drivers: 18,        // 1919 pool: drivers who start the world in the top series
    gridCap: 14,
    worksBrands: 6,
    privateerTeams: 4,
    startAge: 18,
    retireAgeMin: 32,
    retireAgeMax: 45,
  },

  // ---- pace ----
  pace: {
    k: 0.0017,               // lap-time fraction per index point above/below 50
    carShare: 0.55,          // share of pace index that comes from the car
    noise: 0.0055,           // lap-to-lap noise (fraction of lap time)
    weightCoef: 0.7,         // index points per % of weight above reference
    refWeightKg: 950,
    fuelKgPerKm: 0.2,
    fitW: 0.12,              // index points per fit point above 50
    styleW: 3.0,             // max index points from driving style vs car balance
    tyreGripW: 0.18,
    tyreWearLoss: 9,         // index points lost at fully worn tyres
    wetLoss: 26,             // index points lost in full rain for the worst combination
  },

  start: { base: 2.0, perPoint: 0.045, jitter: 1.5, gridGap: 0.45 },

  fatigue: { pace: 0.035, scale: 1.0 },

  mistake: {
    perKm: 0.00065,
    fatigueMult: 1.6,
    wetMult: 1.8,
    off: { w: 5, t: [4, 14] },
    spin: { w: 3, t: [14, 40] },
    damage: { w: 0.7, limp: [0.04, 0.10] },
    crash: { w: 0.9 },
  },

  overtake: {
    base: 0.30,
    skillW: 0.55,
    paceW: 7.0,
    gap: 0.9,                // seconds a blocked car stays behind
    dirtyWindow: 1.2,
    dirtyPenalty: 0.25,
    incident: 0.012,
    incidentLoss: [8, 22],
    incidentRetire: 0.12,
  },

  rel: {
    hazardPerKm: 0.00078,    // base per-component failure chance per km at rating 50
    wearGain: 1.4,
    lifeKm: 650,             // km for a component to be fully worn
    rainStress: 0.35,
    limpPenalty: 1.0,
    roadsideFixChance: 0.5,
    eraGainPerYear: 0.012,   // reliability improvement per year after the era start
  },

  tyre: {
    lifeKm: 260,
    punctureBase: 0.00115,   // per km
    punctureRoadsideSec: [150, 270],
    rainRough: 0.25,
    changeWear: 0.82,
    strategyNoise: 0.18,
  },

  pit: {
    base: 18,                // seconds in the pit lane
    refuelKmPerSec: 6.0,     // km of range added per second
    tyreChange: 85,
    mechanicSpread: 0.30,    // chief mechanic 100 => -30%, 0 => +30%
    fuelMarginKm: 0.3,       // laps of margin before the engineer forces a stop
    outOfFuelSec: 260,
  },

  weather: { rainFracRange: [0.25, 0.65] },

  prequal: { noise: 0.006, exemptTop: 10 },
  qual: { noise: 0.004 },

  fastLapBonus: 0,

  dev: { perRound: 0.35, cap: 14 }, // in-season development, index points per round at tech 100

  season: { partialShare: 0.5 },
};
