// Text recaps: used by the headless script, the browser page and the tests.

import { TRACK_BY_ID } from './data/tracks.js';
import { driverById, entryById, teamById, brandById } from './world.js';

export function formatTime(sec) {
  if (sec === null || sec === undefined) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec - h * 3600 - m * 60;
  return `${h}:${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`;
}

export function formatGap(sec) {
  if (!sec) return '';
  if (sec < 60) return '+' + sec.toFixed(1) + 's';
  const m = Math.floor(sec / 60);
  return `+${m}m${String(Math.round(sec - m * 60)).padStart(2, '0')}s`;
}

export function entryLabel(world, entryId) {
  const e = entryById(world, entryId);
  const d = driverById(world, e.driverId);
  return `#${e.number} ${d.name}`;
}

export function entryTeamName(world, entryId) {
  const e = entryById(world, entryId);
  return teamById(world, e.teamId).name;
}

// Driver name as it was on the day: classification rows carry the driver id.
export function rowLabel(world, row) {
  const d = driverById(world, row.driverId);
  return `#${row.number} ${d ? d.name : '?'}`;
}

export function raceRecap(world, summary) {
  const T = TRACK_BY_ID[summary.trackId];
  const lines = [];
  lines.push(`Round ${summary.round + 1}: ${T.name}${summary.laps ? ', ' + summary.laps + ' laps' : ''}${summary.distanceKm ? ' (' + summary.distanceKm + ' km)' : ''}` + (summary.rain ? `, rain from lap ${summary.rain.start} to ${summary.rain.end}` : ', dry'));
  const pq = summary.prequal || { failed: [], exempt: [] };
  if (summary.prequal) lines.push(`Pre-qualifying: ${pq.exempt.length} exempt, ${pq.failed.length} failed to qualify.`);
  const winner = summary.classification.find((r) => r.pos === 1);
  if (winner) {
    const team = teamById(world, winner.teamId);
    const brand = brandById(world, winner.brandId);
    lines.push(`Winner: ${rowLabel(world, winner)} (${team.name}, ${brand.name}) in ${formatTime(winner.time)}${winner.time ? '' : ' (retired in the lead on distance)'}.`);
  }
  lines.push(`${summary.finishers} of ${summary.starters} cars were running at the finish.`);
  for (const r of summary.classification.filter((x) => x.pos && x.pos <= 6)) {
    lines.push(`  ${String(r.pos).padStart(2)}. ${rowLabel(world, r).padEnd(30)} ${r.status === 'Finished' ? formatTime(r.time) : r.status === 'DNF' ? 'DNF: ' + r.reason : r.status}${r.points ? '  (' + r.points + ' pts)' : ''}`);
  }
  const outs = summary.classification.filter((r) => r.status === 'DNF');
  if (outs.length) lines.push('Retirements: ' + outs.map((r) => `${rowLabel(world, r)} (lap ${r.outLap}, ${r.reason})`).join('; '));
  return lines;
}

export function standingsLines(world, rows, label) {
  const lines = [label];
  rows.slice(0, 10).forEach((r, i) => lines.push(`  ${String(i + 1).padStart(2)}. ${label === 'Drivers' ? driverById(world, r.id).name : label === 'Makers' ? brandById(world, r.id).name : '#' + entryById(world, r.id).number + ' ' + teamById(world, entryById(world, r.id).teamId).name}  ${r.pts} pts, ${r.wins} wins`));
  return lines;
}
