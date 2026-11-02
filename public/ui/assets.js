// Graphical assets: era backgrounds and maker badges. Pure lookups, no engine state.
// Paths are relative to index.html so the site works from any folder or sub-path.

// Badges for makers. A maker can have several, each for a span of years: {file, from, to}
// (inclusive; leave `from` or `to` out for "since always" and "to the present").
// A maker that has any badge ALWAYS shows one: in a year no badge covers (a gap between two
// designs, before the first, after the last) the badge whose years are nearest is used.
// To add a maker, or a newer design, put the file in assets/logos/ and add a line here.
const L = (file, from = 0, to = 9999) => ({ file, from, to });
const LOGOS = {
  // the 1920s makers drawn first (the Peugeot and Opel badges are 1920s designs, shown until newer ones exist)
  ballot: [L('ballot.png')],
  duesenberg: [L('duesenberg.png')],
  sunbeam: [L('sunbeam.png')],
  isotta: [L('isotta.png')],
  darracq: [L('darracq.png')],
  stutz: [L('stutz.png')],
  peugeot: [L('peugeot.png', 0, 1929)],
  opel: [L('opel.png', 0, 1929)],
  // one design each
  astonmartin: [L('Aston-Martin.png')],
  bmw: [L('BMW.webp')],
  brm: [L('BritishRacingMotorsLogo.png')],
  chrysler: [L('Chrysler.png', 0, 2008), L('Chrysler(2009-).png', 2009)],
  citroen: [L('Citron.png')],
  cooper: [L('Cooper_car_company.png')],
  bugatti: [L('Bugatti_Logo.png')],
  cosworth: [L('Cosworth.webp')],
  ilmor: [L('Ilmor.png')],
  judd: [L('Judd_logo.png')],
  matra: [L('Matra_sports_logo.webp')],
  polestar: [L('polestar-logo.png')],
  vanwall: [L('Vanwall_logo.png')],
  delage: [L('Delage.png')],
  ford: [L('Ford_logo_flat.webp')],
  lamborghini: [L('Lambo(1998-).png', 1998)],
  lozier: [L('Lozier.png')],
  nissan: [L('Nissan.png')],
  pontiac: [L('Pontiac.png')],
  // Audi's four rings: used for Audi before the merger as well as for Auto Union (Audi from 1978)
  audi: [L('Audi(2016-).svg', 2016)],
  autounion: [L('Audi(2016-).svg', 2016)],
  // several designs over the years
  chevrolet: [L('Chevrolet(1913-1931).png', 1913, 1931), L('chevy(1934-1950).png', 1934, 1950), L('Chevy(1978-2000).webp', 1978, 1999), L('Chevrolet(2000-).png', 2000)],
  dodge: [L('Dodge_Brothers.png', 1914, 1928), L('Dodge(2010-2022).png', 2010, 2021), L('Dodge(2022-).png', 2022)],
  honda: [L('HGK_Honda.png', 1948, 1962), L('Honda.svg', 1963)],
  alpine: [L('Alpine_1976-2017.svg', 0, 2016), L('Alpine.svg', 2017)],
  fiat: [L('Fiat(1931-1938).png', 1931, 1938), L('Fiat(1959-1968).png', 1959, 1968), L('Fiat(1973-2002).png', 1973, 2002), L('Fiat(2020-).webp', 2020)],
  lancia: [L('Lancia(1974-2002).png', 1974, 2002), L('Lancia(2007-2022).png', 2007, 2021), L('Lancia(2022-).png', 2022)],
  renault: [L('Renault(1900-1906).svg', 1900, 1906), L('Renault(1945-1959).png', 1945, 1959), L('Renault(1960-1967).png', 1960, 1967), L('Renault(1973-1982).png', 1973, 1982), L('Renault(2007-2015).webp', 2007, 2015), L('Renault(2021-).png', 2021)],
  toyota: [L('Toyota(1935-1949).png', 1935, 1948), L('toyota(1949-1958).png', 1949, 1958), L('Toyota(1989-2005).png', 1989, 2005), L('toyota(2006-2019).png', 2006, 2019), L('Toyota(2020-).webp', 2020)],
  volvo: [L('Volvo(1927-1930).png', 1927, 1929), L('Volvo(1930-1959).png', 1930, 1959), L('volvo(1999-2013).png', 1999, 2013), L('Volvo(2021-).png', 2021)],
  wanderer: [L('Wanderer(1918-1927).png', 1918, 1927), L('Wanderer(1928-1929).png', 1928, 1929), L('Wanderer(1930-1932).png', 1930, 1932)],
  jaguar: [L('Jaguar(2012-2022).png', 2012, 2021), L('jaguar(2022-).png', 2022)],
  kia: [L('KIA(!944-1964).webp', 1944, 1964), L('KIA(1994-2020).svg', 1994, 2020), L('KIA_modern.webp', 2021)],
  lotus: [L('Lotus(1948-1984).png', 1948, 1984), L('Lotus(1989-2010).webp', 1989, 2010)],
  vauxhall: [L('Vauxhall_1936-1940.svg', 1936, 1940), L('Vauxhall(2019-).svg', 2019)],
};

// Performance divisions: a works team that runs under the division's name wears its badge instead
// of the maker's (Toyota Gazoo, Honda Mugen). `match` is tested against the team name.
const DIVISIONS = [
  { brand: 'toyota', match: /gazoo/i, list: [L('Toyota_Gazoo_Racing_stacked_logo.webp')] },
  { brand: 'honda', match: /mugen/i, list: [L('Honda-Mugen.png', 0, 1999), L('honda-mugen-logo.png', 2000)] },
];
export function divisionLogo(brandId, teamName, year) {
  const d = DIVISIONS.find((x) => x.brand === brandId && x.match.test(teamName || ''));
  if (!d) return null;
  return 'assets/logos/' + encodeURI(pickNearest(d.list, year).file);
}

// every maker that has at least one badge
export const LOGO_BRANDS = Object.keys(LOGOS);
export const LOGO_FILES = [...new Set(Object.values(LOGOS).flat().concat(DIVISIONS.flatMap((d) => d.list)).map((l) => l.file))];

// the badge for a maker in a year: the one whose years cover it, else the nearest in time
function pickNearest(list, year) {
  if (year === undefined || year === null) return list[list.length - 1];
  let best = list[0], bestGap = Infinity;
  for (const l of list) {
    const gap = year < l.from ? l.from - year : year > l.to ? year - l.to : 0;
    if (gap < bestGap) { best = l; bestGap = gap; } // the earlier design wins a tie
  }
  return best;
}
export function logoFile(brandId, year) {
  const list = LOGOS[brandId];
  return list && list.length ? pickNearest(list, year).file : null;
}

export function logoFor(brandId, year) {
  const f = logoFile(brandId, year);
  return f ? 'assets/logos/' + encodeURI(f) : null;
}

// Decade backgrounds that exist so far.
export function backgroundFor(year) {
  if (year >= 1920 && year < 1930) return '1920s';
  if (year >= 1930 && year < 1940) return '1930s';
  if (year >= 1940 && year < 1950) return '1940s';
  if (year >= 1950 && year < 1960) return '1950s';
  if (year >= 1960 && year < 1970) return '1960s';
  if (year >= 1970 && year < 1980) return '1970s';
  if (year >= 1980 && year < 1990) return '1980s';
  if (year >= 1990 && year < 2000) return '1990s';
  return null;
}

// Small inline badge for lists and links.
export function logoIcon(brandId, year, name) {
  const src = logoFor(brandId, year);
  return src ? `<img class="mk-icon" src="${src}" alt="" loading="lazy">` : '';
}

// Large badge for page heroes.
export function logoHero(brandId, year, name) {
  const src = logoFor(brandId, year);
  return src ? `<img class="mk-hero" src="${src}" alt="${String(name || '').replace(/"/g, '&quot;')} badge">` : '';
}
