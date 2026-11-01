// Lap-by-lap race simulation.
//
// raceGenerator(setup) yields one step per lap and finishes with the result. A
// player watching at any speed just consumes the same generator, so the result is
// identical however the race is watched. simulateRace() drains it.

import { makeRng, clamp, round1 } from './rng.js';
import { PARAMS as P } from './params.js';
import { COMPONENTS, TYRE_FAILURES } from './data/components.js';
import { eraSpeedFactor, eraReliabilityFactor, eraPitFactor, eraRepairFactor, eraSpreadFactor } from './data/eras.js';

export function lapsFor(track, regs) {
  const n = Math.round(regs.raceKm / track.lengthKm);
  return Math.max(track.minLaps || regs.minLaps || 5, n);
}

export function baseLapSeconds(track, year) {
  return (track.lengthKm / (track.speedKmh * eraSpeedFactor(year))) * 3600;
}

// ---- pace ----

function driverIndex(d, T) {
  const wB = T.braking, wH = T.handling, wP = T.power;
  const parts = [
    [d.braking, wB],
    [d.cornering, wH * 0.65],
    [d.throttle, wH * 0.35 + wP * 0.4],
    [d.smoothness, wP * 0.6 + 0.1],
  ];
  let s = 0, w = 0;
  for (const [v, k] of parts) { s += v * k; w += k; }
  const raw = s / w;
  // the very best are only so much faster than the very good: diminishing returns above 72
  return raw > 72 ? 72 + (raw - 72) * 0.6 : raw;
}

function carIndex(car, T) {
  const sum = T.power + T.handling + T.braking;
  return (T.power * car.engine.power + T.handling * car.chassis.handling + T.braking * car.chassis.brakes) / sum;
}

// Pace index for one starter: ~50 = average. `fuelKm`, `tyreWear`, `rain` (0..1) are the live inputs.
export function paceIndex(s, T, fuelKm, tyreWear, rain) {
  const car = s.car;
  const d = s.stats;
  let idx = P.pace.carShare * (carIndex(car, T) + car.dev) + (1 - P.pace.carShare) * driverIndex(d, T);
  const kg = car.chassis.weightKg + fuelKm * P.pace.fuelKgPerKm;
  idx -= ((kg - P.pace.refWeightKg) / P.pace.refWeightKg) * 100 * P.pace.weightCoef * 0.1;
  idx += (car.fit - 50) * P.pace.fitW;
  idx += P.pace.styleW * (0.5 - Math.abs(s.style - car.balance)) * 2 * 0.5;
  idx += (s.tyre.grip - 50) * P.pace.tyreGripW;
  idx -= P.pace.tyreWearLoss * tyreWear * tyreWear;
  if (rain > 0) {
    const cope = clamp((d.adaptability * 0.55 + s.tyre.wet * 0.45) / 100, 0, 1);
    idx -= rain * P.pace.wetLoss * (1 - cope);
  }
  return idx;
}

// A single flying lap used by qualifying and pre-qualifying (no wear, light fuel).
export function qualifyingTime(s, T, year, rng, noise, rain) {
  const idx = paceIndex(s, T, 20, 0, rain || 0);
  const t = baseLapSeconds(T, year) / (1 + (idx - 50) * P.pace.k * eraSpreadFactor(year));
  return t * (1 + rng.gauss(0, noise * (1.4 - s.stats.consistency / 100))) + (rng.chance(clamp((100 - s.stats.focus) * 0.002, 0.02, 0.2)) ? rng.float(0.5, 4) : 0);
}

// ---- race ----

function newCar(s, i, setup) {
  const T = setup.track;
  const comps = {};
  for (const c of COMPONENTS) comps[c.id] = { km: 0, rating: s.car.comps[c.id], fails: 0 };
  const q = (s.staff.raceEngineer.rating * (s.control === 'engineer' ? 1 : 0.6) + s.staff.principal.rating * (s.control === 'principal' ? 1 : 0.6) + s.stats.focus * (s.control === 'driver' ? 1 : 0.4)) / 1.6;
  const quality = clamp(q / 100, 0.1, 1);
  return {
    s, id: s.entryId, pos0: i,
    reliefView: s.relief ? { ...s, stats: s.relief.stats } : null,
    cum: i * P.start.gridGap,
    laps: 0,
    out: null,
    limp: 0, limpWhy: null,
    comps,
    fuel: Math.min(s.car.tankKm, setup.totalKm + T.lengthKm * 0.5),
    tyreWear: 0,
    pits: 0, stops: [],
    quality,
    tyreThresh: clamp(P.tyre.changeWear + (0.5 - quality) * P.tyre.strategyNoise + 0, 0.5, 1.0),
    fuelMargin: P.pit.fuelMarginKm * T.lengthKm * (1.6 - quality),
    mech: 1 - (s.staff.chiefMechanic.rating - 50) / 50 * P.pit.mechanicSpread,
    lastLap: 0, bestLap: 1e9,
    mistakes: 0, passes: 0,
  };
}

function pickMode(modes, rng) { return rng.weighted(modes, (m) => m.w); }

export function* raceGenerator(setup) {
  const { seed, year, round, track: T, starters } = setup;
  const rng = makeRng(seed, 'race', year, round, 'sim');
  const wrng = makeRng(seed, 'race', year, round, 'weather');
  const laps = setup.laps;
  const len = T.lengthKm;
  const totalKm = laps * len;
  const baseLap = baseLapSeconds(T, year) / (setup.speedMult || 1);
  const relEra = eraReliabilityFactor(year) * (setup.relMult || 1);
  const kEra = P.pace.k * eraSpreadFactor(year);
  const scMode = setup.regs.safetyCar || 'none';
  const quiet = !!setup.quiet;
  const swapLap = setup.endurance ? Math.max(2, Math.floor(laps / 2)) : 0;
  let sc = null, scCount = 0;
  const pitF = eraPitFactor(year), repF = eraRepairFactor(year);

  // weather: optional rain spell, decided up front so every speed agrees
  const rain = { start: 0, end: 0, level: 0 };
  if (wrng.chance(T.wetChance)) {
    const frac = wrng.float(...P.weather.rainFracRange);
    rain.start = Math.floor(wrng.float(0, 1 - frac) * laps) + 1;
    rain.end = Math.min(laps, rain.start + Math.max(2, Math.floor(frac * laps)));
    rain.level = wrng.float(0.3, 1.0);
  }
  const rainAt = (lap) => (rain.level > 0 && lap >= rain.start && lap <= rain.end ? rain.level : 0);

  const cars = starters.map((s, i) => newCar(s, i, setup));
  // start launch
  for (const c of cars) {
    c.startLoss = P.start.base + (100 - c.s.stats.throttle) * P.start.perPoint + rng.float(0, P.start.jitter);
  }

  const events = [];
  const lapOrders = [];
  let fastest = { time: 1e9, entryId: 0, lap: 0 };
  yield { type: 'start', laps, totalKm, track: T, rain: rain.level > 0 ? rain : null, grid: cars.map((c) => c.id) };

  for (let lap = 1; lap <= laps; lap++) {
    const rainNow = rainAt(lap);
    const lapEvents = [];
    const running = cars.filter((c) => !c.out);
    if (running.length === 0) break;
    const frac = (lap - 1) / laps;

    const scNow = sc && lap <= sc.until ? sc : null;
    for (const c of running) {
      const s = swapLap && lap > swapLap && c.reliefView ? c.reliefView : c.s;
      let outNow = false;
      c.dt = 0;
      c.pitted = false;

      const idx = paceIndex(s, T, c.fuel, c.tyreWear, rainNow);
      let t = baseLap / (1 + (idx - 50) * kEra);
      t *= 1 + rng.gauss(0, P.pace.noise * (1.4 - s.stats.consistency / 100));
      const stint = swapLap ? (lap <= swapLap ? (lap - 1) / swapLap : (lap - 1 - swapLap) / Math.max(1, laps - swapLap)) : frac;
      const fat = clamp((stint - 0.15) / 0.85, 0, 1) * (1 - s.stats.fitness / 100) * P.fatigue.scale;
      t *= 1 + fat * P.fatigue.pace;
      if (c.limp) t *= 1 + c.limp;
      if (lap === 1) t += c.startLoss;
      const clean = t;

      // driver mistakes
      const copeWet = 1 - clamp(s.stats.adaptability / 100, 0, 1) * 0.6;
      const pm = P.mistake.perKm * len * (1.6 - s.stats.focus / 100) * (1 + fat * P.mistake.fatigueMult) * (1 + rainNow * P.mistake.wetMult * copeWet);
      if (rng.next() < pm) {
        const kind = rng.weighted([{ k: 'off', w: P.mistake.off.w }, { k: 'spin', w: P.mistake.spin.w }, { k: 'damage', w: P.mistake.damage.w }, { k: 'crash', w: P.mistake.crash.w }], (x) => x.w).k;
        c.mistakes++;
        if (kind === 'off') {
          const loss = rng.float(...P.mistake.off.t); t += loss;
          lapEvents.push({ lap, id: c.id, kind: 'mistake', text: `runs wide, loses ${Math.round(loss)}s` });
        } else if (kind === 'spin') {
          const loss = rng.float(...P.mistake.spin.t); t += loss;
          lapEvents.push({ lap, id: c.id, kind: 'mistake', text: `spins, loses ${Math.round(loss)}s` });
        } else if (kind === 'damage') {
          c.limp = Math.max(c.limp, rng.float(...P.mistake.damage.limp));
          lapEvents.push({ lap, id: c.id, kind: 'damage', text: 'clips a barrier and carries on with damage' });
        } else {
          c.out = { lap, reason: 'accident', part: null, kind: 'accident' };
          lapEvents.push({ lap, id: c.id, kind: 'out', text: 'crashes out', part: null });
          outNow = true;
        }
      }

      // mechanical failures (first one wins this lap)
      if (!outNow) {
        for (const comp of COMPONENTS) {
          const st = c.comps[comp.id];
          const wearRate = comp.wearsWith === 'engine' ? 1.1 - s.stats.throttle / 400 : 1.25 - s.stats.smoothness / 200;
          st.km += len * wearRate;
          const wearFrac = clamp(st.km / P.rel.lifeKm, 0, 2);
          const r = st.rating / 100;
          const relMult = 4 * (1 - r) * (1 - r);
          const p = P.rel.hazardPerKm * comp.hazard * relEra * len * T.stress * relMult * (1 + P.rel.wearGain * wearFrac) * (1 + rainNow * P.rel.rainStress);
          if (rng.next() < p) {
            const mode = pickMode(comp.modes, rng);
            st.fails++;
            if (mode.sev === 'retire') {
              c.out = { lap, reason: `${comp.name}: ${mode.name}`, part: comp.id, kind: 'mechanical' };
              lapEvents.push({ lap, id: c.id, kind: 'out', text: `${comp.name.toLowerCase()}: ${mode.name}`, part: comp.id });
              outNow = true;
            } else if (mode.sev === 'limp') {
              c.limp = Math.max(c.limp, mode.limp);
              c.limpWhy = mode.name;
              lapEvents.push({ lap, id: c.id, kind: 'limp', text: `${comp.name.toLowerCase()}: ${mode.name}, running slowly`, part: comp.id });
            } else {
              const repair = rng.float(...mode.repair) * c.mech * repF;
              t += P.pit.base * pitF + repair;
              st.km *= 0.3;
              c.pits++;
              c.pitted = true;
              c.stops.push({ lap, why: mode.name, sec: Math.round(P.pit.base * pitF + repair) });
              lapEvents.push({ lap, id: c.id, kind: 'repair', text: `${comp.name.toLowerCase()}: ${mode.name}, ${Math.round(repair)}s repair`, part: comp.id });
            }
            break;
          }
        }
      }

      // tyres
      if (!outNow) {
        const wearIn = len / (P.tyre.lifeKm * (0.6 + s.tyre.durability / 100 * 0.8)) * (1.2 - s.stats.smoothness / 250);
        c.tyreWear += wearIn;
        const pp = P.tyre.punctureBase * Math.max(relEra, 0.2) * len * (T.roughness + rainNow * P.tyre.rainRough) * (0.4 + 2.2 * c.tyreWear * c.tyreWear) / (0.5 + s.tyre.puncture / 100);
        if (rng.next() < pp) {
          const mode = rng.weighted(TYRE_FAILURES, (m) => m.w);
          const repair = rng.float(...mode.repair) * repF;
          t += repair;
          c.tyreWear = 0;
          c.pits++;
          c.stops.push({ lap, why: mode.name, sec: Math.round(repair) });
          lapEvents.push({ lap, id: c.id, kind: 'repair', text: `${mode.name}, ${Math.round(repair)}s to change the wheel`, part: 'tyres' });
        }
      }

      // fuel and scheduled stops
      if (!outNow) {
        c.fuel -= len;
        if (c.fuel < -0.001) {
          t += P.pit.outOfFuelSec;
          c.fuel = Math.min(s.car.tankKm, totalKm - lap * len + len * 0.5 + len);
          c.stops.push({ lap, why: 'ran dry', sec: P.pit.outOfFuelSec });
          c.pits++;
          lapEvents.push({ lap, id: c.id, kind: 'repair', text: 'runs out of fuel and has to be refilled', part: 'fuel' });
          c.tyreWear += 0;
        } else if (lap < laps) {
          const remaining = totalKm - lap * len;
          const needFuel = c.fuel < remaining && c.fuel < len + c.fuelMargin;
          const wornOut = c.tyreWear >= c.tyreThresh && remaining > (1 - c.tyreWear) * P.tyre.lifeKm * 0.8;
          if (needFuel || wornOut) {
            let sec = P.pit.base;
            let did = [];
            if (needFuel) {
              const add = Math.max(0, Math.min(s.car.tankKm - c.fuel, remaining + len * 0.3 - c.fuel));
              sec += add / P.pit.refuelKmPerSec;
              c.fuel += add;
              did.push('fuel');
            }
            if (wornOut || (needFuel && c.tyreWear > 0.45 && remaining > (1 - c.tyreWear) * P.tyre.lifeKm)) {
              sec += P.pit.tyreChange;
              c.tyreWear = 0;
              did.push('tyres');
            }
            sec *= c.mech * pitF;
            t += sec;
            c.pits++;
            c.pitted = true;
            c.stops.push({ lap, why: did.join(' + '), sec: Math.round(sec) });
            lapEvents.push({ lap, id: c.id, kind: 'pit', text: `pits for ${did.join(' and ')} (${Math.round(sec)}s)` });
          }
        }
      }

      if (swapLap && lap === swapLap && c.reliefView && !outNow) {
        const sec = Math.round(22 * pitF * c.mech);
        t += sec; c.pits++; c.pitted = true;
        c.stops.push({ lap, why: 'driver change', sec });
        lapEvents.push({ lap, id: c.id, kind: 'pit', text: `driver change to ${c.s.relief.driverName} (${sec}s)` });
      }
      if (scNow && !outNow) {
        const slow = baseLap * (scNow.virtual ? 1.35 : 1.6);
        if (t < slow) t = slow;
        if (c.pitted && c.stops.length) t -= c.stops[c.stops.length - 1].sec * 0.4;
      }
      c.dt = t;
      c.clean = clean;
    }

    // order at the start of the lap decides who can hold up whom
    const alive = cars.filter((c) => !c.out);
    alive.sort((a, b) => a.cum - b.cum || a.id - b.id);
    let ahead = null;
    for (const c of alive) {
      let next = c.cum + c.dt;
      if (ahead && scNow && !scNow.virtual) {
        next = Math.max(next, ahead.next + 0.8);
      } else if (ahead && scNow) {
        next = Math.max(next, ahead.next + 0.3);
      } else if (ahead && !c.pitted && !ahead.pitted) {
        if (next < ahead.next) {
          // would pass: attempt
          const pace = (ahead.next - next) / baseLap;
          const sk = (c.s.stats.overtaking - 50) / 100;
          const pOk = clamp(P.overtake.base * T.overtake * 2 + sk * P.overtake.skillW * T.overtake + pace * P.overtake.paceW, 0.02, 0.97);
          if (rng.next() < pOk) {
            c.passes++;
            const pi = P.overtake.incident * (1.5 - c.s.stats.focus / 100) * (1.3 - c.s.stats.overtaking / 100);
            if (rng.next() < pi) {
              const loss = rng.float(...P.overtake.incidentLoss);
              next += loss;
              lapEvents.push({ lap, id: c.id, kind: 'mistake', text: `tangles while overtaking, loses ${Math.round(loss)}s` });
              if (rng.next() < P.overtake.incidentRetire) {
                c.out = { lap, reason: 'accident', part: null, kind: 'accident' };
                lapEvents.push({ lap, id: c.id, kind: 'out', text: 'retires after contact', part: null });
              }
            } else if (rng.next() < 0.18) {
              lapEvents.push({ lap, id: c.id, kind: 'pass', text: `passes #${ahead.s.number}` });
            }
          } else {
            next = ahead.next + P.overtake.gap;
          }
        } else if (next < ahead.next + P.overtake.dirtyWindow) {
          next += P.overtake.dirtyPenalty;
        }
      }
      c.next = next;
      if (!c.out) ahead = c;
    }
    for (const c of alive) {
      if (c.out) { c.laps = lap - 1; continue; }
      c.cum = c.next;
      c.laps = lap;
      c.lastLap = c.dt;
      if (!c.pitted && c.clean < c.bestLap) c.bestLap = c.clean;
      if (!c.pitted && c.clean < fastest.time) fastest = { time: c.clean, entryId: c.id, lap };
    }
    for (const c of cars) if (c.out && c.laps === 0 && c.out.lap === lap) c.laps = lap - 1;

    const order = cars.filter((c) => !c.out).sort((a, b) => a.cum - b.cum || a.id - b.id);
    // a safety car (or virtual one) follows serious incidents once the era has them
    if (scMode !== 'none' && !scNow && lap < laps - 1 && lapEvents.some((e) => e.kind === 'out' && e.part === null)) {
      const pc = scMode === 'pace' ? (scCount ? 0 : 0.35) : 0.65;
      if (rng.next() < pc) {
        const virtual = scMode === 'virtual' && rng.next() < 0.45;
        sc = { until: lap + (virtual ? rng.int(2, 3) : rng.int(2, 4)), virtual };
        scCount++;
        lapEvents.push({ lap, id: 0, kind: 'safety', text: virtual ? 'Virtual safety car deployed' : (scMode === 'pace' ? 'The pace car leads the field' : 'Safety car deployed') });
      }
    }
    if (!quiet) lapOrders.push(order.map((c) => c.id));
    for (const e of lapEvents) events.push(e);
    if (quiet) continue;
    const leaderT = order.length ? order[0].cum : 0;
    yield {
      type: 'lap', lap, laps, rain: rainNow,
      order: order.map((c, i) => ({ id: c.id, number: c.s.number, pos: i + 1, gap: round1(c.cum - leaderT), lapTime: round1(c.dt), pits: c.pits, tyreWear: Math.round(c.tyreWear * 100) / 100, fuel: Math.round(c.fuel) })),
      out: cars.filter((c) => c.out).map((c) => c.id),
      events: lapEvents,
    };
  }

  yield { type: 'finish', result: classify(setup, cars, events, lapOrders, fastest, rain, baseLap, laps) };
}

function classify(setup, cars, events, lapOrders, fastest, rain, baseLap, laps) {
  const running = cars.filter((c) => !c.out);
  running.sort((a, b) => a.cum - b.cum || a.id - b.id);
  const winnerTime = running.length ? running[0].cum : 0;
  const rows = [];
  for (const c of running) {
    const lapsDown = Math.floor((c.cum - winnerTime) / (baseLap * 1.05));
    const done = laps - lapsDown;
    rows.push({ c, laps: done, time: c.cum, finished: true });
  }
  rows.sort((a, b) => b.laps - a.laps || a.time - b.time || a.c.id - b.c.id);
  const retired = cars.filter((c) => c.out).sort((a, b) => b.laps - a.laps || b.out.lap - a.out.lap || a.id - b.id);

  const classification = [];
  const minLaps = Math.ceil(laps * 0.7);
  const scoring = setup.regs.scoring;
  let pos = 0;
  const all = [...rows.map((r) => ({ c: r.c, laps: r.laps, time: r.time, ran: true })), ...retired.map((c) => ({ c, laps: c.laps, time: null, ran: false }))];
  for (const r of all) {
    const c = r.c;
    const classified = r.ran ? r.laps >= minLaps : r.laps >= minLaps;
    let status, pts = 0;
    if (r.ran) status = r.laps >= laps ? 'Finished' : `+${laps - r.laps} lap${laps - r.laps > 1 ? 's' : ''}`;
    else status = 'DNF';
    if (classified) pos++;
    const position = classified ? pos : null;
    if (position && position <= scoring.length && (r.ran || r.laps >= minLaps)) pts = scoring[position - 1];
    if (c.s.noPoints) pts = 0;
    if (setup.endurance && pts) pts = Math.round(pts * setup.endurance.multiplier * 10) / 10;
    classification.push({
      pos: position, entryId: c.id, number: c.s.number, driverId: c.s.driverId, teamId: c.s.teamId, brandId: c.s.brandId,
      laps: r.laps, time: r.time === null ? null : round1(r.time), status,
      reason: c.out ? c.out.reason : null, part: c.out ? c.out.part : null, outLap: c.out ? c.out.lap : null,
      points: pts, pits: c.pits, grid: c.pos0 + 1, bestLap: c.bestLap < 1e8 ? round1(c.bestLap) : null,
      limp: c.limpWhy, reliefDriverId: c.s.relief ? c.s.relief.driverId : null, local: !!c.s.noPoints,
    });
  }
  // a retiree who completed enough distance is classified behind finishers: keep stable ordering
  const winner = classification.find((r) => r.pos === 1) || classification[0] || null;
  const finishers = classification.filter((r) => r.status === 'Finished' || /^\+/.test(r.status)).length;
  return {
    year: setup.year, round: setup.round, trackId: setup.track.id, laps, lengthKm: setup.track.lengthKm,
    distanceKm: Math.round(laps * setup.track.lengthKm * 10) / 10,
    rain: rain.level > 0 ? { start: rain.start, end: rain.end, level: Math.round(rain.level * 100) / 100 } : null,
    endurance: setup.endurance ? true : false,
    starters: cars.length, finishers,
    winnerEntryId: winner ? winner.entryId : null,
    winnerTime: winner && winner.time ? winner.time : null,
    fastest: fastest.entryId ? { entryId: fastest.entryId, time: round1(fastest.time), lap: fastest.lap } : null,
    classification, events, laps_order: lapOrders,
  };
}

export function simulateRace(setup) {
  let result = null;
  for (const step of raceGenerator(setup)) if (step.type === 'finish') result = step.result;
  return result;
}
