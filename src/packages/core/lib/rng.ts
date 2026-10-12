/** A deterministic, seedable random source. */
export type Rng = {
  /** The next value in [0, 1). */
  next(): number;
  /** The next integer in [0, max). */
  int(max: number): number;
};

/**
 * Mulberry32, a small, fast, well-distributed 32-bit PRNG. The core uses it
 * only to break ties between equally good Frightened directions, so the same
 * seed and intent sequence still reproduce the same trace.
 */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (max: number) => Math.floor(next() * max),
  };
}
