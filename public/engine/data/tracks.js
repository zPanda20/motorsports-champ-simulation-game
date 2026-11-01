// Real tracks with existence windows. Figures are approximate and meant to be tuned.
// power / handling / braking: how much each part of the car and driver matters (sum ~1).
// speedKmh: 1919 average racing speed (later eras scale it). stress: reliability load.
// roughness: tyre and suspension punishment. overtake: 0..1 ease of passing.
// wetChance: chance a race at the venue sees rain.
// provisional: true = a period venue added because the draft track list had nothing running in 1919.
// minLaps: road circuits that are too long for a 300 km race still run at least this many laps.

export const TRACKS = [
  // ---- running in 1919 ----
  { id: 'brooklands', name: 'Brooklands', country: 'GB', opens: 1907, closes: 1939, lengthKm: 4.43, speedKmh: 128, power: 0.5, handling: 0.3, braking: 0.2, stress: 1.1, roughness: 1.2, overtake: 0.5, wetChance: 0.30, kind: 'banked circuit', provisional: true },
  { id: 'indianapolis', name: 'Indianapolis', country: 'US', opens: 1909, lengthKm: 4.02, speedKmh: 138, power: 0.55, handling: 0.3, braking: 0.15, stress: 1.15, roughness: 1.3, overtake: 0.55, wetChance: 0.20, kind: 'brick oval' },
  { id: 'sheepshead', name: 'Sheepshead Bay', country: 'US', opens: 1915, closes: 1919, lengthKm: 3.22, speedKmh: 150, power: 0.6, handling: 0.25, braking: 0.15, stress: 1.0, roughness: 0.8, overtake: 0.6, wetChance: 0.25, kind: 'board oval', provisional: true },
  { id: 'tacoma', name: 'Tacoma', country: 'US', opens: 1912, closes: 1922, lengthKm: 3.22, speedKmh: 146, power: 0.58, handling: 0.27, braking: 0.15, stress: 1.0, roughness: 0.9, overtake: 0.6, wetChance: 0.40, kind: 'board oval', provisional: true },
  { id: 'lemans', name: 'Le Mans (Sarthe)', country: 'FR', opens: 1906, lengthKm: 17.3, speedKmh: 104, power: 0.5, handling: 0.3, braking: 0.2, stress: 1.2, roughness: 1.5, overtake: 0.45, wetChance: 0.40, kind: 'public roads', provisional: true },
  { id: 'mugello', name: 'Mugello (road circuit)', country: 'IT', opens: 1914, lengthKm: 66, speedKmh: 76, power: 0.35, handling: 0.45, braking: 0.2, stress: 1.3, roughness: 1.6, overtake: 0.35, wetChance: 0.35, kind: 'public roads', minLaps: 5 },
  { id: 'santamonica', name: 'Santa Monica', country: 'US', opens: 1909, closes: 1919, lengthKm: 13.5, speedKmh: 108, power: 0.45, handling: 0.35, braking: 0.2, stress: 1.15, roughness: 1.4, overtake: 0.45, wetChance: 0.10, kind: 'public roads', provisional: true },
  { id: 'elgin', name: 'Elgin', country: 'US', opens: 1910, closes: 1920, lengthKm: 23.4, speedKmh: 106, power: 0.45, handling: 0.35, braking: 0.2, stress: 1.15, roughness: 1.4, overtake: 0.45, wetChance: 0.25, kind: 'public roads', provisional: true },

  // ---- opening later (draft list; opening years approximate) ----
  { id: 'avus', name: 'Avus', country: 'DE', opens: 1921, lengthKm: 19.3, speedKmh: 140, power: 0.65, handling: 0.2, braking: 0.15, stress: 1.1, roughness: 0.8, overtake: 0.6, wetChance: 0.3, kind: 'autobahn circuit' },
  { id: 'spa', name: 'Spa-Francorchamps', country: 'BE', opens: 1921, lengthKm: 14.9, speedKmh: 120, power: 0.5, handling: 0.3, braking: 0.2, stress: 1.2, roughness: 1.2, overtake: 0.5, wetChance: 0.55, kind: 'public roads' },
  { id: 'monza', name: 'Monza', country: 'IT', opens: 1922, lengthKm: 10.0, speedKmh: 130, power: 0.6, handling: 0.25, braking: 0.15, stress: 1.1, roughness: 0.9, overtake: 0.6, wetChance: 0.25, kind: 'circuit' },
  { id: 'monaco', name: 'Monaco', country: 'MC', opens: 1929, lengthKm: 3.18, speedKmh: 90, power: 0.25, handling: 0.5, braking: 0.25, stress: 1.0, roughness: 0.9, overtake: 0.1, wetChance: 0.2, kind: 'street circuit' },
  { id: 'nurburgring', name: 'Nürburgring', country: 'DE', opens: 1927, lengthKm: 22.8, speedKmh: 105, power: 0.4, handling: 0.4, braking: 0.2, stress: 1.2, roughness: 1.1, overtake: 0.45, wetChance: 0.5, kind: 'mountain circuit' },
  { id: 'bathurst', name: 'Bathurst', country: 'AU', opens: 1938, lengthKm: 6.2, speedKmh: 120, power: 0.4, handling: 0.4, braking: 0.2, stress: 1.2, roughness: 1.1, overtake: 0.4, wetChance: 0.3, kind: 'mountain circuit' },
  { id: 'silverstone', name: 'Silverstone', country: 'GB', opens: 1948, lengthKm: 4.6, speedKmh: 140, power: 0.5, handling: 0.3, braking: 0.2, stress: 1.0, roughness: 0.8, overtake: 0.6, wetChance: 0.3, kind: 'circuit' },
  { id: 'zandvoort', name: 'Zandvoort', country: 'NL', opens: 1948, lengthKm: 4.2, speedKmh: 135, power: 0.4, handling: 0.4, braking: 0.2, stress: 1.0, roughness: 0.8, overtake: 0.4, wetChance: 0.3, kind: 'circuit' },
  { id: 'watkinsglen', name: 'Watkins Glen', country: 'US', opens: 1948, lengthKm: 6.6, speedKmh: 140, power: 0.45, handling: 0.35, braking: 0.2, stress: 1.0, roughness: 1.0, overtake: 0.5, wetChance: 0.3, kind: 'circuit' },
  { id: 'interlagos', name: 'Interlagos', country: 'BR', opens: 1940, lengthKm: 4.3, speedKmh: 135, power: 0.4, handling: 0.4, braking: 0.2, stress: 1.0, roughness: 1.0, overtake: 0.5, wetChance: 0.4, kind: 'circuit' },
  { id: 'imola', name: 'Imola', country: 'IT', opens: 1953, lengthKm: 5.0, speedKmh: 145, power: 0.4, handling: 0.4, braking: 0.2, stress: 1.0, roughness: 0.8, overtake: 0.3, wetChance: 0.3, kind: 'circuit' },
  { id: 'roadamerica', name: 'Road America', country: 'US', opens: 1955, lengthKm: 6.5, speedKmh: 145, power: 0.5, handling: 0.3, braking: 0.2, stress: 1.0, roughness: 0.9, overtake: 0.5, wetChance: 0.3, kind: 'circuit' },
  { id: 'lagunaseca', name: 'Laguna Seca', country: 'US', opens: 1957, lengthKm: 3.6, speedKmh: 130, power: 0.35, handling: 0.45, braking: 0.2, stress: 1.0, roughness: 0.9, overtake: 0.4, wetChance: 0.1, kind: 'circuit' },
  { id: 'daytona', name: 'Daytona', country: 'US', opens: 1959, lengthKm: 5.7, speedKmh: 170, power: 0.65, handling: 0.2, braking: 0.15, stress: 1.1, roughness: 0.8, overtake: 0.7, wetChance: 0.3, kind: 'banked circuit' },
  { id: 'kyalami', name: 'Kyalami', country: 'ZA', opens: 1961, lengthKm: 4.1, speedKmh: 145, power: 0.5, handling: 0.3, braking: 0.2, stress: 1.0, roughness: 0.9, overtake: 0.5, wetChance: 0.2, kind: 'circuit' },
  { id: 'suzuka', name: 'Suzuka', country: 'JP', opens: 1962, lengthKm: 5.8, speedKmh: 150, power: 0.4, handling: 0.4, braking: 0.2, stress: 1.0, roughness: 0.8, overtake: 0.4, wetChance: 0.4, kind: 'circuit' },
  { id: 'mexicocity', name: 'Mexico City', country: 'MX', opens: 1962, lengthKm: 4.3, speedKmh: 140, power: 0.5, handling: 0.3, braking: 0.2, stress: 1.0, roughness: 1.0, overtake: 0.5, wetChance: 0.3, kind: 'circuit' },
  { id: 'fuji', name: 'Fuji', country: 'JP', opens: 1965, lengthKm: 4.5, speedKmh: 145, power: 0.55, handling: 0.25, braking: 0.2, stress: 1.0, roughness: 0.8, overtake: 0.5, wetChance: 0.4, kind: 'circuit' },
  { id: 'brandshatch', name: 'Brands Hatch', country: 'GB', opens: 1950, lengthKm: 3.9, speedKmh: 135, power: 0.35, handling: 0.45, braking: 0.2, stress: 1.0, roughness: 1.0, overtake: 0.4, wetChance: 0.35, kind: 'circuit' },
  { id: 'redbullring', name: 'Red Bull Ring', country: 'AT', opens: 1969, lengthKm: 4.3, speedKmh: 160, power: 0.5, handling: 0.3, braking: 0.2, stress: 1.0, roughness: 0.8, overtake: 0.6, wetChance: 0.3, kind: 'circuit' },
  { id: 'sonoma', name: 'Sonoma', country: 'US', opens: 1968, lengthKm: 4.0, speedKmh: 130, power: 0.35, handling: 0.45, braking: 0.2, stress: 1.0, roughness: 0.9, overtake: 0.4, wetChance: 0.1, kind: 'circuit' },
  { id: 'paulricard', name: 'Paul Ricard', country: 'FR', opens: 1970, lengthKm: 5.8, speedKmh: 150, power: 0.5, handling: 0.3, braking: 0.2, stress: 1.0, roughness: 0.7, overtake: 0.5, wetChance: 0.15, kind: 'circuit' },
  { id: 'estoril', name: 'Estoril', country: 'PT', opens: 1972, lengthKm: 4.2, speedKmh: 145, power: 0.45, handling: 0.35, braking: 0.2, stress: 1.0, roughness: 0.8, overtake: 0.4, wetChance: 0.2, kind: 'circuit' },
  { id: 'longbeach', name: 'Long Beach', country: 'US', opens: 1975, lengthKm: 3.2, speedKmh: 115, power: 0.3, handling: 0.45, braking: 0.25, stress: 1.0, roughness: 1.0, overtake: 0.2, wetChance: 0.05, kind: 'street circuit' },
  { id: 'gillesvilleneuve', name: 'Circuit Gilles Villeneuve', country: 'CA', opens: 1978, lengthKm: 4.4, speedKmh: 160, power: 0.5, handling: 0.25, braking: 0.25, stress: 1.0, roughness: 0.9, overtake: 0.5, wetChance: 0.35, kind: 'circuit' },
  { id: 'detroit', name: 'Detroit', country: 'US', opens: 1982, lengthKm: 4.0, speedKmh: 120, power: 0.3, handling: 0.45, braking: 0.25, stress: 1.0, roughness: 1.1, overtake: 0.2, wetChance: 0.2, kind: 'street circuit' },
  { id: 'adelaide', name: 'Adelaide', country: 'AU', opens: 1985, lengthKm: 3.8, speedKmh: 135, power: 0.4, handling: 0.4, braking: 0.2, stress: 1.0, roughness: 0.9, overtake: 0.3, wetChance: 0.1, kind: 'street circuit' },
  { id: 'hockenheim', name: 'Hockenheim', country: 'DE', opens: 1932, lengthKm: 6.8, speedKmh: 170, power: 0.6, handling: 0.2, braking: 0.2, stress: 1.0, roughness: 0.8, overtake: 0.6, wetChance: 0.3, kind: 'circuit' },
  { id: 'magnycours', name: 'Magny-Cours', country: 'FR', opens: 1960, lengthKm: 4.4, speedKmh: 150, power: 0.4, handling: 0.4, braking: 0.2, stress: 1.0, roughness: 0.8, overtake: 0.4, wetChance: 0.3, kind: 'circuit' },
  { id: 'okayama', name: 'Okayama', country: 'JP', opens: 1990, lengthKm: 3.7, speedKmh: 135, power: 0.35, handling: 0.45, braking: 0.2, stress: 1.0, roughness: 0.8, overtake: 0.3, wetChance: 0.3, kind: 'circuit' },
  { id: 'barcelona', name: 'Barcelona', country: 'ES', opens: 1991, lengthKm: 4.7, speedKmh: 160, power: 0.45, handling: 0.35, braking: 0.2, stress: 1.0, roughness: 0.7, overtake: 0.4, wetChance: 0.15, kind: 'circuit' },
  { id: 'homestead', name: 'Homestead', country: 'US', opens: 1995, lengthKm: 2.4, speedKmh: 200, power: 0.6, handling: 0.25, braking: 0.15, stress: 1.0, roughness: 0.7, overtake: 0.6, wetChance: 0.2, kind: 'oval' },
  { id: 'lasvegasms', name: 'Las Vegas Motor Speedway', country: 'US', opens: 1996, lengthKm: 2.4, speedKmh: 200, power: 0.6, handling: 0.25, braking: 0.15, stress: 1.0, roughness: 0.7, overtake: 0.6, wetChance: 0.03, kind: 'oval' },
  { id: 'autoclub', name: 'Auto Club Speedway', country: 'US', opens: 1997, lengthKm: 3.2, speedKmh: 200, power: 0.6, handling: 0.25, braking: 0.15, stress: 1.0, roughness: 0.7, overtake: 0.6, wetChance: 0.03, kind: 'oval' },
  { id: 'albertpark', name: 'Albert Park', country: 'AU', opens: 1996, lengthKm: 5.3, speedKmh: 155, power: 0.4, handling: 0.4, braking: 0.2, stress: 1.0, roughness: 0.8, overtake: 0.4, wetChance: 0.25, kind: 'street circuit' },
  { id: 'sepang', name: 'Sepang', country: 'MY', opens: 1999, lengthKm: 5.5, speedKmh: 160, power: 0.45, handling: 0.35, braking: 0.2, stress: 1.0, roughness: 0.7, overtake: 0.5, wetChance: 0.5, kind: 'circuit' },
  { id: 'valencia', name: 'Valencia', country: 'ES', opens: 1999, lengthKm: 4.0, speedKmh: 140, power: 0.35, handling: 0.45, braking: 0.2, stress: 1.0, roughness: 0.8, overtake: 0.3, wetChance: 0.1, kind: 'circuit' },
  { id: 'chicagoland', name: 'Chicagoland', country: 'US', opens: 2001, lengthKm: 2.4, speedKmh: 200, power: 0.6, handling: 0.25, braking: 0.15, stress: 1.0, roughness: 0.7, overtake: 0.6, wetChance: 0.2, kind: 'oval' },
  { id: 'bahrain', name: 'Bahrain', country: 'BH', opens: 2004, lengthKm: 5.4, speedKmh: 165, power: 0.45, handling: 0.35, braking: 0.2, stress: 1.0, roughness: 0.6, overtake: 0.5, wetChance: 0.02, kind: 'circuit' },
  { id: 'shanghai', name: 'Shanghai', country: 'CN', opens: 2004, lengthKm: 5.5, speedKmh: 160, power: 0.45, handling: 0.35, braking: 0.2, stress: 1.0, roughness: 0.7, overtake: 0.5, wetChance: 0.3, kind: 'circuit' },
  { id: 'dubai', name: 'Dubai Autodrome', country: 'AE', opens: 2004, lengthKm: 5.4, speedKmh: 150, power: 0.4, handling: 0.4, braking: 0.2, stress: 1.0, roughness: 0.6, overtake: 0.4, wetChance: 0.02, kind: 'circuit' },
  { id: 'yasmarina', name: 'Yas Marina', country: 'AE', opens: 2009, lengthKm: 5.3, speedKmh: 155, power: 0.4, handling: 0.4, braking: 0.2, stress: 1.0, roughness: 0.6, overtake: 0.4, wetChance: 0.02, kind: 'circuit' },
  { id: 'cota', name: 'Circuit of the Americas', country: 'US', opens: 2012, lengthKm: 5.5, speedKmh: 160, power: 0.45, handling: 0.35, braking: 0.2, stress: 1.0, roughness: 0.8, overtake: 0.5, wetChance: 0.15, kind: 'circuit' },
  { id: 'inje', name: 'Inje Speedium', country: 'KR', opens: 2013, lengthKm: 3.9, speedKmh: 140, power: 0.4, handling: 0.4, braking: 0.2, stress: 1.0, roughness: 0.7, overtake: 0.4, wetChance: 0.3, kind: 'circuit' },
  { id: 'berlin', name: 'Berlin ePrix', country: 'DE', opens: 2015, lengthKm: 2.3, speedKmh: 100, power: 0.2, handling: 0.5, braking: 0.3, stress: 1.0, roughness: 1.0, overtake: 0.2, wetChance: 0.3, kind: 'street circuit' },
];

export const TRACK_BY_ID = Object.fromEntries(TRACKS.map((t) => [t.id, t]));

// Tracks that exist in a given year (a track with no `closes` stays open).
export function tracksOpenIn(year) {
  return TRACKS.filter((t) => t.opens <= year && (t.closes === undefined || t.closes >= year));
}
