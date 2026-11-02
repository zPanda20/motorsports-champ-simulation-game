// Real manufacturer names. A brand cannot appear before `founded` (real life), but
// may survive past its real-life death: strength and survival are rolled per save.
// Quality does NOT follow the real brand. Founding years are approximate.
//
// colors:     [primary, secondary] livery and page colours
// engineOnly: year windows in which the maker only builds engines for others and never
//             runs a works team of its own (it still has to decide to supply at all)
// via:        'merge' = does not exist until a corporate merger creates it (data/corp.js)
// until:      the last year the brand exists on its own (it merges into another)
// names:      the name changes with the years, [[from, name], ...]
// small:      a small engine builder: it cannot build the best engine of the year unless a big
//             maker partners with it (Ford-Cosworth, Mercedes-Ilmor), see engine/corp.js
// perf:       the performance division that runs the works team once it exists, [[from, name], ...]
//
// Ferrari, McLaren, Brabham and Tesla are not in this list on purpose: teams like them have to be
// created by the story of the series (a champion founding a team, an engineer founding a
// constructor), see engine/founders.js.

const B = (id, name, country, founded, colors, extra = {}) => ({ id, name, country, founded, colors, ...extra });

export const BRANDS = [
  B('lozier', 'Lozier', 'US', 1900, ['#6b3d1e', '#d9c27a']),
  B('mercer', 'Mercer', 'US', 1909, ['#7a1f1f', '#e0c36a']),
  B('stutz', 'Stutz', 'US', 1911, ['#c8102e', '#1d3f8a']),
  B('duesenberg', 'Duesenberg', 'US', 1913, ['#c9a227', '#14213d']),
  B('darracq', 'Darracq', 'FR', 1896, ['#7a0c14', '#f3e9d2']),
  B('delage', 'Delage', 'FR', 1905, ['#1d3f8a', '#f3e9d2']),
  B('peugeot', 'Peugeot', 'FR', 1889, ['#0b2e6b', '#f2f2f2'], { perf: [[1982, 'Peugeot Talbot Sport'], [1990, 'Peugeot Sport']] }),
  B('ballot', 'Ballot', 'FR', 1905, ['#14337a', '#d6a329']),
  B('sunbeam', 'Sunbeam', 'GB', 1901, ['#0a1a6e', '#d6b13a']),
  B('vauxhall', 'Vauxhall', 'GB', 1903, ['#b0172a', '#f3e9d2']),
  B('fiat', 'Fiat', 'IT', 1899, ['#a4141f', '#f3e9d2']),
  B('itala', 'Itala', 'IT', 1904, ['#8c1a1a', '#d8c18a']),
  B('isotta', 'Isotta Fraschini', 'IT', 1900, ['#7a0c14', '#f3e9d2']),
  B('bugatti', 'Bugatti', 'FR', 1909, ['#1a3f94', '#e8c548']),
  B('opel', 'Opel', 'DE', 1899, ['#f4c20d', '#111111']),
  // the two firms that merge in 1926
  B('daimler', 'Daimler', 'DE', 1890, ['#cfd3d9', '#1b1b1b'], { until: 1926 }),
  B('benz', 'Benz', 'DE', 1883, ['#9aa1ab', '#7a1f1f'], { until: 1926 }),
  // the merged firm: Daimler-Benz from 1926, Mercedes-Benz from 1960, engines only 1955-2009
  B('mercedes', 'Daimler-Benz', 'DE', 1926, ['#cdd2d8', '#00a19b'], { via: 'merge', names: [[1926, 'Daimler-Benz'], [1960, 'Mercedes-Benz']], engineOnly: [[1955, 2009]], perf: [[2010, 'Mercedes AMG']] }),
  // already trading in 1919, added to the pool
  B('alfa', 'Alfa Romeo', 'IT', 1910, ['#9b111e', '#f3f3f3'], { perf: [[1963, 'Alfa Romeo Autodelta'], [1986, 'Alfa Romeo Racing']] }),
  B('maserati', 'Maserati', 'IT', 1914, ['#12335e', '#c8102e']),
  B('astonmartin', 'Aston Martin', 'GB', 1913, ['#00594f', '#f3d54a']),
  B('bmw', 'BMW', 'DE', 1916, ['#1c69d4', '#f3f3f3'], { perf: [[1972, 'BMW M Motorsport']] }),
  // the four firms that merge into Auto Union in 1932
  B('audi', 'Audi', 'DE', 1909, ['#b9bec5', '#1b1b1b'], { until: 1932 }),
  B('horch', 'Horch', 'DE', 1899, ['#7c8793', '#111111'], { until: 1932 }),
  B('dkw', 'DKW', 'DE', 1916, ['#b3252e', '#e8e8e8'], { until: 1932 }),
  B('wanderer', 'Wanderer', 'DE', 1896, ['#2e5e3a', '#dddddd'], { until: 1932 }),
  B('nsu', 'NSU', 'DE', 1873, ['#1d4f9c', '#f3f3f3'], { until: 1969 }),
  B('autounion', 'Auto Union', 'DE', 1932, ['#bfc4cb', '#b0121b'], { via: 'merge', names: [[1932, 'Auto Union'], [1969, 'Audi NSU Auto Union'], [1978, 'Audi']], perf: [[1983, 'Audi Sport']] }),
  B('ford', 'Ford', 'US', 1903, ['#0b3a8a', '#f3f3f3'], { perf: [[1991, 'Ford Special Vehicle Team']] }),
  B('chevrolet', 'Chevrolet', 'US', 1911, ['#c9a227', '#1b3b73']),
  B('renault', 'Renault', 'FR', 1899, ['#f2c200', '#111111'], { perf: [[1976, 'Renault Sport']] }),
  B('lancia', 'Lancia', 'IT', 1906, ['#1f3a8c', '#c9a227'], { perf: [[1963, 'Lancia HF Squadra Corse']] }),
  B('austin', 'Austin', 'GB', 1905, ['#0b6b3a', '#f3e9d2']),
  B('bentley', 'Bentley', 'GB', 1919, ['#0b5d3a', '#d4c08a']),
  // arriving later
  B('mazda', 'Mazda', 'JP', 1920, ['#a3151f', '#1b1b1b'], { perf: [[1981, 'Mazdaspeed']] }),
  B('jaguar', 'Jaguar', 'GB', 1922, ['#0b4f2e', '#c9a54a']),
  B('volvo', 'Volvo', 'SE', 1927, ['#003057', '#8fb8de']),
  B('porsche', 'Porsche', 'DE', 1931, ['#c0c4cc', '#b3121a'], { perf: [[1972, 'Porsche Motorsport']] }),
  B('volkswagen', 'Volkswagen', 'DE', 1937, ['#001e50', '#5da9e9'], { perf: [[1972, 'Volkswagen Motorsport']] }),
  B('nissan', 'Nissan', 'JP', 1933, ['#c3002f', '#cfd2d6'], { perf: [[1984, 'Nissan Nismo']] }),
  B('toyota', 'Toyota', 'JP', 1937, ['#eb0a1e', '#f3f3f3'], { perf: [[1954, 'Toyota TRD'], [2007, 'Toyota Gazoo TRD']] }),
  B('brm', 'BRM', 'GB', 1945, ['#115c36', '#e8e8e8'], { small: true, engineOnly: [[1945, 9999]] }),
  B('matra', 'Matra', 'FR', 1945, ['#1c3fa0', '#f3f3f3']),
  B('cooper', 'Cooper', 'GB', 1947, ['#1c7a45', '#111111']),
  B('honda', 'Honda', 'JP', 1948, ['#d4121a', '#f3f3f3'], { perf: [[1973, 'Honda Mugen']] }),
  B('vanwall', 'Vanwall', 'GB', 1949, ['#0f5a38', '#c8d4c0']),
  B('lotus', 'Lotus', 'GB', 1952, ['#f2c200', '#0f5a38']),
  B('subaru', 'Subaru', 'JP', 1953, ['#1f4fa3', '#f2c200'], { perf: [[1988, 'Subaru STI']] }),
  B('lamborghini', 'Lamborghini', 'IT', 1963, ['#e0b100', '#111111'], { perf: [[2013, 'Lamborghini Squadra Corse']] }),
  B('hyundai', 'Hyundai', 'KR', 1967, ['#003478', '#9bc0ea'], { perf: [[1998, 'Hyundai Motorsport'], [2015, 'Hyundai N Motorsport']] }),
  B('ligier', 'Ligier', 'FR', 1969, ['#1d56b8', '#f3f3f3']),
  B('lexus', 'Lexus', 'JP', 1989, ['#8a8f98', '#1b1b1b']),
  B('genesis', 'Genesis', 'KR', 2015, ['#1b1b1b', '#b08d57'], { perf: [[2023, 'Genesis Magma']] }),
  B('polestar', 'Polestar', 'SE', 2017, ['#1b1b1b', '#e8a33a']),
  // makers added so that real corporate groups can form on the real timeline
  B('citroen', 'Citroën', 'FR', 1919, ['#c4161c', '#e8e8e8'], { perf: [[1980, 'Citroën Sport'], [2007, 'Citroën Racing']] }),
  B('chrysler', 'Chrysler', 'US', 1925, ['#1b3b73', '#b8bcc4'], { perf: [[1964, 'Chrysler Mopar']] }),
  B('dodge', 'Dodge', 'US', 1914, ['#b01e23', '#1b1b1b'], { perf: [[1964, 'Mopar Dodge'], [2011, 'Dodge SRT']] }),
  B('plymouth', 'Plymouth', 'US', 1928, ['#274e9a', '#e6e6e6'], { perf: [[1964, 'Mopar Plymouth']] }),
  B('buick', 'Buick', 'US', 1903, ['#8c1d2b', '#b7bcc4']),
  B('cadillac', 'Cadillac', 'US', 1902, ['#13213d', '#b08d57']),
  B('pontiac', 'Pontiac', 'US', 1926, ['#c1121f', '#d9a21b']),
  B('kia', 'Kia', 'KR', 1944, ['#bb162b', '#e8e8e8']),
  B('alpine', 'Alpine', 'FR', 1955, ['#0b4fb8', '#ec6ca8']),
  // engine builders that never run a works team
  B('climax', 'Coventry Climax', 'GB', 1950, ['#4e5d3a', '#e8e0c0'], { small: true, engineOnly: [[1950, 9999]] }),
  B('cosworth', 'Cosworth', 'GB', 1958, ['#1e3f7a', '#e4b300'], { small: true, engineOnly: [[1958, 9999]] }),
  B('judd', 'Judd', 'GB', 1971, ['#5a5a5a', '#e4572e'], { small: true, engineOnly: [[1971, 9999]] }),
  B('ilmor', 'Ilmor', 'GB', 1984, ['#2b2b2b', '#e4a11b'], { small: true, engineOnly: [[1984, 9999]] }),
];

export const BRAND_DEF = Object.fromEntries(BRANDS.map((b) => [b.id, b]));

// a value that changes over the years, [[from, value], ...]
export function atYear(timeline, year, fallback) {
  let v = fallback;
  if (!timeline) return v;
  for (const [from, val] of timeline) if (year >= from) v = val;
  return v;
}
export const brandNameAt = (def, year) => atYear(def.names, year, def.name);

export const isSmallBuilder = (brandId) => !!(BRAND_DEF[brandId] && BRAND_DEF[brandId].small);

// true while the maker is only allowed to build engines for others
export function engineOnlyAt(brandId, year) {
  const d = BRAND_DEF[brandId];
  if (!d || !d.engineOnly) return false;
  return d.engineOnly.some(([a, b]) => year >= a && year <= b);
}

// brands that exist from the start of a world that begins in `year`
export function brandsAtStart(year) {
  return BRANDS.filter((d) => d.founded <= year && !(d.until !== undefined && d.until <= year));
}

// the fallback colours for a brand or team that has none (saves from older versions)
function hslHex(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const x = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
  return '#' + x(f(0)) + x(f(8)) + x(f(4));
}
export function hashColors(key) {
  let h = 0;
  for (const c of String(key)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const hue = h % 360;
  return [hslHex(hue, 55, 36), hslHex((hue + 40) % 360, 35, 86)];
}
export function brandColors(id) {
  const d = BRAND_DEF[id];
  return d && d.colors ? d.colors : hashColors(id);
}
