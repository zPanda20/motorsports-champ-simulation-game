// How many manufacturers run full works teams, by year (the sport's real shape):
// plentiful before the war, rare after the 1940s, a couple in the 60s and 70s, slight
// growth in the 80s, a dip in the 90s, a boom in the 2000s that ends with the financial
// crash of 2008, then a new wave of makers buying into existing teams from 2014.
// The rest of the grid is independents: teams of drivers, engineers, sponsors and investors.

import { eraFor } from './eras.js';

const WORKS = [
  [1919, 6], [1929, 6], [1935, 7], [1939, 6], [1946, 4], [1950, 3], [1955, 3], [1959, 3],
  [1960, 2], [1969, 2], [1975, 2], [1980, 3], [1986, 4], [1989, 4], [1993, 3], [1998, 2],
  [2001, 3], [2005, 5], [2007, 6], [2008, 6], [2009, 3], [2011, 2], [2013, 2],
  [2014, 3], [2016, 5], [2018, 6], [2024, 7], [2060, 7],
];

function interp(table, year) {
  if (year <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    if (year <= table[i][0]) { const [y0, v0] = table[i - 1], [y1, v1] = table[i]; return v0 + ((v1 - v0) * (year - y0)) / (y1 - y0); }
  }
  return table[table.length - 1][1];
}

export const worksTargetFor = (year) => Math.round(interp(WORKS, year));
// total teams the era settles around (works plus independents), unchanged from the era table
export const totalTeamsFor = (year) => eraFor(year).worksTarget + eraFor(year).privTarget;
export const privTargetFor = (year) => Math.max(3, totalTeamsFor(year) - worksTargetFor(year));

// How likely a maker withdrawing its works team is to sell it on rather than close it.
export function sellOffChance(year) {
  if (year < 1946) return 0.12;
  if (year >= 2008 && year <= 2012) return 0.85;
  if (year >= 1990 && year < 2008) return 0.35;
  return 0.3;
}
// How likely a maker that wants in is to buy an existing independent team instead of founding one.
export function buyInChance(year) {
  if (year < 1985) return 0.05;
  if (year < 2000) return 0.12;
  if (year < 2008) return 0.3;
  if (year < 2014) return 0.15;
  return 0.7;
}
