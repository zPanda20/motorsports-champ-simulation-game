// Browser front end: a thin layer over the engine. All simulation lives in ./engine, all pages in ./ui.

import { createWorld, driverById, entryById, teamById, brandById } from './engine/world.js';
import {
  prepareRound, applyRoundResult, runRound, driverStandings, advanceYear, beginSeason, raceGenerator, currentTrack,
} from './engine/season.js';
import { lapsFor } from './engine/race.js';
import { serialize, deserialize } from './engine/save.js';
import { TRACK_BY_ID } from './engine/data/tracks.js';
import { eraFor } from './engine/data/eras.js';
import { formatTime, formatGap } from './engine/recap.js';
import { pendingItems, resolveItem, settleAll, inviteBrand, expelBrand, setRegulation, setTechRule } from './engine/governor.js';
import * as pages from './ui/pages.js';
import { esc, table } from './ui/common.js';
import { backgroundFor } from './ui/assets.js';
import { teamBadge, teamPalette } from './ui/colors.js';

const $ = (id) => document.getElementById(id);

let world = null;
let busy = false;       // a race is being watched or a batch is running
let paused = false;
let abort = false;
let runMode = '';       // 'watch' (pausable) or 'batch' (stoppable)
let token = 0;          // bumps when the world is replaced so old loops stop
let note = '';
let followDriver = 0;   // driver to follow in the race viewer (0 = nobody)          // one-line message in the status bar

const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
};
const device = () => store.get('msc.device') || '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- themes (the interface follows the era)

const THEMES = [
  { id: 'destijl', label: '1919 De Stijl' }, { id: 'bauhaus', label: '1925 Bauhaus' }, { id: 'constructivism', label: '1935 Constructivism' },
  { id: 'austerity', label: '1940s Austerity print' }, { id: 'atomic', label: '1950s Atomic age' }, { id: 'pop', label: '1960s Pop and Op' },
  { id: 'swiss', label: '1970s Swiss' }, { id: 'pc98', label: '1980s PC-98' }, { id: 'vaporwave', label: '1990s Vaporwave' },
  { id: 'y2k', label: '2000s Y2K' }, { id: 'memphis', label: '2010 Memphis' }, { id: 'duotone', label: '2015 Duotone' },
  { id: 'tech', label: '2020s Abstract tech' }, { id: 'acid', label: '2030s Acid' },
];

function themeForYear(y) {
  if (y < 1925) return 'destijl';
  if (y < 1935) return 'bauhaus';
  if (y < 1940) return 'constructivism';
  if (y < 1950) return 'austerity';
  if (y < 1960) return 'atomic';
  if (y < 1970) return 'pop';
  if (y < 1980) return 'swiss';
  if (y < 1990) return 'pc98';
  if (y < 2000) return 'vaporwave';
  if (y < 2010) return 'y2k';
  if (y < 2015) return 'memphis';
  if (y < 2020) return 'duotone';
  if (y < 2030) return 'tech';
  return 'acid';
}

function applyTheme() {
  const pref = store.get('msc.theme') || 'auto';
  const id = pref === 'auto' ? themeForYear(world ? world.year : 1919) : pref;
  document.body.dataset.theme = id;
  const bg = (store.get('msc.bg') || 'on') === 'on' && world ? backgroundFor(world.year) : null;
  if (bg) document.body.dataset.bg = bg; else delete document.body.dataset.bg;
}

function initThemePicker() {
  const sel = $('theme-sel');
  sel.innerHTML = '<option value="auto">Interface follows the era</option>' + THEMES.map((t) => `<option value="${t.id}">Fixed: ${esc(t.label)}</option>`).join('');
  sel.value = store.get('msc.theme') || 'auto';
  sel.onchange = () => { store.set('msc.theme', sel.value); applyTheme(); };
  const bsel = $('bg-sel');
  bsel.value = store.get('msc.bg') || 'on';
  bsel.onchange = () => { store.set('msc.bg', bsel.value); applyTheme(); };
}

// ---------------------------------------------------------------- automatic copy (IndexedDB, falling back to localStorage)

function idb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no indexedDB'));
    const req = indexedDB.open('series-chronicle', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbSet(key, value) {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(value, key);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
async function idbGet(key) {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readonly');
    const r = tx.objectStore('kv').get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function autosave() {
  if (!world) return;
  const text = serialize(world, device());
  try { await idbSet('autosave', text); } catch (e) { store.set('msc.autosave', text); }
}

async function loadAutosave() {
  try { const t = await idbGet('autosave'); if (t) return t; } catch (e) { /* fall through */ }
  return store.get('msc.autosave');
}

// ---------------------------------------------------------------- start / save / load

function setWorld(w) {
  token++;
  world = w;
  busy = false; paused = false; abort = false; runMode = ''; note = '';
  $('welcome').hidden = true;
  $('game').hidden = false;
  $('btn-save').disabled = false;
  clearRaceView();
  if (!location.hash || location.hash === '#/') location.hash = '#/race';
  renderAll();
  autosave();
}

function newSeries() {
  const seed = $('seed').value.trim() || String(Math.floor(Math.random() * 1e9));
  setWorld(createWorld({ seed, governor: $('new-gov').value, mode: $('new-mode').value }));
}

function downloadSave() {
  const text = serialize(world, device());
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `series-${world.seed}-${world.year}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function loadFile(file) {
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const w = deserialize(String(rd.result), device());
      setWorld(w);
      if (w.meta.openedFrom && device() && w.meta.openedFrom !== device()) {
        alert(`This series was last opened on ${w.meta.openedFrom}. You are now on ${device()}.`);
      }
    } catch (e) { alert(e.message || 'Could not read that file.'); }
  };
  rd.readAsText(file);
}

// ---------------------------------------------------------------- the router

const TAB_OF = { race: 'race', standings: 'standings', teams: 'teams', team: 'teams', lowteam: 'tiers', drivers: 'drivers', driver: 'drivers', tiers: 'tiers', series: 'tiers', industry: 'industry', brand: 'industry', sponsor: 'industry', group: 'industry', groups: 'industry', oil: 'industry', tyre: 'industry', inbox: 'inbox', rules: 'rules', chronicle: 'chronicle', records: 'records', track: 'records' };

function parseRoute() {
  const parts = (location.hash || '#/race').replace(/^#\/?/, '').split('/');
  return { name: parts[0] || 'race', arg: parts[1] === undefined ? null : decodeURIComponent(parts[1]), sub: parts[2] === undefined ? null : decodeURIComponent(parts[2]), extra: parts[3] === undefined ? null : decodeURIComponent(parts[3]) };
}

function viewFor(name, arg, sub, extra) {
  const num = (v) => (v === null ? null : /^\d+$/.test(v) ? +v : v);
  switch (name) {
    case 'standings': return arg === null ? pages.pageStandings(world) : pages.pageSeasonStandings(world, +arg);
    case 'teams': return pages.pageTeams(world);
    case 'team': return pages.pageTeam(world, num(arg));
    case 'lowteam': return pages.pageLowTeam(world, num(arg));
    case 'drivers': return pages.pageDrivers(world);
    case 'driver': return pages.pageDriver(world, num(arg));
    case 'tiers': return pages.pageTiers(world);
    case 'series': return pages.pageSeries(world, num(arg), sub, sub === 'chronicle' ? extra : null);
    case 'industry': return pages.pageIndustry(world, world.governor.mode === 'hands' || (world.governor.manual && world.governor.manual['entry-works']));
    case 'brand': return pages.pageBrand(world, arg);
    case 'sponsor': return pages.pageSponsor(world, arg);
    case 'group': return pages.pageGroup(world, arg);
    case 'groups': return pages.pageGroups(world);
    case 'oil': return pages.pageOil(world, arg);
    case 'tyre': return pages.pageTyre(world, arg);
    case 'track': return pages.pageTrack(world, arg);
    case 'inbox': return pages.pageInbox(world);
    case 'rules': return pages.pageRules(world);
    case 'chronicle': return pages.pageChronicle(world, arg === null ? latestYear() : +arg);
    case 'records': return pages.pageRecords(world);
    default: return '';
  }
}
const latestYear = () => { const h = world.history.seasons.filter((x) => !x.cancelled).slice(-1)[0]; return h ? h.year : world.year; };

function renderRoute(keepScroll) {
  if (!world) return;
  const { name, arg, sub, extra } = parseRoute();
  const tab = name === 'standings' && arg !== null ? 'chronicle' : TAB_OF[name] || 'race';
  for (const a of document.querySelectorAll('#tabs a')) a.classList.toggle('on', a.dataset.tab === tab);
  const race = tab === 'race';
  $('tab-race').hidden = !race;
  $('view').hidden = race;
  if (race) { renderRaceTab(); return; }
  const y = window.scrollY;
  let html;
  try { html = viewFor(name, arg, sub, extra); } catch (e) { html = `<section class="panel"><h3>This page could not be drawn</h3><div class="small">${esc(e.message)}</div></section>`; console.error(e); }
  $('view').innerHTML = (name === 'team' || name === 'driver' || name === 'series' || name === 'brand' || name === 'sponsor' || name === 'lowteam' || name === 'track' || name === 'group' || name === 'oil' || name === 'tyre' || (name === 'standings' && arg !== null) ? '<div class="back"><a class="lk" href="javascript:history.back()">&larr; Back</a></div>' : '') + html;
  if (keepScroll) window.scrollTo(0, y); else window.scrollTo(0, 0);
}

window.addEventListener('hashchange', () => { if (world) renderRoute(false); });

// ---------------------------------------------------------------- status, race tab, buttons

function renderAll() {
  if (!world) return;
  applyTheme();
  const era = eraFor(world.year);
  const s = world.season;
  const where = world.phase === 'offseason' ? 'off-season: decisions waiting' : s.done ? 'season complete' : `round ${s.round + 1} of ${s.calendar.length}`;
  $('status').textContent = `${world.year} · ${era.name} · ${where}` + (note ? ` · ${note}` : '') + (device() ? ` · ${device()}` : '');
  const n = pendingItems(world).length;
  $('badge').hidden = !n; $('badge').textContent = n;
  setButtons();
  renderRoute(true);
}

function renderRaceTab() {
  renderRaceHeader();
  renderLastRace();
  $('dash').innerHTML = pages.pageDash(world);
  const off = $('offseason');
  const pend = pendingItems(world);
  if (world.phase === 'offseason') {
    off.hidden = false;
    off.innerHTML = `<h3>Off-season ${world.year - 1} to ${world.year}</h3><div class="small">The governing body has ${pend.length} decision${pend.length === 1 ? '' : 's'} for you: entries, rule changes and new series. Decide them in <a class="lk" href="#/inbox">Approvals</a>, or let the governor settle the rest.</div>` +
      `<div class="controls"><a class="btnlink" href="#/inbox">Open Approvals</a><button id="btn-begin" class="primary">Let the governor settle the rest and begin ${world.year}</button></div>`;
    $('btn-begin').onclick = beginNow;
  } else off.hidden = true;
}

function setButtons() {
  const s = world.season;
  const off = world.phase === 'offseason';
  const can = !busy && !s.done && !off;
  for (const id of ['btn-watch1', 'btn-watch2', 'btn-watch3', 'btn-skip', 'btn-season']) $(id).disabled = !can;
  $('btn-next-year').hidden = !s.done || off;
  $('btn-next-year').disabled = busy;
  $('btn-auto').disabled = busy || off;
  $('years-n').disabled = busy || off;
  $('btn-pause').disabled = !busy;
  $('btn-pause').textContent = busy && runMode === 'batch' ? 'Stop' : paused ? 'Resume' : 'Pause';
  $('btn-new').disabled = false;
}

function fillFollow() {
  const sel = $('follow');
  const cur = followDriver;
  const ents = world.entries.filter((e) => e.active && e.driverId != null).map((e) => ({ d: driverById(world, e.driverId), t: teamById(world, e.teamId) })).filter((x) => x.d);
  sel.innerHTML = '<option value="0">Follow: nobody</option>' + ents.sort((a, b) => a.d.name.localeCompare(b.d.name)).map((x) => `<option value="${x.d.id}">${esc(x.d.name)} (${esc(x.t.name)})</option>`).join('');
  sel.value = ents.some((x) => x.d.id === cur) ? String(cur) : '0';
  followDriver = +sel.value;
}

function renderRaceHeader() {
  fillFollow();
  const s = world.season;
  if (world.phase === 'offseason') { $('race-title').textContent = `The ${world.year} season has not started`; $('race-sub').textContent = 'Settle the governing body\'s decisions to begin.'; return; }
  if (s.done) {
    const ds = driverStandings(world);
    const dn = (id) => (driverById(world, id) || { name: '?' }).name;
    $('race-title').textContent = `${world.year} season complete`;
    $('race-sub').textContent = ds[0] ? `Champion: ${dn(ds[0].id)} with ${ds[0].pts} points. Start the next season when ready.` : '';
    return;
  }
  const T = currentTrack(world);
  const laps = lapsFor(T, world.regs);
  const end = world.season.endurance && world.season.endurance.indexOf(s.round) >= 0;
  $('race-title').textContent = `Round ${s.round + 1}: ${T.name}`;
  $('race-sub').textContent = `${laps} laps · ${(laps * T.lengthKm).toFixed(0)} km · ${T.kind} · ${T.country}` + (end ? ' · endurance round, relief drivers, extra points' : '') + (s.round === 0 && world.regs.preQual ? ' · everyone pre-qualifies' : world.regs.preQual ? ` · top ${world.regs.exemptTop} entries are exempt from pre-qualifying` : '');
}

function renderLastRace() {
  const s = world.season;
  const r = s.results[s.results.length - 1];
  $('last-race').hidden = !r;
  if (!r) return;
  $('last-title').textContent = `Round ${r.round + 1} result: ${TRACK_BY_ID[r.trackId].name}`;
  $('classification').innerHTML = pages.classTableHtml(world, r.classification).replace(/^<table>|<\/table>$/g, '');
  const dn = (eid) => { const e = entryById(world, eid); const d = e && driverById(world, e.driverId); return d ? d.name : '?'; };
  $('last-retire').textContent = r.fastest ? `Fastest lap: ${dn(r.fastest.entryId)}, ${formatTime(r.fastest.time).replace(/^0:/, '')} on lap ${r.fastest.lap}.` : '';
}

// ---------------------------------------------------------------- race viewing

function clearRaceView() {
  $('timing').innerHTML = '';
  $('feed').innerHTML = '';
  $('lapcount').textContent = '';
}

function feed(text, cls) {
  const li = document.createElement('li');
  if (cls) li.className = cls;
  li.textContent = text;
  const f = $('feed');
  f.insertBefore(li, f.firstChild);
}

// what the timing screens can show depends on the era: gaps are rounded early on, and wear figures only exist later
function gapText(sec, year) {
  if (!sec) return '';
  if (year < 1935) return 'about ' + (Math.max(5, Math.round(sec / 5) * 5)) + 's';
  if (year < 1965) return '+' + Math.round(sec) + 's';
  return formatGap(sec);
}

function renderTiming(step, info) {
  const year = world.year;
  const showTyres = year >= 1975, showStops = year >= 1950;
  const get = (id) => info[id] || { driverName: '?', team: '?', number: '' };
  // the running order and the retirements wear their team's colours
  const look = (id) => { const g = get(id); if (g.teamId === undefined) return { badge: '', style: '' }; const pal = teamPalette(world, g.teamId); return { badge: teamBadge(world, g.teamId), style: `--rc:${pal[0]};--rc2:${pal[1]}` }; };
  const rows = step.order.map((o) => ({
    cls: 'tc ' + (get(o.id).driverId === followDriver ? 'follow' : ''), style: look(o.id).style,
    cells: [o.pos, o.number, esc(get(o.id).driverName), look(o.id).badge + esc(get(o.id).team), o.pos === 1 ? '' : gapText(o.gap, year), showStops ? o.pits : '', showTyres ? Math.round((1 - Math.min(1, o.tyreWear)) * 100) + '%' : ''],
  }));
  for (const id of step.out) rows.push({ cls: 'tc out' + (get(id).driverId === followDriver ? ' follow' : ''), style: look(id).style, cells: ['', get(id).number, esc(get(id).driverName), look(id).badge + esc(get(id).team), 'out', '', ''] });
  const el = $('timing');
  el.innerHTML = '<thead><tr>' + ['P', 'No.', 'Driver', 'Team', 'Gap', showStops ? 'Stops' : '', showTyres ? 'Tyres' : ''].map((h, i) => `<th class="${i >= 4 ? 'num' : ''}">${h}</th>`).join('') + '</tr></thead><tbody>' +
    rows.map((r) => `<tr class="${r.cls || ''}"${r.style ? ` style="${r.style}"` : ''}>` + r.cells.map((c, i) => `<td class="${i >= 4 ? 'num' : ''}">${c}</td>`).join('') + '</tr>').join('') + '</tbody>';
  $('lapcount').textContent = `lap ${step.lap} of ${step.laps}` + (step.rain ? ' · raining' : '') + (step.events.some((e) => e.kind === 'safety') ? ' · safety car' : '');
}

const NOTABLE = new Set(['out', 'repair', 'limp', 'damage', 'pit', 'safety']);

async function watch(mode) {
  if (busy || world.season.done || world.phase === 'offseason') return;
  const my = token;
  busy = true; runMode = 'watch'; paused = false; abort = false; setButtons();
  clearRaceView();
  const prep = prepareRound(world);
  const info = {};
  const tname = (id) => (teamById(world, id) || { name: '?' }).name;
  for (const st of prep.setup.starters) info[st.entryId] = { number: st.number, driverName: st.driverName, driverId: st.driverId, team: tname(st.teamId), teamId: st.teamId };
  const gen = raceGenerator(prep.setup);
  const delay = mode === 1 ? 380 : mode === 2 ? 70 : 0;
  let result = null;
  const label = (id) => (info[id] ? `#${info[id].number} ${info[id].driverName}` : '');

  for (;;) {
    if (my !== token) return;
    const { value: step, done } = gen.next();
    if (done) break;
    if (step.type === 'start') {
      const T = step.track;
      feed(`${T.name}: ${step.laps} laps. ${prep.prequal.failed.length} failed to pre-qualify.` + (step.rain ? ' Rain is forecast.' : ''), 'hd');
      feed('Grid: ' + step.grid.map((id, i) => `${i + 1}. #${(info[id] || {}).number}`).join('  '));
    } else if (step.type === 'lap') {
      const mine = (e) => followDriver && info[e.id] && info[e.id].driverId === followDriver;
      for (const e of step.events) {
        if (e.kind === 'pass' && mode !== 1 && !mine(e)) continue;
        feed(`Lap ${e.lap}: ${label(e.id)} ${e.text}`.replace(/: +/, ': '), e.kind === 'out' ? 'out' : e.kind === 'safety' ? 'hd' : '');
      }
      const notable = step.events.some((e) => NOTABLE.has(e.kind) || mine(e));
      if (mode === 3) {
        if (notable || step.lap % 10 === 0 || step.lap === step.laps) { renderTiming(step, info); await sleep(notable ? 450 : 120); }
      } else {
        renderTiming(step, info);
        await sleep(delay);
      }
      while (paused && my === token && !abort) await sleep(100);
      if (abort) break;
    } else if (step.type === 'finish') {
      result = step.result;
    }
  }
  if (my !== token) return;
  if (!result) { // aborted: finish headlessly so the result is the real one
    for (const step of raceGenerator(prep.setup)) if (step.type === 'finish') result = step.result;
  }
  applyRoundResult(world, prep, result);
  const w = result.classification.find((r) => r.pos === 1);
  if (w) feed(`Winner: #${w.number} ${(driverById(world, w.driverId) || {}).name} (${tname(w.teamId)})`, 'hd');
  busy = false; paused = false; abort = false; runMode = '';
  autosave();
  renderAll();
}

async function instant() {
  if (busy || world.season.done || world.phase === 'offseason') return;
  runRound(world);
  clearRaceView();
  autosave();
  renderAll();
}

async function runRestOfSeason() {
  if (busy || world.phase === 'offseason') return;
  const my = token;
  busy = true; runMode = 'batch'; abort = false; setButtons();
  while (!world.season.done && !abort && my === token) {
    runRound(world);
    $('status').textContent = `${world.year} · round ${world.season.round} of ${world.season.calendar.length} done`;
    await sleep(0);
  }
  if (my !== token) return;
  busy = false; abort = false; runMode = '';
  autosave(); renderAll();
}

// After a season ends: rolls the year. In hands-on mode the new season waits for the player's decisions.
function rollYear() {
  advanceYear(world);
  if (world.phase === 'offseason') {
    note = '';
    location.hash = '#/inbox';
    return true;
  }
  return false;
}

async function autopilot() {
  if (busy || world.phase === 'offseason') return;
  const my = token;
  const years = parseInt($('years-n').value, 10);
  busy = true; runMode = 'batch'; abort = false; setButtons();
  let stopped = false;
  for (let y = 0; y < years && !abort && my === token; y++) {
    while (!world.season.done && !abort && my === token) {
      runRound(world);
      $('status').textContent = `Autopilot · ${world.year} · round ${world.season.round}`;
      await sleep(0);
    }
    if (abort || my !== token) break;
    if (rollYear()) { stopped = true; break; }
    applyTheme();
  }
  if (my !== token) return;
  busy = false; abort = false; runMode = '';
  note = stopped ? 'autopilot paused for your decisions' : '';
  clearRaceView(); autosave(); renderAll();
}

function nextYear() {
  if (busy || !world.season.done) return;
  rollYear();
  clearRaceView();
  autosave();
  renderAll();
}

function beginNow() {
  if (world.phase !== 'offseason') return;
  beginSeason(world);
  note = '';
  clearRaceView();
  autosave();
  renderAll();
}

// ---------------------------------------------------------------- actions inside pages

function onViewClick(e) {
  const tr = e.target.closest('tr[data-year]');
  if (tr && !e.target.closest('a')) { location.hash = '#/chronicle/' + tr.dataset.year; return; }
  const b = e.target.closest('[data-act]');
  if (!b || !world) return;
  const act = b.dataset.act;
  if (act === 'resolve') resolveItem(world, +b.dataset.id, b.dataset.choice, 'you');
  else if (act === 'invite') inviteBrand(world, b.dataset.brand);
  else if (act === 'expel') { if (!confirm('Stop this maker from racing?')) return; expelBrand(world, b.dataset.brand); }
  else if (act === 'reg-reset') { world.regs.overridden = {}; }
  else return;
  autosave(); renderAll();
}

function onViewChange(e) {
  const t = e.target;
  const act = t.dataset && t.dataset.act;
  if (!act || !world) return;
  if (act === 'gov-personality') world.governor.personality = t.value;
  else if (act === 'gov-mode') { world.governor.mode = t.value; world.governor.manual = {}; }
  else if (act === 'gov-kind') { world.governor.manual = world.governor.manual || {}; world.governor.manual[t.dataset.kind] = t.checked; }
  else if (act === 'techban') setTechRule(world, t.dataset.id, t.value);
  else if (act === 'reg') {
    let v; try { v = JSON.parse(t.value); } catch (err) { return; }
    setRegulation(world, t.dataset.key, v);
  } else return;
  autosave(); renderAll();
}

// ---------------------------------------------------------------- wiring

async function init() {
  initThemePicker();
  applyTheme();
  $('btn-new').onclick = () => {
    if (world && !confirm('Start a new series? Unsaved progress in this one is kept only in the automatic browser copy.')) return;
    $('welcome').hidden = false; $('game').hidden = true; token++; busy = false;
  };
  $('btn-start').onclick = newSeries;
  $('seed').addEventListener('keydown', (e) => { if (e.key === 'Enter') newSeries(); });
  $('btn-save').onclick = downloadSave;
  $('btn-load').onclick = () => $('file-load').click();
  $('file-load').onchange = (e) => { if (e.target.files[0]) loadFile(e.target.files[0]); e.target.value = ''; };
  $('btn-device').onclick = () => {
    const n = prompt('Name this computer (for example LAPTOP-9RGEIGTE). Saves remember where they were last opened.', device());
    if (n !== null) { store.set('msc.device', n.trim()); if (world) renderAll(); }
  };
  $('follow').onchange = (e) => { followDriver = +e.target.value; };
  $('btn-watch1').onclick = () => watch(1);
  $('btn-watch2').onclick = () => watch(2);
  $('btn-watch3').onclick = () => watch(3);
  $('btn-skip').onclick = instant;
  $('btn-season').onclick = runRestOfSeason;
  $('btn-next-year').onclick = nextYear;
  $('btn-auto').onclick = autopilot;
  $('btn-pause').onclick = () => {
    // a watched race pauses and resumes; a season or autopilot run stops after the current round
    if (runMode === 'batch') abort = true; else paused = !paused;
    setButtons();
  };
  $('view').addEventListener('click', onViewClick);
  $('view').addEventListener('change', onViewChange);

  const saved = await loadAutosave();
  if (saved) {
    try {
      const w = deserialize(saved, device());
      const box = $('resume');
      box.innerHTML = `Automatic copy found: ${esc(w.meta.name || 'series')}, ${w.year}, round ${w.season.round} of ${w.season.calendar.length}. <button id="btn-resume">Resume it</button>`;
      $('btn-resume').onclick = () => setWorld(w);
    } catch (e) { /* ignore a bad automatic copy */ }
  }
}
init();
