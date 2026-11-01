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
  chrysler: [L('Chrysler.png')],
  citroen: [L('Citron.png')],
  cooper: [L('Cooper_car_company.png')],
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
  jaguar: [L('Jaguar(2012-2022).png', 2012, 2021), L('jaguar(2022-).png', 2022)],
  kia: [L('KIA(!944-1964).webp', 1944, 1964), L('KIA(1994-2020).svg', 1994, 2020), L('KIA_modern.webp', 2021)],
  lotus: [L('Lotus(1948-1984).png', 1948, 1984), L('Lotus(1989-2010).webp', 1989, 2010)],
  vauxhall: [L('Vauxhall_1936-1940.svg', 1936, 1940), L('Vauxhall(2019-).svg', 2019)],
};

// every maker that has at least one badge
export const LOGO_BRANDS = Object.keys(LOGOS);
export const LOGO_FILES = [...new Set(Object.values(LOGOS).flat().map((l) => l.file))];

// the badge for a maker in a year: the one whose years cover it, else the nearest in time
export function logoFile(brandId, year) {
  const list = LOGOS[brandId];
  if (!list || !list.length) return null;
  if (year === undefined || year === null) return list[list.length - 1].file;
  let best = list[0], bestGap = Infinity;
  for (const l of list) {
    const gap = year < l.from ? l.from - year : year > l.to ? year - l.to : 0;
    if (gap < bestGap) { best = l; bestGap = gap; } // the earlier design wins a tie
  }
  return best.file;
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
