// Regions: where venues, teams and local racing live. Continents are the groups the
// continental series are built on.
export const REGIONS = [
  { id: 'WEU', name: 'Western Europe', continent: 'EUR' },
  { id: 'CEU', name: 'Central and Northern Europe', continent: 'EUR' },
  { id: 'NAM', name: 'North America', continent: 'AME' },
  { id: 'SAM', name: 'South America', continent: 'AME' },
  { id: 'ASP', name: 'Asia-Pacific', continent: 'APAC' },
  { id: 'MEA', name: 'Middle East and Africa', continent: 'MEA' },
];
export const CONTINENTS = [
  { id: 'EUR', name: 'European' }, { id: 'AME', name: 'Americas' }, { id: 'APAC', name: 'Asia-Pacific' }, { id: 'MEA', name: 'Middle East and Africa' },
];
const MAP = {
  GB: 'WEU', FR: 'WEU', IT: 'WEU', ES: 'WEU', PT: 'WEU', MC: 'WEU', BE: 'WEU', NL: 'WEU', IE: 'WEU',
  DE: 'CEU', CH: 'CEU', AT: 'CEU', SE: 'CEU', FI: 'CEU', DK: 'CEU', NO: 'CEU', PL: 'CEU',
  US: 'NAM', CA: 'NAM', MX: 'NAM', BR: 'SAM', AR: 'SAM', CO: 'SAM',
  JP: 'ASP', KR: 'ASP', AU: 'ASP', CN: 'ASP', MY: 'ASP', NZ: 'ASP', IN: 'ASP',
  BH: 'MEA', AE: 'MEA', ZA: 'MEA',
};
export const regionOf = (country) => MAP[country] || 'WEU';
export const continentOf = (regionId) => (REGIONS.find((r) => r.id === regionId) || REGIONS[0]).continent;
export const regionName = (id) => (REGIONS.find((r) => r.id === id) || { name: id }).name;
export const continentName = (id) => (CONTINENTS.find((r) => r.id === id) || { name: id }).name;
export const REGION_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r]));
