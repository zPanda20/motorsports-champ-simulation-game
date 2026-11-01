// Technology adoption between seasons, and what technology does to a car.

import { clamp } from './rng.js';
import { TECHS, TECH_BY_ID, bannedIn, availableIn } from './data/tech.js';

const ENGINE_LAG = 2;     // customers get engine technology later than the works team
const CHASSIS_LAG = 2;    // customer chassis lag behind the seller

function worksTeamOf(world, brandId) {
  return world.teams.find((t) => t.kind === 'works' && t.brandId === brandId && t.active) || null;
}

// Technologies a team can actually race with this year (adopted, legal).
export function usableTechs(world, team, year) {
  const out = [];
  const brand = world.brands.find((b) => b.id === team.brandId);
  const rule = world.regs.chassisSupply;
  for (const t of TECHS) {
    if (!availableIn(t, year) || bannedIn(t, year, world.regs.techBans)) continue;
    let adoptedAt = null;
    if (t.kind === 'engine') {
      // decided by the engine supplier; works teams first, customers later
      const sup = brand && brand.tech ? brand.tech[t.id] : undefined;
      if (sup !== undefined && sup !== null) adoptedAt = team.kind === 'works' ? sup : sup + ENGINE_LAG;
    } else if (team.kind === 'works') {
      const own = team.tech && team.tech[t.id];
      if (own !== undefined && own !== null) adoptedAt = own;
    } else {
      const own = team.tech && team.tech[t.id];
      let via = null;
      if (rule !== 'strict') {
        const w = worksTeamOf(world, team.brandId);
        const sup = w && w.tech ? w.tech[t.id] : undefined;
        if (sup !== undefined && sup !== null) via = sup + (rule === 'customer' ? CHASSIS_LAG : CHASSIS_LAG + 1);
      }
      if (own !== undefined && own !== null) adoptedAt = via === null ? own : Math.min(own, via);
      else adoptedAt = via;
    }
    if (adoptedAt !== null && adoptedAt <= year) out.push(t.id);
  }
  return out;
}

// Share of active teams that can use each technology this year.
export function adoptionShares(world, year) {
  const teams = world.teams.filter((t) => t.active);
  const shares = {};
  for (const t of TECHS) shares[t.id] = 0;
  if (!teams.length) return shares;
  for (const team of teams) for (const id of usableTechs(world, team, year)) shares[id]++;
  for (const id of Object.keys(shares)) shares[id] = shares[id] / teams.length;
  return shares;
}

// Rating bonus from technology: full effect plus an early-adopter edge. The result is
// centred on the grid by the caller so the sport as a whole does not inflate.
export function techBonus(ids, shares) {
  const b = { handling: 0, brakes: 0, power: 0, rel: 0, weight: 0 };
  for (const id of ids) {
    const t = TECH_BY_ID[id];
    const edge = (t.edge || 0) * (1 - (shares[id] || 0));
    for (const k of Object.keys(t.effect)) b[k] += t.effect[k];
    b.handling += t.effect.handling ? edge * 0.5 : 0;
    b.power += t.effect.power ? edge * 0.5 : 0;
    b.brakes += t.effect.brakes ? edge * 0.5 : 0;
    if (!t.effect.handling && !t.effect.power && !t.effect.brakes) b.handling += edge * 0.3;
  }
  return b;
}

// Yearly: new technologies spread. Returns lines for the chronicle.
export function adoptTechs(world, year, rng) {
  const notes = [];
  // bans start: suppliers and teams that invested take a loss
  for (const t of TECHS) {
    for (const [a, b] of t.bans || []) {
      if (year === a) {
        let hit = 0;
        for (const br of world.brands) if (br.tech && br.tech[t.id] !== undefined && br.tech[t.id] !== null) { br.strength = clamp(br.strength - 0.03, 0.12, 0.97); hit++; }
        for (const tm of world.teams) if (tm.tech && tm.tech[t.id] !== undefined && tm.tech[t.id] !== null) hit++;
        notes.push(`${t.name} is banned${hit ? '; makers and teams that invested in it take a loss' : ''}.`);
      }
      if (year === b + 1 && b < 9000) notes.push(`${t.name} is permitted again.`);
    }
    if (year === t.from) notes.push(`${t.name} becomes available.`);
  }

  const shares = adoptionShares(world, year);
  // engine technology: each supplier brand decides
  for (const t of TECHS) {
    if (!availableIn(t, year) || bannedIn(t, year, world.regs.techBans)) continue;
    const share = shares[t.id];
    if (t.kind === 'engine') {
      for (const b of world.brands.filter((x) => x.status !== 'defunct').sort((a, c) => a.id.localeCompare(c.id))) {
        b.tech = b.tech || {};
        if (b.tech[t.id] !== undefined && b.tech[t.id] !== null) continue;
        const r = rng.fork('engine', t.id, b.id);
        const works = b.status === 'racing';
        const known = world.brands.some((x) => x.tech && x.tech[t.id] !== undefined && x.tech[t.id] !== null);
        let p = (works ? 0.16 : 0.04) * (0.5 + (b.risk === undefined ? 0.5 : b.risk)) * (0.6 + b.strength);
        if (known) p *= 1.5 + share * 3;
        if (year - t.from > 6) p += 0.2;
        if (r.next() < p) { b.tech[t.id] = year; if (works && !known) notes.push(`${b.name} is first to adopt ${t.name.toLowerCase()}.`); }
      }
    } else {
      for (const team of world.teams.filter((x) => x.active).sort((a, c) => a.id - c.id)) {
        team.tech = team.tech || {};
        if (team.tech[t.id] !== undefined && team.tech[t.id] !== null) continue;
        if (team.kind !== 'works' && world.regs.chassisSupply !== 'strict') {
          // a customer waits for its supplier (handled in usableTechs)
          continue;
        }
        const r = rng.fork('chassis', t.id, team.id);
        const known = world.teams.some((x) => x.tech && x.tech[t.id] !== undefined && x.tech[t.id] !== null);
        const risk = team.risk === undefined ? 0.5 : team.risk;
        let p = 0.14 * (0.5 + risk) * (0.5 + team.wealth) * (team.facilities ? 0.6 + team.facilities.equipment / 150 : 1);
        if (known) p *= 1.5 + share * 3;
        if (year - t.from > 6) p += 0.2;
        if (r.next() < p) { team.tech[t.id] = year; if (!known) notes.push(`${team.name} is first to adopt ${t.name.toLowerCase()}.`); }
      }
    }
  }
  return notes;
}

export function techNames(ids) { return ids.map((id) => TECH_BY_ID[id].name); }
