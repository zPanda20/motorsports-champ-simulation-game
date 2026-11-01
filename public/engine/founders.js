// How new teams come to exist without being a manufacturer: a former champion founds a
// team in his or her own name (the McLaren and Andretti path), a brilliant engineer builds
// chassis and partners with an engine maker (the Williams and Sauber path), a works team
// sold off by a maker that leaves, and makers that later buy such teams back.
// None of this uses a real name: the teams are named after the people who found them.

import { makeRng, clamp } from './rng.js';
import { makePersonName } from './names.js';
import { regionOf, continentOf } from './data/regions.js';
import { brandColors, engineOnlyAt } from './data/brands.js';
import { SPONSORS } from './data/sponsors.js';
import { COMMERCIAL_FROM } from './data/sponsors.js';
import { overallAt } from './drivers.js';
import { makeOwner, budgetBase, closeTeam } from './org.js';
import { addLowTeam, activeSeries, seriesTier, lowTeamById } from './tiers.js';
import {
  logEvent, brandById, driverById, teamById, addPrivateerTeam, pickSupplier, syncEntries, usedNames, deactivateTeam,
  activeTeams, makeStaff,
} from './world.js';
import { worksTeamName } from './corp.js';

const r2 = (x) => Math.round(x * 100) / 100;

// ---------------------------------------------------------------- names

const EPONYM = {
  IT: ['Scuderia {S}', '{S} Corse', 'Squadra {S}'],
  FR: ['Écurie {S}', 'Équipe {S}', '{S} Racing'],
  DE: ['{S} Rennsport', 'Team {S}', '{S} Racing'],
  GB: ['{S} Racing', 'Team {S}', '{S} Grand Prix', '{S} Motor Racing', '{S} Engineering'],
  US: ['{S} Racing', '{S} Autosport', 'Team {S}', '{S} Motorsports'],
};
export function eponymousName(rng, fullName, nat, year, taken, engineer) {
  const surname = String(fullName).split(' ').slice(1).join(' ') || fullName;
  let styles = (EPONYM[nat] || ['{S} Racing', 'Team {S}', '{S} Grand Prix']).slice();
  if (year < 1950) styles = styles.filter((s) => !/Motorsports|Autosport|Grand Prix|Engineering/.test(s));
  if (engineer) styles = styles.concat(['{S} Cars', '{S} Racing Cars']);
  for (const i of rng.shuffle(styles.map((_, k) => k))) {
    const n = styles[i].replace('{S}', surname);
    if (!taken.has(n)) return n;
  }
  return `${surname} Racing Team`;
}
const takenNames = (world) => { const s = new Set(world.teams.map((t) => t.name)); for (const l of world.lowTeams) s.add(l.name); return s; };

function newOwnerFor(world, person, nat, team, type, year, rng) {
  const wealth = team.wealth;
  const goals = { glory: r2(rng.float(0.35, 0.6)), profit: r2(rng.float(0.1, 0.25)), brand: r2(rng.float(0.05, 0.15)), legacy: r2(rng.float(0.15, 0.3)) };
  const tot = goals.glory + goals.profit + goals.brand + goals.legacy;
  for (const k of Object.keys(goals)) goals[k] = r2(goals[k] / tot);
  return { name: person.name, nat: nat || person.nat, gender: person.gender, type, since: year, patience: 85, pockets: Math.round(wealth * 100), fortune: Math.round(budgetBase(year) * (3 + wealth * 8)), goals };
}

// ---------------------------------------------------------------- the champion founds a team

const OPEN_ROUTE = 0.45;

// the team a retired star builds around his or her own name
function driverFounderOpts(world, d, year, rng, teamName) {
  const wealth = r2(clamp(0.34 + d.titles * 0.06 + (d.rep || 0) / 400, 0.3, 0.78));
  const team = { wealth };
  return {
    name: teamName, nat: d.nat, wealth, rich: true,
    origin: { type: 'driver-founder', year, by: d.name, driverId: d.id, titles: d.titles },
    owner: newOwnerFor(world, d, d.nat, team, 'former driver and founder', year, rng.fork('owner')),
    staff: { principal: { name: d.name, nat: d.nat, gender: d.gender, rating: Math.round(clamp(46 + d.titles * 5 + (d.rep || 0) / 8, 40, 88)), age: year - d.birthYear } },
    prestige: Math.round(22 + d.titles * 6 + (d.rep || 0) / 5), fans: d.fans || 20,
  };
}

function foundingSeries(world, d, year) {
  const reg = regionOf(d.nat);
  const cont = continentOf(reg);
  const act = activeSeries(world);
  return act.find((s) => s.kind === 'continental' && s.continent === cont && !s.rival) || act.find((s) => s.kind === 'continental' && s.continent === cont)
    || act.find((s) => s.kind === 'scene' && s.region === reg) || null;
}

// the founder starts in a continental series (or a local scene), set on climbing to the top
export function createFounderLowTeam(world, d, name, year, rng) {
  const s = foundingSeries(world, d, year);
  if (!s) return null;
  const tier = seriesTier(s, year);
  const reg = regionOf(d.nat);
  const t = addLowTeam(world, rng.fork('low'), reg, year, tier, 0.6);
  t.name = name; t.nat = d.nat; t.region = reg;
  t.strength = r2(clamp(0.52 + (overallAt(d, year) - 60) * 0.004 + d.titles * 0.015, 0.45, 0.78));
  t.wealth = r2(clamp(0.4 + d.titles * 0.05, 0.3, 0.75));
  t.prestige = Math.round(clamp(12 + (d.rep || 0) / 6 + d.titles * 3, 8, 50));
  t.ambition = true;
  t.founder = { driverId: d.id, name: d.name, year };
  if (s.teamIds.indexOf(t.id) < 0) s.teamIds.push(t.id);
  return { team: t, series: s };
}

function driverFounders(world, year, rng, ev, propose) {
  if (year < 1925) return;
  const total = activeTeams(world).length;
  const limit = Math.round(world.teams.filter((t) => t.active && t.kind === 'privateer').length);
  for (const d of world.drivers.filter((x) => x.status === 'retired' && x.retiredYear >= year - 2 && !x.founding && !x.founderOf).sort((a, b) => a.id - b.id)) {
    const star = d.titles >= 1 ? 0.12 : d.wins >= 8 ? 0.04 : 0;
    if (!star) continue;
    const r = rng.fork('drv', d.id);
    if (!r.chance(star * (ev.teamFound || 1))) continue;
    if (total > 18 || limit > 15) continue;
    const name = eponymousName(r.fork('name'), d.name, d.nat, year, takenNames(world), false);
    d.founding = true;
    const direct = !foundingSeries(world, d, year) || r.fork('route').chance(OPEN_ROUTE);
    if (direct) {
      propose('entry-team', { founderDriverId: d.id, name, route: 'direct' }, `${d.name} wants to enter ${name}`, `${d.titles ? 'Former champion ' : 'Former winner '}${d.name} has retired from racing and wants to enter a team of their own, ${name}, straight into the championship.`);
    } else {
      const made = createFounderLowTeam(world, d, name, year, r.fork('lt'));
      if (made) logEvent(world, year, 'team', `${d.titles ? 'Champion ' : ''}${d.name} retires and founds ${name} to race in the ${made.series.name}, with ambitions of reaching the top series.`);
      else d.founding = false;
    }
  }
}

// ---------------------------------------------------------------- the engineer founds a constructor

function pickPartnerBrand(world, rng, avoidId) {
  const pool = world.brands.filter((b) => b.status === 'racing' && b.id !== avoidId && (b.sellsCustomers || engineOnlyAt(b.id, world.year)));
  if (!pool.length) return null;
  return rng.weighted(pool, (b) => 0.2 + b.engineStrength * b.engineStrength * 3);
}

function engineerFounders(world, year, rng, ev, propose) {
  if (year < 1935) return;
  const privCount = world.teams.filter((t) => t.active && t.kind === 'privateer').length;
  if (privCount > 15 || activeTeams(world).length > 19) return;
  if (world.inbox.some((i) => i.status === 'pending' && i.kind === 'entry-team' && i.payload.engineer)) return;
  const cands = [];
  for (const t of activeTeams(world).sort((a, b) => a.id - b.id)) {
    const td = t.staff.techDirector;
    if (!td || td.rating < 70 || (td.age || 40) < 34 || (td.age || 40) > 56 || td.founded) continue;
    cands.push(t);
  }
  for (const t of cands) {
    const r = rng.fork('eng', t.id);
    const slump = t.history && t.history.length && t.history[t.history.length - 1].rank > 0.5 ? 1.5 : 1;
    if (!r.chance(0.06 * slump * (ev.teamFound || 1))) continue;
    const brand = pickPartnerBrand(world, r.fork('partner'), t.kind === 'works' ? t.brandId : null);
    if (!brand) continue;
    const td = t.staff.techDirector;
    const name = eponymousName(r.fork('name'), td.name, td.nat || t.nat, year, takenNames(world), true);
    propose('entry-team', { engineer: { name: td.name, nat: td.nat || t.nat, gender: td.gender, rating: td.rating, age: td.age || 40 }, fromTeamId: t.id, partnerBrandId: brand.id, name, route: 'direct' },
      `${td.name} wants to enter ${name}`, `${td.name}, technical director of ${t.name}, wants to leave and enter a team of their own, ${name}, building its own chassis around ${brand.name} engines.`);
    return;
  }
}

// ---------------------------------------------------------------- applying an approval

// 'entry-team' approvals that come from a founder. Returns true when handled.
export function applyFounderDecision(world, pl, choice, year, rng) {
  if (pl.founderDriverId !== undefined) {
    const d = driverById(world, pl.founderDriverId);
    if (!d) return true;
    if (choice === 'approve') {
      const opts = driverFounderOpts(world, d, year, rng, pl.name);
      const t = addPrivateerTeam(world, rng, year, { ...opts, twoCars: d.titles >= 2 });
      d.founderOf = t.id; d.founding = false;
      logEvent(world, year, 'team', `${d.titles ? 'Champion ' : ''}${d.name} founds ${t.name} and enters the championship.`);
    } else {
      // refused a direct entry: the founder starts lower and works upwards instead
      const made = createFounderLowTeam(world, d, pl.name, year, rng.fork('fallback'));
      if (made) logEvent(world, year, 'team', `${pl.name}'s entry is refused; ${d.name} starts in the ${made.series.name} instead.`);
      else { d.founding = false; logEvent(world, year, 'team', `${pl.name}'s entry is refused.`); }
    }
    return true;
  }
  if (pl.engineer) {
    const from = teamById(world, pl.fromTeamId);
    const brand = brandById(world, pl.partnerBrandId);
    if (choice !== 'approve' || !from || !brand || !from.active) { logEvent(world, year, 'team', `${pl.name} does not get its entry.`); return true; }
    const e = pl.engineer;
    const used = usedNames(world);
    // the engineer leaves; the old team promotes someone
    from.staff.techDirector = makeStaff(rng.fork('replace'), from.nat, used, from.wealth).techDirector;
    from.staff.techDirector.age = rng.fork('ra').int(30, 44);
    const wealth = r2(clamp(0.3 + (e.rating - 70) * 0.006, 0.28, 0.5));
    const person = { name: e.name, nat: e.nat, gender: e.gender };
    const t = addPrivateerTeam(world, rng, year, {
      name: pl.name, nat: e.nat, wealth, brandId: brand.id, builder: true, twoCars: true,
      partner: { brandId: brand.id, preferred: true, since: year, until: year + rng.fork('len').int(3, 7) },
      origin: { type: 'engineer-founder', year, by: e.name, from: from.name, rating: e.rating },
      owner: newOwnerFor(world, person, e.nat, { wealth }, 'engineer and founder', year, rng.fork('owner')),
      staff: { techDirector: { name: e.name, nat: e.nat, gender: e.gender, rating: Math.min(95, e.rating + 2), age: e.age, founded: true } },
      prestige: 18 + Math.max(0, e.rating - 70), fans: 8,
    });
    t.control = 'engineer';
    logEvent(world, year, 'team', `${e.name} leaves ${from.name} and founds ${t.name}, a constructor building its own chassis around ${brand.name} engines.`);
    return true;
  }
  return false;
}

// a lower-series team with a founder is granted its Tier 1 entry: it keeps its name and its founder
export function graduateLowTeam(world, lt, year, rng) {
  if (lt.founder) {
    const d = driverById(world, lt.founder.driverId);
    if (d) {
      const opts = driverFounderOpts(world, d, year, rng, lt.name);
      opts.prestige = Math.max(opts.prestige, lt.prestige);
      const t = addPrivateerTeam(world, rng, year, { ...opts, twoCars: d.titles >= 2 });
      t.origin.climbed = true; t.origin.startedIn = lt.founded;
      d.founderOf = t.id; d.founding = false;
      lt.ended = year; lt.graduated = year;
      logEvent(world, year, 'team', `${t.name}, founded by ${d.name} in ${lt.founded}, reaches the top series.`);
      return t;
    }
  }
  return null;
}

// ---------------------------------------------------------------- partners

export function partnersYear(world, year, rng) {
  for (const t of activeTeams(world).filter((x) => x.partner).sort((a, b) => a.id - b.id)) {
    const p = t.partner;
    const b = brandById(world, p.brandId);
    const live = b && b.status === 'racing';
    if (live && p.until >= year) { t.brandId = p.brandId; continue; }
    const r = rng.fork('p', t.id);
    if (live && r.chance(0.6)) { p.until = year + r.int(2, 6); continue; }
    const nb = pickPartnerBrand(world, r.fork('new'), p.brandId) || (live ? b : null);
    if (!nb) continue;
    if (nb.id !== p.brandId) logEvent(world, year, 'team', `${t.name} ${live ? 'switches' : 'finds new'} engines: ${nb.name}${live ? ` instead of ${b.name}` : ''}.`);
    t.partner = { brandId: nb.id, preferred: true, since: nb.id === p.brandId ? p.since : year, until: year + r.int(3, 7) };
    t.brandId = nb.id;
  }
}

// ---------------------------------------------------------------- a maker's works team is sold

function bigSponsors(year) {
  return SPONSORS.filter((s) => year >= s.from && year <= s.to && s.size >= 0.8 && ['energy', 'drinks', 'airline', 'telecom', 'banking', 'tech', 'watches'].indexOf(s.sector) >= 0);
}

// Instead of closing, a maker leaving can sell its team: to its engineers, to a big sponsor
// brand, to a driver or to investors (Brawn, Red Bull, Stewart). The team keeps its factory,
// staff, record and entries; it gets a new name and a new owner, and buys engines.
export function sellOffWorks(world, team, oldBrand, year, rng) {
  const used = usedNames(world);
  const champs = world.drivers.filter((d) => d.titles >= 1 && (d.status === 'retired' || year - d.birthYear >= 34) && !d.founderOf);
  const kinds = [{ k: 'engineers', w: 34 }, { k: 'investors', w: 28 }];
  if (year >= COMMERCIAL_FROM && bigSponsors(year).length) kinds.push({ k: 'sponsor', w: 26 });
  if (champs.length) kinds.push({ k: 'driver', w: 12 });
  const kind = rng.weighted(kinds, (x) => x.w).k;
  const taken = takenNames(world);
  const old = team.name;
  let name, owner, how, partner = null;
  if (kind === 'engineers') {
    const td = team.staff.techDirector.rating >= team.staff.principal.rating ? team.staff.techDirector : team.staff.principal;
    name = eponymousName(rng.fork('n'), td.name, team.nat, year, taken, true).replace(/ (Cars|Racing Cars)$/, ' Grand Prix');
    if (taken.has(name)) name = `${td.name.split(' ').slice(1).join(' ')} Racing`;
    owner = newOwnerFor(world, td, team.nat, team, 'management buyout', year, rng.fork('o'));
    how = `its engineers, led by ${td.name}`;
  } else if (kind === 'sponsor') {
    const sp = rng.fork('sp').pick(bigSponsors(year));
    name = rng.fork('n').pick([`${sp.name} Racing`, `${sp.name} Grand Prix`, `Team ${sp.name}`]);
    if (taken.has(name)) name = `${sp.name} Racing Team`;
    owner = { name: sp.name, nat: team.nat, gender: 'M', type: 'corporate owner (' + sp.name + ')', since: year, patience: 70, pockets: 90, fortune: Math.round(budgetBase(year) * 14), goals: { glory: 0.3, profit: 0.1, brand: 0.5, legacy: 0.1 } };
    team.sponsors = (team.sponsors || []).filter((s) => s.id !== sp.id);
    how = `the energy and consumer brand ${sp.name}`;
  } else if (kind === 'driver') {
    const d = rng.fork('d').pick(champs);
    name = eponymousName(rng.fork('n'), d.name, d.nat, year, taken, false);
    owner = newOwnerFor(world, d, d.nat, team, 'former driver and founder', year, rng.fork('o'));
    d.founderOf = team.id;
    how = `former champion ${d.name}`;
  } else {
    const nat = team.nat;
    name = null;
    owner = makeOwner(world, rng.fork('o'), { ...team, kind: 'privateer', nat }, year);
    owner.type = 'consortium'; owner.since = year;
    how = 'a consortium of investors';
  }
  if (!name) {
    const surname = makePersonName(rng.fork('sn'), team.nat, used, 'M').full.split(' ').slice(1).join(' ');
    name = rng.fork('n2').pick([`${surname} Racing`, `${surname} Grand Prix`, `Team ${surname}`]);
    if (taken.has(name)) name = `${surname} Motor Racing`;
  }
  team.colors = brandColors(oldBrand.id).slice();
  team.kind = 'privateer';
  team.name = name;
  team.names = team.names || [old];
  if (team.names.indexOf(name) < 0) team.names.push(name);
  team.owner = { ...owner };
  team.twoCars = true;
  team.finance.cash = Math.max(team.finance.cash, Math.round(budgetBase(year) * 0.3));
  team.origin = { type: 'buyout', year, by: kind, fromBrandId: oldBrand.id, from: old, buyer: owner.name };
  if (kind === 'engineers') team.control = 'engineer';
  const sup = pickSupplier(world, rng.fork('sup'), oldBrand.id);
  if (sup && sup !== oldBrand.id) team.brandId = sup;
  else { const alt = pickPartnerBrand(world, rng.fork('alt'), oldBrand.id); if (alt) team.brandId = alt.id; }
  if (kind === 'engineers' || kind === 'driver') team.partner = { brandId: team.brandId, preferred: true, since: year, until: year + rng.fork('plen').int(3, 6) };
  team.groupId = null; team.relation = null;
  syncEntries(world, team, rng.fork('entries'));
  logEvent(world, year, 'team', `${oldBrand.name} leaves, but sells its team to ${how}: ${old} becomes ${name}, powered by ${(brandById(world, team.brandId) || { name: 'customer' }).name} engines.`);
  return team;
}

// ---------------------------------------------------------------- a maker buys a team

export function candidatesToBuy(world, year) {
  return world.teams.filter((t) => t.active && t.kind === 'privateer' && (t.twoCars || t.prestige >= 38 || t.titles > 0) && (year - t.foundedYear >= 3)).sort((a, b) => b.prestige - a.prestige || a.id - b.id);
}

export function acquireTeam(world, brand, team, year, rng) {
  const old = team.name;
  team.kind = 'works';
  team.brandId = brand.id;
  team.partner = null; team.constructorTeam = false; team.builder = false;
  team.nat = brand.country; team.region = regionOf(brand.country);
  team.name = worksTeamName(world, brand, year, rng.fork('name'));
  team.names = team.names || [old];
  if (team.names.indexOf(team.name) < 0) team.names.push(team.name);
  const prevOwner = team.owner ? team.owner.name : '';
  team.owner = makeOwner(world, rng.fork('owner'), { ...team, kind: 'works', nat: brand.country }, year);
  team.owner.since = year;
  team.finance.cash = Math.max(team.finance.cash, Math.round(budgetBase(year) * 0.5));
  team.wealth = r2(clamp(Math.max(team.wealth, brand.strength * 0.9), 0.1, 1));
  for (const k of ['factory', 'workshops', 'equipment']) team.facilities[k] = Math.min(100, team.facilities[k] + 6);
  team.origin = { type: 'manufacturer-buyin', year, by: brand.name, from: old, previous: prevOwner };
  team.groupId = null;
  brand.status = 'racing'; brand.raceYears = 0; brand.badYears = 0;
  syncEntries(world, team, rng.fork('entries'));
  logEvent(world, year, 'team', `${brand.name} buys ${old}${prevOwner ? ' from ' + prevOwner : ''} and runs it as a factory effort, ${team.name}.`);
  return team;
}

// ---------------------------------------------------------------- the yearly pass

export function foundersYear(world, year, rng, ev, propose) {
  driverFounders(world, year, rng.fork('drivers'), ev, propose);
  engineerFounders(world, year, rng.fork('engineers'), ev, propose);
  partnersYear(world, year, rng.fork('partners'));
}

export { closeTeam, deactivateTeam, lowTeamById };
