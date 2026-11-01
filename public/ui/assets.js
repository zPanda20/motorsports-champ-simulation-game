// Graphical assets: era backgrounds and maker badges. Pure lookups, no engine state.
// Paths are relative to index.html so the site works from any folder or sub-path.

// Badges drawn for particular makers. `to` is the last year the badge is shown; later the maker is
// text only (the 1920s Peugeot and Opel badges are period designs, not today's).
const LOGOS = {
  ballot: { file: 'ballot.png' },
  duesenberg: { file: 'duesenberg.png' },
  sunbeam: { file: 'sunbeam.png' },
  isotta: { file: 'isotta.png' },
  darracq: { file: 'darracq.png' },
  stutz: { file: 'stutz.png' },
  peugeot: { file: 'peugeot.png', to: 1929 },
  opel: { file: 'opel.png', to: 1929 },
};

export function logoFor(brandId, year) {
  const l = LOGOS[brandId];
  if (!l) return null;
  if (l.to && year !== undefined && year > l.to) return null;
  return 'assets/logos/' + l.file;
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
