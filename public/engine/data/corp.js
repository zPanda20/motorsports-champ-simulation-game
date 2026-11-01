// Corporate history of the motor industry: mergers, renames and the large groups that
// owned several makers at once. All of it is fixed history on the real timeline; what
// the groups and mergers MEAN for racing is decided in engine/corp.js.
//
// A group member is {b: brandId, from, to}. A maker is in at most one group in a year.
// A member whose brand is not in the save is simply skipped.

export const MERGERS = [
  { year: 1926, from: ['daimler', 'benz'], into: 'mercedes', text: 'Daimler and Benz merge to form Daimler-Benz' },
  { year: 1932, from: ['audi', 'horch', 'dkw', 'wanderer'], into: 'autounion', text: 'Audi, Horch, DKW and Wanderer merge to form Auto Union' },
  { year: 1969, from: ['autounion', 'nsu'], into: 'autounion', text: 'Volkswagen buys NSU and merges it with Auto Union to form Audi NSU Auto Union' },
];

export const RENAMES = [
  { year: 1960, id: 'mercedes', name: 'Mercedes-Benz' },
  { year: 1978, id: 'autounion', name: 'Audi' },
];

const M = (b, from, to = 9999) => ({ b, from, to });

export const GROUPS = [
  { id: 'vw', names: [[1937, 'Volkswagen Group']], members: [M('volkswagen', 1937), M('autounion', 1965), M('porsche', 2012), M('lamborghini', 1998), M('bentley', 1998), M('bugatti', 1998, 2020)] },
  { id: 'fiat', names: [[1899, 'Fiat Group'], [2014, 'Fiat Chrysler'], [2021, 'Stellantis']], members: [M('fiat', 1899), M('lancia', 1969), M('alfa', 1986), M('maserati', 1993), M('chrysler', 2014), M('dodge', 2014), M('peugeot', 2021), M('citroen', 2021), M('opel', 2021), M('vauxhall', 2021)] },
  { id: 'mopar', names: [[1925, 'Mopar']], members: [M('chrysler', 1925, 1997), M('dodge', 1928, 1997), M('plymouth', 1928, 2001), M('chrysler', 2008, 2013), M('dodge', 2008, 2013)] },
  { id: 'daimlerchrysler', names: [[1998, 'DaimlerChrysler']], members: [M('mercedes', 1998, 2007), M('chrysler', 1998, 2007), M('dodge', 1998, 2007)] },
  { id: 'psa', names: [[1976, 'PSA Peugeot Citroën']], members: [M('peugeot', 1976, 2020), M('citroen', 1976, 2020), M('opel', 2017, 2020), M('vauxhall', 2017, 2020)] },
  { id: 'gm', names: [[1908, 'General Motors']], members: [M('buick', 1908), M('cadillac', 1909), M('chevrolet', 1918), M('pontiac', 1926), M('vauxhall', 1925, 2016), M('opel', 1929, 2016)] },
  { id: 'ford', names: [[1903, 'Ford Motor Company']], members: [M('ford', 1903), M('astonmartin', 1987, 2006), M('jaguar', 1989, 2007), M('volvo', 1999, 2009), M('mazda', 1979, 2008)] },
  { id: 'bl', names: [[1952, 'British Motor Corporation'], [1968, 'British Leyland']], members: [M('austin', 1952, 1993), M('jaguar', 1966, 1988)] },
  { id: 'tata', names: [[2008, 'Tata Motors']], members: [M('jaguar', 2008)] },
  { id: 'renault', names: [[1899, 'Renault Group'], [1999, 'Renault-Nissan Alliance']], members: [M('renault', 1899), M('alpine', 1973), M('nissan', 1999)] },
  { id: 'toyota', names: [[1937, 'Toyota Group']], members: [M('toyota', 1937), M('lexus', 1989)] },
  { id: 'hyundai', names: [[1967, 'Hyundai Motor Group']], members: [M('hyundai', 1967), M('kia', 1998), M('genesis', 2015)] },
  { id: 'geely', names: [[2010, 'Geely']], members: [M('volvo', 2010), M('polestar', 2017), M('lotus', 2017)] },
  { id: 'bmw', names: [[1916, 'BMW Group']], members: [M('bmw', 1916)] },
];

export const GROUP_BY_ID = Object.fromEntries(GROUPS.map((g) => [g.id, g]));

export function groupName(g, year) {
  let n = g.names[0][1];
  for (const [from, name] of g.names) if (year >= from) n = name;
  return n;
}

// which group owns a maker in a year, or null
export function groupOfBrand(brandId, year) {
  for (const g of GROUPS) {
    for (const m of g.members) if (m.b === brandId && year >= m.from && year <= m.to) return g.id;
  }
  return null;
}

// the makers that belong to a group in a year
export function membersAt(groupId, year) {
  const g = GROUP_BY_ID[groupId];
  return g ? g.members.filter((m) => year >= m.from && year <= m.to).map((m) => m.b) : [];
}

// ---- names for works teams ----------------------------------------------------------
// Generic styles by country, with a few that belong to an era. {X} is the maker's name.
const STYLES = {
  IT: ['Scuderia {X}', '{X} Corse', 'Squadra {X}', 'Officine {X}'],
  FR: ['Écurie {X}', 'Équipe {X}', '{X} Sport', 'Écurie {X} Course'],
  DE: ['{X} Rennabteilung', '{X} Rennsport', 'Rennteam {X}', '{X} Motorsport'],
  GB: ['{X} Racing', '{X} Grand Prix', '{X} Motor Racing', 'Team {X}', '{X} Competition Department'],
  US: ['{X} Racing', '{X} Motorsports', 'Team {X}', '{X} Speed Division'],
  JP: ['{X} Racing', 'Team {X}', '{X} Motorsports'],
  KR: ['{X} Racing', 'Team {X}'],
  SE: ['{X} Competition', '{X} Racing'],
  AU: ['{X} Racing', 'Team {X}'],
};
export function worksStyles(country, year) {
  const list = (STYLES[country] || ['{X} Racing', 'Team {X}']).slice();
  if (year >= 1990) return list.filter((s) => !/Rennabteilung|Officine|Competition Department|Speed Division/.test(s));
  if (year < 1950) return list.filter((s) => !/Motorsport|Competition Department|Speed Division/.test(s));
  return list;
}
