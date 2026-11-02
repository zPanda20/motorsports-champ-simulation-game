// Name generator built from sound rules (Iberian/Latin open vowels, Italian doubled
// consonants, Dutch/German crisp endings, British -wood/-ford/-gate/-bury, Nordic
// -son/-berg, American town suffixes, particles like de/van/von).
// Generated full names are checked against a list of real drivers and re-rolled.

import { makeRng } from './rng.js';
import {
  FIRST_MID, FIRST_MODERN, FIRST_F_MID, FIRST_F_MODERN, FAMILY_EXTRA, NEW_NATIONALITIES, NEW_FIRST, NEW_FAMILY,
  W1919_X, W2020_X, TEAM_WORDS, TEAM_PLACES,
} from './data/names-ext.js';

const BASE_NATIONALITIES = ['GB', 'US', 'FR', 'IT', 'DE', 'ES', 'NL', 'BE', 'CH', 'SE', 'AT', 'AR', 'AU', 'BR', 'CA', 'JP', 'KR'];
export const NATIONALITIES = BASE_NATIONALITIES.concat(NEW_NATIONALITIES);

// More European in 1919, wider later. Linear blend between the two tables.
const W1919 = { GB: 22, US: 18, FR: 20, IT: 17, DE: 9, ES: 3, NL: 2, BE: 4, CH: 2, SE: 1, AT: 1, AR: 0.4, AU: 0.4, BR: 0.2, CA: 0.0, JP: 0, KR: 0, ...W1919_X };
const W2020 = { GB: 10, US: 11, FR: 7, IT: 8, DE: 8, ES: 6, NL: 4, BE: 3, CH: 2, SE: 3, AT: 2, AR: 5, AU: 6, BR: 8, CA: 5, JP: 6, KR: 3, ...W2020_X };

// base = true: only the original 17 nationalities (the fixed legend roster)
export function nationalityWeights(year, base = false) {
  const t = Math.max(0, Math.min(1, (year - 1919) / 101));
  const out = [];
  for (const n of (base ? BASE_NATIONALITIES : NATIONALITIES)) out.push({ n, w: W1919[n] * (1 - t) + W2020[n] * t });
  return out;
}

const FIRST = {
  GB: ['Arthur', 'Harold', 'Reginald', 'Clifford', 'Percy', 'Leslie', 'Cecil', 'Ernest', 'Walter', 'Douglas', 'Gilbert', 'Norman', 'Alfred', 'Basil', 'Victor', 'Roland'],
  US: ['Wilbur', 'Cyrus', 'Elmer', 'Chester', 'Howard', 'Lloyd', 'Virgil', 'Merle', 'Ralph', 'Earl', 'Dewey', 'Homer', 'Russell', 'Clarence', 'Orville', 'Floyd'],
  FR: ['Gaston', 'Lucien', 'Marcel', 'Étienne', 'Henri', 'Armand', 'Raymond', 'Maurice', 'Gustave', 'Édouard', 'Fernand', 'Jules', 'Albert', 'Léon', 'Paul', 'André'],
  IT: ['Giulio', 'Ugo', 'Enrico', 'Alberto', 'Bruno', 'Carlo', 'Dante', 'Franco', 'Guido', 'Luigi', 'Tullio', 'Mario', 'Nino', 'Renzo', 'Sandro', 'Vittorio'],
  DE: ['Hans', 'Otto', 'Fritz', 'Karl', 'Rudolf', 'Walther', 'Ernst', 'Gustav', 'Heinrich', 'Max', 'Werner', 'Emil', 'Ludwig', 'Konrad', 'Anton', 'Berthold'],
  ES: ['Joaquín', 'Alfonso', 'Eduardo', 'Ramón', 'Rafael', 'Tomás', 'Salvador', 'Ignacio', 'Mateo', 'Álvaro', 'Esteban', 'Federico', 'Pedro', 'Luis', 'Manuel', 'Xavier'],
  NL: ['Joost', 'Pieter', 'Willem', 'Cornelis', 'Hendrik', 'Maarten', 'Gerrit', 'Dirk', 'Jan', 'Sjoerd', 'Anton', 'Bram', 'Floris', 'Teun', 'Lodewijk', 'Rutger'],
  BE: ['Jacques', 'Guillaume', 'Pierre', 'Joseph', 'Frans', 'Edmond', 'Louis', 'Eugène', 'Désiré', 'Alphonse', 'Georges', 'Camille', 'Marcel', 'Émile', 'Hubert', 'Victor'],
  CH: ['Ulrich', 'Max', 'Felix', 'Rolf', 'Beat', 'Hugo', 'Walter', 'Jakob', 'Armin', 'Paul', 'Emil', 'Marc', 'Alois', 'Ernst', 'Gian', 'Remo'],
  SE: ['Erik', 'Nils', 'Gösta', 'Olof', 'Sven', 'Axel', 'Carl', 'Gunnar', 'Harald', 'Ivar', 'Knut', 'Lars', 'Per', 'Torsten', 'Anders', 'Folke'],
  AT: ['Franz', 'Josef', 'Leopold', 'Alois', 'Ferdinand', 'Rudi', 'Karl', 'Viktor', 'Anton', 'Emmerich', 'Georg', 'Hermann', 'Kurt', 'Lorenz', 'Matthias', 'Stefan'],
  AR: ['Juan', 'Oscar', 'Carlos', 'Roberto', 'Ernesto', 'Raúl', 'Ricardo', 'Alejandro', 'Julio', 'Héctor', 'Osvaldo', 'Marcos', 'Facundo', 'Gabriel', 'Nicolás', 'Santiago'],
  AU: ['Jack', 'Bruce', 'Keith', 'Clive', 'Ronald', 'Stuart', 'Colin', 'Murray', 'Neville', 'Trevor', 'Ian', 'Lachlan', 'Rodney', 'Barry', 'Graham', 'Wayne'],
  BR: ['Luiz', 'Fábio', 'Rodrigo', 'Paulo', 'Marcelo', 'Gustavo', 'Thiago', 'Caio', 'Renato', 'Vinícius', 'Eduardo', 'Felipe', 'Rafael', 'Bruno', 'Murilo', 'André'],
  CA: ['Gordon', 'Lawrence', 'Duncan', 'Wallace', 'Reid', 'Grant', 'Dale', 'Craig', 'Neil', 'Brent', 'Garry', 'Ian', 'Kirk', 'Allan', 'Marc', 'Ross'],
  KR: ['Min-jun', 'Seo-jun', 'Ji-ho', 'Hyun-woo', 'Joon-ho', 'Dae-hyun', 'Sung-min', 'Tae-yang', 'Jae-won', 'Woo-jin', 'Kang-dae', 'Yong-ho', 'Seung-hyun', 'Do-yoon', 'Eun-woo', 'Ha-joon'],
  JP: ['Haruki', 'Kenji', 'Shin', 'Takeshi', 'Ryo', 'Daichi', 'Satoshi', 'Kazuki', 'Hiroshi', 'Masato', 'Yuta', 'Naoki', 'Tetsu', 'Jun', 'Kei', 'Sho'],
};


const FIRST_F = {
  GB: ['Edith', 'Winifred', 'Dorothy', 'Gladys', 'Marjorie', 'Violet', 'Beatrice', 'Constance', 'Phyllis', 'Muriel', 'Hilda', 'Agnes', 'Vera', 'Eleanor', 'Mabel', 'Florence'],
  US: ['Opal', 'Pearl', 'Ruth', 'Thelma', 'Beulah', 'Vivian', 'Lorraine', 'Clara', 'Irene', 'Estelle', 'Nellie', 'Myrtle', 'Hazel', 'Gertrude', 'Ethel', 'Louise'],
  FR: ['Odette', 'Simone', 'Yvonne', 'Colette', 'Mathilde', 'Geneviève', 'Madeleine', 'Lucienne', 'Jeanne', 'Hélène', 'Suzanne', 'Claire', 'Renée', 'Marguerite', 'Berthe', 'Amélie'],
  IT: ['Giulia', 'Elena', 'Marta', 'Rosa', 'Carla', 'Livia', 'Franca', 'Lidia', 'Silvana', 'Teresa', 'Ida', 'Luciana', 'Anita', 'Adele', 'Bianca', 'Valentina'],
  DE: ['Ilse', 'Greta', 'Hedwig', 'Liesl', 'Marta', 'Helga', 'Anneliese', 'Gisela', 'Ursula', 'Elfriede', 'Hanna', 'Brigitte', 'Else', 'Clara', 'Irma', 'Lotte'],
  ES: ['Carmen', 'Pilar', 'Dolores', 'Inés', 'Rosario', 'Mercedes', 'Elena', 'Lucía', 'Amparo', 'Teresa', 'Consuelo', 'Isabel', 'Gloria', 'Marisol', 'Beatriz', 'Rocío'],
  NL: ['Anke', 'Marijke', 'Wilhelmina', 'Greet', 'Truus', 'Annelies', 'Hanneke', 'Sanne', 'Johanna', 'Cato', 'Femke', 'Lieke', 'Mien', 'Liesbeth', 'Fenna', 'Roos'],
  BE: ['Marguerite', 'Josephine', 'Louise', 'Cécile', 'Germaine', 'Alice', 'Odile', 'Mathilde', 'Simone', 'Lucie', 'Henriette', 'Yvette', 'Jeanne', 'Elise', 'Thérèse', 'Berthe'],
  CH: ['Heidi', 'Ursula', 'Verena', 'Margrit', 'Trudi', 'Elsbeth', 'Rosmarie', 'Gabi', 'Anna', 'Esther', 'Lina', 'Vreni', 'Sibylle', 'Maja', 'Nora', 'Franziska'],
  SE: ['Astrid', 'Ingrid', 'Greta', 'Karin', 'Britt', 'Sigrid', 'Elsa', 'Märta', 'Signe', 'Birgit', 'Linnea', 'Freja', 'Solveig', 'Hedda', 'Annika', 'Maj'],
  AT: ['Maria', 'Gertrud', 'Theresia', 'Rosa', 'Hermine', 'Elisabeth', 'Leopoldine', 'Anna', 'Resi', 'Friederike', 'Paula', 'Wilma', 'Mizzi', 'Klara', 'Hilde', 'Annemarie'],
  AR: ['Eva', 'María', 'Silvina', 'Lucía', 'Graciela', 'Marta', 'Norma', 'Alicia', 'Mirta', 'Susana', 'Julieta', 'Sofía', 'Valeria', 'Florencia', 'Camila', 'Paula'],
  AU: ['Joan', 'Betty', 'Shirley', 'Margaret', 'Marjorie', 'Valerie', 'Noreen', 'Beryl', 'Jill', 'Lorna', 'Dawn', 'Kerry', 'Tamsin', 'Robyn', 'Sheila', 'Trish'],
  BR: ['Luiza', 'Beatriz', 'Fernanda', 'Camila', 'Juliana', 'Marina', 'Helena', 'Aline', 'Carolina', 'Larissa', 'Renata', 'Patrícia', 'Bruna', 'Letícia', 'Gabriela', 'Mariana'],
  CA: ['Marion', 'Joyce', 'Lorraine', 'Heather', 'Gail', 'Wendy', 'Joan', 'Dianne', 'Judith', 'Sheila', 'Maureen', 'Colleen', 'Brenda', 'Lynn', 'Nadine', 'Marielle'],
  JP: ['Haruka', 'Yuki', 'Aiko', 'Mei', 'Rina', 'Sakura', 'Hana', 'Natsuki', 'Chiyo', 'Emi', 'Kaori', 'Mio', 'Naomi', 'Reiko', 'Noriko', 'Yui'],
  KR: ['Seo-yeon', 'Ji-woo', 'Ha-eun', 'Min-seo', 'Soo-ah', 'Yuna', 'Da-eun', 'Chae-won', 'Eun-ji', 'Hye-jin', 'Mi-rae', 'Ji-yoon', 'Sun-hee', 'Bo-ram', 'Na-yeon', 'Su-bin'],
};

// stems + endings per sound family; join() adds doubled consonants for Italian.
const FAMILY = {
  GB: { stems: ['Ash', 'Bar', 'Bright', 'Carter', 'Dun', 'Fair', 'Grim', 'Hast', 'Kings', 'Lang', 'Mer', 'Nor', 'Pen', 'Rad', 'Sher', 'Thorn', 'Whit', 'Wood', 'Har', 'Stan'], ends: ['wood', 'ford', 'gate', 'bury', 'ley', 'ton', 'ham', 'field', 'well', 'worth', 'by', 'shaw', 'win'] },
  US: { stems: ['Cole', 'Pratt', 'Haw', 'Lang', 'Mer', 'Ash', 'Bar', 'Dun', 'Fair', 'Hart', 'Brad', 'Gil', 'Hol', 'Mac', 'Rand', 'Tuck'], ends: ['ville', 'ton', 'field', 'burg', 'dale', 'man', 'son', 'ley', 'ridge', 'worth', 'well', 'ford'] },
  FR: { stems: ['Beau', 'Bel', 'Bou', 'Cha', 'Dar', 'Du', 'Fau', 'Gui', 'Lam', 'Mar', 'Mont', 'Pel', 'Rou', 'Sau', 'Thib', 'Val', 'Vi', 'Lan'], ends: ['mont', 'ier', 'ard', 'eau', 'ac', 'ault', 'ois', 'in', 'et', 'on', 'y', 'ot', 'ère'] },
  IT: { stems: ['Bal', 'Bar', 'Bel', 'Bon', 'Cal', 'Cam', 'Cas', 'Cav', 'Cor', 'Fer', 'Gal', 'Lom', 'Mar', 'Mor', 'Nar', 'Pal', 'Pas', 'Rav', 'Ros', 'Sal', 'Tor', 'Ven', 'Vit', 'Zan'], ends: ['i', 'o', 'a', 'etti', 'ini', 'oni', 'ucci', 'ardi', 'ero'], double: true },
  ES: { stems: ['Alv', 'Cal', 'Cas', 'Cor', 'Fern', 'Gal', 'Gom', 'Her', 'Lop', 'Mart', 'Mont', 'Nav', 'Ort', 'Pad', 'Quint', 'Rod', 'Sal', 'Tor', 'Vel', 'Zam'], ends: ['ez', 'ares', 'ero', 'edo', 'ano', 'illo', 'oza', 'ora', 'anda', 'ido'] },
  DE: { stems: ['Brau', 'Eisen', 'Frei', 'Gru', 'Hart', 'Hoff', 'Kess', 'Krau', 'Lan', 'Mül', 'Ness', 'Rauch', 'Schwar', 'Stei', 'Vogel', 'Wald', 'Wei', 'Zim'], ends: ['er', 'mann', 'berg', 'ner', 'ke', 'hardt', 'bach', 'stein', 'feld', 'hauer', 'sch'], particle: ['von ', 'von '] },
  NL: { stems: ['Bak', 'Hoek', 'Jans', 'Kui', 'Meij', 'Pieters', 'Smit', 'Verb', 'Vos', 'Wil', 'Brink', 'Dijk', 'Haan', 'Mol'], ends: ['ker', 'en', 'stra', 'hout', 'dijk', 'man', 'sen', 'aert', 'bos', 'hoven'], particle: ['van ', 'van der ', 'de ', 'van den '] },
  BE: { stems: ['Bak', 'Pieters', 'Verb', 'Dumont', 'Lam', 'Mar', 'Vos', 'Wil', 'Claes', 'Peeters', 'Mathy', 'Gilles'], ends: ['ker', 'en', 'aert', 'bos', 'hoven', 'ier', 'ard', 'ois', 'et', 'mans'], particle: ['van ', 'de ', 'van den '] },
  CH: { stems: ['Brun', 'Hess', 'Kell', 'Lutz', 'Mey', 'Sigr', 'Stal', 'Weber', 'Zurb', 'Rey', 'Mon', 'Gian'], ends: ['er', 'ler', 'li', 'mann', 'ner', 'ard', 'od', 'oni', 'ini'] },
  SE: { stems: ['And', 'Berg', 'Eng', 'Hell', 'Lind', 'Nils', 'Ols', 'Sjö', 'Stru', 'Sund', 'Ström', 'Ek', 'Holm'], ends: ['son', 'berg', 'qvist', 'dahl', 'gren', 'lund', 'ström', 'holm', 'sen'] },
  AT: { stems: ['Brau', 'Eisen', 'Frei', 'Gru', 'Hart', 'Hoff', 'Kess', 'Krau', 'Lan', 'Mül', 'Rauch', 'Stei', 'Wald', 'Zim'], ends: ['er', 'mann', 'berg', 'ner', 'hofer', 'bach', 'stein', 'feld', 'hauer', 'inger'] },
  AR: { stems: ['Alv', 'Cal', 'Cas', 'Cor', 'Fern', 'Gal', 'Gom', 'Her', 'Mart', 'Mont', 'Nav', 'Rod', 'Sal', 'Bel', 'Mar'], ends: ['ez', 'ero', 'ano', 'oni', 'etti', 'ini', 'ardi', 'ucci', 'a', 'o'] },
  AU: { stems: ['Ash', 'Bar', 'Bright', 'Dun', 'Fair', 'Kings', 'Lang', 'Nor', 'Pen', 'Sher', 'Thorn', 'Whit', 'Wood', 'Mc'], ends: ['wood', 'ford', 'gate', 'bury', 'ley', 'ton', 'ham', 'field', 'well', 'worth', 'by', 'shaw'] },
  BR: { stems: ['Alv', 'Cal', 'Cas', 'Cor', 'Fer', 'Gom', 'Lim', 'Mont', 'Nasc', 'Pere', 'Ribe', 'Sant', 'Teix', 'Vas'], ends: ['es', 'eira', 'ão', 'inho', 'ento', 'ares', 'edo', 'ota', 'ão'] },
  CA: { stems: ['Cole', 'Pratt', 'Haw', 'Lang', 'Ash', 'Bar', 'Dun', 'Fair', 'Hart', 'Brad', 'Mac', 'Tuck', 'Beau', 'Lam'], ends: ['ville', 'ton', 'field', 'burg', 'dale', 'man', 'son', 'ley', 'ridge', 'ault', 'ier'] },
  KR: { stems: ['Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim', 'Han', 'Shin', 'Seo', 'Kwon', 'Hwang', 'Song'], ends: [''] },
  JP: { stems: ['Aki', 'Hata', 'Ishi', 'Kata', 'Miya', 'Naka', 'Oka', 'Saka', 'Take', 'Tani', 'Yama', 'Waka', 'Fuji', 'Mori'], ends: ['mura', 'moto', 'yama', 'da', 'shima', 'zawa', 'saki', 'hara', 'no', 'bayashi'] },
};

// Real drivers whose exact full names must never be generated (short, extendable list).
const REAL_DRIVERS = new Set([
  'tazio nuvolari', 'juan manuel fangio', 'alberto ascari', 'stirling moss', 'jim clark', 'jackie stewart', 'niki lauda', 'ayrton senna', 'alain prost', 'michael schumacher',
  'lewis hamilton', 'sebastian vettel', 'max verstappen', 'fernando alonso', 'mika hakkinen', 'nigel mansell', 'nelson piquet', 'graham hill', 'mike hawthorn', 'jack brabham',
  'denny hulme', 'john surtees', 'jochen rindt', 'emerson fittipaldi', 'james hunt', 'mario andretti', 'alan jones', 'keke rosberg', 'damon hill', 'jacques villeneuve',
  'kimi raikkonen', 'jenson button', 'nico rosberg', 'rudolf caracciola', 'bernd rosemeyer', 'achille varzi', 'hermann lang', 'giuseppe farina', 'luigi fagioli', 'felice bonetto',
  'ralph de palma', 'jimmy murphy', 'louis chevrolet', 'gaston chevrolet', 'dario resta', 'howdy wilcox', 'jules goux', 'rene thomas', 'ralph mulford', 'eddie rickenbacker',
  'henry segrave', 'malcolm campbell', 'woolf barnato', 'tim birkin', 'louis wagner', 'felice nazzaro', 'vincenzo lancia', 'pietro bordino', 'antonio ascari', 'giulio masetti',
  'louis rigal', 'andre boillot', 'robert benoist', 'albert divo', 'jean chassagne', 'christian lautenschlager', 'max sailer', 'otto salzer', 'hans stuck', 'mike spence',
  'peter collins', 'tony brooks', 'jo siffert', 'pedro rodriguez', 'ronnie peterson', 'gilles villeneuve', 'carlos reutemann', 'gerhard berger', 'rubens barrichello', 'felipe massa',
]);

export function isRealDriverName(full) {
  return REAL_DRIVERS.has(full.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''));
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function lastVowelish(c) { return 'aeiouyáéíóúäöüèêàâ'.indexOf(c) >= 0; }

const FAM_CACHE = new Map();
function familyFor(nat, wide) {
  const key = nat + (wide ? '+' : '');
  if (FAM_CACHE.has(key)) return FAM_CACHE.get(key);
  const base = FAMILY[nat] || NEW_FAMILY[nat] || FAMILY.GB;
  const x = wide ? FAMILY_EXTRA[nat] : null;
  const fam = x ? { ...base, stems: base.stems.concat(x.stems), ends: base.ends.concat(x.ends) } : base;
  FAM_CACHE.set(key, fam);
  return fam;
}

// wide = true uses the longer stem and ending lists (the fixed legend roster keeps the original ones).
export function makeSurname(rng, nat, wide = false) {
  const fam = familyFor(nat, wide);
  let stem = rng.pick(fam.stems);
  let end = rng.pick(fam.ends);
  let joiner = '';
  // two vowels meeting (Nune + eiro) lose the first, in the wide lists only
  if (wide && end.length && lastVowelish(stem[stem.length - 1].toLowerCase()) && lastVowelish(end[0].toLowerCase())) stem = stem.slice(0, -1);
  if (fam.double) {
    const last = stem[stem.length - 1].toLowerCase();
    if (!lastVowelish(last) && end.length > 0 && 'aeiou'.indexOf(end[0]) >= 0 && rng.chance(0.55)) joiner = last;
  }
  // avoid awkward doubled letters and over-long words
  let name = cap(stem) + joiner + end;
  name = name.replace(/([a-zäöüéèêàâ])\1\1+/gi, '$1$1');
  if (fam.prefix && rng.chance(0.7)) name = rng.pick(fam.prefix) + name;
  else if (fam.particle && rng.chance(0.28)) name = rng.pick(fam.particle) + name;
  return name;
}

// first names follow the generation: old-fashioned for the early births, then the names of each later age
function eraMix(by) {
  if (by <= 1935) return [1, 0, 0];
  if (by < 1960) { const t = (by - 1935) / 25; return [1 - t, t, 0]; }
  if (by < 1980) return [0, 1, 0];
  if (by < 2000) { const t = (by - 1980) / 20; return [0, 1 - t, t]; }
  return [0, 0.15, 0.85];
}
export function makeFirstName(rng, nat, gender = 'M', by) {
  const F = gender === 'F';
  if (NEW_FIRST[nat]) return rng.pick(NEW_FIRST[nat][F ? 'f' : 'm']);
  const old = (F ? FIRST_F : FIRST)[nat] || (F ? FIRST_F : FIRST).GB;
  if (typeof by !== 'number') return rng.pick(old);
  const mid = (F ? FIRST_F_MID : FIRST_MID)[nat] || old;
  const modern = (F ? FIRST_F_MODERN : FIRST_MODERN)[nat] || mid;
  const mix = eraMix(by);
  const pools = [old, mid, modern];
  let pool = pools[0];
  if (mix[0] < 1) {
    const x = rng.next();
    pool = x < mix[0] ? pools[0] : x < mix[0] + mix[1] ? pools[1] : pools[2];
  }
  return rng.pick(pool);
}

// used: Set of full names already taken in this world (mutated).
// by: the person's birth year. Give it and the names suit the generation and use the wide surname lists;
// leave it out and the original narrow tables are used (the fixed legend roster).
export function makePersonName(rng, nat, used, gender = 'M', by) {
  const wide = typeof by === 'number';
  for (let tries = 0; tries < 60; tries++) {
    const first = makeFirstName(rng, nat, gender, by);
    const last = makeSurname(rng, nat, wide);
    const full = first + ' ' + last;
    if (isRealDriverName(full)) continue;
    if (used && used.has(full)) continue;
    if (used) used.add(full);
    return { first, last, full };
  }
  // vanishingly rare: add a middle initial
  const first = makeFirstName(rng, nat, gender, by);
  const last = makeSurname(rng, nat, wide);
  const full = first + ' ' + rng.pick('ABCDEFGHJKLMNPRSTW'.split('')) + '. ' + last;
  if (used) used.add(full);
  return { first, last, full };
}

const TEAM_SUFFIX = {
  GB: ['Special', 'Racing Syndicate', 'Motor Co.', 'Engineering'],
  US: ['Racing Co.', 'Motors', 'Speed Company', 'Special'],
  FR: ['Écurie', 'Automobiles', 'Équipe'],
  IT: ['Squadra', 'Officine', 'Corse'],
  DE: ['Rennstall', 'Motorenwerke', 'Rennabteilung'],
  ES: ['Escudería', 'Talleres', 'Hispano Racing'],
  NL: ['Racing', 'Garage', 'Motor Co.'],
  BE: ['Écurie', 'Garage', 'Racing'],
  CH: ['Racing', 'Garage', 'Rennstall'],
  SE: ['Racing', 'Motor AB', 'Verkstad'],
  AT: ['Rennstall', 'Motorenwerke', 'Racing'],
  AR: ['Escudería', 'Talleres', 'Racing'],
  AU: ['Racing', 'Motors', 'Special'],
  BR: ['Equipe', 'Racing', 'Oficinas'],
  CA: ['Racing', 'Motors', 'Speed Co.'],
  JP: ['Racing', 'Motors', 'Works'],
  KR: ['Racing', 'Motors', 'Works'],
  IE: ['Racing', 'Motors', 'Special'],
  PT: ['Equipa', 'Racing', 'Automóveis'],
  FI: ['Racing', 'Motors', 'Tekniikka'],
  DK: ['Racing', 'Motors', 'Motorsport'],
  NO: ['Racing', 'Motors', 'Verksted'],
  PL: ['Racing', 'Motors', 'Team'],
  MX: ['Escudería', 'Racing', 'Talleres'],
  CO: ['Escudería', 'Racing', 'Talleres'],
  ZA: ['Racing', 'Motors', 'Engineering'],
  NZ: ['Racing', 'Motors', 'Special'],
  IN: ['Racing', 'Motors', 'Motorsport'],
  CN: ['Racing', 'Motors', 'Motorsport'],
};

const PREFIX_STYLE = ['Écurie', 'Squadra', 'Escudería', 'Rennstall', 'Équipe', 'Equipe', 'Equipa', 'Scuderia'];
// words that follow a name in each age of the sport
function eraSuffixes(year) {
  if (year < 1950) return ['Racing', 'Motors', 'Special', 'Engineering', 'Racing Syndicate'];
  if (year < 1980) return ['Racing', 'Racing Team', 'Racing Developments', 'Engineering', 'Grand Prix', 'Automobiles', 'Racing Organisation', 'Team'];
  if (year < 2010) return ['Racing', 'Motorsport', 'Grand Prix', 'International', 'Racing Team', 'Autosport', 'Competition', 'Engineering', 'Racing Developments'];
  if (year < 2040) return ['Racing', 'Motorsport', 'Autosport', 'Competition', 'Performance', 'Grand Prix', 'Racing Team', 'Racing Group', 'Racing Technologies', 'Dynamics'];
  return ['Racing', 'Motorsport', 'Dynamics', 'Systems', 'Labs', 'Collective', 'Racing Group', 'Autonomics', 'Performance', 'Mobility'];
}
// A new independent team's name. Without a year the original narrow patterns are used.
export function makeTeamName(rng, nat, used, year) {
  const suffixes = TEAM_SUFFIX[nat] || TEAM_SUFFIX.GB;
  const wide = typeof year === 'number';
  for (let tries = 0; tries < 40; tries++) {
    let name;
    const roll = wide ? rng.next() : 1;
    if (roll < 0.12) {
      // named for a place
      const places = (TEAM_PLACES[nat] || []).concat(TEAM_PLACES._);
      name = rng.pick(places) + ' ' + rng.pick(eraSuffixes(year));
    } else if (roll < 0.22 && year >= 1960) {
      // named for an idea
      const words = year >= 1990 ? TEAM_WORDS.late : TEAM_WORDS.early;
      name = rng.pick(words) + ' ' + rng.pick(eraSuffixes(year));
    } else if (roll < 0.32 && year >= 1950) {
      // a partnership
      const a = makeSurname(rng, nat, true).replace(/^(von |van der |van den |van |de |du )/, '');
      const b = makeSurname(rng, nat, true).replace(/^(von |van der |van den |van |de |du )/, '');
      name = a + (rng.chance(0.5) ? ' & ' : '-') + b + (year >= 1980 && rng.chance(0.5) ? ' ' + rng.pick(eraSuffixes(year)) : '');
    } else {
      const sur = makeSurname(rng, nat, wide).replace(/^(von |van der |van den |van |de |du )/, '');
      const national = !wide || rng.chance(0.4);
      const suf = national ? rng.pick(suffixes) : rng.pick(eraSuffixes(year));
      name = PREFIX_STYLE.indexOf(suf) >= 0 ? suf + ' ' + sur : sur + ' ' + suf;
    }
    if (used && used.has(name)) continue;
    if (used) used.add(name);
    return name;
  }
  return 'Privateer ' + rng.int(100, 999);
}

// Deterministic helper for tests and the fixed legend roster.
export function nameRng(seed, ...labels) { return makeRng(seed, 'names', ...labels); }
