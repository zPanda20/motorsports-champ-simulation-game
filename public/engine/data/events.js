// Fixed history. These change the conditions the industry lives in, never the
// outcomes of races. Modifiers add up when events overlap.
//   brandExit: extra yearly chance a works programme stops
//   brandEntry: multiplier on the chance a brand starts racing
//   teamFold: extra yearly chance a privateer folds
//   teamFound: multiplier on the chance a new privateer appears
//   cancel: no championship is held
//   roundsCap: maximum races that season

export const EVENTS = [
  { from: 1929, to: 1933, name: 'The Great Depression', brandExit: 0.05, brandEntry: 0.4, teamFold: 0.08, teamFound: 0.3 },
  { from: 1934, to: 1938, name: 'State-funded works programmes', brandExit: 0, brandEntry: 1.6, teamFold: 0, teamFound: 1 },
  { from: 1939, to: 1939, name: 'War breaks out in Europe', brandExit: 0.08, brandEntry: 0.3, teamFold: 0.1, teamFound: 0.2, roundsCap: 4 },
  { from: 1940, to: 1945, name: 'The Second World War', cancel: true, brandExit: 0.18, brandEntry: 0, teamFold: 0.25, teamFound: 0 },
  { from: 1946, to: 1948, name: 'Post-war austerity', brandExit: 0.01, brandEntry: 0.7, teamFold: 0.04, teamFound: 0.8, roundsCap: 6 },
  { from: 1949, to: 1960, name: 'Post-war boom', brandExit: 0, brandEntry: 1.6, teamFold: 0, teamFound: 1.5 },
  { from: 1955, to: 1955, name: 'The Le Mans disaster', brandExit: 0.04, brandEntry: 1, teamFold: 0.02, teamFound: 1 },
  { from: 1967, to: 1976, name: 'The safety movement', brandExit: 0.01, brandEntry: 1, teamFold: 0.01, teamFound: 1 },
  { from: 1968, to: 1968, name: 'Commercial sponsorship arrives', brandExit: 0, brandEntry: 1.4, teamFold: 0, teamFound: 2 },
  { from: 1973, to: 1975, name: 'The oil crisis', brandExit: 0.05, brandEntry: 0.5, teamFold: 0.06, teamFound: 0.6 },
  { from: 1994, to: 1994, name: 'Imola 1994 and the safety overhaul', brandExit: 0, brandEntry: 1, teamFold: 0.01, teamFound: 1 },
  { from: 2005, to: 2006, name: 'Tobacco sponsorship bans', brandExit: 0.01, brandEntry: 1, teamFold: 0.03, teamFound: 0.8 },
  { from: 2008, to: 2010, name: 'The financial crisis', brandExit: 0.06, brandEntry: 0.4, teamFold: 0.06, teamFound: 0.4 },
  { from: 2020, to: 2021, name: 'The pandemic', brandExit: 0.02, brandEntry: 0.7, teamFold: 0.03, teamFound: 0.7, roundsCap: 8 },
];

export function eventsFor(year) {
  const active = EVENTS.filter((e) => year >= e.from && year <= e.to);
  const out = { names: active.map((e) => e.name), starting: active.filter((e) => e.from === year).map((e) => e.name), cancel: false, brandExit: 0, brandEntry: 1, teamFold: 0, teamFound: 1, roundsCap: Infinity };
  for (const e of active) {
    out.brandExit += e.brandExit || 0;
    out.brandEntry *= e.brandEntry === undefined ? 1 : e.brandEntry;
    out.teamFold += e.teamFold || 0;
    out.teamFound *= e.teamFound === undefined ? 1 : e.teamFound;
    if (e.cancel) out.cancel = true;
    if (e.roundsCap !== undefined) out.roundsCap = Math.min(out.roundsCap, e.roundsCap);
  }
  return out;
}
