// Every page of the game as a function from the world to HTML. Names are links; the router
// in app.js turns the link into a page. Nothing here changes the world.

import { driverById, teamById, brandById, entryById, tyreById, activeEntries } from '../engine/world.js';
import { statsAt, STAT_KEYS, STAT_LABELS, ageAt, overallAt } from '../engine/drivers.js';
import { eraFor, scoringFor, SCORING_TIMELINE } from '../engine/data/eras.js';
import { TRACK_BY_ID, TRACKS } from '../engine/data/tracks.js';
import { REGIONS, regionOf, REGION_BY_ID } from '../engine/data/regions.js';
import { TECHS, bannedIn, availableIn } from '../engine/data/tech.js';
import { SPONSOR_BY_ID, SPONSORS, COMMERCIAL_FROM } from '../engine/data/sponsors.js';
import { describeCar } from '../engine/car.js';
import { adoptionShares } from '../engine/techs.js';
import { money, avgFac, moneyScale } from '../engine/org.js';
import { seriesById, lowTeamById, activeSeries, seriesTier, tierStandings, scoutEstimate } from '../engine/tiers.js';
import { KINDS } from '../engine/data/ladder.js';
import { PERSONALITIES, KIND_LABELS, pendingItems } from '../engine/governor.js';
import { entryStandings, driverStandings, brandStandings } from '../engine/season.js';
import { titleTables, recordBook, trackHistory, driverSeasons, driverTeams, teamDriverTenure, rivalries } from '../engine/records.js';
import { formatTime, raceRecap } from '../engine/recap.js';
import { esc, link, table, bar, kv, panel, small, tag, pct, ordinal, band, subtabs } from './common.js';
import { brandMark, teamMark, teamBadge, teamPalette, brandPalette, lowTeamPalette, rowFor, branded, swatch, identityPalette, identityBadge } from './colors.js';
import { allIdentities, identityAt, identityTitles, identityWins } from '../engine/identity.js';
import { GROUPS, GROUP_BY_ID, groupName, groupOfBrand, membersAt } from '../engine/data/corp.js';
import { OILS, OIL_BY_ID, oilNameAt, OIL_FROM } from '../engine/data/oils.js';
import { engineOnlyAt, BRAND_DEF } from '../engine/data/brands.js';
import { PROGRAMME_LABEL } from '../engine/corp.js';

const dn = (w, id) => { const d = driverById(w, id); return d ? link('driver', d.id, d.name) : '?'; };
// a team's name, led by its maker's badge (works team) or its livery chip; `name` is the name it had that year
const tn = (w, id, name) => { const t = teamById(w, id); return t ? teamBadge(w, t.id) + link('team', t.id, name || t.name) : esc(name || '?'); };
const bn = (w, id, name) => { const b = brandById(w, id); return b ? brandMark(w, b.id, w.year) + link('brand', b.id, name || b.name) : esc(id === 'none' ? '-' : id); };
const trn = (id) => { const t = TRACK_BY_ID[id]; return t ? link('track', id, t.name) : esc(id); };
const sn = (w, id) => { const s = seriesById(w, id); return s ? link('series', s.id, s.name) : '?'; };
const ltn = (w, id) => { const t = lowTeamById(w, id); return t ? swatch(lowTeamPalette(w, t)) + link('lowteam', t.id, t.name) : '?'; };
const gn = (id, year) => { const g = GROUP_BY_ID[id]; return g ? link('group', g.id, groupName(g, year)) : esc(id); };
const driverText = (w, id) => { const d = driverById(w, id); return d ? d.name : '?'; };
const teamText = (w, id) => { const t = teamById(w, id); return t ? t.name : '?'; };
const brandText = (w, id) => { const b = brandById(w, id); return b ? b.name : '?'; };

const GOAL_LABEL = { glory: 'Glory', profit: 'Profit', brand: 'Brand image', legacy: 'Legacy' };
const ROLE_LABEL = { principal: 'Team principal', techDirector: 'Technical director', raceEngineer: 'Race engineer', chiefMechanic: 'Chief mechanic' };
const KIND_NAME = { scene: 'Local scene', continental: 'Continental championship', feeder: 'Feeder series', localDev: 'Development series', globalJunior: 'Global junior series', lowerJunior: 'Lower junior series' };

// ---------------------------------------------------------------- race reports

export function classTableHtml(w, rows) {
  return '<table><thead><tr><th>Pos</th><th>No.</th><th>Driver</th><th>Team</th><th class="num">Laps</th><th class="num">Time / status</th><th class="num">Pts</th></tr></thead><tbody>' +
    rows.map((x) => { const pal = teamPalette(w, x.teamId); return `<tr class="tc ${x.status === 'DNF' ? 'out' : ''}" style="--rc:${pal[0]};--rc2:${pal[1]}"><td>${x.pos || '-'}</td><td>${x.number}</td><td>${dn(w, x.driverId)}</td><td>${tn(w, x.teamId)}</td><td class="num">${x.laps}</td><td class="num">${x.status === 'Finished' ? formatTime(x.time) : x.status === 'DNF' ? `lap ${x.outLap}: ${esc(x.reason)}` : esc(x.status)}</td><td class="num">${x.points || ''}</td></tr>`; }).join('') + '</tbody></table>';
}

export function raceDetailsHtml(w, r) {
  const T = TRACK_BY_ID[r.trackId];
  const win = r.classification.find((x) => x.pos === 1);
  const feedLines = (r.events || []).filter((e) => e.kind !== 'pass').map((e) => {
    const row = r.classification.find((x) => x.entryId === e.id);
    return `Lap ${e.lap}: #${row ? row.number : '?'} ${row ? esc(driverText(w, row.driverId)) : ''} ${esc(e.text)}`;
  });
  const qual = (r.qualifying || []).map((q) => { const row = r.classification.find((x) => x.entryId === q.entryId); return `${q.pos}. #${row ? row.number : '?'}`; }).join('  ');
  return `<details><summary>Round ${r.round + 1}: ${esc(T ? T.name : r.trackId)} · ${win ? esc(driverText(w, win.driverId)) + ' (' + esc(brandText(w, win.brandId)) + ')' : 'no winner'} · ${r.finishers}/${r.starters} finished${r.endurance ? ' · endurance round' : ''}</summary>` +
    `<div class="race-body">${r.classification.length ? `<pre class="recap">${esc(raceRecap(w, r).join('\n'))}</pre>` : ''}` +
    classTableHtml(w, r.classification) +
    (qual ? `<div class="small">Starting grid: ${esc(qual)}</div>` : '') +
    (feedLines.length ? `<details><summary>Incident feed (${feedLines.length})</summary><pre class="recap">${esc(feedLines.join('\n'))}</pre></details>` : '') +
    '</div></details>';
}

// ---------------------------------------------------------------- standings

export function pageStandings(w) {
  const era = eraFor(w.year);
  const dr = driverStandings(w).slice(0, 25);
  const en = entryStandings(w).slice(0, 30);
  const br = brandStandings(w).slice(0, 16);
  const tsum = {};
  for (const r of entryStandings(w)) { const e = entryById(w, r.id); if (!e) continue; const t = (tsum[e.teamId] = tsum[e.teamId] || { id: e.teamId, pts: 0, wins: 0 }); t.pts += r.pts; t.wins += r.wins; }
  const teams = Object.values(tsum).sort((a, b) => b.pts - a.pts || b.wins - a.wins).slice(0, 20);
  const done = w.history.seasons.filter((h) => !h.cancelled && h.champion).slice(-1)[0];
  return panel(`${w.year} championship`, small(`${esc(era.name)} · top ${w.regs.scoring.length} score: ${w.regs.scoring.join(', ')} · ${w.season.round} of ${w.season.calendar.length} rounds run` +
      (done ? ` · <a class="lk" href="#/standings/${done.year}">${done.year} final standings</a> · <a class="lk" href="#/chronicle">every season</a>` : ''))) +
    panel('Drivers', table(['#', 'Driver', 'Team', { t: 'Pts', num: 1 }, { t: 'W', num: 1 }], dr.map((r, i) => {
      const e = activeEntries(w).find((x) => x.driverId === r.id);
      const cells = [i + 1, dn(w, r.id), e ? tn(w, e.teamId) : '', r.pts, r.wins];
      return e ? rowFor(cells, teamPalette(w, e.teamId)) : cells;
    }))) +
    '<div class="two">' + panel('Teams', table(['#', 'Team', { t: 'Pts', num: 1 }, { t: 'W', num: 1 }], teams.map((r, i) => rowFor([i + 1, tn(w, r.id), r.pts, r.wins], teamPalette(w, r.id))))) +
    panel('Makers', table(['#', 'Maker', { t: 'Pts', num: 1 }, { t: 'W', num: 1 }], br.map((r, i) => rowFor([i + 1, bn(w, r.id), r.pts, r.wins], brandPalette(r.id))))) +
    '</div>' +
    panel('Entries (points belong to the entry, not the driver)', table(['#', 'Entry', 'Driver', { t: 'Pts', num: 1 }, { t: 'W', num: 1 }], en.map((r, i) => {
      const e = entryById(w, r.id);
      const cells = [i + 1, e ? `#${e.number} ${tn(w, e.teamId)}${e.type === 'partial' ? tag('part') : ''}` : '?', e && e.driverId != null ? dn(w, e.driverId) : '', r.pts, r.wins];
      return e ? rowFor(cells, teamPalette(w, e.teamId)) : cells;
    })));
}

// The final points tables of any finished season, in the colours of each team.
export function pageSeasonStandings(w, year) {
  const h = w.history.seasons.find((x) => x.year === year);
  if (!h) return w.season && w.season.year === year ? pageStandings(w) : panel(`${year} standings`, small('That season is not on record.'));
  if (h.cancelled || h.empty || !h.champion || !h.final) return panel(`${year} standings`, small(h.cancelled ? `No championship was held: ${esc(h.cancelled.name)}.` : 'No final tables are on record for this season.'));
  const f = h.final;
  const years = w.history.seasons.filter((x) => !x.cancelled && !x.empty && x.champion).map((x) => x.year);
  const i = years.indexOf(year);
  const nav = '<div class="controls">' + (i > 0 ? `<a class="btnlink" href="#/standings/${years[i - 1]}">&larr; ${years[i - 1]}</a>` : '') + `<a class="btnlink" href="#/chronicle/${year}">${year} in the Chronicle</a>` + (i < years.length - 1 ? `<a class="btnlink" href="#/standings/${years[i + 1]}">${years[i + 1]} &rarr;</a>` : '') + '</div>';
  const scoring = h.scoring || scoringFor(year).table;
  const pts = (x) => (x === undefined ? '' : x);
  const teamName = (id) => { const t = (f.teams || []).find((x) => String(x.id) === String(id)); return t ? t.name : undefined; };
  const dr = f.drivers.map((x, k) => {
    const ids = x.teamIds && x.teamIds.length ? x.teamIds : x.teamId !== undefined && x.teamId !== null ? [x.teamId] : [];
    const cells = [k + 1, dn(w, x.id), ids.length ? ids.map((id) => tn(w, +id, teamName(id))).join(' / ') : '', pts(x.pts), pts(x.wins), pts(x.podiums), pts(x.poles)];
    return ids.length ? rowFor(cells, teamPalette(w, +ids[0])) : cells;
  });
  // teams: stored in newer saves, rebuilt from the entries in older ones
  let teams = f.teams;
  if (!teams) {
    const m = {};
    for (const x of f.entries) { const e = entryById(w, x.id); if (!e) continue; const t = (m[e.teamId] = m[e.teamId] || { id: e.teamId, pts: 0, wins: 0 }); t.pts += x.pts; t.wins += x.wins; }
    teams = Object.values(m).sort((a, b) => b.pts - a.pts || b.wins - a.wins);
  }
  const tm = teams.map((x, k) => rowFor([k + 1, tn(w, x.id, x.name), x.pts, x.wins], teamPalette(w, x.id)));
  const br = f.brands.slice(0, 16).map((x, k) => rowFor([k + 1, bn(w, x.id, x.name), x.pts, x.wins === undefined ? '' : x.wins], brandPalette(x.id)));
  const en = f.entries.map((x, k) => {
    const e = entryById(w, x.id);
    const teamId = x.teamId !== undefined ? x.teamId : e ? e.teamId : null;
    const number = x.number !== undefined ? x.number : e ? e.number : '?';
    const drv = x.driverId !== undefined && x.driverId !== null ? x.driverId : e ? e.driverId : null;
    const cells = [k + 1, teamId !== null ? `#${number} ${tn(w, +teamId, teamName(teamId))}` : '?', drv !== null ? dn(w, drv) : '', x.pts, x.wins];
    return teamId !== null ? rowFor(cells, teamPalette(w, +teamId)) : cells;
  });
  const champTeam = h.championTeam ? tn(w, h.championTeam.id, h.championTeam.name) : '';
  return panel(`${year} final standings`, small(`${esc(eraFor(year).name)} · ${(h.calendar || []).length || (h.results || []).length} rounds · top ${scoring.length} scored: ${scoring.join(', ')} · champion ${dn(w, h.champion.id)}${champTeam ? ' with ' + champTeam : ''}`) + nav) +
    panel('Drivers', table(['#', 'Driver', 'Team', { t: 'Pts', num: 1 }, { t: 'W', num: 1 }, { t: 'Pod', num: 1 }, { t: 'Poles', num: 1 }], dr)) +
    '<div class="two">' + panel('Teams', table(['#', 'Team', { t: 'Pts', num: 1 }, { t: 'W', num: 1 }], tm)) +
    panel('Makers', table(['#', 'Maker', { t: 'Pts', num: 1 }, { t: 'W', num: 1 }], br)) + '</div>' +
    panel('Entries', table(['#', 'Entry', 'Driver', { t: 'Pts', num: 1 }, { t: 'W', num: 1 }], en)) +
    (h.results && h.results.length ? panel('Rounds', table(['Round', 'Venue', 'Winner', 'Team'], h.results.map((r) => { const win = (r.classification || []).find((x) => x.pos === 1); return [r.round + 1, trn(r.trackId), win ? dn(w, win.driverId) : '', win ? tn(w, win.teamId) : '']; }))) : '');
}

// ---------------------------------------------------------------- teams

export function pageTeams(w) {
  const act = w.teams.filter((t) => t.active).sort((a, b) => b.prestige - a.prestige);
  const gone = w.teams.filter((t) => !t.active).sort((a, b) => (b.titles - a.titles) || (b.wins - a.wins)).slice(0, 40);
  const row = (t) => {
    const b = brandById(w, t.brandId);
    const ents = activeEntries(w).filter((e) => e.teamId === t.id);
    return rowFor([tn(w, t.id) + (t.legacy && t.legacy.legendary ? tag('legendary') : '') + (t.groupId ? tag('sister') : ''),
      t.kind === 'works' ? 'works' : t.origin && t.origin.type === 'buyout' ? 'privateer (ex-works)' : t.constructorTeam ? 'constructor' : 'privateer', bn(w, t.brandId), ents.map((e) => e.driverId != null ? dn(w, e.driverId) : '-').join(', '),
      avgFac(t), t.prestige, t.fans, t.titles, t.wins, t.foundedYear], teamPalette(w, t.id));
  };
  const head = ['Team', 'Type', 'Car from', 'Drivers', { t: 'Facilities', num: 1 }, { t: 'Prestige', num: 1 }, { t: 'Fans', num: 1 }, { t: 'Titles', num: 1 }, { t: 'Wins', num: 1 }, { t: 'Founded', num: 1 }];
  return panel(`Teams racing in ${w.year} (${act.length})`, small('Click a team for its line-up, staff, facilities, car, finances, owner and history.') + table(head, act.map(row))) +
    panel('Teams that have left the grid', table(['Team', 'Last year', 'Why', { t: 'Titles', num: 1 }, { t: 'Wins', num: 1 }, 'Standing'], gone.map((t) =>
      rowFor([tn(w, t.id), t.endedYear || '', esc(t.closed ? t.closed.why : 'withdrew'), t.titles, t.wins, t.legacy && t.legacy.legendary ? tag('legendary') : ''], teamPalette(w, t.id), 'out'))));
}

function staffTable(w, t) {
  return table(['Role', 'Name', 'Nation', { t: 'Age', num: 1 }, { t: 'Rating', num: 1 }, ''], Object.keys(ROLE_LABEL).filter((k) => t.staff[k]).map((k) => {
    const s = t.staff[k];
    return [ROLE_LABEL[k], esc(s.name) + (s.gender === 'F' ? '' : ''), esc(s.nat), s.age === undefined ? '' : s.age, w.year < 1950 ? band(s.rating) : s.rating, bar(s.rating)];
  }));
}

export function pageTeam(w, id) {
  const t = teamById(w, id);
  if (!t) return panel('Team', 'No such team.');
  const b = brandById(w, t.brandId);
  const tyre = tyreById(w, t.tyreId);
  const era = eraFor(w.year);
  const ents = activeEntries(w).filter((e) => e.teamId === t.id);
  const owner = t.owner;
  const hist = t.history || [];
  const podiums = hist.reduce((a, h) => a + (h.podiums || 0), 0);
  const best = hist.length ? hist.reduce((m, h) => Math.min(m, h.rank === undefined ? 1 : h.rank), 1) : null;
  const group = t.groupId ? w.teams.filter((x) => x.groupId === t.groupId && x.id !== t.id) : [];
  const f = t.finance;
  const base = moneyScale(w.year);
  const status = t.active ? (t.scope === 'global' ? 'Racing' : 'Racing (local)') : `Left the grid in ${t.endedYear || '?'}${t.closed ? ': ' + esc(t.closed.why) : ''}`;

  const pal = teamPalette(w, t.id);
  const oil = t.oilId && w.year >= OIL_FROM ? OIL_BY_ID[t.oilId] : null;
  const head = `<div class="hero">${t.kind === 'works' ? teamMark(w, t.id, true) : ''}<h2>${esc(t.name)}</h2><div class="small">${esc(status)} · ${esc(t.nat)} · founded ${t.foundedYear} · ${t.kind === 'works' ? `works team of ${bn(w, t.brandId)}` : `privateer, ${bn(w, t.brandId)} customer`} · ${esc((REGION_BY_ID[t.region] || {}).name || t.region || '')}` +
    (t.names && t.names.length > 1 ? ` · formerly ${esc(t.names.filter((n) => n !== t.name).join(', '))}` : '') + '</div>' +
    `<div class="small">${originText(w, t)}</div>` +
    ((t.legacy && t.legacy.legendary) ? tag('legendary team') : '') + (t.groupId ? tag('sister teams') : '') + '</div>';

  const summary = panel('At a glance', kv([
    ['Championships', t.titles + ((t.eras || []).length ? ` (${identityTitles(t)} as ${esc(t.name)})` : '')], ['Race wins', t.wins], ['Podiums (seasons on record)', podiums], ['Seasons on record', hist.length],
    ['Best championship rank', best === null ? '' : best === 0 ? 'champions' : 'top ' + Math.max(1, Math.round(best * 100)) + '%'],
    ['Fans', t.fans + ' ' + bar(t.fans)], ['Prestige', t.prestige + ' ' + bar(t.prestige)], ['Facilities', avgFac(t) + ' ' + bar(avgFac(t))],
    ['Legacy score', t.legacy ? t.legacy.score + ((t.eras || []).length ? ` (this identity, since ${t.idFrom})` : '') : ''], ['Appetite for risk', pct(t.risk)],
    ['Who decides', t.control === 'engineer' ? 'the engineers' : t.control === 'principal' ? 'the principal' : esc(t.control)],
  ]));

  const lineup = panel('Line-up this season', ents.length ? table(['No.', 'Driver', 'Entry', 'Contract', 'Salary', { t: 'Age', num: 1 }, { t: 'Years here', num: 1 }, 'Relationship'], ents.map((e) => {
    const d = driverById(w, e.driverId);
    const ten = d ? teamDriverTenure(w, t).find((x) => x.driverId === d.id) : null;
    const yrs = ten ? ten.seasons : 0;
    const rel = !d ? '' : (d.academy === t.id ? 'academy graduate' : yrs >= 4 ? 'long-serving' : yrs <= 1 ? 'new signing' : 'established');
    return [e.number, d ? dn(w, d.id) : 'vacant', e.type === 'partial' ? 'part-season' : 'full', e.contract ? `${e.contract.from}-${e.contract.until}` : '', e.contract ? money(e.contract.salary) : '', d ? ageAt(d, w.year) : '', yrs, rel];
  })) : small('No entries this season.'));

  const academy = w.drivers.filter((d) => d.status === 'active' && d.academy === t.id);
  const academyHtml = academy.length ? panel('Academy', small('Young drivers backed by the team. They learn a little faster and the team gets first call on them.') + table(['Driver', { t: 'Age', num: 1 }, 'Racing in', { t: 'Rep', num: 1 }], academy.map((d) => [dn(w, d.id), ageAt(d, w.year), d.seriesId ? sn(w, d.seriesId) : 'not racing yet', Math.round(d.rep || 0)]))) : '';

  const staff = panel('Staff', staffTable(w, t) + small(`Rated 0-100. ${w.year < 1950 ? 'In this era nobody measured it closely, so ratings show as a word.' : ''}`));

  const fac = panel('Facilities', table(['', { t: 'Level', num: 1 }, ''], [['Factory', t.facilities.factory, bar(t.facilities.factory)], ['Workshops', t.facilities.workshops, bar(t.facilities.workshops)], ['Equipment (tooling, rigs)', t.facilities.equipment, bar(t.facilities.equipment)]]) +
    small('Buildings and equipment date: without investment they decay. Profit goes partly into the factory, and the factory sets how fast the car can be developed.' + (t.finance ? ` Development power this year: ${t.finance.devPower}.` : '')));

  const owners = panel('Owner', kv([
    ['Name', esc(owner.name) + ' (' + esc(owner.nat) + ')'], ['Type', esc(owner.type)], ['Owner since', owner.since],
    ['Patience', owner.patience + ' ' + bar(owner.patience)], ['Pockets', owner.pockets + ' ' + bar(owner.pockets)], ['Personal fortune', money(Math.max(0, owner.fortune))],
  ]) + '<h4>Goals</h4>' + table(['Goal', 'Weight', ''], Object.keys(owner.goals).map((k) => [GOAL_LABEL[k], pct(owner.goals[k]), bar(owner.goals[k], 1)])) +
    small('Patience falls when results and money disappoint. When it runs out the team is sold, handed over, or closed.'));

  const money_ = f ? panel('Finances', kv([
    ['Cash', money(f.cash || 0)], ['Income this year', money(f.income || 0)], ['Costs this year', money(f.costs || 0)], ['Result', money(f.lastNet || 0)],
    ['Prize money', money(f.prize || 0)], ['Sponsors', w.year < COMMERCIAL_FROM ? 'none before ' + COMMERCIAL_FROM : money(f.sponsors || 0)], ['Manufacturer support', money(f.manufacturer || 0)], ['Customer supply income', money(f.supply || 0)],
    ['Owner cover (deficits)', money(f.injection || 0)],
  ]) + ((f.history || []).length > 1 ? '<h4>Last seasons</h4>' + table(['Year', { t: 'Income', num: 1 }, { t: 'Costs', num: 1 }, { t: 'Cash', num: 1 }], f.history.slice(-8).reverse().map((h) => [h.year, money(h.income), money(h.costs), money(h.cash)])) : '')) : '';

  const spons = panel('Sponsors', (t.sponsors && t.sponsors.length) ? table(['Sponsor', 'Sector', 'Value / yr', 'Since', 'Until'], t.sponsors.map((s) => { const sp = SPONSOR_BY_ID[s.id]; return [s.supplier === 'oil' ? link('oil', s.supplierId, s.name) : s.supplier === 'tyres' ? link('tyre', s.supplierId, s.name) : link('sponsor', s.id, s.name), s.supplier ? (s.supplier === 'oil' ? 'oil and fuel supplier' : 'tyre supplier') : esc(sp ? sp.sector : ''), money(s.value), s.since, s.until]; })) : small(w.year < COMMERCIAL_FROM ? `Commercial sponsorship is not allowed before ${COMMERCIAL_FROM}. Before then only prize money, maker support and owners' money pay the bills.` : 'No sponsors at the moment.'));

  const techs = Object.keys(t.tech || {}).map((id) => TECHS.find((x) => x.id === id)).filter(Boolean);
  const carBlocks = ents.filter((e) => e.car).slice(0, 1).map((e) => {
    const c = e.car;
    const desc = describeCar(c, w.year, c.techs, w.regs);
    return `<div class="two"><div>${kv(desc.map(([k, v]) => [k, esc(v)]))}</div><div>` +
      table(['Component', { t: 'Rating', num: 1 }, ''], Object.keys(c.comps).map((k) => [esc(k.replace(/([A-Z])/g, ' $1').toLowerCase()), Math.round(c.comps[k]), bar(c.comps[k])]).concat([['handling', Math.round(c.chassis.handling), bar(c.chassis.handling)], ['engine power', Math.round(c.engine.power), bar(c.engine.power)]])) + '</div></div>' +
      small(`${c.customer ? 'Customer car from ' + esc(brandText(w, c.brandId)) + '. ' : ''}Design of ${c.designYear}, ${c.maturity >= 2 ? 'mature' : c.maturity === 1 ? 'developed' : 'brand new'}; team redesigns about every ${t.cycle} years or when the rules change. Setup fit ${c.fit}.`);
  }).join('');
  const car = panel('Car', (carBlocks || small('No car this season.')) +
    '<h4>Technology</h4>' + (techs.length ? table(['Technology', 'Adopted', 'Source'], techs.map((x) => [esc(x.name), t.tech[x.id], x.kind === 'engine' ? 'engine supplier' : 'own chassis'])) : small('No period technology adopted yet.')));

  const rel = panel('Relationships', kv([
    ['Manufacturer', bn(w, t.brandId) + (b ? ` (${esc(b.status)}, ${b.titles} titles)` : '')],
    ['Role', t.kind === 'works' ? 'factory team; the maker backs it with money' : 'customer team; pays for cars and engines'],
    ['Maker\'s group', groupOfBrand(t.brandId, w.year) ? gn(groupOfBrand(t.brandId, w.year), w.year) : ''],
    ['Engine partner', t.kind !== 'works' && t.partner && brandById(w, t.partner) ? bn(w, t.partner) + (t.partner === t.brandId ? ' (preferred partner: first call on the engine, a better fit with the car)' : '') : ''],
    ['Chassis', t.kind !== 'works' && t.constructorTeam ? 'builds its own' : ''],
    ['Tyre supplier', tyre ? link('tyre', tyre.id, tyre.name) : ''],
    ['Oil and fuel supplier', oil ? link('oil', oil.id, oilNameAt(oil, w.year)) + (t.oilUntil ? ` (deal to ${t.oilUntil})` : '') : (w.year < OIL_FROM ? 'none before ' + OIL_FROM : '')],
    ['Sister teams', group.length ? group.map((g) => tn(w, g.id)).join(', ') + (t.relation ? ` (${esc(t.relation)})` : '') : 'independent'],
    ['Owner', esc(owner.name) + ', ' + esc(owner.type)],
  ]) + '<h4>Drivers over the years</h4>' + (() => {
    const ten = teamDriverTenure(w, t).slice(0, 10);
    return ten.length ? table(['Driver', { t: 'Seasons', num: 1 }, 'Years'], ten.map((x) => [dn(w, x.driverId), x.seasons, `${x.first}-${x.last}`])) : small('No history yet.');
  })());

  // each season is coloured and named for the identity the team had then
  const seasonId = (h) => {
    if (h.name) return { name: h.name, kind: h.kind, colors: h.colors, brandId: h.brandId };
    const e = identityAt(t, h.year);
    return e ? { name: e.name, kind: e.kind, colors: e.colors, brandId: h.brandId || e.brandId } : { name: t.name, kind: t.kind, colors: t.colors, brandId: h.brandId || t.brandId };
  };
  const champYears = new Set(w.history.seasons.filter((h) => h.championTeam && h.championTeam.id === t.id).map((h) => h.year));
  const histRows = hist.slice().reverse().slice(0, 40).map((h) => {
    const id = seasonId(h);
    return rowFor([h.year, identityBadge(w, id, h.year) + esc(id.name) + (champYears.has(h.year) ? tag('champions', 'gold') : ''), bn(w, h.brandId), (h.entries || []).map((e) => e.driverId != null ? dn(w, e.driverId) : '').join(', '), h.pts, h.wins, h.podiums], identityPalette(id));
  });
  const history = panel('Season by season', hist.length ? small('Each season is shown in the colours and name the team had at the time.') + table(['Year', 'Team then', 'Car from', 'Drivers', { t: 'Pts', num: 1 }, { t: 'Wins', num: 1 }, { t: 'Podiums', num: 1 }], histRows) : small('No seasons yet.'));

  const pastIds = (t.eras || []).length ? panel('Past identities', small('When a team is sold and rebranded, or bought or sold by a maker, its legacy starts again. What it was before stays in the record books under its old name.') +
    table(['Identity', 'Years', { t: 'Titles', num: 1 }, { t: 'Wins', num: 1 }, { t: 'Legacy', num: 1 }, 'How it ended'], t.eras.slice().reverse().map((e) =>
      rowFor([identityBadge(w, e, e.to) + esc(e.name) + (e.legendary ? tag('legendary') : ''), `${e.from}-${e.to}`, e.titles, e.wins, e.score, esc(e.how || '') + (e.successor ? ' &rarr; ' + esc(e.successor) : '')], identityPalette(e))))) : '';

  return branded(pal, head + summary + '<div class="two">' + lineup + owners + '</div><div class="two">' + staff + fac + '</div>' + academyHtml + car + '<div class="two">' + money_ + spons + '</div>' + rel + pastIds + history);
}

// where a team came from, in words (HTML: the founder is a link to their career page)
function originText(w, t) {
  const o = t.origin || {};
  const BY = { engineers: 'its own engineers', investors: 'a consortium of investors', sponsor: 'an energy and consumer brand', driver: 'a former driver' };
  const who = (name, driverId) => (driverId !== undefined && driverById(w, driverId) ? dn(w, driverId) : name ? link('person', encodeURIComponent(name), name) : '');
  switch (o.type) {
    case 'manufacturer': return `Created as the factory team of ${esc(o.by || brandText(w, t.brandId))}.`;
    case 'driver-founder': return `Founded in ${o.year} by former champion ${who(o.by, o.driverId)}${o.titles ? ` (${o.titles} title${o.titles > 1 ? 's' : ''})` : ''}.` + (o.climbed ? ` It began in ${o.startedIn} in a lower series and climbed to the top flight.` : '');
    case 'engineer-founder': return `Founded in ${o.year} by ${who(o.by)}, formerly technical director of ${o.fromTeamId && teamById(w, o.fromTeamId) ? link('team', o.fromTeamId, o.from) : esc(o.from)}. It builds its own chassis.`;
    case 'buyout': return `Sold by ${o.fromBrandId && brandById(w, o.fromBrandId) ? esc(brandText(w, o.fromBrandId)) : 'its maker'} in ${o.year} to ${esc(BY[o.by] || 'new owners')}${o.buyer ? ' (' + esc(o.buyer) + ')' : ''}; it kept the cars and the staff.`;
    case 'manufacturer-buyin': return `Bought in ${o.year} by ${esc(o.by)}${o.previous ? ' from ' + esc(o.previous) : ''} and run as a factory effort.`;
    default: return `Founded in ${t.foundedYear || o.year}${o.type === 'investors' ? ' by investors' : ''}.`;
  }
}

// ---------------------------------------------------------------- drivers

export function pageDrivers(w, q = '') {
  const act = activeEntries(w).filter((e) => e.driverId != null).map((e) => ({ e, d: driverById(w, e.driverId) })).filter((x) => x.d);
  const rows = act.sort((a, b) => overallAt(b.d, w.year) - overallAt(a.d, w.year)).map(({ e, d }) => [dn(w, d.id), d.gender === 'F' ? 'W' : 'M', esc(d.nat), ageAt(d, w.year), tn(w, e.teamId), d.wins, d.titles, d.starts, Math.round(d.rep), w.year < 1950 ? band(overallAt(d, w.year)) : overallAt(d, w.year)]);
  const rising = w.drivers.filter((d) => d.status === 'active' && d.seriesId && !activeEntries(w).some((e) => e.driverId === d.id)).sort((a, b) => b.rep - a.rep).slice(0, 25);
  const retired = w.drivers.filter((d) => d.titles > 0 || d.wins >= 8).sort((a, b) => b.titles - a.titles || b.wins - a.wins).slice(0, 30);
  const gr = (w.grass && w.grass[w.year]) || {};
  const grRows = [];
  for (const rid of Object.keys(gr)) for (const g of gr[rid].slice(0, 3)) { const d = driverById(w, g.driverId); if (d) grRows.push([dn(w, d.id), (REGION_BY_ID[rid] || {}).name || rid, g.kind, g.age]); }
  return panel(`Drivers in the top series, ${w.year}`, table(['Driver', 'M/W', 'Nation', { t: 'Age', num: 1 }, 'Team', { t: 'Wins', num: 1 }, { t: 'Titles', num: 1 }, { t: 'Starts', num: 1 }, { t: 'Rep', num: 1 }, { t: 'Overall', num: 1 }], rows)) +
    panel('Rising: racing in the lower tiers', small('The best of the ladder, ranked by reputation. Scouts see an estimate, not the true talent.') + table(['Driver', { t: 'Age', num: 1 }, 'Series', { t: 'Rep', num: 1 }, 'Scouting estimate', 'Backer'], rising.map((d) => [dn(w, d.id), ageAt(d, w.year), sn(w, d.seriesId), Math.round(d.rep), scoutEstimate(w, d, w.year) + '', d.academy ? tn(w, d.academy) : ''])) ) +
    (grRows.length ? panel('Grassroots standouts this year', small('Karting and local racing, before the ladder.') + table(['Driver', 'Region', 'Where', { t: 'Age', num: 1 }], grRows.slice(0, 30))) : '') +
    panel('Champions and big winners (all time)', table(['Driver', 'Status', { t: 'Titles', num: 1 }, { t: 'Wins', num: 1 }, { t: 'Born', num: 1 }], retired.map((d) => [dn(w, d.id), esc(d.status), d.titles, d.wins, d.birthYear])));
}

export function pageDriver(w, id) {
  const d = driverById(w, id);
  if (!d) return panel('Driver', 'No such driver.');
  const e = activeEntries(w).find((x) => x.driverId === d.id);
  const s = statsAt(d, w.year);
  const seasons = driverSeasons(w, d.id);
  const teams = driverTeams(w, d.id);
  const coarse = w.year < 1950;
  const stat = d.status === 'active' || d.status === 'retired' ? STAT_KEYS : STAT_KEYS;
  const age = ageAt(d, w.year);
  const status = d.status === 'retired' ? `retired in ${d.retiredYear}` : age < 18 ? `too young to race in the top series yet (of age in ${d.birthYear + 18})` : e ? `driving #${e.number} for ${esc(teamText(w, e.teamId))}` : d.seriesId ? 'racing in the lower tiers' : 'without a seat';
  const head = `<div class="hero"><h2>${esc(d.name)}</h2><div class="small">${d.gender === 'F' ? 'Woman' : 'Man'} · ${esc(d.nat)} · born ${d.birthYear} (${d.status === 'retired' ? 'aged ' + (d.retiredYear - d.birthYear) + ' at retirement' : 'age ' + age}) · ${esc(status)}</div>` +
    (d.legend ? tag('legendary talent') : '') + (d.titles ? tag(d.titles + ' title' + (d.titles > 1 ? 's' : '')) : '') + '</div>';
  const sum = panel('Career', kv([
    ['Top-series starts', d.starts], ['Wins', d.wins], ['Titles', d.titles], ['Reputation', Math.round(d.rep) + ' ' + bar(d.rep)], ['Fans', d.fans],
    ['Driving style', d.style < -0.35 ? 'prefers understeer' : d.style > 0.35 ? 'prefers oversteer' : 'neutral'],
    ['Backed by', d.academy ? tn(w, d.academy) + ' (academy)' : ''],
    ['Current team', e ? tn(w, e.teamId) : ''],
    ['Contract', e && e.contract ? `${e.contract.from}-${e.contract.until}, ${money(e.contract.salary)} a year` : ''],
    ['Car', e ? bn(w, e.car.brandId) : ''],
  ]));
  const stats = panel('Abilities' + (coarse ? ' (judged by eye in this era)' : ''), table(['', { t: coarse ? '' : 'Rating', num: 1 }, ''], stat.map((k) => [STAT_LABELS[k], coarse ? band(s[k]) : s[k], bar(s[k])])) +
    small(d.status === 'retired' ? 'Abilities at the end of the career.' : 'Potential is hidden. It shows through results over the years. Early in a career the figures are a scout\'s estimate.'));
  const careerRows = (d.career || []).slice().reverse().map((c) => [c.y, c.s ? sn(w, c.s) : '', c.tier ? 'Tier ' + c.tier : '', c.pos || '', c.pts, c.w]);
  const lower = panel('Ladder record (lower tiers)', careerRows.length ? table(['Year', 'Series', 'Tier', { t: 'Pos', num: 1 }, { t: 'Pts', num: 1 }, { t: 'W', num: 1 }], careerRows) : small('No record in the lower tiers.'));
  const top = panel('Top-series seasons, year by year', seasons.length ? table(['Year', 'Team', 'Car from', { t: 'Pos', num: 1 }, { t: 'Pts', num: 1 }, { t: 'Wins', num: 1 }, { t: 'Podiums', num: 1 }, { t: 'Poles', num: 1 }, ''], seasons.slice().reverse().map((x) => {
    const cells = [`<a class="lk" href="#/standings/${x.year}">${x.year}</a>`, x.teamIds.length ? x.teamIds.map((id, k) => tn(w, id, x.teamNames && x.teamNames[k])).join(' / ') : '', x.brandId && brandById(w, x.brandId) ? bn(w, x.brandId) : '', x.pos, x.pts, x.wins, x.podiums === undefined ? '' : x.podiums, x.poles === undefined ? '' : x.poles, x.champion ? tag('champion', 'gold') : ''];
    return x.teamId !== null && x.teamId !== undefined ? rowFor(cells, teamPalette(w, x.teamId)) : cells;
  })) + small('Click a year for that season\'s full points tables.') : small('No top-series seasons in the final tables on record.'));
  const nameThen = {};
  for (const x of seasons) x.teamIds.forEach((id, k) => { if (x.teamNames && x.teamNames[k]) nameThen[id] = x.teamNames[k]; });
  const tm = panel('Teams', teams.length ? table(['Team', 'Years', { t: 'Seasons', num: 1 }], teams.map((x) => rowFor([tn(w, x.teamId, nameThen[x.teamId]), x.from === x.to ? x.from : `${x.from}-${x.to}`, x.seasons], teamPalette(w, x.teamId)))) : small('Not yet.'));
  return head + sum + '<div class="two">' + stats + tm + '</div>' + top + lower;
}

// ---------------------------------------------------------------- manufacturers, tech, sponsors

export function pageIndustry(w, manual) {
  const order = { racing: 0, dormant: 1, defunct: 2 };
  const brands = w.brands.slice().sort((a, b) => order[a.status] - order[b.status] || b.titles - a.titles || a.name.localeCompare(b.name));
  const rows = brands.map((b) => {
    let act = '';
    if (manual) {
      if (b.status === 'racing') act = `<button class="mini" data-act="expel" data-brand="${esc(b.id)}">Stop racing</button>`;
      else if (b.status === 'dormant' && w.year >= b.founded) act = `<button class="mini" data-act="invite" data-brand="${esc(b.id)}">Invite</button>`;
    }
    return { cls: b.status === 'racing' ? '' : 'out', cells: [bn(w, b.id), esc(b.country), esc(brandRole(w, b)), b.corp ? gn(b.corp, w.year) : '', b.founded, bar(b.strength * 100), b.titles, b.wins, b.raceYears || '', act] };
  });
  const sh = adoptionShares(w, w.year);
  const techRows = TECHS.map((t) => {
    const ban = bannedIn(t, w.year, w.regs.techBans);
    const state = !availableIn(t, w.year) ? `arrives ${t.from}` : ban ? 'banned' : Math.round(sh[t.id] * 100) + '% of teams';
    const first = w.teams.concat().filter((x) => x.tech && x.tech[t.id] !== undefined && x.tech[t.id] !== null).sort((a, b) => a.tech[t.id] - b.tech[t.id])[0];
    return [esc(t.name), t.kind === 'engine' ? 'engine' : 'chassis', t.from, (t.bans || []).map(([a, b]) => `${a}-${b === 9999 ? 'on' : b}`).join(', '), state, first ? `${tn(w, first.id)} (${first.tech[t.id]})` : ''];
  });
  const tyres = w.tyres.map((t) => [link('tyre', t.id, t.name), esc(t.country), t.grip, t.durability, t.wet, w.teams.filter((x) => x.active && x.tyreId === t.id).length]);
  const oils = (w.oils || []).map((o) => ({ o, d: OIL_BY_ID[o.id] })).filter((x) => x.d).sort((a, b) => b.d.size - a.d.size).map(({ o, d }) => [link('oil', o.id, oilNameAt(d, w.year)), esc(d.country), o.power, o.rel, w.teams.filter((x) => x.active && x.oilId === o.id).length]);
  const ts = w.titleSponsor;
  const sp = {};
  for (const t of w.teams.filter((x) => x.active)) for (const s of t.sponsors || []) (sp[s.id] = sp[s.id] || { id: s.id, name: s.name, teams: [], total: 0, supplier: s.supplier, supplierId: s.supplierId }).teams.push(t.id), (sp[s.id].total += s.value);
  return panel('Manufacturers', small('A maker\'s strength is rolled for this save and drifts over time: breakthroughs and crises, good and bad management. Makers start, quit, go dormant and come back.') +
    table(['Maker', 'Country', 'Role', 'Group', { t: 'Founded', num: 1 }, 'Strength', { t: 'Titles', num: 1 }, { t: 'Wins', num: 1 }, { t: 'Years in stint', num: 1 }, ''], rows) +
      small('Some makers build engines only (BRM, Climax, Cosworth, Judd, Ilmor, and Mercedes between 1955 and 2009) and never run a team. Teams that were once works teams are sold off in waves; later, makers buy teams to run as factory efforts. See <a class="lk" href="#/groups">the corporate groups</a>.')) +
    panel('Technology: what exists, who has it', small('Engine technology comes from the engine supplier, so a team chooses its future by choosing its supplier. First adopters keep an edge until everyone has it. Some technologies are banned for periods.') +
      table(['Technology', 'Kind', { t: 'From', num: 1 }, 'Banned', 'Now', 'First adopter'], techRows)) +
    '<div class="two">' + panel('Tyre suppliers', small(`Tyre rule in force: ${esc(w.regs.tyreRule)}. A tyre supplier is also a sponsor of its teams.`) + table(['Supplier', 'Country', { t: 'Grip', num: 1 }, { t: 'Durability', num: 1 }, { t: 'Wet', num: 1 }, { t: 'Teams', num: 1 }], tyres)) +
    panel('Oil and fuel suppliers', w.year < OIL_FROM ? small(`Oil and fuel deals begin in ${OIL_FROM}.`) : small('Each team has a deal of one to four years, like its tyres. A supplier is also the sponsor of its teams, so a team never has two rival oil brands.') + table(['Supplier', 'Country', { t: 'Power', num: 1 }, { t: 'Reliability', num: 1 }, { t: 'Teams', num: 1 }], oils)) + '</div><div class="two">' +
    panel('Sponsors', w.year < COMMERCIAL_FROM ? small(`Commercial sponsorship starts in ${COMMERCIAL_FROM}.`) : (ts ? small(`Title sponsor of the championship: <b>${link('sponsor', ts.id, ts.name)}</b> (${ts.from}-${ts.until}).`) : small('No title sponsor.')) +
      table(['Sponsor', 'Teams', { t: 'Total / yr', num: 1 }], Object.values(sp).sort((a, b) => b.total - a.total).map((s) => [s.supplier === 'oil' ? link('oil', s.supplierId, s.name) : s.supplier === 'tyres' ? link('tyre', s.supplierId, s.name) : link('sponsor', s.id, s.name), s.teams.map((id) => tn(w, id)).join(', '), money(s.total)]))) + '</div>';
}

// what a maker does in the sport this year, in a few words
function brandRole(w, b) {
  const works = w.teams.some((t) => t.active && t.kind === 'works' && t.brandId === b.id);
  const cust = w.teams.some((t) => t.active && t.kind !== 'works' && t.brandId === b.id);
  if (b.status === 'defunct') return b.mergedInto && brandById(w, b.mergedInto) ? `merged into ${brandText(w, b.mergedInto)}` : 'defunct';
  if (b.status === 'dormant') return engineOnlyAt(b.id, w.year) ? 'engine builder, not supplying' : 'not racing';
  if (works) return cust ? 'works team and engine supplier' : 'works team';
  if (engineOnlyAt(b.id, w.year)) return 'engine supplier (builds engines only)';
  return cust ? 'engine supplier' : 'racing';
}

export function pageBrand(w, id) {
  const b = brandById(w, id);
  if (!b) return panel('Maker', 'No such maker.');
  const pal = brandPalette(b.id);
  const def = BRAND_DEF[b.id] || {};
  const works = w.teams.filter((t) => t.kind === 'works' && t.brandId === b.id);
  const cust = w.teams.filter((t) => t.kind !== 'works' && t.brandId === b.id && t.active);
  const titles = w.history.seasons.filter((h) => h.championBrand && h.championBrand.id === b.id).map((h) => h.year);
  const techs = Object.keys(b.tech || {}).filter((k) => b.tech[k]).map((k) => TECHS.find((x) => x.id === k)).filter(Boolean);
  const grp = b.corp ? GROUP_BY_ID[b.corp] : null;
  const perf = (def.perf || []).filter(([from]) => w.year >= from).slice(-1)[0];
  const former = (b.names || []).filter((n) => n !== b.name);
  const head = `<div class="hero">${brandMark(w, b.id, w.year, true)}<h2>${esc(b.name)}</h2><div class="small">${esc(b.country)} · founded ${b.founded} · ${esc(brandRole(w, b))}${b.raceYears ? ` · ${b.raceYears} years in the current stint` : ''}` +
    (grp ? ` · part of ${gn(grp.id, w.year)}` : '') + (former.length ? ` · formerly ${esc(former.join(', '))}` : '') + '</div>' +
    (engineOnlyAt(b.id, w.year) ? tag('engine builder') : '') + (perf ? tag(perf[1]) : '') + '</div>';
  const strengths = panel('Strengths', table(['', { t: '', num: 1 }, ''], [['Overall', Math.round(b.strength * 100), bar(b.strength * 100)], ['Chassis', Math.round(b.chassisStrength * 100), bar(b.chassisStrength * 100)], ['Engine', Math.round(b.engineStrength * 100), bar(b.engineStrength * 100)], ['Reliability', Math.round(b.reliability * 100), bar(b.reliability * 100)]]) +
    small(`Commitment to racing ${b.commitment === undefined ? '' : b.commitment.toFixed(2)} (how much money the board puts in). Risk appetite ${b.risk === undefined ? '' : pct(b.risk)}. Sells to customers: ${b.sellsCustomers ? 'yes' : 'no'}.`));
  const sum = panel('Record', kv([['Maker\'s titles', b.titles + (titles.length ? ' (' + titles.slice(-12).join(', ') + (titles.length > 12 ? ' …' : '') + ')' : '')], ['Race wins', b.wins], ['Fans', b.fans], ['Health of the company', pct(b.health === undefined ? b.strength : b.health)],
    ['Group', grp ? gn(grp.id, w.year) : 'independent'], ['Performance division', perf ? esc(perf[1]) + (perf[0] > w.year ? '' : ` (since ${perf[0]})`) : '']]));
  const wt = panel('Works team', works.length ? table(['Team', 'Status', { t: 'Titles', num: 1 }, { t: 'Wins', num: 1 }], works.map((t) => rowFor([tn(w, t.id), t.active ? 'racing' : 'ended ' + t.endedYear, t.titles, t.wins], teamPalette(w, t.id)))) +
    small('A works team may carry any name its maker gives it: a racing department, a scuderia or an écurie, or the name of its performance division.') : small(engineOnlyAt(b.id, w.year) ? 'This maker builds engines for others and does not run a team of its own.' : 'No works team at the moment.'));
  const cu = panel(engineOnlyAt(b.id, w.year) || !works.length ? 'Teams it supplies' : 'Customer teams', cust.length ? table(['Team', { t: 'Titles', num: 1 }, { t: 'Wins', num: 1 }], cust.map((t) => rowFor([tn(w, t.id), t.titles, t.wins], teamPalette(w, t.id)))) : small('None.'));
  const progs = (w.programmes || []).filter((p) => p.leadId === b.id || p.partnerId === b.id);
  const pr = progs.length ? panel('Shared programmes', table(['With', 'Arrangement', 'Since', 'Until', 'How it is going'], progs.slice().reverse().map((p) => [bn(w, p.leadId === b.id ? p.partnerId : p.leadId), esc(PROGRAMME_LABEL[p.kind] || p.kind), p.since, p.ended || 'now', p.quality < -0.02 ? 'not working well' : p.quality > 0.03 ? 'paying off' : 'steady'])) + small('Makers of the same group that race at the same time can share an engine, a chassis or a whole car, or pool development to save money. It does not always work well.')) : '';
  const tc = panel('Technology', techs.length ? table(['Technology', 'Adopted'], techs.map((x) => [esc(x.name), b.tech[x.id]])) : small('Nothing yet.'));
  const log = w.chronicle.filter((c) => c.kind === 'brand' && (c.text.indexOf(b.name) >= 0 || former.some((n) => c.text.indexOf(n) >= 0))).slice(-14).reverse();
  const hist = panel('Chronicle', log.length ? '<ul class="evlog">' + log.map((c) => `<li><b>${c.year}</b> ${esc(c.text)}</li>`).join('') + '</ul>' : small('Nothing yet.'));
  return branded(pal, head + '<div class="two">' + strengths + sum + '</div>' + wt + cu + pr + '<div class="two">' + tc + hist + '</div>');
}

// ---------------------------------------------------------------- corporate groups

export function pageGroup(w, id) {
  const g = GROUP_BY_ID[id];
  if (!g) return panel('Group', 'No such group.');
  const now = membersAt(g.id, w.year).filter((m) => brandById(w, m));
  const ever = [...new Set(g.members.map((m) => m.b))].filter((m) => brandById(w, m));
  const pal = brandPalette(now[0] || ever[0] || g.id);
  const head = `<div class="hero"><h2>${esc(groupName(g, w.year))}</h2><div class="small">${now.length} maker${now.length === 1 ? '' : 's'} in the group in ${w.year}${g.names.length > 1 ? ' · earlier names: ' + esc(g.names.map((n) => n[1] + ' (' + n[0] + ')').join(', ')) : ''}</div></div>`;
  const rows = ever.map((m) => {
    const b = brandById(w, m);
    const wins = g.members.filter((x) => x.b === m).map((x) => `${x.from}-${x.to >= 9999 ? 'on' : x.to}`).join(', ');
    const works = w.teams.filter((t) => t.active && t.kind === 'works' && t.brandId === m);
    return { cls: membersAt(g.id, w.year).indexOf(m) >= 0 ? '' : 'out', cells: [bn(w, m), esc(b.status === 'racing' ? brandRole(w, b) : b.status), wins, works.map((t) => tn(w, t.id)).join(', '), b.titles, b.wins] };
  });
  const progs = (w.programmes || []).filter((p) => p.groupId === g.id);
  const log = w.chronicle.filter((c) => c.kind === 'brand' && c.text.indexOf(groupName(g, w.year)) >= 0 || g.names.some((n) => c.kind === 'brand' && c.text.indexOf(n[1]) >= 0)).slice(-20).reverse();
  return branded(pal, head + panel('Makers', table(['Maker', 'In the sport', 'In the group', 'Works team', { t: 'Titles', num: 1 }, { t: 'Wins', num: 1 }], rows)) +
    panel('Shared programmes', progs.length ? table(['Makers', 'Arrangement', 'Since', 'Until'], progs.slice().reverse().map((p) => [bn(w, p.leadId) + ' + ' + bn(w, p.partnerId), esc(PROGRAMME_LABEL[p.kind] || p.kind), p.since, p.ended || 'now'])) : small('No shared programmes yet. Two makers of a group that race in the same years may share engines, chassis or whole cars.')) +
    panel('In the news', log.length ? '<ul class="evlog">' + log.map((c) => `<li><b>${c.year}</b> ${esc(c.text)}</li>`).join('') + '</ul>' : small('Nothing yet.')));
}

export function pageGroups(w) {
  const rows = GROUPS.map((g) => {
    const now = membersAt(g.id, w.year).filter((m) => brandById(w, m));
    return { cls: now.length ? '' : 'out', cells: [gn(g.id, w.year), now.map((m) => bn(w, m)).join(' '), now.filter((m) => w.teams.some((t) => t.active && t.kind === 'works' && t.brandId === m)).length, (w.programmes || []).filter((p) => p.groupId === g.id && !p.ended).length] };
  });
  return panel('Corporate groups', small('Big groups form on the real timeline: Volkswagen, Fiat and later Stellantis, Mopar, DaimlerChrysler, General Motors, Ford and others. Makers in one group that race together can share parts, chassis or whole cars. Mergers such as Daimler and Benz (1926), Auto Union (1932) and the Audi NSU Auto Union (1969) join teams and their staff.') +
    table(['Group', 'Makers now', { t: 'With works teams', num: 1 }, { t: 'Shared programmes', num: 1 }], rows));
}

// ---------------------------------------------------------------- oil and tyre suppliers

export function pageOil(w, id) {
  const o = OIL_BY_ID[id];
  if (!o) return panel('Supplier', 'No such supplier.');
  const live = (w.oils || []).find((x) => x.id === id);
  const teams = w.teams.filter((t) => t.active && t.oilId === id && w.year >= OIL_FROM);
  const sp = o.sponsorId ? w.teams.filter((t) => t.active && (t.sponsors || []).some((s) => s.id === o.sponsorId && !s.supplier)) : [];
  const past = w.teams.filter((t) => !teams.includes(t) && (t.sponsors || []).some((s) => s.supplierId === id)).slice(0, 12);
  return `<div class="hero"><h2>${esc(oilNameAt(o, w.year))}</h2><div class="small">Oil and fuel supplier · ${esc(o.country)} · strongest in ${esc((REGION_BY_ID[o.home] || {}).name || o.home)} · supplies teams ${Math.max(o.from, OIL_FROM)}-${o.to >= 9999 ? 'on' : o.to}</div></div>` +
    panel('This year', kv([['Status', live ? 'supplying teams' : w.year < Math.max(o.from, OIL_FROM) ? 'not yet in the sport' : 'not supplying'], ['Power', live ? live.power + ' ' + bar(live.power) : ''], ['Reliability', live ? live.rel + ' ' + bar(live.rel) : ''], ['Size of its deals', bar(o.size * 100, 120)]]) +
      small('Oil and fuel add a little power and reliability. A supplier is also the sponsor of the teams it supplies, so the same company never appears twice, and no rival oil brand can sponsor a team tied to another supplier.')) +
    panel('Teams it supplies', teams.length ? table(['Team', 'Deal until'], teams.map((t) => rowFor([tn(w, t.id), t.oilUntil || ''], teamPalette(w, t.id)))) : small(w.year < OIL_FROM ? `Supply deals start in ${OIL_FROM}.` : 'None at the moment.')) +
    (past.length ? panel('Teams it has supplied', table(['Team'], past.map((t) => [tn(w, t.id)]))) : '') + (sp.length ? '' : '');
}

export function pageTyre(w, id) {
  const m = tyreById(w, id);
  if (!m) return panel('Supplier', 'No such supplier.');
  const teams = w.teams.filter((t) => t.active && t.tyreId === id);
  return `<div class="hero"><h2>${esc(m.name)}</h2><div class="small">Tyre supplier · ${esc(m.country)}</div></div>` +
    panel('This year', kv([['Grip', m.grip + ' ' + bar(m.grip)], ['Durability', m.durability + ' ' + bar(m.durability)], ['Wet performance', m.wet + ' ' + bar(m.wet)], ['Tyre rule', esc(w.regs.tyreRule)]])) +
    panel('Teams on these tyres', teams.length ? table(['Team', { t: 'Wins', num: 1 }], teams.map((t) => rowFor([tn(w, t.id), t.wins], teamPalette(w, t.id)))) : small('None at the moment.'));
}

// ---------------------------------------------------------------- tracks

export function pageTrack(w, id) {
  const T = TRACK_BY_ID[id];
  if (!T) return panel('Track', 'No such venue.');
  const hist = trackHistory(w, id);
  const tally = {};
  for (const h of hist) tally[h.driverId] = (tally[h.driverId] || 0) + 1;
  const best = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return `<div class="hero"><h2>${esc(T.name)}</h2><div class="small">${esc(T.country)} · ${T.lengthKm} km lap · opened ${T.opens}${T.closes ? ', closed ' + T.closes : ''} · ${esc(T.kind || '')}</div></div>` +
    panel('Character', kv([['Power demand', pct(T.power)], ['Handling demand', pct(T.handling)], ['Braking demand', pct(T.braking)], ['Reliability stress', T.stress], ['Overtaking', pct(T.overtake)], ['Chance of rain', pct(T.wetChance)]])) +
    (best.length ? panel('Most wins here', table(['Driver', { t: 'Wins', num: 1 }], best.map(([d, n]) => [dn(w, +d), n]))) : '') +
    panel('Winners', hist.length ? table(['Year', 'Round', 'Driver', 'Team', 'Car'], hist.slice().reverse().map((h) => [h.year, h.round + 1, dn(w, h.driverId), tn(w, h.teamId), bn(w, h.brandId)])) : small('No race here in the records yet.'));
}

// ---------------------------------------------------------------- the ladder

function tierBlock(w, tier, list) {
  return `<h4>Tier ${tier}${tier === 1 ? ' (the championship you run)' : ''}</h4>` + (list.length ? table(['Series', 'Kind', 'Region', { t: 'Teams', num: 1 }, { t: 'Rounds', num: 1 }, { t: 'Prestige', num: 1 }, 'Leader now'], list.map((s) => {
    const st = s.cur && s.cur.standings ? Object.entries(s.cur.standings.drivers).sort((a, b) => b[1].pts - a[1].pts)[0] : null;
    return [sn(w, s.id) + (s.rival ? tag('rival') : '') + (s.sanctioned === false ? tag('unsanctioned') : '') + ` <span class="small"><a class="lk" href="#/series/${s.id}/chronicle">chronicle</a> · <a class="lk" href="#/series/${s.id}/records">records</a></span>`, KIND_NAME[s.kind], esc((REGION_BY_ID[s.region] || {}).name || s.continent || 'global'), s.teamIds.length, s.cur ? s.cur.calendar.length : s.rounds, s.prestige, st ? dn(w, +st[0]) + ' (' + st[1].pts + ')' : ''];
  })) : small('Nothing at this level yet.'));
}

export function pageTiers(w) {
  const act = activeSeries(w);
  const by = {};
  for (const s of act) (by[seriesTier(s, w.year)] = by[seriesTier(s, w.year)] || []).push(s);
  const tiers = Object.keys(by).map(Number).sort((a, b) => a - b);
  const t1 = `<h4>Tier 1 (the championship you run)</h4>` + small(`${activeEntries(w).length} entries from ${w.teams.filter((t) => t.active).length} teams. <a class="lk" href="#/standings">Standings</a> · <a class="lk" href="#/rules">Regulations</a>`);
  const gone = w.series.filter((s) => !s.active).sort((a, b) => (b.endedYear || 0) - (a.endedYear || 0)).slice(0, 25);
  const pyramid = '<div class="pyramid">' + [1].concat(tiers.filter((t) => t > 1)).map((t, i) => `<div class="pyr p${Math.min(i, 5)}"><b>Tier ${t}</b><span>${t === 1 ? 'The championship' : (by[t] || []).length + ' series'}</span></div>`).join('') + '</div>';
  const rising = w.drivers.filter((d) => d.status === 'active' && d.seriesId).sort((a, b) => b.rep - a.rep).slice(0, 12);
  return panel('The ladder', small('Below the championship sit continental series, development series, feeder series and, later, global junior series. Local racing is where it starts. Lower tiers run the real race engine each year, with fewer rounds and lower pace. Lower series can merge, be founded, or be challenged by rival series. The governor approves the changes.') + pyramid + t1 + tiers.filter((t) => t > 1).map((t) => tierBlock(w, t, by[t])).join('')) +
    panel('Talent coming through', table(['Driver', { t: 'Age', num: 1 }, 'Series', { t: 'Rep', num: 1 }, 'Backer'], rising.map((d) => [dn(w, d.id), ageAt(d, w.year), sn(w, d.seriesId), Math.round(d.rep), d.academy ? tn(w, d.academy) : ''])) + small('Grassroots standouts are on the <a class="lk" href="#/drivers">Drivers</a> page.')) +
    panel('Series that no longer run', gone.length ? table(['Series', 'Kind', 'Ended', 'Became'], gone.map((s) => [sn(w, s.id) + ` <span class="small"><a class="lk" href="#/series/${s.id}/chronicle">chronicle</a></span>`, KIND_NAME[s.kind], s.endedYear || '', s.mergedInto ? sn(w, s.mergedInto) : ''])) : small('None so far.'));
}

export function pageSeries(w, id, sub, arg) {
  const s = seriesById(w, id);
  if (!s) return panel('Series', 'No such series.');
  const tier = seriesTier(s, w.year);
  const head = `<div class="hero"><h2>${esc(s.name)}</h2><div class="small">${KIND_NAME[s.kind]} · Tier ${tier} · founded ${s.founded} · ${s.active ? 'running' : 'ended ' + s.endedYear} · prestige ${s.prestige} · owner: ${esc(s.owner)}${s.rival ? ' · rival series' : ''}</div></div>` +
    subtabs([[`#/series/${s.id}`, 'This season', !sub], [`#/series/${s.id}/chronicle`, `Chronicle (${s.history.length})`, sub === 'chronicle'], [`#/series/${s.id}/records`, 'Records', sub === 'records']]);
  if (sub === 'chronicle') return head + seriesChronicle(w, s, arg);
  if (sub === 'records') return head + seriesRecords(w, s);
  const c = s.cur;
  let live = '';
  if (c && s.active) {
    const st = tierStandings(s);
    live = panel(`${c.year} season, round ${c.round} of ${c.calendar.length}`, '<div class="two"><div><h4>Drivers</h4>' + table(['#', 'Driver', { t: 'Pts', num: 1 }, { t: 'W', num: 1 }, { t: 'Pod', num: 1 }], st.drivers.slice(0, 15).map((r, i) => [i + 1, dn(w, r.id), r.pts, r.wins, r.podiums])) + '</div><div><h4>Teams</h4>' +
      table(['#', 'Team', { t: 'Pts', num: 1 }, { t: 'W', num: 1 }], st.teams.slice(0, 15).map((r, i) => rowFor([i + 1, ltn(w, r.id), r.pts, r.wins], lowTeamPalette(w, lowTeamById(w, r.id))))) + '</div></div>') +
      panel('Results so far', c.results.length ? c.results.slice().reverse().map((r) => tierRaceHtml(w, r)).join('') : small('No round run yet this year. Lower series run in step with the championship.')) +
      panel('Calendar', small(c.calendar.map((t, i) => (i < c.round ? '<s>' : '') + trn(t) + (i < c.round ? '</s>' : '')).join(' · ')));
  }
  const teams = panel('Teams', table(['Team', 'Nation', { t: 'Strength', num: 1 }, { t: 'Titles', num: 1 }, 'Car from'], s.teamIds.map((id) => lowTeamById(w, id)).filter(Boolean).sort((a, b) => b.strength - a.strength).map((t) => rowFor([ltn(w, t.id) + (t.founder ? tag('founded by ' + t.founder.name) : ''), esc(t.nat), Math.round(t.strength * 100), t.titles, t.brandId && t.brandId !== 'none' ? bn(w, t.brandId) : ''], lowTeamPalette(w, t)))));
  const hist = panel('Champions', s.history.length ? table(['Year', 'Champion', 'Team', { t: 'Pts', num: 1 }, { t: 'Wins', num: 1 }, 'Runner-up'], s.history.slice().reverse().slice(0, 12).map((h) =>
    [`<a class="lk" href="#/series/${s.id}/chronicle/${h.year}">${h.year}</a>`, h.champion ? dn(w, h.champion.id) : '', h.team ? ltn(w, h.team.id) : '', h.champion ? h.champion.pts : '', h.champion ? h.champion.wins : '', h.standings && h.standings[1] ? dn(w, h.standings[1].id) : ''])) + (s.history.length > 12 ? small(`<a class="lk" href="#/series/${s.id}/chronicle">All ${s.history.length} seasons in the Chronicle</a>`) : '') : small('No seasons completed yet.'));
  const pastRaces = s.history.length ? panel('Last completed season', (s.history[s.history.length - 1].races || []).map((r) => tierRaceHtml(w, { ...r, classification: r.top })).join('') || small('Race reports from older seasons are dropped to keep saves small.')) : '';
  return head + live + '<div class="two">' + teams + hist + '</div>' + pastRaces;
}

// the margin between first and second in a lower series season
const lowMargin = (h) => (h.standings && h.standings[1] ? h.standings[0].pts - h.standings[1].pts : null);

function seriesChronicle(w, s, arg) {
  const hs = s.history.slice().reverse();
  if (!hs.length) return panel('Chronicle', small('No seasons have been completed in this series yet.'));
  const year = arg ? +arg : hs[0].year;
  const rows = hs.map((h) => ({
    cls: 'click' + (h.year === year ? ' on' : ''),
    cells: [`<a class="lk" href="#/series/${s.id}/chronicle/${h.year}">${h.year}</a>`, h.champion ? dn(w, h.champion.id) : '', h.team ? ltn(w, h.team.id) : '', h.champion ? h.champion.pts : '', h.champion ? h.champion.wins : '', lowMargin(h) === null ? '' : lowMargin(h),
      h.standings && h.standings[1] ? dn(w, h.standings[1].id) : '', h.standings && h.standings[2] ? dn(w, h.standings[2].id) : '', h.from ? esc(h.from) : ''],
  }));
  const list = panel(`${esc(s.name)}: champions, season by season`, small('Click a year to open its standings and race winners. Seasons from series that merged into this one carry over, marked with their old name.') +
    `<div class="scroll">${table(['Year', 'Champion', 'Team', { t: 'Pts', num: 1 }, { t: 'Wins', num: 1 }, { t: 'Margin', num: 1 }, 'Runner-up', 'Third', 'Series then'], rows, 'chron-table')}</div>`);
  const h = s.history.find((x) => x.year === year);
  if (!h) return list;
  const log = w.chronicle.filter((c) => c.year === year && c.text.indexOf(s.name) >= 0);
  const st = (h.standings || []).map((r, i) => [i + 1, dn(w, r.id), r.pts, r.wins, r.podiums === undefined ? '' : r.podiums]);
  const tm = (h.teams || []).map((r, i) => rowFor([i + 1, ltn(w, r.id), r.pts, r.wins], lowTeamPalette(w, lowTeamById(w, r.id))));
  const races = (h.races || []);
  const detail = panel(`${year} season`, (h.champion ? `<div class="champ"><div class="bigname">${dn(w, h.champion.id)}</div><div class="small">${h.team ? 'with ' + ltn(w, h.team.id) : ''} · ${h.champion.pts} points, ${h.champion.wins} win${h.champion.wins === 1 ? '' : 's'}${lowMargin(h) === null ? '' : ', margin ' + lowMargin(h)}</div></div>` : small('No champion on record.')) +
    (log.length ? '<ul class="evlog">' + log.map((c) => `<li class="${c.kind}">${esc(c.text)}</li>`).join('') + '</ul>' : '')) +
    '<div class="two">' + panel('Drivers', table(['#', 'Driver', { t: 'Pts', num: 1 }, { t: 'W', num: 1 }, { t: 'Pod', num: 1 }], st)) + panel('Teams', table(['#', 'Team', { t: 'Pts', num: 1 }, { t: 'W', num: 1 }], tm)) + '</div>' +
    panel(`Race winners (${races.length})`, races.length ? races.slice().sort((a, b) => a.round - b.round).map((r) => tierRaceHtml(w, { ...r, classification: r.top })).join('') : small('Race reports are kept for the last six seasons only; the standings stay.'));
  return list + detail;
}

function seriesRecords(w, s) {
  const hs = s.history.filter((h) => h.champion);
  if (!hs.length) return panel('Records', small('Records appear once the series has completed a season.'));
  const dT = {}, tT = {};
  for (const h of hs) { (dT[h.champion.id] = dT[h.champion.id] || []).push(h.year); if (h.team) (tT[h.team.id] = tT[h.team.id] || []).push(h.year); }
  const rows = (m) => Object.entries(m).map(([id, years]) => ({ id: +id, years, n: years.length })).sort((a, b) => b.n - a.n || a.years[0] - b.years[0]);
  let mostWins = null, mostPts = null, big = null, close = null, streak = null, run = null;
  for (const h of hs) {
    const c = h.champion, m = lowMargin(h);
    if (!mostWins || c.wins > mostWins.n) mostWins = { n: c.wins, id: c.id, year: h.year };
    if (!mostPts || c.pts > mostPts.n) mostPts = { n: c.pts, id: c.id, year: h.year };
    if (m !== null) { if (!big || m > big.n) big = { n: m, id: c.id, year: h.year }; if (!close || m < close.n) close = { n: m, id: c.id, year: h.year }; }
    if (run && run.id === c.id) run.n++; else run = { id: c.id, n: 1, from: h.year };
    if (!streak || run.n > streak.n) streak = { ...run };
  }
  const wins = {}, pods = {};
  for (const h of s.history) for (const r of h.standings || []) { wins[r.id] = (wins[r.id] || 0) + (r.wins || 0); pods[r.id] = (pods[r.id] || 0) + (r.podiums || 0); }
  const top = (m) => Object.entries(m).filter(([, n]) => n > 0).map(([id, n]) => ({ id: +id, n })).sort((a, b) => b.n - a.n).slice(0, 10);
  const tWins = {};
  for (const h of s.history) for (const r of h.teams || []) tWins[r.id] = (tWins[r.id] || 0) + (r.wins || 0);
  const line = (x, f) => (x ? f(x) : '-');
  // where the champions went
  const grads = hs.map((h) => ({ h, d: driverById(w, h.champion.id) })).filter((x) => x.d).map(({ h, d }) => ({ year: h.year, d, seasons: driverSeasons(w, d.id) })).filter((x) => x.seasons.length || x.d.titles);
  const climbed = w.lowTeams.filter((t) => t.graduated && s.history.some((h) => (h.teams || []).some((r) => r.id === t.id)));
  return panel('Records', kv([
    ['Most titles in a row', line(streak, (x) => `${x.n} by ${dn(w, x.id)} (from ${x.from})`)],
    ['Most wins in a season (champion)', line(mostWins, (x) => `${x.n} by ${dn(w, x.id)} in ${x.year}`)],
    ['Most points by a champion', line(mostPts, (x) => `${x.n} by ${dn(w, x.id)} in ${x.year}`)],
    ['Biggest winning margin', line(big, (x) => `${x.n} points, ${dn(w, x.id)}, ${x.year}`)],
    ['Closest championship', line(close, (x) => `${x.n} point${x.n === 1 ? '' : 's'}, ${dn(w, x.id)}, ${x.year}`)],
    ['Seasons on record', `${hs.length} (${hs[0].year}-${hs[hs.length - 1].year})`],
  ]) + small('Wins and podiums count the top ten of each season. Older seasons keep fewer rows to keep saves small.')) +
    '<div class="three">' + panel('Driver titles', table(['Driver', { t: 'Titles', num: 1 }, 'Years'], rows(dT).slice(0, 12).map((x) => [dn(w, x.id), x.n, x.years.join(', ')]))) +
    panel('Team titles', table(['Team', { t: 'Titles', num: 1 }], rows(tT).slice(0, 12).map((x) => [ltn(w, x.id), x.n]))) +
    panel('Wins in this series', table(['Driver', { t: 'Wins', num: 1 }], top(wins).map((x) => [dn(w, x.id), x.n]))) + '</div>' +
    '<div class="two">' + panel('Podiums in this series', table(['Driver', { t: 'Podiums', num: 1 }], top(pods).map((x) => [dn(w, x.id), x.n]))) +
    panel('Team wins in this series', table(['Team', { t: 'Wins', num: 1 }], top(tWins).map((x) => [ltn(w, x.id), x.n]))) + '</div>' +
    panel('Where the champions went', grads.length ? table(['Year', 'Champion', { t: 'Top-series seasons', num: 1 }, { t: 'Top-series titles', num: 1 }], grads.slice().reverse().slice(0, 25).map((x) => [x.year, dn(w, x.d.id), x.seasons.length, x.d.titles])) : small('None of its champions has reached the top series yet.')) +
    (climbed.length ? panel('Teams that climbed to the top series', table(['Team', 'Founded', 'Reached the top'], climbed.map((t) => [esc(t.name), t.founded, t.graduated]))) : '');
}

function tierRaceHtml(w, r) {
  const rows = r.classification || r.top || [];
  const win = rows.find((x) => x.pos === 1);
  return `<details><summary>Round ${r.round + 1}: ${trn(r.trackId)} · ${win ? esc(driverText(w, win.driverId)) : '-'} · ${r.finishers}/${r.starters} finished</summary><div class="race-body">` +
    table(['Pos', 'No.', 'Driver', 'Team', { t: 'Laps', num: 1 }, { t: 'Time / status', num: 1 }, { t: 'Pts', num: 1 }], rows.slice(0, 12).map((x) => [x.pos || '-', x.number, dn(w, x.driverId), teamById(w, x.teamId) && !lowTeamById(w, x.teamId) ? tn(w, x.teamId) : ltn(w, x.teamId), x.laps, x.status === 'Finished' ? formatTime(x.time) : esc(x.status === 'DNF' ? (x.reason || 'DNF') : x.status), x.points || ''])) + '</div></details>';
}

export function pageLowTeam(w, id) {
  const t = lowTeamById(w, id);
  if (!t) return panel('Team', 'No such team.');
  const ser = w.series.filter((s) => s.teamIds.indexOf(t.id) >= 0);
  const drivers = w.drivers.filter((d) => d.status === 'active' && d.seriesId && ser.some((s) => s.id === d.seriesId) && (ser.find((s) => s.id === d.seriesId).cur || { entries: [] }).entries.some((e) => e.teamId === t.id && e.driverId === d.id));
  const parent = t.groupTeamId ? teamById(w, t.groupTeamId) : null;
  return `<div class="hero"><h2>${esc(t.name)}</h2><div class="small">${esc(t.nat)} · ${esc((REGION_BY_ID[t.region] || {}).name || t.region)} · founded ${t.founded}${t.ended ? ', closed ' + t.ended : ''}</div></div>` +
    panel('At a glance', kv([['Strength', Math.round(t.strength * 100) + ' ' + bar(t.strength * 100)], ['Wealth', Math.round(t.wealth * 100) + ' ' + bar(t.wealth * 100)], ['Titles', t.titles], ['Wins', t.wins], ['Prestige', t.prestige], ['Car from', t.brandId && t.brandId !== 'none' ? bn(w, t.brandId) : ''],
      ['Junior team of', parent ? tn(w, parent.id) : ''], ['Races in', ser.map((s) => sn(w, s.id)).join(', ')]])) +
    panel('Drivers now', drivers.length ? table(['Driver', { t: 'Age', num: 1 }, { t: 'Rep', num: 1 }], drivers.map((d) => [dn(w, d.id), ageAt(d, w.year), Math.round(d.rep)])) : small('None at the moment.'));
}

// ---------------------------------------------------------------- approvals and governor

export function pageInbox(w) {
  const g = w.governor;
  const pend = pendingItems(w);
  const mode = `<div class="controls"><b>Governor</b> <select data-act="gov-personality">${Object.keys(PERSONALITIES).map((k) => `<option value="${k}" ${g.personality === k ? 'selected' : ''}>${PERSONALITIES[k].name}</option>`).join('')}</select>` +
    ` <select data-act="gov-mode"><option value="auto" ${g.mode === 'auto' ? 'selected' : ''}>Fully autonomous</option><option value="hands" ${g.mode === 'hands' ? 'selected' : ''}>Hands-on (you approve)</option></select></div>` +
    small(esc((PERSONALITIES[g.personality] || {}).blurb || '') + ' In hands-on mode, decisions wait here for you; anything you leave is settled by the governor when the season starts. In either mode you can take over single kinds of decision below.');
  const toggles = '<div class="controls">' + Object.keys(KIND_LABELS).map((k) => {
    const m = g.manual && g.manual[k];
    const on = m === true || (g.mode === 'hands' && m !== false);
    return `<label class="chk"><input type="checkbox" data-act="gov-kind" data-kind="${k}" ${on ? 'checked' : ''}> I decide: ${esc(KIND_LABELS[k])}</label>`;
  }).join(' ') + '</div>';
  const items = pend.length ? pend.map((i) => `<div class="item"><div class="item-h"><b>${esc(i.title)}</b> ${tag(KIND_LABELS[i.kind] || i.kind)} <span class="small">${i.year}</span></div><div class="small">${esc(i.text)}</div><div class="controls">` +
    i.options.map((o) => `<button class="${o.id === 'approve' ? 'primary' : ''}" data-act="resolve" data-id="${i.id}" data-choice="${esc(o.id)}">${esc(o.label)}</button>`).join('') + '</div></div>').join('') : small('Nothing waiting for you.');
  const log = (w.decisions || []).slice(-40).reverse();
  return panel('Governing body', mode + toggles) + panel(`Waiting for your decision (${pend.length})`, items) +
    panel('Recent decisions', log.length ? table(['Year', 'Kind', 'Decision', 'Outcome', 'By'], log.map((d) => [d.year, esc(KIND_LABELS[d.kind] || d.kind), esc(d.title), esc(d.choice), esc(d.by)])) : small('None yet.'));
}

// ---------------------------------------------------------------- regulations

const SCORING_PRESETS = {
  '6-4-2': [6, 4, 2], '8-6-4-3-2': [8, 6, 4, 3, 2], '9-6-4-3-2-1': [9, 6, 4, 3, 2, 1], '10-8-6-5-4-3-2-1': [10, 8, 6, 5, 4, 3, 2, 1],
  '12-9-7-5-4-3-2-1': [12, 9, 7, 5, 4, 3, 2, 1], '25-18-15-12-10-8-6-4-2-1': [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], '30-22-18-14-12-10-8-6-4-2': [30, 22, 18, 14, 12, 10, 8, 6, 4, 2],
};
const opt = (cur, pairs) => pairs.map(([v, l]) => `<option value="${esc(JSON.stringify(v))}" ${JSON.stringify(cur) === JSON.stringify(v) ? 'selected' : ''}>${esc(l)}</option>`).join('');
const regRow = (key, label, cur, pairs, note, w) => `<tr><td>${label}${w.regs.overridden && w.regs.overridden[key] ? ' ' + tag('set by you') : ''}</td><td><select data-act="reg" data-key="${key}">${opt(cur, pairs)}</select></td><td class="small">${note || ''}</td></tr>`;

export function pageRules(w) {
  const r = w.regs; const era = eraFor(w.year);
  const rangeOf = (a, b, step = 1) => { const o = []; for (let v = a; v <= b; v += step) o.push([v, String(v)]); return o; };
  const scoringKey = Object.keys(SCORING_PRESETS).find((k) => JSON.stringify(SCORING_PRESETS[k]) === JSON.stringify(r.scoring));
  const pairsScoring = Object.keys(SCORING_PRESETS).map((k) => [SCORING_PRESETS[k], k.replace(/-/g, ' / ')]);
  if (!scoringKey) pairsScoring.unshift([r.scoring, r.scoring.join(' / ') + ' (current)']);
  const rows = [
    regRow('scoring', 'Points system', r.scoring, pairsScoring, 'Points for each finishing place.', w),
    regRow('rounds', 'Races per season', r.rounds, rangeOf(6, 24), 'Longer seasons cost more to travel.', w),
    regRow('gridCap', 'Cars on the grid', r.gridCap, rangeOf(10, 30), 'Pre-qualifying cuts the field to this.', w),
    regRow('raceKm', 'Race distance (km)', r.raceKm, [[200, '200'], [250, '250'], [300, '300'], [350, '350'], [400, '400']], '', w),
    regRow('exemptTop', 'Exempt from pre-qualifying', r.exemptTop, rangeOf(0, 16), 'Best full-season entries skip it.', w),
    regRow('entries', 'Entries per team', r.entries, [[{ full: 1, partial: 0 }, '1 car'], [{ full: 2, partial: 0 }, '2 cars'], [{ full: 2, partial: 1 }, '2 + 1 part-season'], [{ full: 3, partial: 1 }, '3 + 1 part-season'], [{ full: 4, partial: 2 }, '4 + 2 part-season']], 'A team may enter at most 4 full-season and 2 part-season cars.', w),
    regRow('chassisSupply', 'Chassis supply', r.chassisSupply, [['customer', 'Customer cars allowed'], ['hybrid', 'Some customer cars'], ['strict', 'Constructors only']], 'Strict: every team must build its own chassis. This resets car designs.', w),
    regRow('commonOwnership', 'Common ownership', r.commonOwnership, [['free', 'Free'], ['limited', 'Limited (two teams per group)'], ['none', 'Not allowed']], 'Sister teams and groups.', w),
    regRow('safetyCar', 'Safety cars', r.safetyCar, [['none', 'None'], ['pace', 'Pace car'], ['standard', 'Standard'], ['virtual', 'Virtual']], '', w),
    regRow('tyreRule', 'Tyre rule', r.tyreRule, [['exclusive', 'Exclusive contracts'], ['tyre war', 'Tyre war'], ['single supplier', 'Single supplier'], ['two-supplier war', 'Two-supplier war']], 'Changes how suppliers are assigned.', w),
    regRow('costCap', 'Cost cap', !!r.costCap, [[false, 'Off'], [true, 'On']], 'Limits development spending; narrows the gap between rich and poor.', w),
    regRow('prizeFund', 'Prize fund', r.prizeFund, [[0.6, 'x0.6'], [0.8, 'x0.8'], [1, 'x1.0'], [1.2, 'x1.2'], [1.5, 'x1.5'], [2, 'x2.0']], 'Total money paid out to teams.', w),
    regRow('revenueShare', 'Prize money split', r.revenueShare, [['equal', 'Equal'], ['balanced', 'Balanced'], ['performance', 'By performance']], '', w),
    regRow('minWeight', 'Minimum weight', r.minWeight, [[false, 'None'], [true, 'Minimum weight'], ['ballast', 'Minimum weight with ballast']], '', w),
    regRow('preQual', 'Pre-qualifying', !!r.preQual, [[true, 'On'], [false, 'Off']], 'Off: everyone starts, up to the grid cap.', w),
    regRow('academyCap', 'Academy cap', r.academyCap, [[{ group: 4, global: 40 }, '4 per group, 40 total'], [{ group: 3, global: 24 }, '3 per group, 24 total'], [{ group: 2, global: 12 }, '2 per group, 12 total'], [{ group: 0, global: 0 }, 'No academies']], 'Junior programmes of the big groups.', w),
    regRow('endurance', 'Endurance rounds', r.endurance, [[{ events: 0, multiplier: 1 }, 'None'], [{ events: 1, multiplier: 1.5 }, 'One, points x1.5'], [{ events: 2, multiplier: 1.5 }, 'Two, points x1.5'], [{ events: 3, multiplier: 1.5 }, 'Three, points x1.5'], [{ events: 1, multiplier: 2 }, 'One, points x2'], [{ events: 3, multiplier: 2 }, 'Three, points x2']], 'Long races with relief drivers.', w),
  ].join('');
  const timeline = table(['From', 'Top places that score', 'Points'], SCORING_TIMELINE.map((s) => [s.from + (s.from <= w.year && (SCORING_TIMELINE.find((x) => x.from > s.from) || { from: 9999 }).from > w.year ? ' ' + tag('now') : ''), s.table.length, s.table.join(' / ')]));
  const ov = r.techBans || {};
  const techRows = TECHS.filter((x) => availableIn(x, w.year + 1)).map((x) => {
    const cur = ov[x.id] || 'default';
    const legal = bannedIn(x, w.year, ov) ? 'banned' : 'legal';
    return `<tr><td>${esc(x.name)}${ov[x.id] ? ' ' + tag('set by you') : ''}</td><td><select data-act="techban" data-id="${x.id}"><option value="default" ${cur === 'default' ? 'selected' : ''}>Period default</option><option value="ban" ${cur === 'ban' ? 'selected' : ''}>Ban</option><option value="allow" ${cur === 'allow' ? 'selected' : ''}>Allow</option></select></td><td class="small">Now ${legal}. ${(x.bans || []).length ? 'Default bans: ' + x.bans.map(([a, b]) => a + '-' + (b === 9999 ? 'on' : b)).join(', ') + '.' : 'No default ban.'} A supplier that invested in a banned technology takes a loss.</td></tr>`;
  }).join('');
  return panel('Regulations in force', small(`${esc(era.name)} era. Defaults follow the period; the governor changes rules over time (see Approvals). Changes you make here are yours: the governor will leave that rule alone. Rules take effect from the next season.`) +
    `<table class="rules"><tbody>${rows}</tbody></table>` + (Object.keys(r.overridden || {}).length ? `<div class="controls"><button data-act="reg-reset">Hand all rules back to the governor</button></div>` : '')) +
    panel('Technology bans and returns', small('Each technology has a period default (for example turbo is banned in the late 1980s and returns in the 2010s). Override any of them.') + `<table class="rules"><tbody>${techRows}</tbody></table>`) +
    panel('How the points system changed through history', small('Unless you set it yourself, the table moves to the next period default when its date arrives.') + timeline);
}

// ---------------------------------------------------------------- chronicle

function champRow(w, h) {
  const c = h.champion;
  if (h.cancelled) return null;
  const scoring = h.scoring || scoringFor(h.year).table;
  const rounds = (h.calendar || []).length || (h.results || []).length;
  const max = h.maxPoints || scoring[0] * rounds;
  const f = h.final && h.final.drivers && h.final.drivers[0];
  const wins = c.wins !== undefined ? c.wins : f ? f.wins : '';
  let pod = c.podiums !== undefined ? c.podiums : f && f.podiums !== undefined ? f.podiums : null;
  if (pod === null && h.results && h.results.length) pod = h.results.reduce((a, r) => a + (r.classification.some((x) => x.driverId === c.id && x.pos && x.pos <= 3) ? 1 : 0), 0);
  const poles = c.poles !== undefined ? c.poles : f && f.poles !== undefined ? f.poles : '';
  return { year: h.year, champ: c, wins, pod: pod === null ? '' : pod, poles, pts: c.pts, max, scoring, margin: c.margin, rounds };
}

export function pageChronicle(w, year) {
  const hs = w.history.seasons.slice().reverse();
  const cur = w.season;
  const rows = hs.map((h) => {
    if (h.cancelled) return { cls: 'void click', attr: h.year, cells: [h.year, '<i>no championship</i>', esc(h.cancelled.name), '', '', '', '', '', ''] };
    if (h.empty || !h.champion) return { cls: 'void click', attr: h.year, cells: [h.year, '<i>no grid</i>', '', '', '', '', '', '', ''] };
    const r = champRow(w, h);
    return { cls: 'click' + (h.year === year ? ' on' : ''), attr: h.year, cells: [h.year, dn(w, h.champion.id), h.championTeam ? tn(w, h.championTeam.id, h.championTeam.name) : '', h.championBrand ? bn(w, h.championBrand.id, h.championBrand.name) : '', r.wins, r.pod, r.poles, `${r.pts} of ${r.max}`, h.final ? `<a class="lk" href="#/standings/${h.year}">Points tables</a>` : ''] };
  });
  const listHtml = `<table class="chron-table"><thead><tr><th>Year</th><th>Champion</th><th>Team</th><th>Maker</th><th class="num">Wins</th><th class="num">Podiums</th><th class="num">Poles</th><th class="num">Points / on offer</th><th>Standings</th></tr></thead><tbody>` +
    (cur && !cur.done ? `<tr class="click" data-year="${cur.year}"><td>${cur.year}</td><td colspan="7"><i>in progress (${cur.results.length} of ${cur.calendar.length} rounds run)</i></td><td><a class="lk" href="#/standings">Live tables</a></td></tr>` : '') +
    rows.map((r) => `<tr class="${r.cls}" data-year="${r.attr}">` + r.cells.map((c, i) => `<td class="${i >= 4 && i <= 7 ? 'num' : ''}">${c}</td>`).join('') + '</tr>').join('') + '</tbody></table>';
  return panel('Champions, season by season', small('Click a season to open its race reports and the points it took to win; “Points tables” opens the full standings of that year, drivers, teams and makers, in team colours. Names link to their pages. “Points / on offer” is what the champion scored against the most the season could have given.') + `<div class="scroll">${listHtml}</div>`) +
    `<div id="season-detail">${year ? seasonDetail(w, year) : ''}</div>`;
}

function seasonDetail(w, year) {
  const h = w.history.seasons.find((x) => x.year === year);
  const log = w.chronicle.filter((c) => c.year === year);
  const logHtml = log.length ? panel('Changes in the industry', `<ul class="evlog">${log.map((c) => `<li class="${c.kind}">${esc(c.text)}</li>`).join('')}</ul>`) : '';
  if (!h) {
    const cur = w.season;
    if (cur.year !== year) return '';
    return panel(`${year} season (in progress)`, small(`${cur.results.length} of ${cur.calendar.length} rounds run. Scoring: ${w.regs.scoring.join(', ')}.`)) + (cur.results.length ? panel('Race reports', cur.results.slice().reverse().map((r) => raceDetailsHtml(w, r)).join('')) : '') + logHtml;
  }
  if (h.cancelled) return panel(`${year}: no championship`, `<p>${esc(h.cancelled.name)}. Drivers aged and teams and makers carried on or gave up.</p>`) + logHtml;
  if (h.empty || !h.champion) return panel(`${year}: no grid`, '<p>No race was held this year.</p>') + logHtml;
  const r = champRow(w, h);
  const c = h.champion;
  const marginTxt = r.margin === undefined || r.margin === null ? '' : r.margin === 0 ? 'won on countback' : `won by ${r.margin} point${r.margin === 1 ? '' : 's'}`;
  const head = panel(`${year} season`, `<div class="champ"><div class="bigname">${dn(w, c.id)}</div><div class="small">${esc(h.championTeam ? 'with ' + h.championTeam.name : '')}${h.championBrand ? ' · ' + esc(h.championBrand.name) + ' power' : ''}</div></div>` +
    kv([
      ['Points to win the championship', `<b>${r.pts}</b> of ${r.max} on offer${r.max ? ' (' + Math.round((r.pts / r.max) * 100) + '%)' : ''}`],
      ['Margin', marginTxt],
      ['Wins', r.wins], ['Podiums', r.pod], ['Pole positions', r.poles],
      ['Races', r.rounds],
      ['Scoring that year', r.scoring.join(' / ') + (h.endurance ? ' (endurance rounds scored extra)' : '')],
      ['Maker\'s title', h.championBrand ? bn(w, h.championBrand.id) + ` (${h.championBrand.pts} pts${h.championBrand.wins === undefined ? '' : ', ' + h.championBrand.wins + ' wins'})` : ''],
      ['Team title', h.championTeam ? tn(w, h.championTeam.id, h.championTeam.name) : ''],
      ['Points tables', h.final ? `<a class="lk" href="#/standings/${year}">Full ${year} standings: drivers, teams, makers</a>` : ''],
    ]));
  let standings = '';
  if (h.final) {
    const pts = (x) => (x === undefined ? '' : x);
    const tname = (id) => { const t = (h.final.teams || []).find((x) => String(x.id) === String(id)); return t ? t.name : undefined; };
    const dr = h.final.drivers.slice(0, 15).map((x, i) => { const cells = [i + 1, dn(w, x.id), x.teamId !== undefined && x.teamId !== null ? tn(w, +x.teamId, tname(x.teamId)) : '', pts(x.pts), pts(x.wins), pts(x.podiums), pts(x.poles)]; return x.teamId !== undefined && x.teamId !== null ? rowFor(cells, teamPalette(w, +x.teamId)) : cells; });
    const br = h.final.brands.slice(0, 12).map((x, i) => rowFor([i + 1, bn(w, x.id, x.name), x.pts, x.wins], brandPalette(x.id)));
    const en = h.final.entries.slice(0, 15).map((x, i) => { const e = entryById(w, x.id); const tid = x.teamId !== undefined ? +x.teamId : e ? e.teamId : null; const num = x.number !== undefined ? x.number : e ? e.number : '?'; const cells = [i + 1, tid !== null ? `#${num} ${tn(w, tid, tname(tid))}` : '?', x.pts, x.wins]; return tid !== null ? rowFor(cells, teamPalette(w, tid)) : cells; });
    standings = '<div class="two">' + panel('Drivers', table(['#', 'Driver', 'Team', { t: 'Pts', num: 1 }, { t: 'W', num: 1 }, { t: 'Pod', num: 1 }, { t: 'Poles', num: 1 }], dr)) +
      '<div>' + panel('Makers', table(['#', 'Maker', { t: 'Pts', num: 1 }, { t: 'W', num: 1 }], br)) + '</div></div>' +
      panel('Entries', table(['#', 'Entry', { t: 'Pts', num: 1 }, { t: 'W', num: 1 }], en));
  }
  // champions of the lower tiers the same year
  const lower = w.series.map((s) => ({ s, h: s.history.find((x) => x.year === year) })).filter((x) => x.h && x.h.champion).sort((a, b) => a.h.tier - b.h.tier);
  const lowerHtml = lower.length ? panel('Lower tiers that year', table(['Tier', 'Series', 'Champion', 'Team', { t: 'Pts', num: 1 }], lower.map((x) => [x.h.tier, sn(w, x.s.id) + ` <a class="lk" href="#/series/${x.s.id}/chronicle/${year}">season</a>`, dn(w, x.h.champion.id), x.h.team ? ltn(w, x.h.team.id) : '', x.h.champion.pts]))) : '';
  const races = h.results && h.results.length ? panel(`Race reports (${h.results.length})`, h.results.map((x) => raceDetailsHtml(w, x)).join('')) : '';
  return head + logHtml + standings + lowerHtml + races;
}

export function pageRecords(w) {
  const tt = titleTables(w);
  const legacies = pageLegacies(w);
  const rb = recordBook(w);
  const rv = rivalries(w);
  const line = (x, f) => (x ? f(x) : '-');
  const recs = kv([
    ['Most titles in a row', line(rb.longestStreak, (x) => `${x.n} by ${dn(w, x.id)} (from ${x.from})`)],
    ['Most wins in a season (champion)', line(rb.mostWins, (x) => `${x.n} by ${dn(w, x.id)} in ${x.year}`)],
    ['Most points by a champion', line(rb.mostPts, (x) => `${x.n} by ${dn(w, x.id)} in ${x.year}`)],
    ['Biggest winning margin', line(rb.bigMargin, (x) => `${x.n} points, ${dn(w, x.id)}, ${x.year}`)],
    ['Closest championship', line(rb.closest, (x) => `${x.n} point${x.n === 1 ? '' : 's'}, ${dn(w, x.id)}, ${x.year}`)],
  ]);
  return panel('Records', recs) + legacies +
    '<div class="three">' + panel('Driver titles', table(['Driver', { t: 'Titles', num: 1 }, 'Years'], tt.drivers.slice(0, 15).map((x) => [dn(w, x.id), x.n, x.years.join(', ')]))) +
    panel('Team titles', table(['Team', { t: 'Titles', num: 1 }], tt.teams.slice(0, 15).map((x) => [tn(w, x.id), x.n]))) +
    panel('Maker titles', table(['Maker', { t: 'Titles', num: 1 }], tt.brands.slice(0, 15).map((x) => [bn(w, x.id), x.n]))) + '</div>' +
    '<div class="three">' + panel('Career wins', table(['Driver', { t: 'Wins', num: 1 }], rb.careerWins.map((x) => [dn(w, x.id), x.n]))) +
    panel('Career starts', table(['Driver', { t: 'Starts', num: 1 }], rb.careerStarts.map((x) => [dn(w, x.id), x.n]))) +
    panel('Team wins', table(['Team', { t: 'Wins', num: 1 }], rb.teamWins.map((x) => [tn(w, x.id), x.n]))) + '</div>' +
    panel('Rivalries', small('Two drivers who were both real title contenders (within a quarter of the leader) in the same season, more than once. Each season is graded on how close they finished and how serious both were; the rivalry is graded on that and on how many seasons it ran.') +
      (rv.length ? table(['Pair', 'Grade', { t: 'Intensity', num: 1 }, '', { t: 'Seasons', num: 1 }, 'Span', 'Titles between them', 'Closest fight'], rv.map((x) =>
        [dn(w, x.a) + ' and ' + dn(w, x.b) + (x.teammates ? tag(x.teammates === x.seasons.length ? 'teammates' : 'sometimes teammates') : ''),
          tag(x.grade, x.grade === 'Legendary' ? 'gold' : ''), x.rating, bar(x.rating), x.seasons.length, `${x.from}-${x.to}`,
          `${driverText(w, x.a)} ${x.titlesA}, ${driverText(w, x.b)} ${x.titlesB}`, `${x.closest.year} (${x.closest.gap} pt${x.closest.gap === 1 ? '' : 's'} apart)`])) : small('No rivalries yet. They appear when two drivers fight for the title in more than one season.'))) +
    panel('Venues', table(['Venue', 'Country', 'Open'], TRACKS.filter((t) => w.year >= t.opens && (!t.closes || w.year <= t.closes)).map((t) => [trn(t.id), esc(t.country), t.opens + (t.closes ? '-' + t.closes : '')])));
}

// ---------------------------------------------------------------- the front page

export function pageDash(w) {
  const dr = driverStandings(w).slice(0, 6);
  const news = w.chronicle.slice(-10).reverse();
  const last = w.history.seasons.filter((h) => h.champion).slice(-1)[0];
  const era = eraFor(w.year);
  const pend = pendingItems(w);
  const t1 = w.series.filter((s) => s.active).sort((a, b) => seriesTier(a, w.year) - seriesTier(b, w.year));
  return '<div class="two">' +
    panel(`${w.year}: ${esc(era.name)}`, kv([
      ['Points system', `top ${w.regs.scoring.length} score: ${w.regs.scoring.join(', ')}`], ['Rounds', `${w.season.round} of ${w.season.calendar.length}`],
      ['Entries', `${activeEntries(w).length} cars from ${w.teams.filter((t) => t.active).length} teams`], ['Tyre rule', esc(w.regs.tyreRule)], ['Governor', esc((PERSONALITIES[w.governor.personality] || {}).name) + ', ' + (w.governor.mode === 'hands' ? 'you decide' : 'autonomous')],
      ['Title sponsor', w.titleSponsor ? link('sponsor', w.titleSponsor.id, w.titleSponsor.name) : 'none'], ['Last champion', last ? `${dn(w, last.champion.id)} (${last.year})` : ''],
      ['Waiting for you', pend.length ? `<a class="lk" href="#/inbox">${pend.length} decision${pend.length === 1 ? '' : 's'}</a>` : 'nothing'],
    ]) + (dr.length ? '<h4>Championship leaders</h4>' + table(['#', 'Driver', 'Team', { t: 'Pts', num: 1 }], dr.map((r, i) => { const e = activeEntries(w).find((x) => x.driverId === r.id); const cells = [i + 1, dn(w, r.id), e ? tn(w, e.teamId) : '', r.pts]; return e ? rowFor(cells, teamPalette(w, e.teamId)) : cells; })) : '')) +
    panel('News', news.length ? '<ul class="evlog">' + news.map((c) => `<li class="${c.kind}"><b>${c.year}</b> ${esc(c.text)}</li>`).join('') + '</ul>' : small('Nothing yet.')) +
    '</div>' + panel('The ladder at a glance', t1.length ? table(['Series', 'Tier', { t: 'Teams', num: 1 }], [[`${esc(w.titleSponsor ? w.titleSponsor.name + ' ' : '')}The Championship`, 1, w.teams.filter((t) => t.active).length]].concat(t1.map((s) => [sn(w, s.id), seriesTier(s, w.year), s.teamIds.length]))) : small('Only local racing exists so far. Series form as it grows.'));
}

export function pageSponsor(w, id) {
  const sp = SPONSOR_BY_ID[id];
  if (!sp) return panel('Sponsor', 'No such sponsor.');
  const deals = [];
  for (const t of w.teams) for (const d of t.sponsors || []) if (d.id === id) deals.push({ t, d });
  const ts = w.titleSponsor && w.titleSponsor.id === id;
  const log = w.chronicle.filter((c) => c.kind === 'sponsor' && c.text.indexOf(sp.name) >= 0).slice(-20).reverse();
  const open = w.year >= sp.from && w.year <= sp.to;
  return `<div class="hero"><h2>${esc(sp.name)}</h2><div class="small">${esc(sp.sector)} · ${sp.reach === 'global' ? 'global brand' : 'strongest in ' + esc((REGION_BY_ID[sp.reach] || {}).name || sp.reach)} · real brand, active in the sport ${sp.from}-${sp.to === 9999 ? 'on' : sp.to}${sp.marquee ? ' · marquee sponsor' : ''}</div>` + (ts ? tag('title sponsor of the championship', 'gold') : '') + '</div>' +
    panel('Profile', kv([['Size', bar(sp.size * 100, 120)], ['Loyalty', sp.loyalty === undefined ? '' : pct(sp.loyalty)], ['Chases stars', sp.star === undefined ? '' : pct(sp.star)], ['Available now', open ? (w.year >= COMMERCIAL_FROM ? 'yes' : 'not until commercial sponsorship starts in ' + COMMERCIAL_FROM) : 'no, outside its real dates']])) +
    panel('Current deals', deals.length ? table(['Team', { t: 'Value / yr', num: 1 }, 'Since', 'Until'], deals.map((x) => [tn(w, x.t.id), money(x.d.value), x.d.since, x.d.until])) : small('No team deals at the moment.')) +
    panel('History', log.length ? '<ul class="evlog">' + log.map((c) => `<li><b>${c.year}</b> ${esc(c.text)}</li>`).join('') + '</ul>' : small('Nothing notable yet.'));
}

export function pageLegacies(w) {
  const ids = allIdentities(w);
  const cell = (e) => identityBadge(w, e, e.to || w.year) + link('team', e.teamId, e.name);
  const span = (e) => `${e.from}-${e.to || (e.active ? 'now' : '?')}`;
  const fate = (e) => {
    if (e.current) return e.active ? 'racing' : 'closed ' + (e.to || '');
    return esc(e.how || 'ended') + (e.successor ? ' &rarr; ' + esc(e.successor) : '');
  };
  const legends = ids.filter((e) => e.legendary).sort((a, b) => b.score - a.score);
  const near = ids.filter((e) => e.current && e.active && !e.legendary).sort((a, b) => b.score - a.score).slice(0, 8);
  return panel('Legendary teams', small('A team becomes legendary through titles, wins and years in the sport, the way the great names of the sport did. When a team is sold and rebranded its legacy starts again, and the old identity stays here as the legend it was. A legend that closes is likelier to be revived.') +
    (legends.length ? table(['Team', 'Years', 'What became of it', { t: 'Titles', num: 1 }, { t: 'Wins', num: 1 }, { t: 'Legacy', num: 1 }], legends.map((e) => rowFor([cell(e), span(e), fate(e), e.titles, e.wins, e.score], identityPalette(e)))) : small('None yet.')) +
    '<h4>Building a legacy</h4>' + table(['Team', 'Since', { t: 'Titles', num: 1 }, { t: 'Wins', num: 1 }, { t: 'Legacy', num: 1 }], near.map((e) => rowFor([cell(e), e.from, e.titles, e.wins, e.score], identityPalette(e)))));
}

// a person who is not a driver: team staff and the engineers who founded teams. Their career is the story the chronicle tells.
export function pagePerson(w, name) {
  const roles = [];
  for (const t of w.teams) for (const k of Object.keys(ROLE_LABEL)) if (t.staff && t.staff[k] && t.staff[k].name === name) roles.push({ t, k, s: t.staff[k] });
  const founded = w.teams.filter((t) => t.origin && t.origin.by === name && (t.origin.type === 'engineer-founder' || t.origin.type === 'driver-founder'));
  const driver = w.drivers.find((d) => d.name === name);
  const log = (w.chronicle || []).filter((c) => c.text.indexOf(name) >= 0).sort((a, b) => a.year - b.year);
  if (!roles.length && !founded.length && !driver && !log.length) return panel('Person', 'No record of ' + esc(name) + '.');
  const first = roles[0] ? roles[0].s : null;
  return `<div class="hero"><h2>${esc(name)}</h2><div class="small">${first ? esc(first.nat) + ' · ' : ''}${roles.length ? 'now ' + roles.map((r) => `${ROLE_LABEL[r.k].toLowerCase()} of ${link('team', r.t.id, r.t.name)}`).join(', ') : 'no longer in a team role'}</div>` +
    (driver ? `<div class="small">Also raced: ${dn(w, driver.id)}</div>` : '') + '</div>' +
    (founded.length ? panel('Teams founded', table(['Team', 'Founded', { t: 'Titles', num: 1 }, { t: 'Wins', num: 1 }, 'Status'], founded.map((t) => [tn(w, t.id), t.foundedYear, t.titles, t.wins, t.active ? 'racing' : 'left the grid ' + (t.endedYear || '')]))) : '') +
    (roles.length ? panel('Current role', table(['Team', 'Role', { t: 'Age', num: 1 }, { t: 'Rating', num: 1 }], roles.map((r) => [tn(w, r.t.id), ROLE_LABEL[r.k], r.s.age === undefined ? '' : r.s.age, w.year < 1950 ? band(r.s.rating) : r.s.rating]))) : '') +
    panel('Career', log.length ? '<ul class="evlog">' + log.map((c) => `<li><b>${c.year}</b> ${esc(c.text)}</li>`).join('') + '</ul>' : small('Nothing notable on record.'));
}
