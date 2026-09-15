import { useId, useMemo } from "react";

/* ------------------------------------------------------------------ */
/* CartCover — procedural pixel-art cartridge covers.                 */
/* Each cover is a tiny deterministic "shader" painted on an 18x24    */
/* cell grid, so no two covers share a landscape.                     */
/* ------------------------------------------------------------------ */

export type CoverPattern =
  | "dunes"
  | "nebula"
  | "grid"
  | "waves"
  | "meadow"
  | "ember";

export interface CoverSpec {
  pattern: CoverPattern;
  seed: number;
  colors: [string, string, string, string];
}

const COLS = 18;
const ROWS = 24;
const VW = 180;
const VH = 240;
const CW = VW / COLS;
const CH = VH / ROWS;

function hash(x: number, y: number, s: number) {
  const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

function fract(v: number) {
  return v - Math.floor(v);
}

/* returns palette index 0..3 for a cell (0 is painted as the base rect) */
function shade(spec: CoverSpec, cx: number, cy: number): number {
  const s = spec.seed;
  const u = cx / (COLS - 1);
  const v = cy / (ROWS - 1);
  const h = hash(cx, cy, s);

  switch (spec.pattern) {
    /* banded sunset sky, pixel sun, two jagged land ridges */
    case "dunes": {
      const du = (u - 0.5) / 0.9;
      const dv = (v - 0.24) / 1.1;
      const d = du * du + dv * dv;
      if (d < 0.018) return 3;
      const r1 = 0.52 + 0.05 * Math.sin(u * 6 + s);
      const r2 = 0.72 + 0.06 * Math.sin(u * 9 + s * 2.1 + 2);
      if (v > r2) return 1;
      if (v > r1) return 2;
      if (d < 0.034 && h > 0.25) return 2; /* sun corona shimmer */
      if (h < 0.02 && v < 0.4) return 3; /* sparse stars */
      return 0;
    }

    /* starfield with a ringed, banded planet */
    case "nebula": {
      const du = (u - 0.5) / 1.15;
      const dv = (v - 0.34) / 0.85;
      const d = du * du + dv * dv;
      if (d < 0.05) {
        const band = Math.floor(((v - 0.1) / 0.5) * 5 + h * 0.6);
        return band % 3 === 0 ? 2 : 1;
      }
      const ring = Math.abs(v - (0.34 + (u - 0.5) * 0.45));
      if (ring < 0.012 && u > 0.1 && u < 0.9 && d < 0.13)
        return v > 0.34 ? 3 : 2;
      if (h < 0.05) return 3; /* bright stars */
      if (h < 0.09) return 2; /* dim stars */
      if (h > 0.97) return 1; /* nebula wisps */
      return 0;
    }

    /* perspective grid floor under a slatted sun */
    case "grid": {
      const horizon = 0.56;
      const du = (u - 0.5) / 0.95;
      const dv = (v - 0.34) / 1.0;
      const d = du * du + dv * dv;
      if (d < 0.022) {
        return v > 0.37 && fract(v * 26) < 0.35 ? 1 : 3;
      }
      if (v < horizon) {
        if (d < 0.045) return 2; /* horizon glow */
        return v < 0.18 ? 0 : 1;
      }
      const t = (v - horizon) / (1 - horizon);
      for (let k = -4; k <= 4; k++) {
        const ex = 0.5 + k * 0.22 * t;
        if (Math.abs(u - ex) < 0.012) return 3;
      }
      for (let i = 1; i <= 6; i++) {
        const pos = horizon + Math.pow(i / 7, 1.8) * (1 - horizon);
        if (Math.abs(v - pos) < 0.008) return i % 2 === 0 ? 3 : 2;
      }
      return 0;
    }

    /* rolling diagonal bands with a moon and its reflection */
    case "waves": {
      const du = (u - 0.72) / 1.0;
      const dv = (v - 0.14) / 1.0;
      if (du * du + dv * dv < 0.011) return 3;
      const t = fract(v * 1.7 - u * 0.4 + s * 0.071);
      if (v > 0.3 && Math.abs(u - 0.72) < 0.03 && h > 0.72) return 3;
      const band = Math.floor(t * 4);
      if (band === 0) return 0;
      if (band === 1) return 1;
      if (band === 2) return 2;
      return 3;
    }

    /* moonlit ground with seeded pine trees */
    case "meadow": {
      const ground = 0.42;
      const du = (u - 0.76) / 1.0;
      const dv = (v - 0.16) / 1.0;
      if (du * du + dv * dv < 0.012) return 3;
      if (v < ground) return h < 0.045 ? 3 : 0;
      for (let tc = 1; tc < COLS; tc += 3) {
        const off = hash(tc, 11, s) * 2 - 1;
        const xc = (tc + off) / (COLS - 1);
        const top = ground + 0.05;
        const height = 0.16 + hash(tc, 5, s) * 0.14;
        const halfW = (v - top) * 0.75;
        if (v > top && v < top + height && Math.abs(u - xc) < Math.max(0, halfW))
          return 2;
        if (
          v > top + height &&
          v < top + height + 0.06 &&
          Math.abs(u - xc) < 0.014
        )
          return 0;
      }
      return h > 0.82 ? 2 : 1;
    }

    /* dark rock under a sky of rising embers, shot through with lava */
    case "ember": {
      const r1 = 0.5 + 0.05 * Math.sin(u * 7 + s * 1.7);
      if (v < r1) {
        if (h < 0.015) return 3;
        if (h < 0.05) return 2;
        return 0;
      }
      if (h < 0.08) return 3; /* fissures */
      if (h < 0.16) return 2;
      return 1;
    }
  }
}

export default function CartCover({
  spec,
  className = "",
}: {
  spec: CoverSpec;
  className?: string;
}) {
  const uid = useId();
  const cells = useMemo(() => {
    const list: { x: number; y: number; i: number }[] = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const i = shade(spec, x, y);
        if (i > 0) list.push({ x, y, i });
      }
    }
    return list;
  }, [spec]);

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <pattern id={`${uid}s`} width={VW} height="6" patternUnits="userSpaceOnUse">
          <rect width={VW} height="2" fill="rgba(0,0,0,0.16)" />
        </pattern>
        <radialGradient id={`${uid}v`} cx="0.5" cy="0.45" r="0.75">
          <stop offset="0.62" stopColor="rgba(0,0,0,0)" />
          <stop offset="1" stopColor="rgba(2,1,8,0.5)" />
        </radialGradient>
      </defs>
      <rect width={VW} height={VH} fill={spec.colors[0]} />
      {cells.map((c, k) => (
        <rect
          key={k}
          x={c.x * CW}
          y={c.y * CH}
          width={CW + 0.5}
          height={CH + 0.5}
          fill={spec.colors[c.i]}
        />
      ))}
      <rect width={VW} height={VH} fill={`url(#${uid}s)`} />
      <rect width={VW} height={VH} fill={`url(#${uid}v)`} />
    </svg>
  );
}
