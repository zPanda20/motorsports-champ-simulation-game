import { OIL_FROM, SUPPLIER_SPONSOR_IDS } from './oils.js';

// Real sponsor brands with their real start and end windows (approximate).
// sector decides fit; marquee sponsors have personalities and drive big stories.
// reach: 'global' or a region id; risk: appetite for gambles on young drivers.
// tobacco brands vanish when advertising bans arrive (2005-2006).

export const SPONSORS = [
  { id: 'shell', name: 'Shell', sector: 'fuel', from: 1919, to: 9999, reach: 'global', size: 1.0, marquee: true, loyalty: 0.8, star: 0.2 },
  { id: 'bp', name: 'BP', sector: 'fuel', from: 1919, to: 9999, reach: 'global', size: 0.9, marquee: false },
  { id: 'castrol', name: 'Castrol', sector: 'oil', from: 1919, to: 9999, reach: 'global', size: 0.6, marquee: false },
  { id: 'esso', name: 'Esso', sector: 'fuel', from: 1919, to: 9999, reach: 'global', size: 0.8, marquee: false },
  { id: 'texaco', name: 'Texaco', sector: 'fuel', from: 1919, to: 2001, reach: 'NAM', size: 0.8, marquee: false },
  { id: 'agip', name: 'Agip', sector: 'fuel', from: 1926, to: 2010, reach: 'WEU', size: 0.6, marquee: false },
  { id: 'total', name: 'Total', sector: 'fuel', from: 1954, to: 9999, reach: 'WEU', size: 0.6, marquee: false },
  { id: 'elf', name: 'Elf', sector: 'fuel', from: 1967, to: 2000, reach: 'WEU', size: 0.7, marquee: false },
  { id: 'gulf', name: 'Gulf', sector: 'fuel', from: 1925, to: 9999, reach: 'global', size: 0.7, marquee: true, loyalty: 0.5, star: 0.5 },
  { id: 'martini', name: 'Martini', sector: 'drinks', from: 1968, to: 9999, reach: 'WEU', size: 0.8, marquee: true, loyalty: 0.7, star: 0.3 },
  { id: 'marlboro', name: 'Marlboro', sector: 'tobacco', from: 1968, to: 2006, reach: 'global', size: 1.6, marquee: true, loyalty: 0.9, star: 0.6 },
  { id: 'jps', name: 'John Player Special', sector: 'tobacco', from: 1968, to: 1986, reach: 'WEU', size: 1.1, marquee: true, loyalty: 0.8, star: 0.3 },
  { id: 'rothmans', name: 'Rothmans', sector: 'tobacco', from: 1968, to: 2005, reach: 'global', size: 1.0, marquee: false },
  { id: 'camel', name: 'Camel', sector: 'tobacco', from: 1970, to: 2005, reach: 'global', size: 1.0, marquee: false },
  { id: 'lucky', name: 'Lucky Strike', sector: 'tobacco', from: 1968, to: 2005, reach: 'global', size: 0.9, marquee: false },
  { id: 'goodyearad', name: 'Champion', sector: 'parts', from: 1919, to: 9999, reach: 'global', size: 0.4, marquee: false },
  { id: 'bosch', name: 'Bosch', sector: 'parts', from: 1919, to: 9999, reach: 'CEU', size: 0.5, marquee: false },
  { id: 'rolex', name: 'Rolex', sector: 'watches', from: 1968, to: 9999, reach: 'global', size: 0.9, marquee: true, loyalty: 0.9, star: 0.1 },
  { id: 'heuer', name: 'TAG Heuer', sector: 'watches', from: 1968, to: 9999, reach: 'global', size: 0.5, marquee: false },
  { id: 'olivetti', name: 'Olivetti', sector: 'tech', from: 1968, to: 1995, reach: 'WEU', size: 0.4, marquee: false },
  { id: 'canon', name: 'Canon', sector: 'tech', from: 1975, to: 9999, reach: 'ASP', size: 0.5, marquee: false },
  { id: 'honda_s', name: 'Epson', sector: 'tech', from: 1978, to: 9999, reach: 'ASP', size: 0.5, marquee: false },
  { id: 'ibm', name: 'IBM', sector: 'tech', from: 1968, to: 2005, reach: 'global', size: 0.6, marquee: false },
  { id: 'budweiser', name: 'Budweiser', sector: 'drinks', from: 1968, to: 9999, reach: 'NAM', size: 0.8, marquee: false },
  { id: 'heineken', name: 'Heineken', sector: 'drinks', from: 1968, to: 9999, reach: 'global', size: 0.8, marquee: true, loyalty: 0.6, star: 0.3 },
  { id: 'redbull', name: 'Red Bull', sector: 'energy', from: 1992, to: 9999, reach: 'global', size: 1.5, marquee: true, loyalty: 0.5, star: 0.9 },
  { id: 'monster', name: 'Monster Energy', sector: 'energy', from: 2002, to: 9999, reach: 'NAM', size: 0.7, marquee: false },
  { id: 'vodafone', name: 'Vodafone', sector: 'telecom', from: 1988, to: 9999, reach: 'WEU', size: 1.1, marquee: true, loyalty: 0.6, star: 0.3 },
  { id: 'telefonica', name: 'Telefónica', sector: 'telecom', from: 1990, to: 9999, reach: 'WEU', size: 0.6, marquee: false },
  { id: 'santander', name: 'Santander', sector: 'banking', from: 1990, to: 9999, reach: 'WEU', size: 0.9, marquee: false },
  { id: 'hsbc', name: 'HSBC', sector: 'banking', from: 1990, to: 9999, reach: 'global', size: 0.8, marquee: false },
  { id: 'ing', name: 'ING', sector: 'banking', from: 1995, to: 2020, reach: 'WEU', size: 0.6, marquee: false },
  { id: 'emirates', name: 'Emirates', sector: 'airline', from: 1985, to: 9999, reach: 'global', size: 1.0, marquee: true, loyalty: 0.8, star: 0.2 },
  { id: 'qatar', name: 'Qatar Airways', sector: 'airline', from: 1997, to: 9999, reach: 'global', size: 0.8, marquee: false },
  { id: 'aramco', name: 'Aramco', sector: 'fuel', from: 1990, to: 9999, reach: 'global', size: 1.2, marquee: true, loyalty: 0.8, star: 0.1 },
  { id: 'puma', name: 'Puma', sector: 'apparel', from: 1968, to: 9999, reach: 'global', size: 0.5, marquee: false },
  { id: 'amazon', name: 'Amazon', sector: 'tech', from: 2005, to: 9999, reach: 'global', size: 1.0, marquee: true, loyalty: 0.4, star: 0.6 },
  { id: 'twitch', name: 'Twitch', sector: 'media', from: 2014, to: 9999, reach: 'global', size: 0.5, marquee: false },
  { id: 'oracle', name: 'Oracle', sector: 'tech', from: 2005, to: 9999, reach: 'global', size: 0.9, marquee: false },
  { id: 'crypto', name: 'Digital exchange', sector: 'finance', from: 2018, to: 2026, reach: 'global', size: 0.8, marquee: false },
  { id: 'dhl', name: 'DHL', sector: 'logistics', from: 1985, to: 9999, reach: 'global', size: 0.6, marquee: false },
  { id: 'pirelli_s', name: 'Pirelli Tyres', sector: 'tyres', from: 1919, to: 9999, reach: 'WEU', size: 0.4, marquee: false },
];

export const SPONSOR_BY_ID = Object.fromEntries(SPONSORS.map((s) => [s.id, s]));
// From the year oil deals begin, fuel, oil and tyre companies are sponsors only as the
// suppliers of a team (see engine/org.js): the same company must never appear twice and a
// rival oil or tyre brand can not sponsor a team tied to another supplier.
export const sponsorsOpenIn = (year) => SPONSORS.filter((s) => year >= s.from && year <= s.to && !(year >= OIL_FROM && (SUPPLIER_SPONSOR_IDS.has(s.id) || s.sector === 'tyres')));

// Commercial sponsorship (team and driver sponsors) is allowed from 1968; before that
// only prize money, manufacturer support and owners' pockets pay the bills.
export const COMMERCIAL_FROM = 1968;
