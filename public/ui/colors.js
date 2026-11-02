// Brand and team colours, and the small badges that carry them. Pure lookups, no engine state.
//
// A team's colours are its own livery if it has one (teams founded in the save, and teams sold
// off by a maker, which keep the old colours); a works team wears its maker's colours.
// A maker's colours come from data/brands.js. Anything without colours gets a stable
// colour made from its name, so it is never grey by accident.

import { brandColors, hashColors } from '../engine/data/brands.js';
import { teamById, brandById } from '../engine/world.js';
import { logoFor, divisionLogo } from './assets.js';
import { esc } from './common.js';

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
function norm(c) {
  if (typeof c !== 'string' || !HEX.test(c)) return null;
  if (c.length === 4) return '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
  return c.toLowerCase();
}
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// WCAG relative luminance and contrast ratio
export function luminance(hex) {
  const [r, g, b] = rgb(norm(hex) || '#808080').map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
// the text colour that reads best on a given background
export function inkOn(hex) { return contrast(hex, '#ffffff') >= contrast(hex, '#101010') ? '#ffffff' : '#101010'; }

function pair(list, key) {
  const a = list && norm(list[0]), b = list && norm(list[1]);
  if (a && b) return [a, b];
  const h = hashColors(key);
  return [a || norm(h[0]), b || norm(h[1])];
}

export function brandPalette(brandId) { return pair(brandColors(brandId), brandId); }

export function teamPalette(w, teamId) {
  const t = teamById(w, teamId);
  if (!t) return pair(null, 'team' + teamId);
  if (t.kind === 'works') return brandPalette(t.brandId); // a factory team wears its maker's colours, whatever it wore before
  if (t.colors && norm(t.colors[0]) && norm(t.colors[1])) return pair(t.colors, t.id);
  return brandPalette(t.brandId);
}

// the colours of one identity of a team (a season of its history, or a past identity): a works identity wears
// its maker's colours, a privateer one the livery it had then
export function identityPalette(id) {
  if (id.kind === 'works') return brandPalette(id.brandId);
  if (id.colors && norm(id.colors[0]) && norm(id.colors[1])) return pair(id.colors, id.name || 'x');
  return brandPalette(id.brandId);
}
export function identityBadge(w, id, year) {
  if (id.kind === 'works') {
    const src = divisionLogo(id.brandId, id.name, year);
    if (src) return `<img class="mk-icon" src="${src}" alt="" loading="lazy">`;
    return brandMark(w, id.brandId, year);
  }
  return swatch(identityPalette(id));
}

// a lower-tier team has no livery of its own: use its car maker's colours, or a colour from its name
export function lowTeamPalette(w, lt) {
  if (!lt) return pair(null, 'low');
  if (lt.brandId && lt.brandId !== 'none' && brandById(w, lt.brandId)) return brandPalette(lt.brandId);
  return pair(null, lt.name || 'low' + lt.id);
}

// ---- badges ----
export function swatch(pal) {
  return `<span class="sw" style="--c1:${pal[0]};--c2:${pal[1]}" aria-hidden="true"></span>`;
}

function initials(name) {
  const words = String(name || '?').replace(/[^\p{L}\p{N}\s-]/gu, '').split(/[\s-]+/).filter(Boolean);
  if (!words.length) return '?';
  return words.length === 1 ? words[0][0].toUpperCase() : (words[0][0] + words[1][0]).toUpperCase();
}

// the maker's badge if there is a drawn one, else a monogram in the maker's colours (until a badge exists)
export function brandMark(w, brandId, year, big) {
  const src = logoFor(brandId, year === undefined ? w.year : year);
  if (src) return `<img class="${big ? 'mk-hero' : 'mk-icon'}" src="${src}" alt="" loading="lazy">`;
  const b = brandById(w, brandId);
  if (!b) return '';
  const pal = brandPalette(brandId);
  return `<span class="${big ? 'mono mono-big' : 'mono'}" style="--c1:${pal[0]};--c2:${pal[1]};--ci:${inkOn(pal[0])}" aria-hidden="true">${esc(initials(b.name))}</span>`;
}

// the mark of a works team: its performance division's badge when it runs under that name (Toyota Gazoo,
// Honda Mugen), else its maker's badge or monogram
export function teamMark(w, teamId, big) {
  const t = teamById(w, teamId);
  if (!t || t.kind !== 'works') return '';
  const src = divisionLogo(t.brandId, t.name, w.year);
  if (src) return `<img class="${big ? 'mk-hero' : 'mk-icon'}" src="${src}" alt="" loading="lazy">`;
  return brandMark(w, t.brandId, w.year, big);
}

// what goes in front of a team's name: its maker's badge for a works team, a livery chip otherwise
export function teamBadge(w, teamId) {
  const t = teamById(w, teamId);
  if (!t) return '';
  return t.kind === 'works' ? teamMark(w, teamId) : swatch(teamPalette(w, teamId));
}

// ---- styles ----
// a table row carrying a team's colour as a left stripe and a faint wash
export function rowFor(cells, pal, cls = '') { return { cells, cls: ('tc ' + cls).trim(), style: `--rc:${pal[0]};--rc2:${pal[1]}` }; }

// the page-level colour variables for a branded page (hero fill, panel rules, contrast text)
export function brandVars(pal) { return `--c1:${pal[0]};--c2:${pal[1]};--ci:${inkOn(pal[0])};--ci2:${inkOn(pal[1])}`; }
export function branded(pal, html) { return `<div class="branded" style="${brandVars(pal)}">${html}</div>`; }
