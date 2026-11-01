// The governing body. Every decision the player can make is also one the autonomous
// governor makes, using the same rules. A governor has a personality chosen at world
// creation. In hands-on mode the player's decisions wait in the approvals inbox; the
// season only starts once they are settled (or the governor settles the rest).

import { makeRng, clamp } from './rng.js';
import { scoringFor, tyreRuleFor, eraFor } from './data/eras.js';
import { regionName } from './data/regions.js';
import { logEvent, activateWorks, addPrivateerTeam, brandById, teamById, activeEntries, deactivateTeam } from './world.js';
import { applyFounderDecision, graduateLowTeam, acquireTeam } from './founders.js';
import { engineOnlyAt } from './data/brands.js';
import { foundSeries, lowTeamById } from './tiers.js';
import { eventsFor } from './data/events.js';

export const PERSONALITIES = {
  cautious:      { name: 'Cautious', growth: 0.3, change: 0.25, open: 0.4, tiers: 0.4, commercial: 0.3, blurb: 'Protects the sport, slow to approve change and new entrants.' },
  expansionist:  { name: 'Expansionist', growth: 0.9, change: 0.6, open: 0.9, tiers: 0.9, commercial: 0.6, blurb: 'Wants more teams, more races, new tiers and new regions, early.' },
  traditionalist:{ name: 'Traditionalist', growth: 0.35, change: 0.15, open: 0.5, tiers: 0.35, commercial: 0.25, blurb: 'Follows the era defaults and resists changes to the formula.' },
  commercial:    { name: 'Commercial', growth: 0.7, change: 0.5, open: 0.7, tiers: 0.6, commercial: 0.95, blurb: 'Chases money, fans and spectacle; likes big grids and prize funds.' },
};
export const traits = (world) => PERSONALITIES[world.governor.personality] || PERSONALITIES.traditionalist;

export const KIND_LABELS = {
  'entry-works': 'Manufacturer entries', 'entry-team': 'Team entries', series: 'New and merged series', regs: 'Regulations', calendar: 'Calendar', sanction: 'Local events',
};

const APPROVE = [{ id: 'approve', label: 'Approve' }, { id: 'refuse', label: 'Refuse' }];

// ---------------------------------------------------------------- the inbox

export function propose(world, year, kind, payload, title, text, options) {
  const item = { id: ++world.counters.decision, kind, year, title, text, payload, options: options || APPROVE, choice: null, status: 'pending', by: null };
  world.inbox.push(item);
  return item;
}

export function isManual(world, kind) {
  const g = world.governor;
  const m = g.manual && g.manual[kind];
  if (m === true) return true;
  if (g.mode === 'hands' && m !== false) return true;
  return false;
}

export const pendingItems = (world) => world.inbox.filter((i) => i.status === 'pending');

// the governor's own pick, from its personality and the state of the sport
export function governorChoice(world, item) {
  const g = traits(world);
  const rng = makeRng(world.seed, 'gov', item.id, item.year);
  const r = () => rng.next();
  const pl = item.payload;
  switch (item.kind) {
    case 'entry-works': case 'entry-team': {
      const cars = activeEntries(world).length;
      const room = clamp((world.regs.gridCap + 6 - cars) / 8, 0.05, 1);
      // a champion or an established engineer with a plan, or a maker buying a team already on the grid, is a safer bet
      const bonus = pl.founderDriverId !== undefined || pl.engineer ? 0.22 : pl.buyTeamId ? 0.3 : (pl.lowTeamId && lowFounder(world, pl.lowTeamId)) ? 0.25 : 0;
      return r() < clamp(0.25 + 0.65 * g.open * room + bonus, 0.05, 0.97) ? 'approve' : 'refuse';
    }
    case 'series': return r() < 0.3 + 0.65 * g.tiers ? 'approve' : 'refuse';
    case 'calendar': return r() < 0.3 + 0.6 * g.growth ? 'approve' : 'refuse';
    case 'sanction': return g.open > 0.6 ? 'all' : g.open > 0.35 ? 'major' : 'major';
    case 'regs': return r() < (pl.schedule ? 0.9 : 0.25 + 0.7 * g.change) ? 'approve' : 'refuse';
    default: return 'approve';
  }
}

const lowFounder = (world, id) => { const t = lowTeamById(world, id); return t && t.founder; };

// carries out a decision
export function applyDecision(world, item, choice, who) {
  const year = world.year;
  const pl = item.payload;
  item.choice = choice; item.status = 'done'; item.by = who;
  const rng = makeRng(world.seed, 'apply', item.id, year);
  if (item.kind === 'entry-works') {
    const b = brandById(world, pl.brandId);
    const target = pl.buyTeamId ? teamById(world, pl.buyTeamId) : null;
    if (choice === 'approve' && b && b.status !== 'racing' && target && target.active && target.kind === 'privateer') acquireTeam(world, b, target, year, rng);
    else if (choice === 'approve' && b && b.status !== 'racing') { activateWorks(world, b, rng, year); logEvent(world, year, 'brand', `${b.name} enters the championship with a works team.`); }
    else if (b) logEvent(world, year, 'brand', `The entry of ${b.name}${target ? ' to buy ' + target.name : ''} is refused.`);
  } else if (item.kind === 'entry-team') {
    const lt = pl.lowTeamId ? lowTeamById(world, pl.lowTeamId) : null;
    if (applyFounderDecision(world, pl, choice, year, rng)) { /* a founder's team: handled */ }
    else if (choice === 'approve' && lt && lt.founder && graduateLowTeam(world, lt, year, rng)) { /* the founder's team climbs */ }
    else if (choice === 'approve') {
      const t = addPrivateerTeam(world, rng, year, { nat: lt ? lt.nat : undefined, rich: true });
      if (lt) { t.name = lt.name; t.nat = lt.nat; t.region = lt.region; t.names = [lt.name]; lt.ended = year; lt.graduated = year; t.prestige = Math.max(t.prestige, lt.prestige); }
      logEvent(world, year, 'team', `${t.name} is granted a Tier 1 entry and must pre-qualify.`);
    } else if (lt) logEvent(world, year, 'team', `${lt.name}'s Tier 1 application is refused.`);
  } else if (item.kind === 'series') {
    if (choice === 'approve') foundSeries(world, pl, year, rng);
  } else if (item.kind === 'regs') {
    if (choice === 'approve') {
      world.regs[pl.key] = pl.value;
      if (pl.key === 'entriesFull') { world.regs.entries.full = pl.value; delete world.regs.entriesFull; }
      if (who === 'you') { world.regs.overridden = world.regs.overridden || {}; world.regs.overridden[pl.key] = true; }
      world.epoch += pl.epoch ? 1 : 0;
      logEvent(world, year, 'regs', `${pl.label || pl.key} changed: ${pl.describe || JSON.stringify(pl.value)}${who === 'you' ? ' (your decision)' : ''}.`);
    }
  } else if (item.kind === 'calendar') {
    if (choice === 'approve') {
      if (pl.rounds !== undefined) world.regs.rounds = pl.rounds;
      if (pl.endurance !== undefined) world.regs.endurance.events = pl.endurance;
      logEvent(world, year, 'regs', `Calendar: ${pl.describe}.`);
    }
  } else if (item.kind === 'sanction') {
    world.sanction = { year, level: choice };
    for (const s of world.series) {
      if (!s.active || s.kind !== 'scene') continue;
      const yes = choice === 'all' || (choice === 'major' && (s.prestige >= 12 || s.teamIds.length >= 8));
      s.sanctioned = yes;
      if (yes) { s.prestige = Math.round(s.prestige + 3); s.score = (s.score || 0) + 2; }
    }
    if (choice !== 'none') logEvent(world, year, 'regs', choice === 'all' ? 'The governing body sanctions all local events.' : 'The governing body sanctions the major local events only.');
  }
  world.decisions.push({ id: item.id, year, kind: item.kind, title: item.title, choice, by: who });
  if (world.decisions.length > 300) world.decisions.shift();
}

export function resolveItem(world, id, choice, who = 'you') {
  const item = world.inbox.find((i) => i.id === id);
  if (!item || item.status !== 'pending') return false;
  if (!item.options.some((o) => o.id === choice)) return false;
  applyDecision(world, item, choice, who);
  return true;
}

// settle items the governor handles; manual ones stay pending
export function settle(world) {
  for (const item of world.inbox.filter((i) => i.status === 'pending')) {
    if (isManual(world, item.kind)) continue;
    applyDecision(world, item, governorChoice(world, item), 'governor');
  }
}
// the governor takes over everything still waiting
export function settleAll(world) {
  for (const item of world.inbox.filter((i) => i.status === 'pending')) applyDecision(world, item, governorChoice(world, item), 'governor');
}
export function clearInbox(world) { world.inbox = world.inbox.filter((i) => i.status === 'pending'); }

// ---------------------------------------------------------------- commands only the player gives

export function inviteBrand(world, brandId) {
  const b = brandById(world, brandId);
  if (!b || b.status === 'racing' || b.status === 'defunct') return false;
  const year = world.year;
  if (engineOnlyAt(b.id, year)) { b.status = 'racing'; b.raceYears = 0; logEvent(world, year, 'brand', `${b.name} accepts an invitation from the governing body and begins supplying engines (your decision).`); return true; }
  activateWorks(world, b, makeRng(world.seed, 'invite', brandId, year), year);
  logEvent(world, year, 'brand', `${b.name} accepts an invitation from the governing body and enters with a works team (your decision).`);
  return true;
}
export function expelBrand(world, brandId) {
  const b = brandById(world, brandId);
  if (!b || b.status !== 'racing') return false;
  const year = world.year;
  const team = world.teams.find((t) => t.kind === 'works' && t.brandId === brandId && t.active);
  if (team) deactivateTeam(world, team, year);
  b.status = 'dormant';
  logEvent(world, year, 'brand', `${b.name} is stopped from racing by the governing body (your decision).`);
  return true;
}
export function setRegulation(world, key, value) {
  world.regs[key] = value;
  world.regs.overridden = world.regs.overridden || {};
  world.regs.overridden[key] = true;
  world.regs.touched = true;
  if (['chassisSupply', 'minWeight', 'tyreRule'].indexOf(key) >= 0) world.epoch++;
  logEvent(world, world.year, 'regs', `You set ${key} to ${JSON.stringify(value)}.`);
}

// ---------------------------------------------------------------- the governor's proposals

function recentTeamDominance(world) {
  const s = world.history.seasons.filter((h) => !h.cancelled && h.championTeam).slice(-3);
  if (s.length < 3) return null;
  return s.every((h) => h.championTeam.id === s[0].championTeam.id) ? s[0].championTeam.name : null;
}
function recentDominance(world) {
  const s = world.history.seasons.filter((h) => !h.cancelled && h.championBrand).slice(-3);
  if (s.length < 3) return null;
  return s.every((h) => h.championBrand.id === s[0].championBrand.id) ? s[0].championBrand.name : null;
}

export function regsProposals(world, year, last, ev) {
  const regs = world.regs;
  const ov = regs.overridden || {};
  const g = traits(world);
  const out = [];
  const add = (key, value, label, describe, extra = {}) => out.push({ key, value, label, describe, ...extra });

  // the default schedules of the era
  const sc = scoringFor(year);
  if (!ov.scoring && sc.from === year && year > world.startYear) add('scoring', sc.table.slice(), 'Points system', `top ${sc.table.length} score: ${sc.table.join('-')}`, { schedule: true });
  const tr = tyreRuleFor(year);
  if (!ov.tyreRule && tr !== regs.tyreRule) add('tyreRule', tr, 'Tyre rule', tr, { schedule: true });

  // a runaway maker invites a response
  const tdom = recentTeamDominance(world);
  if (tdom && !regs.costCap && year >= 1960) add('costCap', true, 'Cost cap', `a cost cap, after ${tdom} won three titles in a row`);
  if (tdom && regs.revenueShare !== 'equal') add('revenueShare', 'equal', 'Revenue share', `an equal split of the prize fund, after ${tdom} won three titles in a row`);
  const dom = recentDominance(world);
  if (dom && !regs.costCap && year >= 1990) add('costCap', true, 'Cost cap', `a cost cap, after ${dom} won three titles in a row`);
  if (dom && regs.revenueShare !== 'equal' && year >= 1950) add('revenueShare', 'equal', 'Revenue share', `an equal split of the prize fund, after ${dom} won three titles in a row`);

  // a thin grid
  const cars = activeEntries(world).filter((e) => e.driverId != null).length;
  if (cars < regs.gridCap - 4 && regs.prizeFund < 1.6) add('prizeFund', Math.round((regs.prizeFund + 0.2) * 10) / 10, 'Prize fund', `larger prize fund (x${(regs.prizeFund + 0.2).toFixed(1)}) to help a thin grid`);
  if (cars > regs.gridCap + 8 && regs.gridCap < 30) add('gridCap', regs.gridCap + 2, 'Grid cap', `grid raised to ${regs.gridCap + 2} cars`);

  // sister teams crowd the grid
  const grouped = world.teams.filter((t) => t.active && t.groupId).length;
  if (grouped >= 4 && regs.commonOwnership === 'free') add('commonOwnership', 'limited', 'Common ownership', 'limited: a group may own at most two teams');
  if (grouped >= 6 && regs.commonOwnership === 'limited') add('commonOwnership', 'none', 'Common ownership', 'none: one team per owner');

  // the sport's safety history
  if (year === 1994 && regs.safetyCar !== 'standard' && regs.safetyCar !== 'virtual') add('safetyCar', 'standard', 'Safety cars', 'standard safety cars at every race', { schedule: true });
  if (year === 1956 && regs.entries.full > 3) add('entriesFull', 3, 'Entries per team', 'at most 3 full-season entries per team after the Le Mans disaster');

  // academies
  if (year >= 1990 && regs.academyCap.global > 30 && grouped >= 4 && g.change > 0.4) add('academyCap', { group: 3, global: 24 }, 'Academy cap', 'at most 3 academy drivers per group');

  // calendar and endurance live in their own kind
  return out;
}

export function calendarProposals(world, year) {
  const g = traits(world);
  const era = eraFor(year);
  const out = [];
  const r = makeRng(world.seed, 'cal-prop', year);
  const fans = world.teams.filter((t) => t.active).reduce((a, t) => a + t.fans, 0) / Math.max(1, world.teams.filter((t) => t.active).length);
  const ev = eventsFor(year);
  if (!ev.cancel && world.regs.rounds < era.rounds + 4 && fans > 35 && r.chance(0.25 * g.growth)) out.push({ rounds: world.regs.rounds + 1, describe: `calendar grows to ${world.regs.rounds + 1} rounds` });
  if (world.regs.rounds > era.rounds - 2 && fans < 18 && r.chance(0.3)) out.push({ rounds: world.regs.rounds - 1, describe: `calendar shortened to ${world.regs.rounds - 1} rounds` });
  if (year >= 1950 && world.regs.endurance.events < 3 && r.chance(0.12 * g.growth)) out.push({ endurance: world.regs.endurance.events + 1, describe: `${world.regs.endurance.events + 1} endurance event${world.regs.endurance.events ? 's' : ''} a season` });
  if (world.regs.endurance.events > 0 && r.chance(0.04 * (1 - g.growth))) out.push({ endurance: world.regs.endurance.events - 1, describe: `${world.regs.endurance.events - 1} endurance events a season` });
  return out;
}

// all of the governor's proposals for the coming year
export function governorYear(world, year, last, ev) {
  for (const p of regsProposals(world, year, last, ev)) {
    propose(world, year, 'regs', p, `Rule change: ${p.label}`, `Proposed: ${p.describe}.`);
  }
  for (const c of calendarProposals(world, year)) propose(world, year, 'calendar', c, 'Calendar change', `Proposed: ${c.describe}.`);
  const scenes = world.series.filter((s) => s.active && s.kind === 'scene');
  if (scenes.length) {
    propose(world, year, 'sanction', {}, `Sanction local events in ${year}`, `${scenes.length} local scene${scenes.length === 1 ? '' : 's'} (${scenes.map((s) => regionName(s.region)).join(', ')}) want their events recognised. A sanctioned event gains prestige and helps the scene grow into a regional series.`,
      [{ id: 'all', label: 'Sanction all' }, { id: 'major', label: 'Major events only' }, { id: 'none', label: 'None' }]);
  }
}

// the player's say on technology: 'ban', 'allow' or back to the period default
export function setTechRule(world, techId, value) {
  world.regs.techBans = world.regs.techBans || {};
  if (value === 'default') delete world.regs.techBans[techId]; else world.regs.techBans[techId] = value;
  world.regs.overridden = world.regs.overridden || {};
  world.regs.overridden.techBans = true;
  world.regs.touched = true;
  logEvent(world, world.year, 'regs', `You set the rule for ${techId} to ${value}.`);
}
