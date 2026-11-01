// Browser front end: a thin layer over the engine. All simulation lives in ./engine.

import { createWorld, driverById, entryById, teamById, brandById } from './engine/world.js';
import {
  prepareRound, applyRoundResult, runRound, entryStandings, driverStandings, brandStandings, advanceYear, raceGenerator,
} from './engine/season.js';
import { serialize, deserialize } from './engine/save.js';
import { TRACK_BY_ID } from './engine/data/tracks.js';
import { eraFor } from './engine/data/eras.js';
import { statsAt, STAT_KEYS, STAT_LABELS, ageAt } from './engine/drivers.js';
import { formatTime, formatGap, raceRecap } from './engine/recap.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let world = null;
let busy = false;       // a race is being watched or autopilot is running
let paused = false;
let abort = false;
let runMode = '';       // 'watch' (pausable) or 'batch' (stoppable)
let token = 0;          // bumps when the world is replaced so old loops stop

const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
};
const device = () => store.get('msc.device') || '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- start / save / load

function setWorld(w) {
  token++;
  world = w;
  busy = false; paused = false; abort = false;
  $('welcome').hidden = true;
  $('game').hidden = false;
  $('btn-save').disabled = false;
  clearRaceView();
  renderAll();
  autosave();
}

function autosave() {
  if (!world) return;
  store.set('msc.autosave', serialize(world, device()));
}

function newSeries() {
  const seed = $('seed').value.trim() || String(Math.floor(Math.random() * 1e9));
  setWorld(createWorld({ seed }));
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

// ---------------------------------------------------------------- rendering

function driverName(id) { const d = driverById(world, id); return d ? d.name : '?'; }
function teamName(id) { return teamById(world, id).name; }

function renderAll() {
  if (!world) return;
  const era = eraFor(world.year);
  const s = world.season;
  $('status').textContent = `${world.year} · ${era.name} · ` + (s.done ? 'season complete' : `round ${s.round + 1} of ${s.calendar.length}`) + (device() ? ` · ${device()}` : '');
  renderRaceHeader();
  renderStandings();
  renderEntries();
  renderResults();
  renderChronicle();
  renderLastRace();
  setButtons();
}

function setButtons() {
  const s = world.season;
  const can = !busy && !s.done;
  for (const id of ['btn-watch1', 'btn-watch2', 'btn-watch3', 'btn-skip', 'btn-season']) $(id).disabled = !can;
  $('btn-next-year').hidden = !s.done;
  $('btn-next-year').disabled = busy;
  $('btn-auto').disabled = busy;
  $('years-n').disabled = busy;
  $('btn-pause').disabled = !busy;
  $('btn-pause').textContent = busy && runMode === 'batch' ? 'Stop' : paused ? 'Resume' : 'Pause';
  $('btn-new').disabled = false;
}

function renderRaceHeader() {
  const s = world.season;
  if (s.done) {
    const ds = driverStandings(world);
    $('race-title').textContent = `${world.year} season complete`;
    $('race-sub').textContent = ds[0] ? `Champion: ${driverName(ds[0].id)} with ${ds[0].pts} points. Start the next season when ready.` : '';
    return;
  }
  const T = TRACK_BY_ID[s.calendar[s.round]];
  const laps = Math.max(T.minLaps || world.regs.minLaps, Math.round(world.regs.raceKm / T.lengthKm));
  $('race-title').textContent = `Round ${s.round + 1}: ${T.name}`;
  $('race-sub').textContent = `${laps} laps · ${(laps * T.lengthKm).toFixed(0)} km · ${T.kind} · ${T.country}` + (s.round === 0 ? ' · everyone pre-qualifies' : ` · top ${world.regs.exemptTop} entries are exempt from pre-qualifying`);
}

function table(el, head, rows, cls) {
  el.innerHTML = '<thead><tr>' + head.map((h) => `<th class="${h.num ? 'num' : ''}">${esc(h.t || h)}</th>`).join('') + '</tr></thead><tbody>' +
    rows.map((r) => `<tr class="${r.cls || ''}" ${r.attr || ''}>` + r.cells.map((c, i) => `<td class="${head[i] && head[i].num ? 'num' : ''}">${c}</td>`).join('') + '</tr>').join('') + '</tbody>';
  void cls;
}

function renderStandings() {
  const dr = driverStandings(world).slice(0, 16);
  table($('st-drivers'), ['#', 'Driver', { t: 'Pts', num: 1 }, { t: 'W', num: 1 }],
    dr.map((r, i) => ({ cells: [i + 1, esc(driverName(r.id)), r.pts, r.wins] })));
  const en = entryStandings(world).slice(0, 18);
  table($('st-entries'), ['#', 'Entry', { t: 'Pts', num: 1 }, { t: 'W', num: 1 }],
    en.map((r, i) => { const e = entryById(world, r.id); return { cells: [i + 1, `#${e.number} ${esc(teamName(e.teamId))}${e.type === 'partial' ? '<span class="tag">part</span>' : ''}`, r.pts, r.wins] }; }));
  const br = brandStandings(world).slice(0, 12);
  table($('st-brands'), ['#', 'Maker', { t: 'Pts', num: 1 }, { t: 'W', num: 1 }],
    br.map((r, i) => ({ cells: [i + 1, esc(brandById(world, r.id).name), r.pts, r.wins] })));
}

function styleLabel(v) { return v < -0.35 ? 'prefers understeer' : v > 0.35 ? 'prefers oversteer' : 'neutral'; }

function renderEntries() {
  const standing = {};
  entryStandings(world).forEach((r, i) => { standing[r.id] = i + 1; });
  const rows = world.entries.map((e) => {
    const d = driverById(world, e.driverId);
    const t = teamById(world, e.teamId);
    const b = brandById(world, t.brandId);
    return {
      cls: 'click', attr: `data-driver="${d.id}"`,
      cells: [e.number, esc(t.name) + (t.kind === 'privateer' ? ` <span class="small">(${esc(b.name)} customer)</span>` : ''),
        e.type === 'partial' ? 'part-season' : 'full', esc(d.name) + ` <span class="small">${ageAt(d, world.year)}</span>`,
        e.car.engine.power.toFixed(0), e.car.chassis.handling.toFixed(0), e.car.fit, e.car.chassis.weightKg, standing[e.id] || '-'],
    };
  });
  table($('entry-table'), ['No.', 'Team', 'Entry', 'Driver', { t: 'Power', num: 1 }, { t: 'Handling', num: 1 }, { t: 'Fit', num: 1 }, { t: 'kg', num: 1 }, { t: 'Champ.', num: 1 }], rows);
  for (const tr of $('entry-table').querySelectorAll('tr[data-driver]')) tr.onclick = () => showDriver(+tr.dataset.driver);
}

function showDriver(id) {
  const d = driverById(world, id);
  const s = statsAt(d, world.year);
  const card = $('driver-card');
  card.hidden = false;
  card.innerHTML = `<h3>${esc(d.name)}</h3><div class="small">${esc(d.nat)} · born ${d.birthYear} (age ${ageAt(d, world.year)}) · ${styleLabel(d.style)} · ${d.starts} starts, ${d.wins} wins, ${d.titles} titles</div>` +
    '<table class="bars"><tbody>' + STAT_KEYS.map((k) => `<tr><td>${STAT_LABELS[k]}</td><td class="num">${s[k]}</td><td><span class="bar" style="width:${s[k] * 2.2}px"></span></td></tr>`).join('') + '</tbody></table>' +
    '<div class="small">Potential is hidden. It shows through results over the years.</div>';
}

function renderResults() {
  const s = world.season;
  const rows = s.calendar.map((id, i) => {
    const T = TRACK_BY_ID[id];
    const r = s.results[i];
    let win = '', fin = '';
    if (r) { const w = r.classification.find((x) => x.pos === 1); win = w ? esc(driverName(w.driverId)) : '-'; fin = `${r.finishers}/${r.starters}`; }
    return { cells: [i + 1, esc(T.name), T.country, r ? r.laps : '', win, fin] };
  });
  table($('cal-table'), ['Rd', 'Venue', 'Ctry', { t: 'Laps', num: 1 }, 'Winner', { t: 'Finished', num: 1 }], rows);
  $('reports').innerHTML = s.results.length ? s.results.slice().reverse().map((r) => `<details><summary>Round ${r.round + 1}: ${esc(TRACK_BY_ID[r.trackId].name)}</summary><pre class="recap">${esc(raceRecap(world, r).join('\n'))}</pre></details>`).join('') : '<div class="small">No races yet.</div>';
}

function renderChronicle() {
  const rows = world.history.seasons.slice().reverse().map((h) => ({ cells: [h.year, esc(h.champion ? h.champion.name : '-'), h.champion ? h.champion.pts : '', esc(h.championBrand ? h.championBrand.name : '-')] }));
  table($('champions'), ['Year', 'Champion', { t: 'Pts', num: 1 }, 'Maker'], rows);
  const kids = world.drivers.filter((d) => d.status === 'active' && d.birthYear > world.year - 18 && d.birthYear <= world.year + 3).slice(0, 60);
  table($('cohort'), ['Name', 'Nation', 'Born', 'Of age'], kids.map((d) => ({ cells: [esc(d.name), d.nat, d.birthYear, d.birthYear + 18] })));
  const r = world.regs;
  $('regs').innerHTML = `Scoring: top ${r.scoring.length} score (${r.scoring.join(', ')}). Entries per team: up to ${r.entries.full} full-season plus ${r.entries.partial} part-season. Grid ${r.gridCap} cars. Top ${r.exemptTop} full-season entries skip pre-qualifying. Race distance about ${r.raceKm} km. Chassis supply: ${r.chassisSupply}. Common ownership: ${r.commonOwnership}.`;
}

function renderLastRace() {
  const s = world.season;
  const r = s.results[s.results.length - 1];
  $('last-race').hidden = !r;
  if (!r) return;
  $('last-title').textContent = `Round ${r.round + 1} result: ${TRACK_BY_ID[r.trackId].name}`;
  table($('classification'), ['Pos', 'No.', 'Driver', 'Team', { t: 'Laps', num: 1 }, { t: 'Time / status', num: 1 }, { t: 'Pts', num: 1 }],
    r.classification.map((x) => ({
      cls: x.status === 'DNF' ? 'out' : '',
      cells: [x.pos || '-', x.number, esc(driverName(x.driverId)), esc(teamName(x.teamId)), x.laps,
        x.status === 'Finished' ? formatTime(x.time) : x.status === 'DNF' ? `lap ${x.outLap}: ${esc(x.reason)}` : x.status, x.points || ''],
    })));
  $('last-retire').textContent = r.fastest ? `Fastest lap: ${esc(driverName(entryById(world, r.fastest.entryId).driverId))}, ${formatTime(r.fastest.time).replace(/^0:/, '')} on lap ${r.fastest.lap}.` : '';
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

function renderTiming(step, info) {
  const rows = step.order.map((o) => ({
    cells: [o.pos, o.number, esc(info[o.id].driverName), esc(info[o.id].team), o.pos === 1 ? '' : formatGap(o.gap), o.pits, Math.round((1 - Math.min(1, o.tyreWear)) * 100) + '%'],
  }));
  for (const id of step.out) rows.push({ cls: 'out', cells: ['', info[id].number, esc(info[id].driverName), esc(info[id].team), 'out', '', ''] });
  table($('timing'), ['P', 'No.', 'Driver', 'Team', { t: 'Gap', num: 1 }, { t: 'Stops', num: 1 }, { t: 'Tyres', num: 1 }], rows);
  $('lapcount').textContent = `lap ${step.lap} of ${step.laps}` + (step.rain ? ' · raining' : '');
}

const NOTABLE = new Set(['out', 'repair', 'limp', 'damage', 'pit']);

async function watch(mode) {
  if (busy || world.season.done) return;
  const my = token;
  busy = true; runMode = 'watch'; paused = false; abort = false; setButtons();
  clearRaceView();
  const prep = prepareRound(world);
  const info = {};
  for (const st of prep.setup.starters) info[st.entryId] = { number: st.number, driverName: st.driverName, team: teamName(st.teamId) };
  const gen = raceGenerator(prep.setup);
  const delay = mode === 1 ? 380 : mode === 2 ? 70 : 0;
  let result = null;
  const label = (id) => `#${info[id].number} ${info[id].driverName}`;

  for (;;) {
    if (my !== token) return;
    const { value: step, done } = gen.next();
    if (done) break;
    if (step.type === 'start') {
      const T = step.track;
      feed(`${T.name}: ${step.laps} laps. ${prep.prequal.failed.length} failed to pre-qualify.` + (step.rain ? ' Rain is forecast.' : ''), 'hd');
      feed('Grid: ' + step.grid.map((id, i) => `${i + 1}. #${info[id].number}`).join('  '));
    } else if (step.type === 'lap') {
      for (const e of step.events) {
        if (e.kind === 'pass' && mode !== 1) continue;
        feed(`Lap ${e.lap}: ${label(e.id)} ${e.text}`, e.kind === 'out' ? 'out' : '');
      }
      const notable = step.events.some((e) => NOTABLE.has(e.kind));
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
  if (w) feed(`Winner: #${w.number} ${driverName(w.driverId)} (${teamName(w.teamId)})`, 'hd');
  busy = false; paused = false; abort = false;
  autosave();
  renderAll();
}

async function instant() {
  if (busy || world.season.done) return;
  runRound(world);
  clearRaceView();
  autosave();
  renderAll();
}

async function runRestOfSeason() {
  if (busy) return;
  const my = token;
  busy = true; runMode = 'batch'; abort = false; setButtons();
  while (!world.season.done && !abort && my === token) {
    runRound(world);
    $('status').textContent = `${world.year} · round ${world.season.round} of ${world.season.calendar.length} done`;
    await sleep(0);
  }
  if (my !== token) return;
  busy = false; abort = false;
  autosave(); renderAll();
}

async function autopilot() {
  if (busy) return;
  const my = token;
  const years = parseInt($('years-n').value, 10);
  busy = true; runMode = 'batch'; abort = false; setButtons();
  for (let y = 0; y < years && !abort && my === token; y++) {
    while (!world.season.done && !abort && my === token) {
      runRound(world);
      $('status').textContent = `Autopilot · ${world.year} · round ${world.season.round}`;
      await sleep(0);
    }
    if (abort || my !== token) break;
    advanceYear(world);
  }
  if (my !== token) return;
  busy = false; abort = false;
  clearRaceView(); autosave(); renderAll();
}

function nextYear() {
  if (busy || !world.season.done) return;
  advanceYear(world);
  clearRaceView();
  autosave();
  renderAll();
}

// ---------------------------------------------------------------- wiring

function showTab(name) {
  for (const b of document.querySelectorAll('#tabs button')) b.classList.toggle('on', b.dataset.tab === name);
  for (const p of document.querySelectorAll('.tabpane')) p.hidden = p.id !== 'tab-' + name;
}

function init() {
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
  for (const b of document.querySelectorAll('#tabs button')) b.onclick = () => showTab(b.dataset.tab);

  const saved = store.get('msc.autosave');
  if (saved) {
    try {
      const w = deserialize(saved, device());
      const box = $('resume');
      box.innerHTML = `Automatic copy found: ${esc(w.meta.name || 'series')}, ${w.year}, round ${w.season.round} of ${w.season.calendar.length}. <button id="btn-resume">Resume it</button>`;
      $('btn-resume').onclick = () => setWorld(w);
    } catch (e) { /* ignore a bad autosave */ }
  }
}
init();
