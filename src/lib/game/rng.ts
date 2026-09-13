/**
 * Seeded pseudo-random number generation for deterministic cartridges.
 *
 * mulberry32 is a tiny, fast PRNG with good statistical quality for games.
 * A cartridge spec carries a 32-bit seed; the same seed + dials always
 * produces the same run — same maze, same spawn order, same boulder falls.
 */

/** Create a deterministic RandomSource from a 32-bit seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0xffffffff;
  };
}

/** Derive a stable 32-bit seed from an arbitrary string (e.g. a preset id). */
export function seedFromString(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A fresh random 32-bit seed for new presses. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}
