/**
 * The Cartridge Foundry — CRT display pipeline.
 *
 * Shared canvas helpers that give every cartridge the same authentic
 * 1980s arcade display treatment: pitch-black tube, 2.5D acrylic bevels,
 * phosphor glow, aperture-grille scanlines, and chunky pixel debris.
 */

// ---------------------------------------------------------------------------
// Display constants
// ---------------------------------------------------------------------------

/** Authentic arcade tube black. */
export const CRT_BLACK = "#050508";

/** Alternating scanline shade for the aperture-grille overlay. */
export const SCANLINE_ALPHA = 0.2;

// ---------------------------------------------------------------------------
// 2.5D bevels — faux-extruded physical acrylic layers
// ---------------------------------------------------------------------------

/**
 * Draw a dual-tone bevelled plate: a sharp 1px neon highlight on the top/left
 * edges and a dark translucent extruded shadow on the bottom/right edges.
 * `glow` tints the highlight; `depth` sizes the dark extrusion in px.
 */
export function drawBevelPlate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  base: string,
  highlight: string,
  depth = 3,
): void {
  // dark extruded drop (bottom/right)
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(x + depth, y + depth, w, h);
  // base plate
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);
  // 1px neon highlight (top/left)
  ctx.fillStyle = highlight;
  ctx.fillRect(x, y, w, 1);
  ctx.fillRect(x, y, 1, h);
  // faint bottom/right inner edge
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(x, y + h - 1, w, 1);
  ctx.fillRect(x + w - 1, y, 1, h);
}

/**
 * Draw one bevelled girder segment (structural steel look) with bright rivet
 * accents along the top edge.
 */
export function drawGirder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  base: string,
  highlight: string,
  rivet: string,
): void {
  drawBevelPlate(ctx, x, y, w, h, base, highlight, 3);
  ctx.fillStyle = rivet;
  for (let rx = x + 6; rx < x + w - 4; rx += 14) {
    ctx.fillRect(rx, y + 2, 2, 2);
    ctx.fillRect(rx, y + h - 4, 2, 2);
  }
}

// ---------------------------------------------------------------------------
// Phosphor glow
// ---------------------------------------------------------------------------

/** Enable phosphor glow for subsequent draws. */
export function glowOn(
  ctx: CanvasRenderingContext2D,
  color: string,
  blur = 6,
): void {
  ctx.shadowBlur = blur;
  ctx.shadowColor = color;
}

/** Disable phosphor glow. */
export function glowOff(ctx: CanvasRenderingContext2D): void {
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
}

// ---------------------------------------------------------------------------
// Scanlines / aperture grille
// ---------------------------------------------------------------------------

/** Draw alternating scanline overlay across a region. */
export function drawScanlineGrille(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  alpha = SCANLINE_ALPHA,
): void {
  ctx.save();
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  for (let yy = y; yy < y + h; yy += 3) {
    ctx.fillRect(x, yy, w, 1);
  }
  // faint vertical aperture stripes for RGB triad feel
  ctx.fillStyle = "rgba(0, 0, 0, 0.06)";
  for (let xx = x; xx < x + w; xx += 3) {
    ctx.fillRect(xx, y, 1, h);
  }
  ctx.restore();
}

/**
 * Barrel-curve corner shading: darkens the four corners of a CRT face to
 * suggest convex glass curvature. Cheap (few fills), runs every frame.
 */
export function drawBarrelCorners(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const r = Math.min(w, h) * 0.16;
  const g = 26;
  ctx.save();
  const grad = (cx: number, cy: number) => {
    const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    rg.addColorStop(0, `rgba(0,0,0,${g / 255})`);
    rg.addColorStop(1, "rgba(0,0,0,0)");
    return rg;
  };
  for (const [cx, cy] of [
    [x + r * 0.4, y + r * 0.4],
    [x + w - r * 0.4, y + r * 0.4],
    [x + r * 0.4, y + h - r * 0.4],
    [x + w - r * 0.4, y + h - r * 0.4],
  ] as const) {
    ctx.fillStyle = grad(cx, cy);
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Chunky pixel debris
// ---------------------------------------------------------------------------

export interface Debris {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

/** Spawn 4–8 chunky pixel debris blocks with upward random velocity. */
export function spawnDebris(
  out: Debris[],
  x: number,
  y: number,
  colors: string[],
  rng: () => number,
  count = 6,
  speed = 120,
): void {
  for (let i = 0; i < count; i++) {
    out.push({
      x,
      y,
      vx: (rng() * 2 - 1) * speed,
      vy: -rng() * speed * 0.9 - 30,
      size: 2 + Math.floor(rng() * 3), // chunky 2–4px blocks
      life: 0,
      maxLife: 0.5 + rng() * 0.5,
      color: colors[Math.floor(rng() * colors.length)],
    });
  }
  if (out.length > 400) out.splice(0, out.length - 400);
}

/** Advance debris with gravity + simple floor bounce; prune dead. */
export function stepDebris(
  debris: Debris[],
  dt: number,
  floorY: number,
  gravity = 420,
): void {
  let w = 0;
  for (const d of debris) {
    d.life += dt;
    if (d.life >= d.maxLife) continue;
    d.vy += gravity * dt;
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    if (d.y > floorY && d.vy > 0) {
      d.y = floorY;
      d.vy *= -0.45; // bounce with damping
      d.vx *= 0.8;
    }
    debris[w++] = d;
  }
  debris.length = w;
}

/** Render debris as chunky blocks, fading in the last 30% of life. */
export function renderDebris(ctx: CanvasRenderingContext2D, debris: Debris[]): void {
  for (const d of debris) {
    const fade = d.life > d.maxLife * 0.7 ? 1 - (d.life - d.maxLife * 0.7) / (d.maxLife * 0.3) : 1;
    ctx.globalAlpha = Math.max(0, fade);
    ctx.fillStyle = d.color;
    ctx.fillRect(d.x, d.y, d.size, d.size);
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Squash & stretch helper (2-frame directional pop)
// ---------------------------------------------------------------------------

export interface SquashState {
  t: number; // remaining time
  dx: number; // direction x
  dy: number; // direction y
}

/** Trigger a 2-frame squash toward a direction. */
export function triggerSquash(s: SquashState, dx: number, dy: number): void {
  s.t = 0.09; // ~2 frames at 22fps visual pop
  s.dx = dx;
  s.dy = dy;
}

/** Current scale factors from a squash state (sx, sy). */
export function squashScale(
  s: SquashState,
  dt: number,
): { sx: number; sy: number } {
  if (s.t > 0) s.t -= dt;
  if (s.t <= 0) return { sx: 1, sy: 1 };
  const k = s.t / 0.09; // 1 → 0
  const amount = 0.25 * k;
  if (Math.abs(s.dx) > Math.abs(s.dy)) {
    return { sx: 1 - amount, sy: 1 + amount };
  }
  return { sx: 1 + amount, sy: 1 - amount };
}
