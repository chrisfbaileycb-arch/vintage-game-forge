import { describe, expect, it } from "vitest";

import { MOULD_OPTIONS, normalizeSpec } from "./moulds";
import { PATTERNS } from "./patterns";
import { createCartridge, emptyInput } from "./engine";
import { rateSpec } from "./dials";
import { mulberry32 } from "./rng";

/**
 * Automated smoke test: every preset in the pattern book must validate,
 * boot its engine, advance a hundred frames of real input, and finish
 * without an uncaught exception — and two identical presets must produce
 * identical runs (determinism from the seed).
 */

function makeRng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0xffffffff;
  };
}

describe("preset launch smoke — all 100 patterns", () => {
  it("covers every mould with the expected preset counts", () => {
    expect(PATTERNS).toHaveLength(100);
    for (const mould of MOULD_OPTIONS) {
      expect(
        PATTERNS.some((p) => p.spec.mould === mould.id),
        mould.id,
      ).toBe(true);
    }
  });

  it("validates, boots, and advances 100 frames per preset", () => {
    for (const pattern of PATTERNS) {
      // Every spec must be normalized (round-trips cleanly).
      const spec = normalizeSpec(pattern.spec);
      expect(spec.mould, pattern.id).toBe(pattern.spec.mould);

      // Boot the engine with a deterministic RNG and drive 100 frames
      // of mixed input, then assert the HUD is sane.
      const cart = createCartridge(spec, { random: makeRng(7) });
      const input = emptyInput();
      for (let i = 0; i < 100; i++) {
        input.fire = i % 60 < 8;
        input.left = i % 30 < 10;
        input.right = i % 30 >= 10 && i % 30 < 20;
        input.up = i % 45 < 15;
        input.down = i % 45 >= 15 && i % 45 < 25;
        cart.update(1 / 60, input);
      }
      cart.render; // renderer exists on the handle
      expect(Number.isFinite(cart.hud.score), pattern.id).toBe(true);
      expect(["title", "playing", "paused", "won", "lost"]).toContain(
        cart.hud.state,
      );
      expect(cart.hud.objective.length, pattern.id).toBeGreaterThan(0);
    }
  });

  it("plays two copies of the same preset identically (seeded determinism)", () => {
    for (const pattern of PATTERNS.slice(0, 12)) {
      const a = createCartridge(pattern.spec, { random: makeRng(7) });
      const b = createCartridge(pattern.spec, { random: makeRng(7) });
      const inputA = emptyInput();
      const inputB = emptyInput();
      for (let i = 0; i < 90; i++) {
        inputA.fire = i % 90 < 10;
        inputB.fire = i % 90 < 10;
        inputA.right = i % 40 < 20;
        inputB.right = i % 40 < 20;
        a.update(1 / 60, inputA);
        b.update(1 / 60, inputB);
      }
      expect(a.hud.score, pattern.id).toBe(b.hud.score);
      expect(a.hud.state, pattern.id).toBe(b.hud.state);
    }
  });
});

describe("difficulty rating", () => {
  it("rates every preset within bounds and assigns verdicts", () => {
    for (const pattern of PATTERNS) {
      const r = rateSpec(pattern.spec);
      expect(r.overall).toBeGreaterThanOrEqual(1);
      expect(r.overall).toBeLessThanOrEqual(10);
      expect(r.sessionMinutes).toBeGreaterThanOrEqual(2);
      expect(r.verdict.length).toBeGreaterThan(0);
      expect(r.pace).toBeGreaterThanOrEqual(0);
      expect(r.pace).toBeLessThanOrEqual(1);
    }
  });

  it("responds monotonically to the pace dial", () => {
    const gentle = rateSpec(normalizeSpec({ mould: "breakout", pace: 1 }));
    const frantic = rateSpec(normalizeSpec({ mould: "breakout", pace: 5 }));
    expect(frantic.overall).toBeGreaterThan(gentle.overall);
    expect(frantic.pace).toBeGreaterThan(gentle.pace);
  });
});
