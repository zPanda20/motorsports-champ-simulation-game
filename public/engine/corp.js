// Corporate life of the makers: mergers and renames on the real timeline, the large groups
// that own several makers, the programmes sisters in a group share (engines, chassis,
// whole cars, pooled development) and the names of works teams.

import { makeRng, clamp } from './rng.js';
import { BRAND_DEF, brandNameAt, atYear } from './data/brands.js';
import { MERGERS, RENAMES, GROUPS, GROUP_BY_ID, groupName, groupOfBrand, worksStyles } from './data/corp.js';
import { logEvent, brandById, teamById, newBrandObject, deactivateTeam, syncEntries } from './world.js';
import { closeTeam } from './org.js';

const r3 = (x) => Math.round(x * 1000) / 1000;

// ---------------------------------------------------------------- names of works teams

// The team that races for a maker: a performance division once that division is real,
// otherwise a name in the style of the maker's country.
export function worksTeamName(world, brand, year, rng) {
  const taken = new Set(world.teams.map((t) => t.name));
  const def = BRAND_DEF[brand.id];
  const perf = def ? atYear(def.perf, year, null) : null;
  if (perf && !taken.has(perf)) return perf;
  const styles = worksStyles(brand.country, year);
  const order = rng.shuffle(styles.map((_, i) => i));
  for (const i of order) {
    const n = styles[i].replace('{X}', brand.name);
    if (!taken.has(n)) return n;
  }
  return `${brand.name} Works`;
}

// the year a maker's performance division becomes real, a works team already racing is renamed
function perfRenames(world, year) {
  for (const t of world.teams) {
    if (!t.active || t.kind !== 'works') continue;
    const def = BRAND_DEF[t.brandId];
    if (!def || !def.perf) continue;
    const hit = def.perf.find(([from]) => from === year);
    if (!hit || t.name === hit[1] || world.teams.some((x) => x.name === hit[1])) continue;
    const old = t.name;
    t.name = hit[1];
    t.names = t.names || [old];
    if (t.names.indexOf(t.name) < 0) t.names.push(t.name);
    logEvent(world, year, 'team', `${old} is renamed ${t.name} as the maker's performance division takes over its racing.`);
  }
}

// ---------------------------------------------------------------- mergers

function mergeWorksTeams(world, teams, into, year, rng) {
  const order = teams.slice().sort((a, b) => b.titles - a.titles || b.prestige - a.prestige || a.id - b.id);
  const keep = order[0];
  const others = order.slice(1);
  const roles = ['principal', 'techDirector', 'raceEngineer', 'chiefMechanic'];
  for (const k of roles) {
    for (const o of others) if (o.staff[k] && keep.staff[k] && o.staff[k].rating > keep.staff[k].rating) keep.staff[k] = o.staff[k];
  }
  for (const k of ['factory', 'workshops', 'equipment']) for (const o of others) keep.facilities[k] = Math.max(keep.facilities[k], o.facilities[k]);
  keep.wealth = r3(clamp(Math.max(keep.wealth, ...others.map((o) => o.wealth)) + 0.08, 0.1, 1));
  keep.prestige = Math.max(keep.prestige, ...others.map((o) => o.prestige));
  keep.fans = Math.max(keep.fans, ...others.map((o) => o.fans));
  keep.finance.cash = Math.round(keep.finance.cash + others.reduce((a, o) => a + Math.max(0, o.finance.cash), 0));
  keep.merged = (keep.merged || []).concat(others.map((o) => o.id));
  for (const o of others) {
    keep.titles += o.titles; keep.wins += o.wins;
    if (o.legacy) keep.legacy.peakPrestige = Math.max(keep.legacy.peakPrestige, o.legacy.peakPrestige);
    closeTeam(world, o, year, `merged into ${into.name}`, deactivateTeam);
    o.mergedInto = keep.id;
  }
  const old = keep.name;
  keep.brandId = into.id;
  keep.name = worksTeamName(world, into, year, rng.fork('name'));
  keep.names = keep.names || [old];
  if (keep.names.indexOf(keep.name) < 0) keep.names.push(keep.name);
  keep.nat = into.country; keep.region = keep.region || null;
  syncEntries(world, keep, rng.fork('entries'));
  logEvent(world, year, 'team', `${others.map((o) => o.name).concat([old]).join(', ')} are combined into one super team, ${keep.name}, with the best staff and facilities of each.`);
  return keep;
}

function performMerger(world, ev, year, rng) {
  const members = ev.from.map((id) => brandById(world, id));
  if (members.some((m) => !m)) return false;
  let into = brandById(world, ev.into);
  if (into && ev.from.indexOf(ev.into) < 0) return false;
  const def = BRAND_DEF[ev.into];
  const fresh = !into;
  if (fresh) {
    into = newBrandObject(def, makeRng(world.seed, 'brand', ev.into), year);
    world.brands.push(into);
  }
  const others = members.filter((m) => m.id !== into.id);
  const all = members.concat(fresh ? [] : []);
  const top = (k) => Math.max(...all.map((m) => m[k]));
  const worksTeams = world.teams.filter((t) => t.kind === 'works' && t.active && ev.from.indexOf(t.brandId) >= 0);
  const racing = all.some((m) => m.status === 'racing');
  // the merged maker has the best of every member
  into.strength = r3(clamp(top('strength') + 0.04, 0.2, 0.95));
  into.chassisStrength = r3(clamp(top('chassisStrength') + 0.03, 0.2, 0.95));
  into.engineStrength = r3(clamp(top('engineStrength') + 0.03, 0.2, 0.95));
  into.reliability = r3(clamp(top('reliability') + 0.02, 0.15, 0.95));
  into.health = r3(clamp(Math.max(...all.map((m) => m.health === undefined ? m.strength : m.health)) + 0.05, 0.1, 1));
  into.fans = Math.max(...all.map((m) => m.fans || 0));
  into.sellsCustomers = all.some((m) => m.sellsCustomers);
  into.raceYears = Math.max(...all.map((m) => m.raceYears || 0));
  into.badYears = 0;
  into.tech = into.tech || {};
  for (const m of all) for (const k of Object.keys(m.tech || {})) if (into.tech[k] === undefined || (m.tech[k] !== null && m.tech[k] < into.tech[k])) into.tech[k] = m.tech[k];
  for (const m of others) { into.titles += m.titles; into.wins += m.wins; }
  into.mergedFrom = (into.mergedFrom || []).concat(others.map((m) => m.id));
  into.names = into.names || [into.name];
  for (const m of others) {
    m.status = 'defunct'; m.defunctSince = year; m.mergedInto = into.id;
    if (!m.names) m.names = [m.name];
  }
  into.status = racing ? 'racing' : (all.some((m) => m.status === 'dormant') ? 'dormant' : 'dormant');
  into.foundedInGame = year;
  into.name = brandNameAt(def, year);
  if (into.names.indexOf(into.name) < 0) into.names.push(into.name);
  logEvent(world, year, 'brand', `${ev.text}.`);
  if (worksTeams.length >= 2) mergeWorksTeams(world, worksTeams, into, year, rng.fork('merge'));
  else if (worksTeams.length === 1) {
    const t = worksTeams[0];
    t.brandId = into.id; t.nat = into.country;
    const old = t.name;
    t.name = worksTeamName(world, into, year, rng.fork('name'));
    t.names = t.names || [old];
    if (t.names.indexOf(t.name) < 0) t.names.push(t.name);
    logEvent(world, year, 'team', `${old} becomes ${t.name}.`);
  }
  return true;
}

// ---------------------------------------------------------------- groups and programmes

function setCorp(world, year, silent) {
  for (const b of world.brands) {
    if (b.status === 'defunct') { if (b.corp) b.corp = null; continue; }
    const gid = groupOfBrand(b.id, year);
    if ((b.corp || null) === gid) continue;
    const was = b.corp ? groupName(GROUP_BY_ID[b.corp], year) : null;
    const now = gid ? groupName(GROUP_BY_ID[gid], year) : null;
    b.corp = gid;
    if (!silent) {
      if (gid && !was) { logEvent(world, year, 'brand', `${b.name} becomes part of ${now}.`); b.health = r3(clamp((b.health === undefined ? b.strength : b.health) + 0.06, 0.05, 1)); }
      else if (gid && was) logEvent(world, year, 'brand', `${b.name} moves from ${was} to ${now}.`);
      else logEvent(world, year, 'brand', `${b.name} is sold by ${was} and stands alone.`);
    }
  }
}

export const activeProgrammes = (world) => (world.programmes || []).filter((p) => !p.ended);
export const programmeOf = (world, brandId) => activeProgrammes(world).find((p) => p.leadId === brandId || p.partnerId === brandId) || null;
const KIND_TEXT = { engine: 'share an engine', chassis: 'share a chassis', full: 'run the same car under two badges', pool: 'pool their development' };
export const PROGRAMME_LABEL = { engine: 'shared engine', chassis: 'shared chassis', full: 'same car, two badges', pool: 'pooled development' };

function hasWorks(world, brand) { return world.teams.some((t) => t.kind === 'works' && t.active && t.brandId === brand.id); }

function programmesYear(world, year, rng) {
  world.programmes = world.programmes || [];
  // endings
  for (const p of activeProgrammes(world)) {
    const lead = brandById(world, p.leadId), partner = brandById(world, p.partnerId);
    const sameGroup = lead && partner && lead.corp && lead.corp === partner.corp;
    const both = lead && partner && hasWorks(world, lead) && hasWorks(world, partner);
    const r = rng.fork('end', p.id);
    if (!sameGroup || !both || r.chance(0.07)) {
      p.ended = year;
      if (lead && partner) logEvent(world, year, 'brand', `${lead.name} and ${partner.name} end their ${PROGRAMME_LABEL[p.kind]} programme${!both ? ' as one of them leaves the grid' : ''}.`);
      continue;
    }
    p.quality = r3(clamp(p.quality + r.gauss(0, 0.012), -0.1, 0.12));
  }
  // starts: two sisters from the same group both racing with works teams
  const byGroup = {};
  for (const b of world.brands) if (b.corp && b.status === 'racing' && hasWorks(world, b)) (byGroup[b.corp] = byGroup[b.corp] || []).push(b);
  for (const gid of Object.keys(byGroup).sort()) {
    const list = byGroup[gid].sort((a, b) => b.strength - a.strength || a.id.localeCompare(b.id));
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const lead = list[i], partner = list[j];
      if (programmeOf(world, lead.id) || programmeOf(world, partner.id)) continue;
      const r = rng.fork('start', lead.id, partner.id);
      if (!r.chance(0.18)) continue;
      const kind = r.weighted([{ k: 'engine', w: 35 }, { k: 'chassis', w: 20 }, { k: 'full', w: 15 }, { k: 'pool', w: 30 }], (x) => x.w).k;
      // most arrangements help, a good share do not: the two cultures clash or one side is starved
      const quality = r3(clamp(r.gauss(0.015, 0.05), -0.08, 0.1));
      const p = { id: world.programmes.length + 1, groupId: gid, kind, leadId: lead.id, partnerId: partner.id, since: year, quality, ended: null };
      world.programmes.push(p);
      logEvent(world, year, 'brand', `${lead.name} and ${partner.name} (${groupName(GROUP_BY_ID[gid], year)}) ${KIND_TEXT[kind]}${quality < -0.02 ? '; insiders say the arrangement is not working well' : ''}.`);
    }
  }
}

// What a maker's car is really built from this year, once its group's programmes apply.
export function effectiveBrand(world, brand) {
  const p = programmeOf(world, brand.id);
  if (!p) return brand;
  const lead = brandById(world, p.leadId), partner = brandById(world, p.partnerId);
  if (!lead || !partner) return brand;
  const q = p.quality;
  const cl = (v) => clamp(v, 0.12, 0.97);
  const o = { ...brand };
  if (p.kind === 'pool') {
    const mc = (lead.chassisStrength + partner.chassisStrength) / 2, me = (lead.engineStrength + partner.engineStrength) / 2;
    o.chassisStrength = cl(brand.chassisStrength * 0.6 + mc * 0.4 + q);
    o.engineStrength = cl(brand.engineStrength * 0.6 + me * 0.4 + q);
    return o;
  }
  if (brand.id === p.leadId) {
    // the lead carries a little of the friction when it goes badly
    if (q < 0) o.reliability = cl(brand.reliability + q * 0.5);
    return o;
  }
  if (p.kind === 'engine' || p.kind === 'full') { o.engineStrength = cl(lead.engineStrength + q); o.reliability = cl(brand.reliability * 0.5 + lead.reliability * 0.5 + q * 0.5); }
  if (p.kind === 'chassis' || p.kind === 'full') o.chassisStrength = cl(lead.chassisStrength + q);
  if (p.kind === 'full') o.reliability = cl(lead.reliability + q);
  return o;
}

// ---------------------------------------------------------------- the yearly pass

// silent: used while a world is being created, to put the makers in the groups they belong to
export function initCorp(world, year) { setCorp(world, year, true); world.programmes = world.programmes || []; }

export function corporateYear(world, year, rng) {
  for (const ev of MERGERS) if (ev.year === year) performMerger(world, ev, year, rng.fork('merge', ev.into));
  for (const rn of RENAMES) {
    if (rn.year !== year) continue;
    const b = brandById(world, rn.id);
    if (!b || b.status === 'defunct' || b.name === rn.name) continue;
    const old = b.name;
    b.name = rn.name;
    b.names = b.names || [old];
    if (b.names.indexOf(rn.name) < 0) b.names.push(rn.name);
    logEvent(world, year, 'brand', `${old} is renamed ${rn.name}.`);
  }
  setCorp(world, year, false);
  perfRenames(world, year);
  programmesYear(world, year, rng.fork('prog'));
}

export { teamById, GROUPS, groupName, GROUP_BY_ID };
