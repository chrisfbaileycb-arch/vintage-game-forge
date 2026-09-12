import { describe, expect, it } from "vitest";

import { PALETTES, tonePalette } from "./engine";
import { SPECTRUM_STEPS, normalizeSpec } from "./moulds";

describe("spectrum toning", () => {
  it("returns the base palette unchanged at hue 0", () => {
    const base = PALETTES.sepia;
    expect(tonePalette(base, 0)).toBe(base);
  });

  it("preserves saturation and lightness at every bath", () => {
    for (const step of SPECTRUM_STEPS) {
      const toned = tonePalette(PALETTES.sepia, step.hue);
      for (const key of ["background", "field", "ink", "accent", "grid"] as const) {
        const a = hslOf(PALETTES.sepia[key]);
        const b = hslOf(toned[key]);
        expect(Math.abs(a.s - b.s), `${step.label} ${key} saturation`).toBeLessThan(0.02);
        expect(Math.abs(a.l - b.l), `${step.label} ${key} lightness`).toBeLessThan(0.02);
      }
    }
  });

  it("reaches every hue family around the wheel", () => {
    const families = new Set<number>();
    for (const step of SPECTRUM_STEPS) {
      const toned = tonePalette(PALETTES.cabinet, step.hue);
      families.add(Math.round(hslOf(toned.accent).h / 30) * 30 % 360);
    }
    // 24 baths at 15° apart must cover all 12 hue families.
    expect(families.size).toBe(12);
  });

  it("wraps the wheel cleanly (345° + 15° == 0°)", () => {
    const a = tonePalette(PALETTES.emerald, 345);
    const b = tonePalette(PALETTES.emerald, 15);
    expect(a.accent).not.toBe(b.accent);
    // Rotating by a full wheel returns the original tone.
    const full = tonePalette(PALETTES.emerald, 360);
    expect(full.accent).toBe(PALETTES.emerald.accent);
  });

  it("keeps achromatic tones achromatic", () => {
    const grey = "#808080";
    const pal = { background: grey, field: grey, ink: grey, accent: grey, grid: grey };
    const toned = tonePalette(pal, 210);
    expect(toned.accent).toBe(grey);
  });

  it("survives a toned spec through normalizeSpec", () => {
    const spec = normalizeSpec({ palette: "nocturne", hue: 300 });
    expect(spec.hue).toBe(300);
    expect(spec.palette).toBe("nocturne");
  });
});

function hslOf(hex: string): { h: number; s: number; l: number } {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  return { h: (h + 360) % 360, s, l };
}
