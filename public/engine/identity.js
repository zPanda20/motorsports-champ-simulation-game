// Team identities. A team keeps one id for ever (so records and contracts stay tied), but when it is
// sold and rebranded, or bought or sold by a maker, it becomes a different team in the eyes of the sport:
// its legacy starts again and the old identity is kept in the record books as a team of its own
// (Jaguar Racing stays a legend after Lotus buys it).
//
//   team.eras      closed identities: {name, from, to, titles, wins, brandId, kind, colors, nat, score, legendary, how, successor, owner}
//   team.idFrom    the first season of the identity racing now
//   team.idTitles0 / idWins0   the team's lifetime totals when this identity began

export function initIdentity(team) {
  if (!team.eras) team.eras = [];
  if (team.idFrom === undefined) { team.idFrom = team.foundedYear; team.idTitles0 = 0; team.idWins0 = 0; }
}

export const identityTitles = (t) => t.titles - (t.idTitles0 || 0);
export const identityWins = (t) => t.wins - (t.idWins0 || 0);

// `year` is the first season of the new identity; the old one ran up to the season before.
export function retireIdentity(world, team, year, how, successor) {
  initIdentity(team);
  const to = year - 1;
  if (to >= team.idFrom) {
    team.eras.push({
      name: team.name, from: team.idFrom, to,
      titles: identityTitles(team), wins: identityWins(team),
      brandId: team.brandId, kind: team.kind, nat: team.nat,
      colors: team.colors ? team.colors.slice() : null,
      score: team.legacy ? team.legacy.score : 0, legendary: !!(team.legacy && team.legacy.legendary),
      peakPrestige: team.legacy ? team.legacy.peakPrestige : team.prestige,
      how: how || 'sold', successor: successor || null, owner: team.owner ? team.owner.name : null,
    });
  }
  team.idFrom = year; team.idTitles0 = team.titles; team.idWins0 = team.wins;
  if (team.legacy) { team.legacy.score = 0; team.legacy.legendary = false; team.legacy.peakPrestige = team.prestige; }
  return team;
}

// the identity a team had in a season (for the colour of its season history)
export function identityAt(team, year) {
  const eras = team.eras || [];
  for (const e of eras) if (year >= e.from && year <= e.to) return e;
  return null;
}

export function legacyScore(titles, wins, years, peakPrestige) {
  return Math.round(titles * 12 + wins * 0.7 + years * 0.5 + peakPrestige * 0.2);
}
export const isLegendary = (score, titles) => score >= 90 && titles >= 3;

// Every identity in the record books: past ones and the one racing now, as one list.
export function allIdentities(world) {
  const out = [];
  for (const t of world.teams) {
    for (const e of (t.eras || [])) out.push({ ...e, teamId: t.id, current: false, active: false });
    const ended = !t.active && t.endedYear;
    out.push({
      name: t.name, from: t.idFrom === undefined ? t.foundedYear : t.idFrom, to: ended ? t.endedYear : null,
      titles: identityTitles(t), wins: identityWins(t), brandId: t.brandId, kind: t.kind, nat: t.nat,
      colors: t.colors || null, score: t.legacy ? t.legacy.score : 0, legendary: !!(t.legacy && t.legacy.legendary),
      teamId: t.id, current: true, active: t.active, how: ended ? 'closed' : null, successor: null,
    });
  }
  return out;
}

// Best-effort identities for a save made before this existed: split at the recorded buy-in or buy-out,
// and at the sales and rebrands the chronicle remembers. Titles come from the season records.
export function rebuildIdentities(world) {
  const champ = {};
  for (const h of (world.history && world.history.seasons) || []) if (h.championTeam) (champ[h.championTeam.id] = champ[h.championTeam.id] || []).push(h.year);
  for (const t of world.teams) {
    t.eras = [];
    t.idFrom = t.foundedYear; t.idTitles0 = 0; t.idWins0 = 0;
    // year -> the name the team took that year, from the chronicle
    const cuts = [];
    for (const c of world.chronicle || []) {
      const names = t.names || [t.name];
      let m;
      if ((m = /^(.+?) is sold to .+? and rebranded as (.+)\.$/.exec(c.text)) && names.indexOf(m[2]) >= 0 && names.indexOf(m[1]) >= 0) cuts.push({ year: c.year, from: m[1], to: m[2], how: 'sold' });
      else if ((m = /^.+? buys (.+?)(?: from .+?)? and runs it as a factory effort, (.+)\.$/.exec(c.text)) && names.indexOf(m[2]) >= 0) cuts.push({ year: c.year, from: m[1], to: m[2], how: 'bought by a maker' });
      else if ((m = /^.+? leaves, but sells its team to .+?: (.+?) becomes (.+?), powered by/.exec(c.text)) && names.indexOf(m[2]) >= 0) cuts.push({ year: c.year, from: m[1], to: m[2], how: 'sold by its maker' });
    }
    const o = t.origin;
    if (o && (o.type === 'buyout' || o.type === 'manufacturer-buyin') && !cuts.some((c) => c.year === o.year) && o.from) cuts.push({ year: o.year, from: o.from, to: t.name, how: o.type === 'buyout' ? 'sold by its maker' : 'bought by a maker' });
    cuts.sort((a, b) => a.year - b.year);
    const hist = t.history || [];
    // wins before the season records begin (they keep 60 years) belong to the earliest identity
    const unrecorded = Math.max(0, (t.wins || 0) - hist.reduce((a, h) => a + (h.wins || 0), 0));
    let from = t.foundedYear, nameNow = cuts.length ? cuts[0].from : t.name;
    let usedTitles = 0, usedWins = 0;
    for (let i = 0; i < cuts.length; i++) {
      const c = cuts[i];
      if (c.year <= from) { nameNow = c.to; continue; }
      const row = hist.filter((h) => h.year >= from && h.year < c.year).slice(-1)[0] || hist.find((h) => h.year >= from) || null;
      const titles = (champ[t.id] || []).filter((y) => y >= from && y < c.year).length;
      const wins = hist.filter((h) => h.year >= from && h.year < c.year).reduce((a, h) => a + (h.wins || 0), 0) + (i === 0 ? unrecorded : 0);
      const years = c.year - from;
      const score = legacyScore(titles, wins, years, t.legacy ? t.legacy.peakPrestige : t.prestige);
      t.eras.push({
        name: nameNow, from, to: c.year - 1, titles, wins,
        brandId: row ? row.brandId : t.brandId, kind: c.how === 'sold by its maker' ? 'works' : 'privateer',
        nat: t.nat, colors: null, score, legendary: isLegendary(score, titles), how: c.how === 'sold' ? 'sold' : c.how === 'bought by a maker' ? 'bought by a maker' : 'sold by its maker',
        successor: c.to, owner: null,
      });
      usedTitles += titles; usedWins += wins;
      from = c.year; nameNow = c.to;
    }
    if (t.eras.length) {
      t.idFrom = from;
      t.idTitles0 = Math.min(t.titles, usedTitles);
      t.idWins0 = Math.min(t.wins, usedWins);
      const titles = identityTitles(t), wins = identityWins(t);
      const end = t.endedYear && !t.active ? t.endedYear : world.year;
      const score = legacyScore(titles, wins, Math.max(0, end - from), t.legacy ? t.legacy.peakPrestige : t.prestige);
      if (t.legacy) { t.legacy.score = score; t.legacy.legendary = isLegendary(score, titles); }
    }
  }
}
