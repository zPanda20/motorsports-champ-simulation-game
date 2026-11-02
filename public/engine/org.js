// Organisations and money: owners and principals, facilities, budgets, sponsors, fans,
// groups and sister teams, the team lifecycle (sale, closure, revival) and legacy.
// Money is nominal and scaled by the era so a 1919 budget and a 2020 one are comparable.

import { makeRng, clamp } from './rng.js';
import { makePersonName, makeTeamName, nationalityWeights } from './names.js';
import { sponsorsOpenIn, SPONSOR_BY_ID, COMMERCIAL_FROM } from './data/sponsors.js';
import { regionOf } from './data/regions.js';
import { OIL_FROM, OIL_BY_ID, oilNameAt } from './data/oils.js';
import { programmeOf } from './corp.js';
import { stability, eraFor } from './data/eras.js';
import { overallAt } from './drivers.js';
import { initIdentity, identityTitles, identityWins, retireIdentity } from './identity.js';
import { usedNames, logEvent, brandById, teamById, driverById, activeEntries } from './world.js';

const r2 = (x) => Math.round(x * 100) / 100;

function interp(table, year) {
  if (year <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    if (year <= table[i][0]) { const [y0, v0] = table[i - 1], [y1, v1] = table[i]; return v0 + ((v1 - v0) * (year - y0)) / (y1 - y0); }
  }
  return table[table.length - 1][1];
}
const MONEY = [[1919, 1], [1939, 2], [1950, 5], [1968, 30], [1980, 200], [1990, 800], [2005, 3000], [2020, 8000], [2040, 12000]];
export const moneyScale = (year) => interp(MONEY, year);
// a typical mid-grid team's yearly budget
export const budgetBase = (year) => 40000 * moneyScale(year);
// travel is expensive early on and cheap later (1 = very expensive)
export const travelCost = (year) => interp([[1919, 1], [1939, 0.9], [1950, 0.7], [1970, 0.4], [1990, 0.2], [2010, 0.08], [2040, 0.05]], year);

export function money(n) {
  const a = Math.abs(n), s = n < 0 ? '-' : '';
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(2)}bn`;
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(1)}m`;
  if (a >= 1e3) return `${s}$${Math.round(a / 1e3)}k`;
  return `${s}$${Math.round(a)}`;
}

// ---------------------------------------------------------------- creation

const OWNER_TYPES = ['gentleman driver', 'wealthy backer', 'consortium'];

export function makeOwner(world, rng, team, year) {
  const used = usedNames(world);
  const nat = team.nat || 'GB';
  let type = team.kind === 'works' ? 'manufacturer executive' : rng.pick(OWNER_TYPES);
  const g = rng.chance(0.5) ? 'F' : 'M';
  const nm = makePersonName(rng, nat, used, g, year - 45);
  const goals = { glory: rng.float(0.1, 1), profit: rng.float(0.1, 1), brand: rng.float(0.1, 1), legacy: rng.float(0.1, 1) };
  const tot = goals.glory + goals.profit + goals.brand + goals.legacy;
  for (const k of Object.keys(goals)) goals[k] = r2(goals[k] / tot);
  if (type === 'manufacturer executive') { goals.brand += 0.2; }
  return {
    name: nm.full, nat, gender: g, type, since: year,
    patience: rng.int(30, 90), pockets: Math.round(clamp(team.wealth, 0.1, 1) * 100),
    fortune: Math.round(budgetBase(year) * (4 + team.wealth * 30)),
    goals,
  };
}

// Everything a team needs beyond what slice 1 gave it. Safe to call twice.
export function initTeamOrg(world, team, rng, year) {
  const w = team.wealth;
  if (!team.owner || team.owner.fortune === undefined) {
    const old = team.owner || {};
    team.owner = makeOwner(world, rng.fork('owner'), team, year);
    if (old.patience) team.owner.patience = old.patience;
    if (old.pockets) team.owner.pockets = old.pockets;
  }
  if (!team.facilities) {
    const base = 22 + w * 42;
    team.facilities = { factory: Math.round(clamp(base + rng.gauss(0, 7), 8, 90)), workshops: Math.round(clamp(base + rng.gauss(0, 7), 8, 90)), equipment: Math.round(clamp(base - 4 + rng.gauss(0, 7), 8, 90)) };
  }
  if (!team.finance) team.finance = { cash: Math.round(budgetBase(year) * w * 0.4), income: 0, costs: 0, lastNet: 0, devPower: 1, history: [] };
  if (!team.sponsors) team.sponsors = [];
  if (team.fans === undefined) team.fans = Math.round(clamp(w * 30 + rng.gauss(10, 5), 1, 90));
  if (team.prestige === undefined) team.prestige = Math.round(clamp(w * 40 + rng.gauss(10, 6), 5, 80));
  if (!team.region) team.region = regionOf(team.nat);
  if (!team.scope) team.scope = team.kind === 'works' || w > 0.55 || year >= 1960 ? 'global' : 'local';
  if (team.glory === undefined) team.glory = 0;
  if (team.risk === undefined) team.risk = r2(rng.float(0.1, 0.9));
  if (!team.tech) team.tech = {};
  if (!team.history) team.history = [];
  if (!team.legacy) team.legacy = { score: 0, legendary: false, peakPrestige: team.prestige, peakFacilities: avgFac(team) };
  if (!team.cycle) team.cycle = rng.int(3, 6);
  if (team.groupId === undefined) team.groupId = null;
  if (!team.names) team.names = [team.name];
  initIdentity(team);
  if (!team.contracts) team.contracts = {};
  return team;
}

export function driverSalary(driver, year) {
  const o = overallAt(driver, year) / 100;
  return Math.round(budgetBase(year) * (0.03 + o * o * o * 0.34) / 1000) * 1000;
}
// A driver signs a contract with an entry: one to four years, paid by the team.
export function signContract(world, entry, driver, year, rng) {
  const len = rng.int(1, 4);
  entry.contract = { from: year, until: year + len - 1, salary: driverSalary(driver, year) };
  if (driver.backer) entry.contract.backer = driver.backer.name;
}

export const avgFac = (t) => Math.round((t.facilities.factory + t.facilities.workshops + t.facilities.equipment) / 3);

export function initBrandOrg(brand, rng) {
  if (brand.tech === undefined) brand.tech = {};
  if (brand.risk === undefined) brand.risk = r2(rng.float(0.15, 0.9));
  if (brand.commitment === undefined) brand.commitment = 1;
  if (brand.fans === undefined) brand.fans = Math.round(clamp(brand.strength * 40 + rng.gauss(5, 5), 1, 80));
}

// ---------------------------------------------------------------- the year's results by team

function teamSeason(world) {
  const out = {};
  const results = world.season.results;
  for (const r of results) {
    for (const row of r.classification) {
      const t = out[row.teamId] = out[row.teamId] || { pts: 0, wins: 0, podiums: 0, starts: 0, best: 99 };
      t.pts += row.points || 0; t.starts++;
      if (row.pos === 1) t.wins++;
      if (row.pos && row.pos <= 3) t.podiums++;
      if (row.pos && row.pos < t.best) t.best = row.pos;
    }
  }
  return out;
}

// ---------------------------------------------------------------- sponsors

function sponsorBudget(sp, year) { return sp.size * 0.55 * budgetBase(year); }

function attractiveness(team, sp, rank, year) {
  let a = team.prestige * 0.35 + team.fans * 0.25 + (1 - rank) * 30;
  if (sp.reach === 'global' || sp.reach === team.region) a += 12;
  if (team.legacy && team.legacy.legendary) a += 14;
  void year;
  return Math.max(1, a);
}

// The oil and tyre suppliers of every team double as its sponsors, so the same company is
// never a supplier and a sponsor separately, and no rival can sponsor the team.
export function supplierDeals(world, year) {
  const base = budgetBase(year);
  const scale = year >= COMMERCIAL_FROM ? 1 : 0.3;
  for (const t of world.teams.filter((x) => x.active)) {
    const old = t.sponsors || [];
    const keep = old.filter((d) => !d.supplier);
    if (year < OIL_FROM) { t.sponsors = keep; continue; }
    const out = [];
    const oil = t.oilId ? OIL_BY_ID[t.oilId] : null;
    if (oil) {
      const prev = old.find((d) => d.supplier === 'oil' && d.supplierId === oil.id);
      out.push({ id: oil.sponsorId || 'oil:' + oil.id, name: oilNameAt(oil, year), value: Math.round(oil.size * 0.1 * base * (0.6 + t.prestige / 200) * scale / 1000) * 1000, since: prev ? prev.since : year, until: t.oilUntil || year, supplier: 'oil', supplierId: oil.id });
    }
    const ty = t.tyreId ? world.tyres.find((m) => m.id === t.tyreId) : null;
    if (ty) {
      const prev = old.find((d) => d.supplier === 'tyres' && d.supplierId === ty.id);
      out.push({ id: 'tyre:' + ty.id, name: ty.name, value: Math.round(0.055 * base * (0.6 + t.prestige / 200) * scale / 1000) * 1000, since: prev ? prev.since : year, until: year, supplier: 'tyres', supplierId: ty.id });
    }
    t.sponsors = keep.concat(out);
  }
}

function sponsorMarket(world, year, rng, rank) {
  for (const t of world.teams) if (t.sponsors) t.sponsors = t.sponsors.filter((d) => !d.supplier);
  if (year < COMMERCIAL_FROM) {
    for (const t of world.teams) t.sponsors = [];
    supplierDeals(world, year);
    return;
  }
  const open = sponsorsOpenIn(year);
  const openIds = new Set(open.map((s) => s.id));
  const teams = world.teams.filter((t) => t.active);
  // deals end, or lapse when the sponsor's window closes
  for (const t of teams) {
    t.sponsors = t.sponsors.filter((d) => {
      if (!openIds.has(d.id)) {
        const sp = SPONSOR_BY_ID[d.id];
        if (sp && sp.marquee) logEvent(world, year, 'sponsor', `${sp.name} ends its sponsorship of ${t.name}.`);
        return false;
      }
      if (d.until < year) return rng.fork('renew', t.id, d.id).chance(0.6 + (SPONSOR_BY_ID[d.id].loyalty || 0.3) * 0.3);
      return true;
    });
    for (const d of t.sponsors) if (d.until < year) d.until = year + rng.fork('len', t.id, d.id).int(1, 3);
  }
  // sponsors with room look for teams
  for (const sp of open) {
    const have = {};
    let n = 0;
    for (const t of teams) { const d = t.sponsors.find((x) => x.id === sp.id); if (d) { have[t.id] = true; n++; } }
    const quota = sp.marquee ? 1 + (sp.size > 1.2 ? 1 : 0) : 2;
    const r = rng.fork('sp', sp.id);
    for (let k = n; k < quota; k++) {
      const pool = teams.filter((t) => !have[t.id] && t.sponsors.length < 4 && !(sp.sector === 'tobacco' && year > 2005));
      if (!pool.length || !r.chance(0.7)) break;
      const t = r.weighted(pool, (x) => attractiveness(x, sp, rank[x.id] === undefined ? 0.5 : rank[x.id], year));
      have[t.id] = true;
      const value = Math.round(sponsorBudget(sp, year) * 0.45 * (0.5 + t.prestige / 100) / (quota > 1 ? 1.3 : 1) / 1000) * 1000;
      t.sponsors.push({ id: sp.id, name: sp.name, value, since: year, until: year + r.int(1, 4) });
      if (sp.marquee) logEvent(world, year, 'sponsor', `${sp.name} signs with ${t.name}.`);
    }
  }
  // series title sponsor
  const ts = world.titleSponsor;
  if (!ts || ts.until < year || !openIds.has(ts.id)) {
    const cand = open.filter((s) => s.marquee && s.size >= 0.9 && !(s.sector === 'tobacco' && year > 2005));
    if (cand.length && rng.fork('title').chance(0.5)) {
      const sp = rng.fork('title2').pick(cand);
      world.titleSponsor = { id: sp.id, name: sp.name, from: year, until: year + rng.fork('title3').int(3, 8) };
      logEvent(world, year, 'sponsor', `${sp.name} becomes title sponsor of the championship.`);
    } else if (ts && ts.until < year) world.titleSponsor = null;
  }
  supplierDeals(world, year);
}

// a marquee sponsor can bankroll a rising driver
function sponsorBacking(world, year, rng) {
  if (year < COMMERCIAL_FROM) return;
  const open = sponsorsOpenIn(year).filter((s) => s.marquee && (s.star || 0) > 0.4);
  for (const sp of open) {
    const r = rng.fork('back', sp.id);
    const has = world.drivers.some((d) => d.backer && d.backer.id === sp.id && d.status === 'active');
    if (has || !r.chance(0.12 * sp.star)) continue;
    const pool = world.drivers.filter((d) => d.status === 'active' && year - d.birthYear >= 17 && year - d.birthYear <= 24 && !d.backer);
    if (!pool.length) continue;
    const d = r.weighted(pool, (x) => 1 + (x.rep || 0) / 20 + (x.fans || 0) / 30);
    d.backer = { id: sp.id, name: sp.name, until: year + r.int(2, 5) };
    logEvent(world, year, 'sponsor', `${sp.name} bankrolls the rise of ${d.name}.`);
  }
  for (const d of world.drivers) if (d.backer && d.backer.until < year) d.backer = null;
}

// ---------------------------------------------------------------- fans and prestige

function fansAndPrestige(world, year, ts, rank) {
  for (const t of world.teams) {
    if (!t.active) continue;
    const s = ts[t.id] || { pts: 0, wins: 0, podiums: 0 };
    const res = clamp(40 - (rank[t.id] === undefined ? 0.5 : rank[t.id]) * 40 + s.wins * 3 + s.podiums, 0, 100);
    t.prestige = Math.round(clamp(t.prestige * 0.6 + res * 0.4 + (t.legacy.legendary ? 3 : 0), 3, 100));
    t.fans = Math.round(clamp(t.fans * 0.85 + (res * 0.5 + t.prestige * 0.3) * 0.15 + (s.wins ? 2 : 0), 1, 100));
    t.legacy.peakPrestige = Math.max(t.legacy.peakPrestige, t.prestige);
    t.legacy.peakFacilities = Math.max(t.legacy.peakFacilities, avgFac(t));
  }
  for (const b of world.brands) {
    if (b.fans === undefined) continue;
    const racing = b.status === 'racing';
    b.fans = Math.round(clamp(b.fans * 0.94 + (racing ? 1.5 + b.titles * 0.05 : 0) + b.strength * 3, 1, 100));
  }
  for (const d of world.drivers) {
    if (d.status !== 'active') continue;
    d.fans = Math.round(clamp((d.fans || 0) * 0.9 + (d.rep || 0) * 0.06, 0, 100));
  }
}

// ---------------------------------------------------------------- the money

function prizePool(world, year) {
  return world.regs.prizeFund * budgetBase(year) * (eraFor(year).worksTarget + eraFor(year).privTarget) * 0.32;
}

function shareFor(rule, rank) {
  // rank 0 = best. weights add up over all teams then normalise
  if (rule === 'equal') return 1;
  if (rule === 'performance') return 3.2 - 3 * rank;
  return 2.0 - 1.4 * rank;
}

function financeYear(world, year, rng, ts, rank) {
  const base = budgetBase(year);
  const teams = world.teams.filter((t) => t.active);
  const pool = prizePool(world, year);
  const shares = teams.map((t) => shareFor(world.regs.revenueShare, rank[t.id] === undefined ? 0.6 : rank[t.id]));
  const shareSum = shares.reduce((a, b) => a + b, 0) || 1;
  const titleIncome = world.titleSponsor ? base * 3.5 : 0;
  const rounds = world.season.results.length || 1;
  const custCount = {};
  for (const t of teams) if (t.kind !== 'works') custCount[t.brandId] = (custCount[t.brandId] || 0) + 1;

  teams.forEach((t, i) => {
    const f = t.finance;
    const b = brandById(world, t.brandId);
    const ents = activeEntries(world).filter((e) => e.teamId === t.id);
    const prize = ((pool + titleIncome) * shares[i]) / shareSum;
    const spons = t.sponsors.reduce((a, d) => a + d.value, 0);
    let mfr = t.kind === 'works' ? base * (0.3 + 0.8 * b.strength) * (b.commitment === undefined ? 1 : b.commitment) : 0;
    // the engine maker backs a preferred partner almost like a works team
    if (t.kind !== 'works' && t.partner && t.partner.preferred) mfr = base * (0.12 + 0.3 * b.strength) * (b.commitment === undefined ? 1 : b.commitment);
    // sisters in a group that share parts save money
    const prog = t.kind === 'works' ? programmeOf(world, t.brandId) : null;
    if (prog) mfr += base * (prog.quality >= 0 ? 0.04 : 0.015);
    const supply = t.kind === 'works' ? (custCount[t.brandId] || 0) * base * 0.28 : 0;
    const income = prize + spons + mfr + supply;

    const staff = Object.values(t.staff).reduce((a, s) => a + s.rating, 0) / 100 * 0.1 * base;
    let drivers = 0;
    for (const e of ents) { const c = e.contract; drivers += c ? c.salary : base * 0.06; }
    const dev = clamp(0.28 + t.owner.goals.glory * 0.35 - t.owner.goals.profit * 0.12, 0.15, 0.6) * base * (0.5 + t.wealth);
    const capped = world.regs.costCap ? Math.min(dev, base * 0.38) : dev;
    const ops = rounds * travelCost(year) * (t.scope === 'global' ? 1 : 0.35) * base * 0.045 * (1 + ents.length * 0.25);
    const supplier = t.kind === 'works' ? 0 : base * 0.28;
    const upkeep = (avgFac(t) / 100) * 0.16 * base;
    const costs = staff + drivers + capped + ops + supplier + upkeep;

    let net = income - costs;
    // the owner covers a deficit while there is a fortune and patience left
    let injection = 0;
    if (net < 0 && t.kind !== 'works') {
      injection = Math.min(-net, Math.max(0, t.owner.fortune));
      t.owner.fortune -= injection;
      net += injection;
    } else if (net > 0 && t.kind !== 'works') {
      const skim = net * t.owner.goals.profit * 0.5;
      t.owner.fortune += skim; net -= skim;
    }
    // a profit goes partly into the factory
    let invest = 0;
    // buildings and equipment date: without spending they decay; spending lifts them with diminishing returns
    if (net > 0) {
      invest = Math.min(net * (0.4 + t.owner.goals.legacy * 0.4), base * 1.1);
      const gain = invest / base * 10;
      for (const key of ['factory', 'workshops', 'equipment']) t.facilities[key] = Math.round(clamp(t.facilities[key] + gain / 3 * (1 - t.facilities[key] / 130), 5, 100));
      net -= invest;
    }
    for (const key of ['factory', 'workshops', 'equipment']) t.facilities[key] = Math.round(clamp(t.facilities[key] - (key === 'equipment' ? 1.7 : 1.0) - (net < -base * 0.05 ? 1 : 0), 5, 100));
    f.cash = Math.round(f.cash + net);
    // surplus above a few years of budget goes back to the maker or the owner
    if (f.cash > base * 3) { const x = Math.round((f.cash - base * 3) * 0.5); f.cash -= x; if (t.kind !== 'works') t.owner.fortune += x; }
    f.income = Math.round(income); f.costs = Math.round(costs); f.lastNet = Math.round(income - costs);
    f.injection = Math.round(injection);
    f.prize = Math.round(prize); f.sponsors = Math.round(spons); f.manufacturer = Math.round(mfr); f.supply = Math.round(supply);
    f.devPower = r2(clamp(0.75 + (capped / base) * 0.45 + (avgFac(t) - 50) / 450, 0.65, 1.25));
    f.history.push({ year, income: f.income, costs: f.costs, cash: f.cash });
    if (f.history.length > 25) f.history.shift();
    // wealth follows what the team can actually spend
    const target = clamp(0.12 + (income - injection * 0.5) / (base * 4.6), 0.08, 0.95);
    t.wealth = r2(clamp(t.wealth + 0.25 * (target - t.wealth), 0.06, 1));
    t.owner.patience = Math.round(clamp(t.owner.patience + (res(rank[t.id]) - 0.5) * 6 - (net + invest < 0 ? 3 : 0), 0, 100));
  });
  void rng;
}
function res(rank) { return 1 - (rank === undefined ? 0.6 : rank); }

// ---------------------------------------------------------------- legacy

function legacyUpdate(world, year, ts) {
  for (const t of world.teams) {
    const L = t.legacy;
    const yrs = Math.max(0, (t.endedYear && !t.active ? t.endedYear : year) - (t.idFrom === undefined ? t.foundedYear : t.idFrom));
    // legacy belongs to the identity racing now: a sale and rebrand starts it again
    const titles = identityTitles(t);
    L.score = Math.round(titles * 12 + identityWins(t) * 0.7 + yrs * 0.5 + L.peakPrestige * 0.2);
    const was = L.legendary;
    L.legendary = L.score >= 90 && titles >= 3;
    if (L.legendary && !was) logEvent(world, year, 'team', `${t.name} is now regarded as a legendary team.`);
  }
  void ts;
}

// ---------------------------------------------------------------- lifecycle: sale, closure, revival, groups

export function closeTeam(world, team, year, why, deactivate) {
  team.closed = { year, why, peakPrestige: team.legacy.peakPrestige, peakFacilities: team.legacy.peakFacilities };
  deactivate(world, team, year);
}

function saleThreshold(team) { return 46 - (team.legacy.legendary ? 18 : 0) - Math.min(10, team.legacy.score / 15); }

function lifecycle(world, year, rng, ev, rank, deactivate) {
  const base = budgetBase(year);
  for (const t of world.teams.filter((x) => x.active && x.kind === 'privateer').sort((a, b) => a.id - b.id)) {
    const r = rng.fork('life', t.id);
    const broke = t.owner.fortune <= 0 && t.finance.cash < -base * 0.4;
    const bored = t.owner.patience <= 8 && (rank[t.id] === undefined ? 0.6 : rank[t.id]) > 0.5;
    const hist = (year - t.foundedYear) > 25 ? 0.5 : 1;
    const stress = (ev.teamFold || 0) * 0.6 * stability(year);
    if (!((broke && r.chance(0.35 + 0.65 * stability(year))) || (bored && r.chance(0.3 + 0.7 * stability(year))) || r.chance(stress * hist))) continue;
    const count = world.teams.filter((x) => x.active && x.kind === 'privateer').length;
    if (count <= 2) continue;
    // a team with a good factory is put up for sale instead of closing
    if (avgFac(t) >= saleThreshold(t) || t.legacy.legendary) {
      const chance = 0.45 + t.prestige / 250 + (t.legacy.legendary ? 0.35 : 0) - (ev.teamFold || 0);
      if (r.fork('sale').chance(clamp(chance, 0.1, 0.95))) {
        const old = t.name;
        const nat = r.fork('nat').weighted(nationalityWeights(year), (x) => x.w).n;
        t.owner = makeOwner(world, r.fork('owner'), { ...t, nat }, year);
        t.owner.since = year;
        t.finance.cash = Math.round(base * 0.3);
        const rename = !t.legacy.legendary && r.fork('rename').chance(0.55);
        if (rename) {
          const names = new Set(world.teams.map((x) => x.name));
          const fresh = makeTeamName(r.fork('name'), nat, names, year);
          retireIdentity(world, t, year, 'sold', fresh);
          t.name = fresh;
          t.names.push(t.name);
          logEvent(world, year, 'team', `${old} is sold to ${t.owner.name} and rebranded as ${t.name}.`);
        } else logEvent(world, year, 'team', `${old} is sold to ${t.owner.name}.`);
        t.nat = nat; t.region = regionOf(nat);
        t.owner.patience = Math.max(t.owner.patience, 50);
        continue;
      }
      closeTeam(world, t, year, 'sale failed', deactivate);
      logEvent(world, year, 'team', `${t.name} is put up for sale but no buyer is found; it closes.`);
      continue;
    }
    closeTeam(world, t, year, broke ? 'bankrupt' : 'owner gave up', deactivate);
    logEvent(world, year, 'team', `${t.name} closes (${broke ? 'out of money' : 'its owner loses patience'}).`);
  }
}

// a closed team can be revived by new investors, bringing its old facilities back
export function reviveCandidates(world, year, rng, want, activate) {
  const closed = world.teams.filter((t) => !t.active && t.kind === 'privateer' && t.closed && year - t.closed.year >= 2);
  const out = [];
  for (const t of closed.sort((a, b) => a.id - b.id)) {
    const p = (0.012 + 0.05 * (t.closed.peakPrestige / 100) * (t.closed.peakFacilities / 100) + (t.legacy.legendary ? 0.08 : 0)) * want * stability(year) * stability(year) * 1.6;
    if (rng.fork('rev', t.id).next() < p) { activate(world, t, year); out.push(t); }
  }
  return out;
}

// wealthy teams found a sister team while the rules allow it; tighter rules force divestment
function groups(world, year, rng, rank, addTeam) {
  const rule = world.regs.commonOwnership;
  const cap = rule === 'none' ? 1 : rule === 'limited' ? 2 : 4;
  const byGroup = {};
  for (const t of world.teams.filter((x) => x.active)) {
    if (t.groupId) (byGroup[t.groupId] = byGroup[t.groupId] || []).push(t);
  }
  // divest above the cap
  for (const gid of Object.keys(byGroup).sort()) {
    const members = byGroup[gid].sort((a, b) => a.id - b.id);
    if (members.length > cap) {
      for (const t of members.slice(cap)) {
        t.groupId = null; t.relation = null; t.owner = makeOwner(world, rng.fork('divest', t.id), t, year);
        logEvent(world, year, 'team', `${t.name} is sold off as the common-ownership rules tighten.`);
      }
    }
  }
  if (rule === 'none' || year < 1930) return;
  const parents = world.teams.filter((t) => t.active && t.wealth > 0.65 && !t.groupId && (t.kind === 'works' || t.owner.type === 'consortium')).sort((a, b) => a.id - b.id);
  for (const p of parents) {
    const r = rng.fork('sister', p.id);
    const gSize = (p.groupId ? 1 : 1);
    void gSize;
    if (!r.chance(0.03 * (rule === 'free' ? 1.5 : 0.7) * stability(year))) continue;
    const era = eraFor(year);
    if (world.teams.filter((x) => x.active).length >= era.worksTarget + era.privTarget + 3) continue;
    const kinds = ['owned', 'technical partner', 'manufacturer-affiliated'];
    const kind = p.kind === 'works' ? r.pick(kinds) : 'owned';
    const gid = 'g' + p.id;
    const t = addTeam(world, r.fork('team'), year, { brandId: p.brandId, groupId: gid, relation: kind, parentId: p.id });
    p.groupId = gid; p.relation = 'parent';
    logEvent(world, year, 'team', `${p.name} sets up a sister team, ${t.name} (${kind}).`);
  }
}

// ---------------------------------------------------------------- the yearly pass

// Runs once per year turn, after the season has been archived. `callbacks` supply the
// world helpers that would otherwise create an import cycle.
export function orgYear(world, year, rng, last, callbacks) {
  const ts = teamSeason(world);
  const rank = (last && last.teamRank) || {};
  const finished = world.season.year;
  for (const t of world.teams) initTeamOrg(world, t, makeRng(world.seed, 'org-init', t.id), year);
  for (const b of world.brands) initBrandOrg(b, makeRng(world.seed, 'brand-org', b.id));

  // line-up and results per team, for the team page
  for (const t of (world.season.results.length ? world.teams.filter((x) => x.active) : [])) {
    const s = ts[t.id] || { pts: 0, wins: 0, podiums: 0 };
    const ents = activeEntries(world).filter((e) => e.teamId === t.id);
    t.history.push({
      year: finished, name: t.name, kind: t.kind, colors: t.colors ? t.colors.slice() : null, brandId: t.brandId, tyreId: t.tyreId, pts: s.pts, wins: s.wins, podiums: s.podiums,
      rank: rank[t.id] === undefined ? null : Math.round(rank[t.id] * 100) / 100,
      entries: ents.map((e) => ({ number: e.number, driverId: e.driverId, type: e.type })),
    });
    if (t.history.length > 60) t.history.shift();
    // a local team on the podium gains glory and may go global
    if (t.scope === 'local') {
      t.glory += s.podiums;
      const fits = t.wealth * 1.0 > travelCost(finished) * 0.55 || t.glory >= 3;
      if (fits && (t.glory >= 3 || year >= 1960)) { t.scope = 'global'; logEvent(world, year, 'team', `${t.name} decides to go global.`); }
    }
  }
  fansAndPrestige(world, year, ts, rank);
  sponsorMarket(world, year, rng.fork('spons'), rank);
  sponsorBacking(world, year, rng.fork('backing'));
  financeYear(world, year, rng.fork('finance'), ts, rank);
  legacyUpdate(world, year, ts);
  lifecycle(world, year, rng.fork('lifecycle'), callbacks.ev, rank, callbacks.deactivate);
  groups(world, year, rng.fork('groups'), rank, callbacks.addTeam);
  const revived = reviveCandidates(world, year, rng.fork('revive'), callbacks.reviveWeight || 1, callbacks.activate);
  for (const t of revived) logEvent(world, year, 'team', `${t.name} is revived by new investors.`);
}

export { teamSeason, logEvent, teamById, driverById };
