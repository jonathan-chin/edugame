/**
 * Seeded, deterministic pseudo-random number generator.
 *
 * The same seed string always produces the same stream of values, which is what
 * makes an entire game session reproducible: given the seed recorded in a session's
 * `*.meta.json` manifest, every generated question can be recreated exactly.
 *
 * Implementation: xmur3 to hash the string seed into a 32-bit state, then mulberry32
 * as the core generator. Both are small, well-known, and fast — no crypto strength is
 * needed or wanted here (we specifically want reproducibility, not unpredictability).
 */

export interface RNG {
  /** A float in [0, 1). */
  next(): number;
  /** An integer in [min, max], inclusive on both ends. */
  int(min: number, max: number): number;
  /** A float in [min, max). */
  float(min: number, max: number): number;
  /** A uniformly chosen element of `arr`. Throws on an empty array. */
  pick<T>(arr: readonly T[]): T;
  /** True with probability `p` (default 0.5). */
  bool(p?: number): boolean;
  /** A new array with the elements of `arr` shuffled (Fisher–Yates). */
  shuffle<T>(arr: readonly T[]): T[];
  /** A sample from a normal distribution (Box–Muller). */
  normal(mean?: number, stdev?: number): number;
  /** A short, stream-derived id string. Deterministic given the seed. */
  id(prefix?: string): string;
}

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: string): RNG {
  const seedFn = xmur3(seed);
  const core = mulberry32(seedFn());

  const rng: RNG = {
    next: () => core(),
    int: (min, max) => Math.floor(core() * (max - min + 1)) + min,
    float: (min, max) => core() * (max - min) + min,
    pick: (arr) => {
      if (arr.length === 0) throw new Error("rng.pick() called on an empty array");
      return arr[Math.floor(core() * arr.length)]!;
    },
    bool: (p = 0.5) => core() < p,
    shuffle: (arr) => {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(core() * (i + 1));
        [out[i], out[j]] = [out[j]!, out[i]!];
      }
      return out;
    },
    normal: (mean = 0, stdev = 1) => {
      // Box–Muller transform. Guard u1 away from 0 to avoid log(0).
      let u1 = core();
      const u2 = core();
      if (u1 < 1e-12) u1 = 1e-12;
      const mag = Math.sqrt(-2.0 * Math.log(u1));
      return mean + stdev * mag * Math.cos(2.0 * Math.PI * u2);
    },
    id: (prefix = "q") => {
      const n = Math.floor(core() * 0xffffffff).toString(36);
      const m = Math.floor(core() * 0xffffffff).toString(36);
      return `${prefix}_${n}${m}`;
    },
  };

  return rng;
}
