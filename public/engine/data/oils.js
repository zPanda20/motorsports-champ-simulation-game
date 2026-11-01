// Oil and fuel suppliers. From 1960 every team has a supply deal, much as it has a tyre
// deal. A supplier is also a sponsor of the teams it supplies (the same company must not
// appear twice, and a rival oil brand cannot sponsor a team tied to another supplier).
// from/to: the real years the company was active in motorsport (never before OIL_FROM).
// home: the region its deals favour. size: how much money its deals are worth.
// sponsorId: the matching entry in data/sponsors.js, if the company was already there.

export const OIL_FROM = 1960;

const O = (id, name, country, home, from, size, extra = {}) => ({ id, name, country, home, from, to: 9999, size, ...extra });

export const OILS = [
  O('shell', 'Shell', 'GB', 'WEU', 1960, 1.0, { sponsorId: 'shell' }),
  O('bp', 'BP', 'GB', 'WEU', 1960, 0.9, { sponsorId: 'bp' }),
  O('gulf', 'Gulf', 'US', 'NAM', 1960, 0.7, { sponsorId: 'gulf' }),
  O('total', 'Total', 'FR', 'WEU', 1960, 0.6, { sponsorId: 'total' }),
  O('castrol', 'Castrol', 'GB', 'WEU', 1960, 0.6, { sponsorId: 'castrol' }),
  O('exxon', 'Exxon', 'US', 'NAM', 1960, 0.8, { sponsorId: 'esso', names: [[1960, 'Esso'], [1972, 'Exxon']] }),
  O('eni', 'Eni', 'IT', 'WEU', 1960, 0.6, { sponsorId: 'agip', names: [[1960, 'Agip'], [2000, 'Eni']] }),
  O('stp', 'STP', 'US', 'NAM', 1963, 0.4, { to: 1996 }),
  O('mobil', 'Mobil 1', 'US', 'NAM', 1960, 0.7, { names: [[1960, 'Mobil'], [1974, 'Mobil 1']] }),
  O('havoline', 'Havoline', 'US', 'NAM', 1962, 0.6, { sponsorId: 'texaco', to: 2001 }),
  O('valvoline', 'Valvoline', 'US', 'NAM', 1965, 0.4),
  O('sonoco', 'Sonoco', 'US', 'NAM', 1962, 0.3, { to: 1990 }),
  O('motul', 'Motul', 'FR', 'WEU', 1965, 0.4),
  O('idemitsu', 'Idemitsu', 'JP', 'ASP', 1967, 0.5),
  O('elf', 'Elf', 'FR', 'WEU', 1967, 0.7, { sponsorId: 'elf', to: 2000 }),
  O('ampol', 'Ampol', 'AU', 'ASP', 1962, 0.3, { to: 1999 }),
  O('pemex', 'Pemex', 'MX', 'NAM', 1963, 0.4),
  O('sonatrach', 'Sonatrach', 'DZ', 'MEA', 1975, 0.4),
  O('petrobras', 'Petrobras', 'BR', 'SAM', 1972, 0.5),
  O('petronas', 'Petronas', 'MY', 'ASP', 1974, 0.8),
  O('sonangol', 'Sonangol', 'AO', 'MEA', 1990, 0.4),
  O('sonabhy', 'SONABHY', 'BF', 'MEA', 1985, 0.2),
  O('aramco', 'Aramco', 'SA', 'MEA', 1988, 1.2, { sponsorId: 'aramco' }),
  O('gnpc', 'GNPC', 'GH', 'MEA', 2005, 0.2),
  O('petrochina', 'PetroChina', 'CN', 'ASP', 2000, 0.6),
  O('gazprom', 'Gazprom', 'RU', 'CEU', 2006, 0.7, { to: 2022 }),
  O('bapco', 'Bapco Energies', 'BH', 'MEA', 2005, 0.4),
];

export const OIL_BY_ID = Object.fromEntries(OILS.map((o) => [o.id, o]));
export const oilNameAt = (o, year) => { let n = o.name; for (const [from, name] of (o.names || [])) if (year >= from) n = name; return n; };
export const oilsOpenIn = (year) => OILS.filter((o) => year >= Math.max(o.from, OIL_FROM) && year <= o.to);
// sponsor ids that are really oil and fuel suppliers: they are sponsors only as a supplier
export const SUPPLIER_SPONSOR_IDS = new Set(OILS.filter((o) => o.sponsorId).map((o) => o.sponsorId));
