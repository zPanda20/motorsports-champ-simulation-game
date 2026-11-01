// A car is a chassis plus an engine plus a fit (integration) stat. Components carry
// ratings; reliability is computed from those ratings during the race. Cars carry
// over from year to year (development, maturity) until the team starts a new design.

import { clamp } from './rng.js';
import { COMPONENTS } from './data/components.js';
import { TECH_BY_ID, bannedIn } from './data/tech.js';

// brand: {chassisStrength, engineStrength, reliability}; staff; customer: bought-in car;
// bonus: technology effect on this car (already centred on the grid).
export function buildCar(rng, { brand, staff, customer, year, bonus, facilities, techs }) {
  const bn = bonus || { handling: 0, brakes: 0, power: 0, rel: 0, weight: 0 };
  const tech = staff.techDirector.rating;
  const techEdge = (tech - 50) * 0.12 + (facilities ? (facilities - 50) * 0.04 : 0);
  const cust = customer ? 0.88 : 1.0;

  const handling = clamp(28 + brand.chassisStrength * 46 * cust + techEdge + bn.handling + rng.gauss(0, 3.5), 15, 92);
  const brakes = clamp(18 + brand.chassisStrength * 28 * cust + techEdge * 0.5 + bn.brakes + rng.gauss(0, 4), 10, 80);
  const power = clamp(28 + brand.engineStrength * 46 * cust + techEdge + bn.power + rng.gauss(0, 3.5), 15, 92);
  const weightKg = Math.round(1000 - (brand.chassisStrength - 0.5) * 90 + bn.weight + rng.gauss(0, 18));

  const comps = {};
  for (const c of COMPONENTS) {
    const base = c.group === 'engine' ? brand.engineStrength * 0.5 + brand.reliability * 0.5 : brand.chassisStrength * 0.4 + brand.reliability * 0.6;
    comps[c.id] = Math.round(clamp(24 + base * 52 * (customer ? 0.95 : 1) + bn.rel + rng.gauss(0, 7), 12, 90));
  }

  const fit = Math.round(clamp((customer ? 38 : 52) + techEdge * 1.5 + rng.gauss(0, 8), 10, 92));
  const balance = Math.round(clamp(rng.gauss(0, 0.5), -1, 1) * 100) / 100;

  return {
    year,
    brandId: brand.id,
    customer: !!customer,
    chassis: { handling: Math.round(handling * 10) / 10, brakes: Math.round(brakes * 10) / 10, weightKg },
    engine: { power: Math.round(power * 10) / 10 },
    comps,
    fit,
    balance,
    tankKm: rng.int(150, 250),
    dev: 0,
    designYear: year,
    maturity: 0,
    techs: techs || [],
  };
}

// Year-on-year continuity. `prev` is last year's car of the same entry, `fresh` what the
// brand and team would build today. A continuing design keeps most of what it had,
// matures (fewer failures) and takes on a share of the year's development; a new design
// is quick but fragile until it matures.
export function evolveCar(prev, fresh, { newDesign, devGain, rng }) {
  if (!prev || newDesign || prev.brandId !== fresh.brandId) {
    const c = fresh;
    c.designYear = fresh.year; c.maturity = 0;
    // a brand-new design is fast on paper and fragile
    c.chassis.handling = Math.round((c.chassis.handling + 2.0) * 10) / 10;
    c.engine.power = Math.round((c.engine.power + 1.5) * 10) / 10;
    for (const k of Object.keys(c.comps)) c.comps[k] = Math.max(10, c.comps[k] - 4);
    c.fit = Math.max(8, c.fit - 4);
    return c;
  }
  const mat = (prev.maturity || 0) + 1;
  const carry = (a, b) => Math.round((a + (b - a) * 0.5 + devGain * 0.8) * 10) / 10;
  const c = fresh;
  c.designYear = prev.designYear;
  c.maturity = mat;
  c.chassis.handling = carry(prev.chassis.handling - (prev.dev || 0) * 0.0, fresh.chassis.handling);
  c.chassis.brakes = Math.round((prev.chassis.brakes + (fresh.chassis.brakes - prev.chassis.brakes) * 0.5) * 10) / 10;
  c.engine.power = carry(prev.engine.power, fresh.engine.power);
  c.chassis.weightKg = Math.round(prev.chassis.weightKg + (fresh.chassis.weightKg - prev.chassis.weightKg) * 0.5);
  c.tankKm = prev.tankKm;
  c.balance = Math.round((prev.balance + (fresh.balance - prev.balance) * 0.2) * 100) / 100;
  for (const k of Object.keys(c.comps)) {
    const ripen = Math.min(mat, 4) * 1.5;
    c.comps[k] = Math.round(clamp(prev.comps[k] + (fresh.comps[k] - prev.comps[k]) * 0.4 + ripen * 0.5 + rng.gauss(0, 1.2), 12, 92));
  }
  c.fit = Math.round(clamp(prev.fit + (fresh.fit - prev.fit) * 0.4 + 1.5, 8, 94));
  return c;
}

// ---- what the car is, in words and numbers, for the era it belongs to ----

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
const HP = [[1919, 105], [1930, 200], [1938, 460], [1950, 350], [1966, 420], [1976, 480], [1986, 950], [1990, 700], [2005, 830], [2014, 880], [2030, 1000]];
const KG = [[1919, 980], [1938, 850], [1950, 720], [1966, 540], [1990, 505], [2010, 620], [2030, 760]];
const KMH = [[1919, 150], [1938, 310], [1950, 270], [1966, 300], [1990, 330], [2010, 340], [2030, 350]];
const CAP = [[1919, 4.5], [1928, 1.5], [1938, 3.0], [1950, 4.5], [1961, 1.5], [1966, 3.0], [1989, 3.5], [1995, 3.0], [2006, 2.4], [2014, 1.6], [2030, 1.6]];

export function describeCar(car, year, teamTechs, regs) {
  const has = (id) => (teamTechs || car.techs || []).indexOf(id) >= 0;
  const p = clamp(car.engine.power, 10, 100) / 100;
  const hp = Math.round(interp(HP, year) * (0.72 + 0.56 * p) / 5) * 5;
  const minKg = regs && regs.minWeight ? Math.round(interp(KG, year) * 0.96) : 0;
  const kg = Math.max(minKg, Math.round(interp(KG, year) * (0.9 + (car.chassis.weightKg - 1000) / 900 * -1) / 5) * 5);
  const cyl = year < 1925 ? 4 : year < 1950 ? 8 : year < 1961 ? 6 : year < 1966 ? 8 : year < 2006 ? (year < 1995 ? 8 : 10) : year < 2014 ? 8 : 6;
  const layout = year < 1925 ? 'inline-' + cyl : year < 1950 ? 'straight-' + cyl : cyl <= 6 && year < 2014 ? 'inline-' + cyl : 'V' + cyl;
  const forced = has('hybrid') ? 'turbocharged hybrid' : has('turbo') ? 'turbocharged' : year < 1935 && year > 1927 ? 'supercharged' : 'naturally aspirated';
  const cap = Math.round(interp(CAP, year) * 10) / 10;
  const brakes = has('discBrakes') ? (has('carbonFibre') ? 'carbon-ceramic discs' : 'disc brakes') : (year < 1925 ? 'rear drum brakes only' : 'four drum brakes');
  const aero = has('groundEffect') ? 'ground-effect underbody and wings' : has('activeAero') ? 'adjustable wings' : has('wings') ? 'inverted wings' : (year > 1935 ? 'streamlined bodywork' : 'no aerodynamic aids');
  const frame = has('carbonFibre') ? 'carbon-fibre monocoque' : has('monocoque') ? 'aluminium monocoque' : year > 1950 ? 'tubular spaceframe' : (year < 1935 ? 'ladder frame' : 'tubular frame');
  const gearbox = has('semiAuto') ? 'semi-automatic' : year < 1930 ? '3-speed crash' : year < 1960 ? '4-speed' : year < 1985 ? '5-speed manual' : '6-speed manual';
  const susp = has('activeSuspension') ? 'active suspension' : year < 1950 ? 'leaf springs and rigid axles' : 'independent suspension';
  const lines = [
    ['Engine', `${layout}, ${cap.toFixed(1)} litres, ${forced}`],
    ['Power', `about ${hp} hp`],
    ['Weight', `about ${kg} kg`],
    ['Top speed', `about ${Math.round(interp(KMH, year) * (0.94 + 0.12 * p) / 5) * 5} km/h`],
    ['Chassis', frame],
    ['Brakes', brakes],
    ['Gearbox', gearbox],
    ['Suspension', susp],
  ];
  // downforce data only exists once downforce does
  if (has('wings') || has('groundEffect') || has('activeAero')) lines.push(['Aerodynamics', aero]);
  else lines.push(['Aerodynamics', aero]);
  return lines;
}

export function techListNames(ids) { return ids.map((id) => TECH_BY_ID[id].name); }
export { bannedIn };
