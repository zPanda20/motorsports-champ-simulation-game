// Seeded, labelled random streams.
//
// Every concern (a race, a season's weather, one step of world creation) gets its
// own stream, derived from the save seed plus a list of labels. A stream never
// depends on how much any other stream has been used, so results do not change
// when code is reordered, when a save is loaded, or when a race is watched at a
// different speed.
//
// Determinism rule for the whole engine: only + - * / Math.sqrt Math.floor and
// friends are used on numbers. No Math.pow / exp / log / sin / cos, because those
// can differ in the last digit between browsers and Node.

function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function sfc32(a, b, c, d) {
  return function () {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export function makeRng(seed, ...labels) {
  const key = String(seed) + '|' + labels.join('/');
  const g = xmur3(key);
  const f = sfc32(g(), g(), g(), g());
  for (let i = 0; i < 12; i++) f();

  const rng = {
    key,
    next: f,
    float(a = 0, b = 1) { return a + (b - a) * f(); },
    // inclusive integer range
    int(a, b) { return a + Math.floor(f() * (b - a + 1)); },
    chance(p) { return f() < p; },
    pick(arr) { return arr[Math.floor(f() * arr.length)]; },
    // approx normal (Irwin-Hall, 12 uniforms): no log/cos needed, same everywhere
    gauss(mean = 0, sd = 1) {
      let s = 0;
      for (let i = 0; i < 12; i++) s += f();
      return mean + (s - 6) * sd;
    },
    // items: array; w: item => weight
    weighted(items, w = (x) => x.w) {
      let total = 0;
      for (const it of items) total += w(it);
      let r = f() * total;
      for (const it of items) {
        r -= w(it);
        if (r < 0) return it;
      }
      return items[items.length - 1];
    },
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(f() * (i + 1));
        const t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    },
    fork(...more) { return makeRng(seed, ...labels, ...more); },
  };
  return rng;
}

export const clamp = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);
export const round1 = (x) => Math.round(x * 10) / 10;
export const round2 = (x) => Math.round(x * 100) / 100;

// Stable string hash (used by tests to compare whole results).
export function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
