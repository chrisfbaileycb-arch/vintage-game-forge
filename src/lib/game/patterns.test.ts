import { describe, expect, it } from "vitest";

import { MOULD_OPTIONS } from "./moulds";
import { PATTERNS, PATTERN_COUNT, getPattern, patternsByMould } from "./patterns";

/** Expected pattern count per mould id. */
const EXPECTED_PER_MOULD: Record<string, number> = {
  breakout: 10,
  snake: 10,
  invaders: 10,
  maze: 10,
  flyer: 10,
  burrower: 10,
  scaffolding: 10,
  stacker: 15,
  crossing: 15,
};

describe("pattern book", () => {
  it("holds exactly 100 patterns", () => {
    expect(PATTERN_COUNT).toBe(100);
    expect(PATTERNS).toHaveLength(100);
  });

  it("spreads patterns across every mould at its expected count", () => {
    const byMould = patternsByMould();
    expect(byMould.size).toBe(MOULD_OPTIONS.length);
    for (const mould of MOULD_OPTIONS) {
      const entries = byMould.get(mould.id);
      expect(entries, mould.id).toBeDefined();
      expect(entries!.length).toBe(EXPECTED_PER_MOULD[mould.id]);
    }
  });

  it("gives every pattern a unique id and normalized spec", () => {
    const ids = new Set(PATTERNS.map((p) => p.id));
    expect(ids.size).toBe(100);
    for (const p of PATTERNS) {
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.blurb.length).toBeGreaterThan(0);
      expect(p.spec.title).toBe(p.name.toUpperCase().slice(0, 40));
    }
  });

  it("looks patterns up by id and misses gracefully", () => {
    expect(getPattern("the-wall-1907")?.name).toBe("The Wall, 1907");
    expect(getPattern("dock-one")?.spec.mould).toBe("stacker");
    expect(getPattern("first-fig")?.spec.mould).toBe("crossing");
    expect(getPattern("no-such-pattern")).toBeUndefined();
  });

  it("varies the dial settings meaningfully within each mould", () => {
    const byMould = patternsByMould();
    for (const [, entries] of byMould) {
      const fingerprints = new Set(
        entries.map((e) => JSON.stringify(e.spec)),
      );
      // Every pattern in a mould must be a distinct dial setting.
      expect(fingerprints.size).toBe(entries.length);
    }
  });
});
