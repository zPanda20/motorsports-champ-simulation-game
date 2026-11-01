// A car is a chassis plus an engine plus a fit (integration) stat. Components carry
// ratings; reliability is computed from those ratings during the race.

import { clamp } from './rng.js';
import { COMPONENTS } from './data/components.js';

// brand: {chassisStrength, engineStrength, reliability}; team: staff; customer: bought-in car.
export function buildCar(rng, { brand, staff, customer, year }) {
  const tech = staff.techDirector.rating;
  const techEdge = (tech - 50) * 0.12;
  const cust = customer ? 0.88 : 1.0;

  const handling = clamp(28 + brand.chassisStrength * 46 * cust + techEdge + rng.gauss(0, 3.5), 15, 92);
  const brakes = clamp(18 + brand.chassisStrength * 28 * cust + techEdge * 0.5 + rng.gauss(0, 4), 10, 80);
  const power = clamp(28 + brand.engineStrength * 46 * cust + techEdge + rng.gauss(0, 3.5), 15, 92);
  const weightKg = Math.round(1000 - (brand.chassisStrength - 0.5) * 90 + rng.gauss(0, 18));

  const comps = {};
  for (const c of COMPONENTS) {
    const base = c.group === 'engine' ? brand.engineStrength * 0.5 + brand.reliability * 0.5 : brand.chassisStrength * 0.4 + brand.reliability * 0.6;
    comps[c.id] = Math.round(clamp(24 + base * 52 * (customer ? 0.95 : 1) + rng.gauss(0, 7), 12, 90));
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
  };
}
