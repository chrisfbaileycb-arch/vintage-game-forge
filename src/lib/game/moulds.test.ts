import { describe, expect, it } from "vitest";

import {
  catalogueNumber,
  decodeSpec,
  encodeSpec,
  normalizeSpec,
} from "./moulds";

describe("normalizeSpec", () => {
  it("applies mould defaults to an empty input", () => {
    const spec = normalizeSpec({});
    expect(spec.mould).toBe("breakout");
    expect(spec.pace).toBe(3);
    expect(spec.title).toBe("Untitled Pressing");
    expect(spec.bells).toBe(false);
    expect(spec.tokens).toBe(0);
    expect(spec.finish).toBe("matte");
    expect(spec.palette).toBe("sepia");
  });

  it("clamps numeric dials into their ranges", () => {
    const spec = normalizeSpec({
      pace: 99,
      gridDensity: -4,
      brickRows: 100,
      hazards: 3.9,
      tokens: 42,
    });
    expect(spec.pace).toBe(5);
    expect(spec.gridDensity).toBe(0);
    expect(spec.brickRows).toBe(9);
    expect(spec.hazards).toBe(4); // rounds, then clamps
    expect(spec.tokens).toBe(9);
  });

  it("caps handling per mould", () => {
    expect(normalizeSpec({ mould: "breakout", handling: 9 }).handling).toBe(3);
    expect(normalizeSpec({ mould: "snake", handling: 9 }).handling).toBe(9);
    expect(normalizeSpec({ mould: "invaders", handling: 9 }).handling).toBe(5);
  });

  it("rejects unknown enums and falls back to defaults", () => {
    const spec = normalizeSpec({
      palette: "neon",
      frame: "holo",
      twist: "hardmode",
      finish: "foil",
      mould: "pong",
    });
    expect(spec.palette).toBe("sepia");
    expect(spec.frame).toBe("none");
    expect(spec.twist).toBe("none");
    expect(spec.finish).toBe("matte");
    expect(spec.mould).toBe("breakout");
  });

  it("accepts every new enum value", () => {
    const spec = normalizeSpec({
      palette: "nocturne",
      frame: "gilt",
      twist: "windfall",
      finish: "electric",
      bells: true,
    });
    expect(spec.palette).toBe("nocturne");
    expect(spec.frame).toBe("gilt");
    expect(spec.twist).toBe("windfall");
    expect(spec.finish).toBe("electric");
    expect(spec.bells).toBe(true);
  });

  it("trims and bounds the title", () => {
    expect(normalizeSpec({ title: "  THE WALL  " }).title).toBe("THE WALL");
    expect(normalizeSpec({ title: "x".repeat(80) }).title).toHaveLength(40);
    expect(normalizeSpec({ title: 42 }).title).toBe("Untitled Pressing");
  });
});

describe("share codes", () => {
  it("round-trips a full spec", () => {
    const spec = normalizeSpec({
      mould: "snake",
      title: "GARDEN SERPENT",
      pace: 4,
      gridDensity: 7,
      handling: 6,
      hazards: 5,
      tokens: 3,
      bells: true,
      palette: "emerald",
      frame: "ticket",
      twist: "blackout",
      finish: "lithograph",
    });
    const decoded = decodeSpec(encodeSpec(spec));
    expect(decoded).toEqual(spec);
  });

  it("returns null for malformed codes", () => {
    expect(decodeSpec("!!!not-base64!!!")).toBeNull();
    expect(decodeSpec("")).toBeNull();
  });
});

describe("catalogueNumber", () => {
  it("formats a stable 3-digit number", () => {
    expect(catalogueNumber("aaaaaaaaaaaaaaaa")).toMatch(/^№ \d{3}$/);
    expect(catalogueNumber("aaaaaaaaaaaaaaaa")).toBe(
      catalogueNumber("aaaaaaaaaaaaaaaa"),
    );
  });
});
