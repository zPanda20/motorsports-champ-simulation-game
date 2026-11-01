// Technology adoption. Each technology becomes available in a year; teams adopt it
// at different speeds (money, risk appetite); first adopters keep an edge until
// everyone has it. Engine technology is decided by the engine supplier, so a team's
// influence is which supplier it signs with. Bans and returns are regulations.
//   kind: 'engine' (supplier) or 'chassis' (team or its chassis supplier)
//   effect: rating points for the adopter (the grid average is removed afterwards)
//   edge: extra rating points while few have it
//   bans: [from, to] spans in which it is illegal; a supplier that invested takes a loss

export const TECHS = [
  { id: 'discBrakes', name: 'Disc brakes', kind: 'chassis', from: 1951, effect: { brakes: 16, handling: 1 }, edge: 6, note: 'Drums at first; discs from the 1950s.' },
  { id: 'rearEngine', name: 'Rear-engined layout', kind: 'chassis', from: 1957, effect: { handling: 6, weight: -20 }, edge: 3 },
  { id: 'monocoque', name: 'Monocoque chassis', kind: 'chassis', from: 1962, effect: { handling: 7, weight: -60 }, edge: 3 },
  { id: 'fuelInjection', name: 'Fuel injection', kind: 'engine', from: 1958, effect: { power: 4, rel: 3 }, edge: 2, bans: [[1999, 2002]] },
  { id: 'wings', name: 'Aerodynamic wings', kind: 'chassis', from: 1968, effect: { handling: 6, brakes: 2 }, edge: 3, downforce: true },
  { id: 'groundEffect', name: 'Ground-effect downforce', kind: 'chassis', from: 1977, effect: { handling: 9 }, edge: 5, downforce: true, bans: [[1983, 2021]] },
  { id: 'turbo', name: 'Turbocharging', kind: 'engine', from: 1977, effect: { power: 14, rel: -5 }, edge: 6, bans: [[1989, 2013]] },
  { id: 'carbonFibre', name: 'Carbon-fibre chassis', kind: 'chassis', from: 1981, effect: { handling: 4, weight: -50, rel: 2 }, edge: 3 },
  { id: 'semiAuto', name: 'Semi-automatic gearbox', kind: 'chassis', from: 1989, effect: { handling: 2, rel: 1 }, edge: 2 },
  { id: 'activeSuspension', name: 'Active suspension', kind: 'chassis', from: 1987, effect: { handling: 7 }, edge: 5, bans: [[1994, 9999]] },
  { id: 'hybrid', name: 'Hybrid energy recovery', kind: 'engine', from: 2009, effect: { power: 10, rel: -2 }, edge: 5 },
  { id: 'activeAero', name: 'Adjustable aerodynamics', kind: 'chassis', from: 2011, effect: { handling: 3 }, edge: 2, downforce: true },
];
export const TECH_BY_ID = Object.fromEntries(TECHS.map((t) => [t.id, t]));

export function bannedIn(tech, year, over) {
  if (over && over[tech.id] === 'ban') return true;
  if (over && over[tech.id] === 'allow') return false;
  return (tech.bans || []).some(([a, b]) => year >= a && year <= b);
}
export const availableIn = (tech, year) => year >= tech.from;
