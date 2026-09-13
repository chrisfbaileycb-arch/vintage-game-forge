import { describe, expect, it } from "vitest";

import { mulberry32, randomSeed, seedFromString } from "./rng";

describe("mulberry32", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    for (let i = 0; i < 100; i++) {
      expect(a()).toBe(b());
    }
  });

  it("produces different streams for different seeds", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const seqA = Array.from({ length: 8 }, () => a());
    const seqB = Array.from({ length: 8 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it("returns values in [0, 1)", () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("handles the zero seed and full-range seeds", () => {
    const a = mulberry32(0);
    const b = mulberry32(0xffffffff);
    for (let i = 0; i < 100; i++) {
      const va = a();
      const vb = b();
      expect(va).toBeGreaterThanOrEqual(0);
      expect(va).toBeLessThan(1);
      expect(vb).toBeGreaterThanOrEqual(0);
      expect(vb).toBeLessThan(1);
    }
  });
});

describe("seedFromString", () => {
  it("is stable across calls", () => {
    expect(seedFromString("the-wall-1907")).toBe(seedFromString("the-wall-1907"));
  });

  it("differs for different strings", () => {
    expect(seedFromString("alpha")).not.toBe(seedFromString("beta"));
  });

  it("returns a valid 32-bit unsigned integer", () => {
    const seed = seedFromString("anything");
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThanOrEqual(0xffffffff);
    expect(Number.isInteger(seed)).toBe(true);
  });
});

describe("randomSeed", () => {
  it("returns valid 32-bit unsigned integers", () => {
    for (let i = 0; i < 20; i++) {
      const s = randomSeed();
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(0xffffffff);
    }
  });
});
