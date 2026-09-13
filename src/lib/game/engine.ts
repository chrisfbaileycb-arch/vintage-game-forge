/**
 * The Cartridge Foundry — cartridge execution engine.
 *
 * Pure TypeScript + Canvas 2D. One engine instance runs one cartridge spec.
 * The React component owns the requestAnimationFrame loop, keyboard/touch
 * input, and HUD wiring; the engine stays framework-free.
 *
 * Advanced layer: particle embers, screen shake, combo streaks, house-token
 * power-ups, print finishes, blackout/windfall twists, and a small event bus
 * for chiptune bells and HUD flourishes.
 */

import type { CartridgeSpec, FinishId, PaletteId, TokenId } from "./moulds";
import { EFFECT_LIMITS } from "./moulds";
import { mulberry32 } from "./rng";
import {
  CRT_BLACK,
  drawBarrelCorners,
  drawBevelPlate,
  drawGirder,
  drawScanlineGrille,
  glowOff,
  glowOn,
  renderDebris,
  spawnDebris,
  squashScale,
  stepDebris,
  triggerSquash,
  type Debris,
  type SquashState,
} from "./crt";

// ---------------------------------------------------------------------------
// Palettes
// ---------------------------------------------------------------------------

interface Palette {
  background: string;
  field: string;
  ink: string;
  accent: string;
  grid: string;
}

/**
 * Full-spectrum toning: rotate every tone of a base palette around the
 * colour wheel. HSL keeps saturation & lightness fixed, so the vintage
 * contrast mix survives at any hue — 6 recipes × 24 baths = 144 colourings.
 */
export function tonePalette(base: Palette, hueDegrees: number): Palette {
  if (!hueDegrees) return base;
  const rotate = (hex: string): string =>
    hslRotateHex(hex, ((hueDegrees % 360) + 360) % 360);
  return {
    background: rotate(base.background),
    field: rotate(base.field),
    ink: rotate(base.ink),
    accent: rotate(base.accent),
    grid: rotate(base.grid),
  };
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16, ) / 255;
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
  return { h: (h + 360) % 360, s: Math.min(1, s), l };
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [c, 0, x];
  else [r, g, b] = [x, 0, c];
  const m = l - c / 2;
  const f = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v + m)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${f(r)}${f(g)}${f(b)}`;
}

function hslRotateHex(hex: string, degrees: number): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex((h + degrees) % 360, s, l);
}

export const PALETTES: Record<PaletteId, Palette> = {
  sepia: {
    background: "#3a2d1c",
    field: "#e9dcbe",
    ink: "#41321f",
    accent: "#8a5a2b",
    grid: "#d3c19b",
  },
  cabinet: {
    background: "#17100a",
    field: "#2c1b0f",
    ink: "#d8b06a",
    accent: "#c25a32",
    grid: "#4a3421",
  },
  emerald: {
    background: "#0d1710",
    field: "#15271b",
    ink: "#9fd8ac",
    accent: "#d8b06a",
    grid: "#22402c",
  },
  blueprint: {
    background: "#0f1b26",
    field: "#12222e",
    ink: "#bcd7e8",
    accent: "#d8b06a",
    grid: "#1d3a4c",
  },
  nocturne: {
    background: "#141118",
    field: "#1c1823",
    ink: "#d9cfdd",
    accent: "#b06a8a",
    grid: "#2e2733",
  },
  halftone: {
    background: "#efe6d0",
    field: "#f4ecdb",
    ink: "#2b2620",
    accent: "#a03428",
    grid: "#e0d5bb",
  },
};

/** Per-finish behaviour flags consumed by the renderer and FX layer. */
export const FINISH_FLAGS: Record<
  FinishId,
  { grain: boolean; glow: boolean; shake: number }
> = {
  matte: { grain: false, glow: false, shake: 1 },
  lithograph: { grain: true, glow: false, shake: 1.25 },
  electric: { grain: false, glow: true, shake: 1.6 },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GameState = "title" | "playing" | "paused" | "won" | "lost";

export interface EngineInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  fire: boolean;
}

export function emptyInput(): EngineInput {
  return { left: false, right: false, up: false, down: false, fire: false };
}

export interface HudState {
  state: GameState;
  score: number;
  best: number;
  seals: number;
  objective: string;
  progressLabel: string;
  progress: number;
  message: string;
  combo: number;
  comboTimer: number;
}

export type FoundryEvent =
  | "brick"
  | "mark"
  | "sentinel"
  | "token"
  | "sealLost"
  | "won"
  | "lost"
  | "combo"
  | "checkpoint"
  | "gate"
  | "pop"
  | "barrel"
  | "apex";

export type FoundryListener = (event: FoundryEvent) => void;

export interface CartridgeHandle {
  reset(): void;
  start(): void;
  togglePause(): void;
  update(dt: number, input: EngineInput): void;
  render(ctx: CanvasRenderingContext2D): void;
  readonly hud: HudState;
  /** Subscribe to engine events (chiptune bells, HUD flourishes). */
  onEvent(listener: FoundryListener): () => void;
  /** Toggle the aperture-grille scanline overlay. */
  setScanlines(on: boolean): void;
}

/** Test seam: deterministic replacement for Math.random. */
export type RandomSource = () => number;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const W = 360;
const H = 480;

function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v;
}

function segDist(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = clamp(t, 0, 1);
  const ex = ax + t * dx;
  const ey = ay + t * dy;
  return Math.hypot(px - ex, py - ey);
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function withAlpha(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ---------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------

export function createCartridge(
  spec: CartridgeSpec,
  opts: {
    initialBest?: number;
    onHudChange?: (hud: HudState) => void;
    random?: RandomSource;
  } = {},
): CartridgeHandle {
  const pal = tonePalette(PALETTES[spec.palette], spec.hue ?? 0);
  const finish = FINISH_FLAGS[spec.finish];
  const paceMul = 0.55 + 0.22 * spec.pace;
  const maxSeals = spec.twist === "brittle" ? 1 : 3;
  const rng: RandomSource = opts.random ?? mulberry32(spec.seed ?? 1);

  const field: Rect =
    spec.twist === "compact"
      ? { x: W * 0.1, y: H * 0.1, w: W * 0.8, h: H * 0.8 }
      : { x: 0, y: 0, w: W, h: H };

  let hud: HudState = {
    state: "title",
    score: 0,
    best: opts.initialBest ?? 0,
    seals: maxSeals,
    objective: "",
    progressLabel: "",
    progress: 0,
    message: "",
    combo: 0,
    comboTimer: 0,
  };

  function setHud(patch: Partial<HudState>) {
    let changed = false;
    for (const key of Object.keys(patch) as (keyof HudState)[]) {
      if (hud[key] !== patch[key]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    hud = { ...hud, ...patch };
    opts.onHudChange?.(hud);
  }

  // ----- Event bus -----------------------------------------------------------

  const listeners = new Set<FoundryListener>();
  function emit(event: FoundryEvent) {
    for (const fn of listeners) fn(event);
  }

  // ----- Particles & shake ----------------------------------------------------

  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    color: string;
    gravity: number;
  }
  const particles: Particle[] = [];
  const MAX_PARTICLES = 220;

  function burst(
    x: number,
    y: number,
    count: number,
    colors: string[],
    speed: number,
    gravity = 140,
  ) {
    for (let i = 0; i < count; i++) {
      if (particles.length >= MAX_PARTICLES) particles.shift();
      const angle = rng() * Math.PI * 2;
      const vel = speed * (0.4 + rng() * 0.8);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * vel,
        vy: Math.sin(angle) * vel - speed * 0.35,
        life: 0,
        maxLife: 0.35 + rng() * 0.45,
        size: 1.5 + rng() * 2.5,
        color: colors[Math.floor(rng() * colors.length)],
        gravity,
      });
    }
  }

  function stepParticles(dt: number) {
    let w = 0;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      particles[w++] = p;
    }
    particles.length = w;
  }

  let shakeAmount = 0;
  function shake(amount: number) {
    shakeAmount = Math.min(7, shakeAmount + amount * finish.shake);
  }

  // ----- Combo streaks --------------------------------------------------------

  let combo = 0;
  let comboTimer = 0;
  const COMBO_WINDOW = 2.2;

  /** Chain a scoring event; larger streaks pay escalating bonuses. */
  function scoreCombo(points: number): number {
    combo += 1;
    comboTimer = COMBO_WINDOW;
    const bonus =
      combo >= 5 ? Math.ceil(points * 0.5) : combo >= 3 ? Math.ceil(points * 0.25) : 0;
    return points + bonus;
  }

  function breakCombo() {
    combo = 0;
    comboTimer = 0;
  }

  // ----- House tokens ---------------------------------------------------------

  interface TokenDrop {
    id: TokenId;
    x: number;
    y: number;
    vy: number;
    ttl: number;
  }
  let tokens: TokenDrop[] = [];
  let tokenBudget = 0;

  function refillTokenBudget() {
    tokenBudget = spec.tokens > 0 ? spec.tokens : 1;
  }

  function spawnTokenAt(x: number, y: number) {
    if (tokenBudget <= 0) return;
    tokenBudget -= 1;
    const ids: TokenId[] = ["widen", "slowpress", "windfall"];
    const id = ids[Math.floor(rng() * ids.length)];
    tokens.push({ id, x, y, vy: 55 + spec.pace * 8, ttl: 9 });
  }

  // Active power effects
  let widenTimer = 0;
  let slowTimer = 0;
  let widenFactor = 1;
  let slowFactor = 1;

  function applyToken(id: TokenId) {
    emit("token");
    shake(1.5);
    if (id === "widen") {
      widenTimer = 8;
      widenFactor = Math.min(EFFECT_LIMITS.widenMulMax, widenFactor + 0.5);
    } else if (id === "slowpress") {
      slowTimer = 6;
      slowFactor = Math.max(EFFECT_LIMITS.slowMulMin, slowFactor - 0.25);
    } else {
      score += EFFECT_LIMITS.windfallPoints;
    }
  }

  function tickEffects(dt: number) {
    if (widenTimer > 0) {
      widenTimer -= dt;
      if (widenTimer <= 0) {
        widenTimer = 0;
        widenFactor = 1;
      }
    }
    if (slowTimer > 0) {
      slowTimer -= dt;
      if (slowTimer <= 0) {
        slowTimer = 0;
        slowFactor = 1;
      }
    }
  }

  // ----- Blackout & windfall twists -------------------------------------------

  let blackoutOn = false;
  let blackoutTimer = 0;
  let blackoutPhase = 0;
  const BLACKOUT_CYCLE = 7;

  function tickBlackout(dt: number) {
    if (spec.twist !== "blackout") return;
    blackoutTimer += dt;
    if (blackoutTimer >= BLACKOUT_CYCLE) {
      blackoutTimer = 0;
      blackoutPhase += 1;
      blackoutOn = !blackoutOn;
    }
  }

  let windfallCount = 0;
  /** Every fifth point paid double, per the Windfall Ledger. */
  function windfallScore(raw: number): number {
    if (spec.twist !== "windfall") return raw;
    let payout = raw;
    let left = raw;
    while (left > 0) {
      windfallCount += 1;
      left -= 1;
      if (windfallCount % 5 === 0) payout += 1;
    }
    return payout;
  }

  let state: GameState = "title";
  let seals = maxSeals;
  let score = 0;

  // ----- CRT & juice state ---------------------------------------------------

  let scanlines = true;
  const debrisField: Debris[] = [];
  const squash: SquashState = { t: 0, dx: 0, dy: 0 };

  /** Chunky bouncing debris burst at a world position. */
  function popDebris(x: number, y: number, colors: string[], count = 6) {
    spawnDebris(debrisField, x, y, colors, rng, count, 130);
  }

  // ----- Mould: Breaker -------------------------------------------------------

  interface Rotor {
    cx: number;
    cy: number;
    radius: number;
    speed: number;
    angle: number;
  }

  interface Brick {
    x: number;
    y: number;
    w: number;
    h: number;
    alive: boolean;
    tone: number;
    hits: number;
  }

  const bat = { x: W / 2, baseW: 46 + (spec.handling / 3) * 36, w: 0 };
  bat.w = bat.baseW;
  const ball = { x: W / 2, y: 0, vx: 0, vy: 0, r: 6, stuck: true };
  /** Fading position history for the phosphor ball trail (breakout). */
  const ballTrail: { x: number; y: number }[] = [];
  let bricks: Brick[] = [];
  let rotors: Rotor[] = [];

  function buildBreakout() {
    const rows = clamp(spec.brickRows, 3, 9);
    const cols = 8;
    const bw = (field.w - 24) / cols;
    const bh = 16;
    bricks = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const hits = spec.hazards >= 7 ? 2 : 1;
        bricks.push({
          x: field.x + 12 + c * bw,
          y: field.y + 46 + r * (bh + 6),
          w: bw - 6,
          h: bh,
          alive: true,
          tone: (r + c) % 3,
          hits,
        });
      }
    }
    rotors = [];
    if (spec.hazards >= 2) {
      rotors.push({
        cx: field.x + field.w / 2,
        cy: field.y + field.h * 0.52,
        radius: 30 + spec.hazards * 3,
        speed: (0.9 + spec.hazards * 0.12) * paceMul,
        angle: rng() * Math.PI,
      });
    }
    if (spec.hazards >= 6) {
      rotors.push({
        cx: field.x + field.w * 0.28,
        cy: field.y + field.h * 0.68,
        radius: 22 + spec.hazards * 2,
        speed: -(1.1 + spec.hazards * 0.1) * paceMul,
        angle: rng() * Math.PI,
      });
    }
    refillTokenBudget();
  }

  function resetBall() {
    ball.stuck = true;
    ball.x = bat.x;
    ball.y = field.y + field.h - 34;
    ball.vx = 0;
    ball.vy = 0;
  }

  // ----- Mould: Serpent ---------------------------------------------------------

  const snake = {
    cells: [] as { x: number; y: number }[],
    dir: { x: 1, y: 0 },
    cols: 12,
    rows: 16,
    cell: 30,
    marks: [] as { x: number; y: number }[],
    burrows: [] as { x: number; y: number }[],
    grow: 0,
    eaten: 0,
    target: 10,
    stepTimer: 0,
    stepInterval: 0.2,
  };

  function randInt(max: number) {
    return Math.floor(rng() * max);
  }

  function buildSnake() {
    const cols = 12 + clamp(spec.gridDensity, 0, 9) * 2;
    const cell = field.w / cols;
    const rows = Math.floor(field.h / cell);
    snake.cols = cols;
    snake.rows = rows;
    snake.cell = cell;
    snake.stepInterval = clamp(0.3 - spec.pace * 0.05, 0.06, 0.3);
    snake.dir = { x: 1, y: 0 };
    snake.grow = 0;
    snake.eaten = 0;
    snake.cells = [];
    const midY = Math.floor(rows / 2);
    for (let i = 0; i < 4; i++) {
      snake.cells.push({ x: Math.floor(cols / 4) - i, y: midY });
    }
    const markCount = 1 + clamp(spec.hazards, 0, 9);
    const burrowCount =
      spec.hazards >= 8 ? 3 : spec.hazards >= 4 ? 2 : spec.hazards >= 1 ? 1 : 0;
    snake.burrows = [];
    for (let i = 0; i < burrowCount; i++) {
      snake.burrows.push({ x: randInt(cols), y: randInt(rows) });
    }
    snake.marks = [];
    for (let i = 0; i < markCount; i++) spawnMark();
    refillTokenBudget();
  }

  function cellFree(x: number, y: number) {
    if (snake.cells.some((c) => c.x === x && c.y === y)) return false;
    if (snake.marks.some((m) => m.x === x && m.y === y)) return false;
    if (snake.burrows.some((b) => b.x === x && b.y === y)) return false;
    return true;
  }

  function spawnMark() {
    for (let tries = 0; tries < 200; tries++) {
      const x = randInt(snake.cols);
      const y = randInt(snake.rows);
      if (cellFree(x, y)) {
        snake.marks.push({ x, y });
        return;
      }
    }
  }

  /** Grid origin of the serpent board, for converting cells to pixels. */
  function snakeOrigin(): { ox: number; oy: number } {
    return {
      ox: field.x + (field.w - snake.cell * snake.cols) / 2,
      oy: field.y + (field.h - snake.cell * snake.rows) / 2,
    };
  }

  // ----- Mould: Sentinels -------------------------------------------------------

  const invaders = {
    cols: 8,
    rows: 4,
    alive: [] as boolean[],
    origin: { x: 20, y: 70 },
    dirX: 1,
    stepTimer: 0,
    stepInterval: 0.6,
    bullets: [] as { x: number; y: number }[],
    bombs: [] as { x: number; y: number }[],
    cannon: { x: W / 2, cooldown: 0 },
    barriers: [] as Rect[],
    rotor: null as Rotor | null,
  };

  function sentinelPos(col: number, row: number) {
    const cell = W / (invaders.cols + 2);
    return {
      x: invaders.origin.x + col * cell,
      y: invaders.origin.y + row * cell * 1.15,
      s: cell * 0.62,
    };
  }

  function buildInvaders() {
    invaders.cols = 4 + clamp(spec.gridDensity, 0, 9);
    invaders.rows = 3 + Math.round(clamp(spec.hazards, 0, 9) / 3);
    invaders.alive = new Array(invaders.cols * invaders.rows).fill(true);
    invaders.origin = { x: 20, y: 70 };
    invaders.dirX = 1;
    invaders.stepInterval = clamp(0.95 - spec.pace * 0.16, 0.15, 0.95);
    invaders.bullets = [];
    invaders.bombs = [];
    invaders.cannon = { x: W / 2, cooldown: 0 };
    invaders.barriers =
      spec.twist === "brittle"
        ? []
        : [0.2, 0.5, 0.8].map((f) => ({
            x: W * f - 23,
            y: field.y + field.h - 92,
            w: 46,
            h: 14,
          }));
    invaders.rotor =
      spec.hazards >= 5
        ? {
            cx: field.x + field.w / 2,
            cy: field.y + field.h * 0.34,
            radius: 26 + spec.hazards * 2,
            speed: (1.2 + spec.hazards * 0.1) * paceMul,
            angle: rng() * Math.PI,
          }
        : null;
    refillTokenBudget();
  }

  // ----- Shared run control ---------------------------------------------------

  function objectiveText(): string {
    if (spec.mould === "breakout") return "Clear the wall of bricks";
    if (spec.mould === "snake") return `Consume ${snake.target} marks`;
    if (spec.mould === "maze")
      return `Claim every beacon before the fuse burns`;
    if (spec.mould === "flyer") return "Ring the gates, dodge the balloons";
    if (spec.mould === "burrower")
      return `Excavate ${burrow.target} buried marks`;
    if (spec.mould === "scaffolding")
      return "Climb every tier to reach the apex";
    if (spec.mould === "stacker")
      return `Stack ${menagerie.target} crates on the dock`;
    if (spec.mould === "crossing")
      return `Collect ${crossing.target} brass buttons`;
    return "Rout the descending ranks";
  }

  function progressInfo(): { label: string; value: number } {
    if (spec.mould === "breakout") {
      const total = bricks.length || 1;
      const cleared = bricks.filter((b) => !b.alive).length;
      return { label: `${cleared}/${total} bricks`, value: cleared / total };
    }
    if (spec.mould === "snake") {
      return {
        label: `${snake.eaten}/${snake.target} marks`,
        value: snake.eaten / snake.target,
      };
    }
    if (spec.mould === "maze") {
      const total = maze.claimed + maze.checkpoints.length || 1;
      return {
        label: `${maze.claimed}/${total} beacons`,
        value: maze.claimed / total,
      };
    }
    if (spec.mould === "flyer") {
      return {
        label: `${Math.floor(flyer.distance * 100)} yards flown`,
        value: (flyer.distance % 10) / 10,
      };
    }
    if (spec.mould === "burrower") {
      return {
        label: `${burrow.collected}/${burrow.target} marks`,
        value: burrow.collected / burrow.target,
      };
    }
    if (spec.mould === "scaffolding") {
      return {
        label: `tier ${scaffold.tier + 1}/${SCAFF_TIERS}`,
        value: (scaffold.tier + 1) / SCAFF_TIERS,
      };
    }
    if (spec.mould === "stacker") {
      return {
        label: `${menagerie.stacked}/${menagerie.target} stacked`,
        value: menagerie.stacked / menagerie.target,
      };
    }
    if (spec.mould === "crossing") {
      return {
        label: `${crossing.collected}/${crossing.target} buttons`,
        value: crossing.collected / crossing.target,
      };
    }
    const total = invaders.alive.length || 1;
    const down = invaders.alive.filter((a) => !a).length;
    return { label: `${down}/${total} routed`, value: down / total };
  }

  function publishScore(extra?: string) {
    const p = progressInfo();
    setHud({
      state,
      score,
      best: Math.max(hud.best, score),
      seals,
      objective: objectiveText(),
      progressLabel: p.label,
      progress: p.value,
      message: extra ?? "",
      combo,
      comboTimer,
    });
  }

  function winRun() {
    state = "won";
    emit("won");
    publishScore("PRESSED & APPROVED");
  }

  function loseRun(reason: string) {
    seals -= 1;
    emit("sealLost");
    shake(3);
    burst(W / 2, H * 0.8, 24, [pal.ink, pal.accent], 120, 200);
    if (seals <= 0) {
      state = "lost";
      emit("lost");
      publishScore(reason);
      return;
    }
    publishScore(reason);
    if (spec.mould === "breakout") resetBall();
    if (spec.mould === "burrower") {
      burrow.px = 10;
      burrow.py = 0;
      burrow.dirX = 0;
      burrow.dirY = 1;
      burrow.hoseTarget = -1;
      burrow.hose = 0;
    }
    if (spec.mould === "scaffolding") {
      scaffold.px = 0.12;
      scaffold.tier = 0;
      scaffold.py = 0;
      scaffold.barrels = scaffold.barrels.filter(
        (b) => Math.abs(b.x - scaffold.px) > 0.1,
      );
    }
    if (spec.mould === "stacker") {
      menagerie.crates = menagerie.crates.slice(
        0,
        Math.max(0, menagerie.crates.length - 3),
      );
      menagerie.carrying = true;
      menagerie.hookY = 0;
    }
    if (spec.mould === "crossing") {
      crossing.lane = 0;
      crossing.laneT = 0;
      crossing.x = 0.5;
    }
    if (spec.mould === "maze") {
      maze.elapsed = Math.max(0, maze.elapsed - maze.fuse * 0.25);
      maze.px = 0.5 + 0.001;
      maze.py = 0.5 + 0.001;
      maze.heading = 0;
    }
    if (spec.mould === "flyer") {
      flyer.plane.y = 0.5;
      flyer.plane.vy = 0;
      flyer.balloons = flyer.balloons.filter((b) => b.x > 0.3 || b.x < 0);
    }
    if (spec.mould === "snake") {
      snake.cells = [];
      const midY = Math.floor(snake.rows / 2);
      for (let i = 0; i < 4; i++) {
        snake.cells.push({ x: Math.floor(snake.cols / 4) - i, y: midY });
      }
      snake.dir = { x: 1, y: 0 };
      snake.grow = 0;
    }
    if (spec.mould === "invaders") {
      invaders.bombs = [];
      invaders.cannon.x = W / 2;
      invaders.cannon.cooldown = 0.4;
    }
  }

  // ----- Mould: Menagerie (Boots the Badger's dock stacks) --------------------
  // Swinging crane hook, wobbling crate stacks, and one cranky bee.

  const CRATE_ROWS = 5; // stack this many rows high on the dock
  const MENAGERIE_CRATE_COLORS = ["#e2a33c", "#c96f2f", "#8fae3f", "#4fb0c6"];
  const menagerie = {
    hookX: 0.5,
    hookDir: 1,
    hookY: 0,
    carrying: true,
    wasFire: false,
    crates: [] as { x: number; h: number }[],
    nextCrate: 0,
    beeX: 0.2,
    beeY: 0.6,
    beeVx: 0.11,
    beeVy: 0.07,
    beeStun: 0,
    target: 10,
    stacked: 0,
    swing: 0,
  };

  function buildMenagerie() {
    menagerie.hookX = 0.5;
    menagerie.hookDir = 1;
    menagerie.hookY = 0;
    menagerie.carrying = true;
    menagerie.wasFire = false;
    menagerie.crates = [];
    menagerie.nextCrate = 0;
    menagerie.beeX = 0.2;
    menagerie.beeY = 0.6;
    menagerie.beeStun = 0;
    menagerie.stacked = 0;
    menagerie.swing = 0;
  }

  function menagerieStackHeight(x: number): number {
    let h = 0;
    for (const c of menagerie.crates) {
      if (Math.abs(c.x - x) < 0.06) h += 1;
    }
    return h;
  }

  function updateMenagerie(dt: number, input: EngineInput) {
    const swingSpeed = (0.9 + spec.pace * 0.28) * paceMul;
    menagerie.swing += dt * swingSpeed * 2.2;

    // The crane hook swings; left/right nudges its patrol centre.
    const nudge = (input.left ? -1 : 0) + (input.right ? 1 : 0);
    const range = 0.34 + spec.handling * 0.015;
    const center = 0.5 + nudge * 0.06;
    menagerie.hookX = center + Math.sin(menagerie.swing) * range;
    menagerie.hookDir = Math.cos(menagerie.swing) >= 0 ? 1 : -1;

    if (menagerie.carrying) {
      if (input.fire && !menagerie.wasFire) {
        menagerie.carrying = false;
        menagerie.hookY = 0;
        triggerSquash(squash, 0, 1);
      }
    } else {
      // crate falls toward the dock
      menagerie.hookY += dt * 2.6;
      const dockNorm = 0.86;
      if (menagerie.hookY >= dockNorm) {
        const x = menagerie.hookX;
        const stackH = menagerieStackHeight(x);
        if (stackH >= CRATE_ROWS + 2) {
          loseRun("The stack swamped the dock");
          menagerie.carrying = true;
          menagerie.hookY = 0;
          return;
        }
        menagerie.crates.push({ x, h: stackH });
        menagerie.stacked += 1;
        score += windfallScore(50);
        emit("checkpoint");
        burst(
          field.x + x * field.w,
          field.y + field.h * dockNorm,
          6,
          [MENAGERIE_CRATE_COLORS[menagerie.nextCrate % MENAGERIE_CRATE_COLORS.length], "#fff8e6"],
          90,
          150,
        );
        menagerie.nextCrate += 1;
        // Off-centre drops wobble the stack; brittle moulding topples easier.
        let wobble = Math.abs(x - 0.5);
        if (spec.twist === "brittle") wobble += 0.08;
        if (stackH > 0 && wobble > 0.3 && rng() < 0.35) {
          let idx = -1;
          for (let i = 0; i < menagerie.crates.length; i++) {
            const c = menagerie.crates[i];
            if (Math.abs(c.x - x) < 0.06 && c.h === stackH) idx = i;
          }
          if (idx >= 0) {
            menagerie.crates.splice(idx, 1);
            menagerie.stacked -= 1;
            emit("barrel");
            shake(2);
            spawnDebris(
              debrisField,
              field.x + x * field.w,
              field.y + field.h * dockNorm,
              [MENAGERIE_CRATE_COLORS[0]],
              rng,
              6,
              110,
            );
          }
        }
        menagerie.carrying = true;
        menagerie.hookY = 0;
        if (menagerie.stacked >= menagerie.target) {
          winRun();
          return;
        }
      }
    }
    menagerie.wasFire = input.fire;

    // Sprocket the squirrel patrols the rope and calms the cranky bee.
    const sprocketX = 0.5 + Math.sin(menagerie.swing * 0.37) * 0.42;
    if (menagerie.beeStun > 0) {
      menagerie.beeStun -= dt;
    } else {
      // More hazards dialled = crankier, faster bees.
      const beeAggro = 1 + spec.hazards * 0.12;
      menagerie.beeX += menagerie.beeVx * dt * (0.8 + spec.pace * 0.2) * beeAggro;
      menagerie.beeY += menagerie.beeVy * dt * 2 * beeAggro;
      if (menagerie.beeX < 0.05 || menagerie.beeX > 0.95) menagerie.beeVx *= -1;
      if (menagerie.beeY < 0.55 || menagerie.beeY > 0.95) menagerie.beeVy *= -1;
      if (Math.abs(sprocketX - menagerie.beeX) < 0.05) {
        menagerie.beeStun = 4;
        emit("token");
      }
      if (
        menagerie.beeY > 0.8 &&
        Math.abs(menagerie.beeX - menagerie.hookX) < 0.05 &&
        menagerie.hookY > 0.5
      ) {
        loseRun("Stung on the dock");
        menagerie.carrying = true;
        menagerie.hookY = 0;
        return;
      }
    }

    updateTokenDrops(dt, (t) => {
      if (
        t.y > field.y + field.h * 0.3 &&
        Math.abs(t.x - (field.x + menagerie.hookX * field.w)) < 16
      ) {
        score += windfallScore(40);
        emit("token");
        t.ttl = 0;
      }
    });
  }

  function renderMenagerie(ctx: CanvasRenderingContext2D) {
    const sx = field.w / W;
    const sy = field.h / H;
    const dockY = field.y + field.h * 0.86;

    // dock planks (bevelled)
    drawBevelPlate(ctx, field.x, dockY, field.w, field.h * 0.14, "#4a3220", "#7d5a38", 4);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    for (let px = field.x + 12; px < field.x + field.w - 8; px += 26) {
      ctx.fillRect(px, dockY + 4, 2, field.h * 0.14 - 8);
    }

    // stacked crates
    for (const c of menagerie.crates) {
      const cx2 = field.x + c.x * field.w;
      const ch = 15;
      const cy2 = dockY - c.h * ch;
      glowOn(ctx, "#e2a33c", 4);
      drawBevelPlate(
        ctx,
        cx2 - 14 * sx,
        cy2 - ch,
        28 * sx,
        ch - 2,
        MENAGERIE_CRATE_COLORS[c.h % MENAGERIE_CRATE_COLORS.length],
        "#ffe9c9",
        2,
      );
      glowOff(ctx);
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fillRect(cx2 - 12 * sx, cy2 - ch / 2 - 1, 24 * sx, 2);
    }

    // rope + hook from the top rail
    const hx = field.x + menagerie.hookX * field.w;
    ctx.strokeStyle = "#c9a25a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx, field.y + 6);
    ctx.lineTo(hx, field.y + 10 + menagerie.hookY * field.h);
    ctx.stroke();
    ctx.strokeRect(hx - 5, field.y + 8 + menagerie.hookY * field.h, 10, 6);

    if (menagerie.carrying) {
      const cy2 = field.y + 16 + menagerie.hookY * field.h;
      const color = MENAGERIE_CRATE_COLORS[menagerie.nextCrate % MENAGERIE_CRATE_COLORS.length];
      glowOn(ctx, color, 6);
      drawBevelPlate(ctx, hx - 14 * sx, cy2, 28 * sx, 13, color, "#fff2d9", 2);
      glowOff(ctx);
    }

    // Sprocket the squirrel on the rope
    const spx = field.x + (0.5 + Math.sin(menagerie.swing * 0.37) * 0.42) * field.w;
    glowOn(ctx, "#c96f2f", 5);
    ctx.fillStyle = "#c96f2f";
    ctx.beginPath();
    ctx.arc(spx, field.y + 14, 5 * sy, 0, Math.PI * 2);
    ctx.fill();
    glowOff(ctx);
    ctx.fillStyle = "#8a5a2b";
    ctx.beginPath();
    ctx.arc(spx - 6 * sx, field.y + 17, 3 * sy, 0, Math.PI * 1.2);
    ctx.fill();
    ctx.fillStyle = "#2a1c10";
    ctx.fillRect(spx + 2, field.y + 12, 2, 2);

    // Boots the badger on the dock
    const bx = hx;
    glowOn(ctx, "#5ad7ff", 5);
    ctx.fillStyle = "#5a6470";
    ctx.fillRect(bx - 9 * sx, dockY - 18 * sy, 18 * sx, 18 * sy);
    glowOff(ctx);
    ctx.fillStyle = "#f2ede2";
    ctx.fillRect(bx - 3 * sx, dockY - 18 * sy, 6 * sx, 10 * sy);
    ctx.fillStyle = "#2a2f36";
    ctx.fillRect(bx - 9 * sx, dockY - 15 * sy, 6 * sx, 5 * sy);
    ctx.fillRect(bx + 3 * sx, dockY - 15 * sy, 6 * sx, 5 * sy);

    // cranky bee
    const bex = field.x + menagerie.beeX * field.w;
    const bey = field.y + menagerie.beeY * field.h;
    glowOn(ctx, "#ffd23f", 6);
    ctx.fillStyle = "#ffd23f";
    ctx.beginPath();
    ctx.ellipse(bex, bey, 6 * sx, 4 * sy, 0, 0, Math.PI * 2);
    ctx.fill();
    glowOff(ctx);
    ctx.fillStyle = "#2a2015";
    ctx.fillRect(bex - 4, bey - 3, 2, 6);
    ctx.fillRect(bex + 2, bey - 3, 2, 6);
    if (menagerie.beeStun > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.arc(bex, bey, 9, 0, Math.PI * 2);
      ctx.fill();
    }

    drawScanlines(ctx, field.x, field.y, field.w, field.h);
    ctx.fillStyle = pal.ink;
    ctx.font = "10px monospace";
    ctx.fillText(`DOCK ${menagerie.stacked}/${menagerie.target}`, field.x + 8, field.y + 14);
  }

  // ----- Mould: Crossing Guard (Pip the Pigeon's thoroughfare) ----------------

  const CROSS_LANES = 10;
  const CROSS_LANE_H = 34;
  const CROSS_COLORS = ["#c8472f", "#3f7fae", "#c9a25a", "#5e5a52", "#7d4a6f"];
  const crossing = {
    lane: 0,
    laneT: 0,
    hopFrom: 0,
    hopDir: 1,
    x: 0.5,
    wasFire: false,
    vehicles: [] as { lane: number; x: number; speed: number; kind: number; len: number }[],
    buttons: [] as { lane: number; x: number; taken: boolean }[],
    spawnTimers: [] as number[],
    collected: 0,
    target: 6,
  };

  function buildCrossing() {
    crossing.lane = 0;
    crossing.laneT = 0;
    crossing.hopFrom = 0;
    crossing.hopDir = 1;
    crossing.x = 0.5;
    crossing.wasFire = false;
    crossing.vehicles = [];
    crossing.spawnTimers = Array.from({ length: CROSS_LANES }, () => 0.6 + rng() * 1.4);
    crossing.buttons = [];
    crossing.collected = 0;
    crossingSpawnButton();
    crossingSpawnButton();
    crossingSpawnButton();
  }

  function crossingSpawnButton() {
    const lane = 1 + Math.floor(rng() * (CROSS_LANES - 1));
    const x = 0.15 + rng() * 0.7;
    crossing.buttons.push({ lane, x, taken: false });
  }

  function crossingLaneY(lane: number): number {
    return field.y + field.h - 30 - lane * CROSS_LANE_H;
  }

  function updateCrossing(dt: number, input: EngineInput) {
    const hopSpeed = 5.5 + spec.handling * 0.4;
    const hitNow = () =>
      crossing.vehicles.some(
        (v) =>
          v.lane === crossing.lane &&
          Math.abs(v.x - crossing.x) < (v.len + 0.05) / 2,
      );

    if (crossing.laneT > 0) {
      crossing.laneT -= dt * hopSpeed;
      if (crossing.laneT <= 0) {
        crossing.laneT = 0;
        crossing.lane = crossing.hopFrom + crossing.hopDir;
        if (hitNow()) {
          loseRun("Pip was clipped in traffic");
          return;
        }
        const btn = crossing.buttons.find(
          (b) =>
            !b.taken &&
            b.lane === crossing.lane &&
            Math.abs(b.x - crossing.x) < 0.09,
        );
        if (btn) {
          btn.taken = true;
          crossing.collected += 1;
          score += windfallScore(120);
          emit("checkpoint");
          burst(
            field.x + crossing.x * field.w,
            crossingLaneY(crossing.lane),
            10,
            ["#c9a25a", "#fff8e6"],
            90,
            150,
          );
          if (crossing.collected >= crossing.target) {
            winRun();
            return;
          }
          if (crossing.buttons.filter((b) => !b.taken).length < 3)
            crossingSpawnButton();
        }
        if (crossing.lane === CROSS_LANES) {
          // far pavement reached: pay the crossing bonus and head back
          score += windfallScore(60);
          emit("gate");
          crossing.hopFrom = crossing.lane;
          crossing.hopDir = -1;
          crossing.laneT = 1;
          return;
        }
      }
    } else {
      if (input.fire && !crossing.wasFire) {
        if (crossing.lane + 1 <= CROSS_LANES) {
          crossing.hopFrom = crossing.lane;
          crossing.hopDir = 1;
          crossing.laneT = 1;
          triggerSquash(squash, 0, 1);
        }
      }
      if (input.down && crossing.lane - 1 >= 0) {
        crossing.hopFrom = crossing.lane;
        crossing.hopDir = -1;
        crossing.laneT = 1;
      }
      if (input.left)
        crossing.x = clamp(crossing.x - dt * (0.55 + spec.handling * 0.03), 0.06, 0.94);
      if (input.right)
        crossing.x = clamp(crossing.x + dt * (0.55 + spec.handling * 0.03), 0.06, 0.94);
      if (hitNow()) {
        loseRun("Pip was clipped in traffic");
        return;
      }
    }
    crossing.wasFire = input.fire;

    // traffic per lane
    for (let lane = 1; lane < CROSS_LANES; lane++) {
      const dir = lane % 2 === 1 ? 1 : -1;
      crossing.spawnTimers[lane] -= dt;
      if (crossing.spawnTimers[lane] <= 0) {
        const density = 0.8 + spec.hazards * 0.12;
        crossing.spawnTimers[lane] =
          Math.max(0.55, (1.6 - spec.pace * 0.16) / density) + rng() * 0.8;
        const kind = Math.floor(rng() * 3);
        crossing.vehicles.push({
          lane,
          x: dir === 1 ? -0.12 : 1.12,
          speed: dir * (0.16 + spec.pace * 0.03 + rng() * 0.08),
          kind,
          len: kind === 0 ? 0.14 : kind === 1 ? 0.2 : 0.09,
        });
      }
    }
    for (let i = crossing.vehicles.length - 1; i >= 0; i--) {
      const v = crossing.vehicles[i];
      v.x += v.speed * dt;
      if (v.x < -0.3 || v.x > 1.3) crossing.vehicles.splice(i, 1);
    }

    updateTokenDrops(dt, (t) => {
      if (
        t.y > field.y + field.h - 46 &&
        Math.abs(t.x - (field.x + crossing.x * field.w)) < 14
      ) {
        score += windfallScore(60);
        emit("token");
        t.ttl = 0;
      }
    });
  }

  function renderCrossing(ctx: CanvasRenderingContext2D) {
    const sx = field.w / W;
    const sy = field.h / H;

    // pavements top & bottom
    drawBevelPlate(ctx, field.x, field.y + field.h - 30, field.w, 30, "#3a342c", "#6a6154", 3);
    drawBevelPlate(ctx, field.x, field.y, field.w, 26, "#3a342c", "#6a6154", 3);

    // traffic lanes with dashed brass markings
    for (let lane = 1; lane < CROSS_LANES; lane++) {
      const top = crossingLaneY(lane) - CROSS_LANE_H + 6;
      ctx.fillStyle = "#191d24";
      ctx.fillRect(field.x, top, field.w, CROSS_LANE_H - 6);
      ctx.fillStyle = "#c9a25a";
      const midY = crossingLaneY(lane) - CROSS_LANE_H / 2;
      for (let dx2 = field.x + 6; dx2 < field.x + field.w - 8; dx2 += 30) {
        ctx.fillRect(dx2, midY, 14, 2);
      }
    }

    // vehicles
    for (const v of crossing.vehicles) {
      const vy = crossingLaneY(v.lane) - CROSS_LANE_H / 2;
      const vw = v.len * field.w;
      const vx = field.x + v.x * field.w - vw / 2;
      glowOn(ctx, CROSS_COLORS[v.kind], 4);
      drawBevelPlate(ctx, vx, vy, vw, CROSS_LANE_H - 12, CROSS_COLORS[v.kind], "#ffe9c9", 2);
      glowOff(ctx);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(vx + vw * 0.15, vy + 3, vw * 0.2, 4);
      if (v.kind === 1) {
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.arc(vx + vw / 2, vy + (CROSS_LANE_H - 12) / 2, 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // brass buttons
    for (const b of crossing.buttons) {
      if (b.taken) continue;
      const byy = crossingLaneY(b.lane) - 6;
      const bxx = field.x + b.x * field.w;
      glowOn(ctx, "#c9a25a", 8);
      ctx.fillStyle = "#c9a25a";
      ctx.beginPath();
      ctx.arc(bxx, byy, 5, 0, Math.PI * 2);
      ctx.fill();
      glowOff(ctx);
      ctx.fillStyle = "#8a6a2b";
      ctx.fillRect(bxx - 2, byy - 1, 4, 2);
    }

    // Pip the pigeon, mid-hop arc
    const hopT = crossing.laneT;
    const tE = 1 - hopT;
    const laneNow = hopT > 0 ? crossing.hopFrom : crossing.lane;
    const laneNext = hopT > 0 ? crossing.hopFrom + crossing.hopDir : crossing.lane;
    const yNow = crossingLaneY(clamp(laneNow, 0, CROSS_LANES));
    const yNext = crossingLaneY(clamp(laneNext, 0, CROSS_LANES));
    const py2 = yNow + (yNext - yNow) * tE - Math.sin(tE * Math.PI) * 14;
    const pxx = field.x + crossing.x * field.w;
    glowOn(ctx, "#7ec8e3", 6);
    ctx.fillStyle = "#7ec8e3";
    ctx.beginPath();
    ctx.ellipse(pxx, py2 - 8, 8 * sx, 7 * sy, 0, 0, Math.PI * 2);
    ctx.fill();
    glowOff(ctx);
    ctx.fillStyle = "#a8d8ea";
    ctx.beginPath();
    ctx.arc(pxx + 6 * sx, py2 - 13, 4 * sy, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e2a33c";
    ctx.fillRect(pxx + 9 * sx, py2 - 14, 5 * sx, 2);
    ctx.fillStyle = "#2a2015";
    ctx.fillRect(pxx + 7 * sx, py2 - 14, 2, 2);
    ctx.fillStyle = "#e2a33c";
    ctx.fillRect(pxx - 3 * sx, py2 - 2, 2, Math.max(2, 4 * sy));
    ctx.fillRect(pxx + 2 * sx, py2 - 2, 2, Math.max(2, 4 * sy));

    drawScanlines(ctx, field.x, field.y, field.w, field.h);
    ctx.fillStyle = pal.ink;
    ctx.font = "10px monospace";
    ctx.fillText(
      `BUTTONS ${crossing.collected}/${crossing.target}`,
      field.x + 8,
      field.y + 14,
    );
  }

  function reset() {
    seals = maxSeals;
    score = 0;
    breakCombo();
    particles.length = 0;
    tokens = [];
    widenTimer = 0;
    slowTimer = 0;
    widenFactor = 1;
    slowFactor = 1;
    windfallCount = 0;
    blackoutOn = false;
    blackoutTimer = 0;
    blackoutPhase = 0;
    state = "title";
    buildBreakout();
    buildSnake();
    buildInvaders();
    buildMaze();
    buildFlyer();
    buildBurrower();
    buildScaffolding();
    buildMenagerie();
    buildCrossing();
    flyerSpawn = 0;
    scaffoldSpawn = 1.2;
    input_beam = false;
    debrisField.length = 0;
    resetBall();
    publishScore();
  }

  function start() {
    if (state === "won" || state === "lost" || state === "title") {
      reset();
      state = "playing";
    } else if (state === "paused") {
      state = "playing";
    }
    publishScore();
  }

  function togglePause() {
    if (state === "playing") state = "paused";
    else if (state === "paused") state = "playing";
    publishScore();
  }

  // ----- Token drops ---------------------------------------------------------

  function updateTokenDrops(dt: number, onCatch: (t: TokenDrop) => void) {
    if (tokens.length === 0) return;
    for (const t of tokens) {
      t.y += t.vy * dt;
      t.ttl -= dt;
      onCatch(t);
    }
    tokens = tokens.filter((t) => t.ttl > 0 && t.y < field.y + field.h + 24);
  }

  // ----- Update: Breaker ------------------------------------------------------

  function updateBreakout(dt: number, input: EngineInput) {
    const speed = 300;
    if (input.left) bat.x -= speed * dt;
    if (input.right) bat.x += speed * dt;
    const effW = bat.baseW * widenFactor;
    bat.x = clamp(bat.x, field.x + effW / 2, field.x + field.w - effW / 2);

    for (const rotor of rotors) rotor.angle += rotor.speed * dt;

    if (ball.stuck) {
      ball.x = bat.x;
      ball.y = field.y + field.h - 34;
      if (input.fire) {
        ball.stuck = false;
        const dir = input.left ? -1 : input.right ? 1 : rng() < 0.5 ? -1 : 1;
        ball.vx = dir * 140 * paceMul;
        ball.vy = -280 * paceMul;
      }
      return;
    }

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.x - ball.r < field.x) {
      ball.x = field.x + ball.r;
      ball.vx = Math.abs(ball.vx);
    }
    if (ball.x + ball.r > field.x + field.w) {
      ball.x = field.x + field.w - ball.r;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y - ball.r < field.y) {
      ball.y = field.y + ball.r;
      ball.vy = Math.abs(ball.vy);
    }

    const batY = field.y + field.h - 26;
    if (
      ball.vy > 0 &&
      ball.y + ball.r >= batY &&
      ball.y - ball.r <= batY + 12 &&
      ball.x >= bat.x - effW / 2 - ball.r &&
      ball.x <= bat.x + effW / 2 + ball.r
    ) {
      ball.y = batY - ball.r;
      const offset = clamp((ball.x - bat.x) / (effW / 2), -1, 1);
      const angle = offset * (Math.PI / 3);
      const sp = Math.hypot(ball.vx, ball.vy) * 1.015;
      ball.vx = Math.sin(angle) * sp;
      ball.vy = -Math.abs(Math.cos(angle) * sp);
      score += windfallScore(1);
    }

    for (const brick of bricks) {
      if (!brick.alive) continue;
      if (
        ball.x + ball.r > brick.x &&
        ball.x - ball.r < brick.x + brick.w &&
        ball.y + ball.r > brick.y &&
        ball.y - ball.r < brick.y + brick.h
      ) {
        const fromSide = ball.x < brick.x || ball.x > brick.x + brick.w;
        if (fromSide) ball.vx = -ball.vx;
        else ball.vy = -ball.vy;
        brick.hits -= 1;
        if (brick.hits > 0) {
          score += windfallScore(5);
          burst(ball.x, ball.y, 5, [pal.ink, pal.accent], 70);
        } else {
          brick.alive = false;
          score += windfallScore(scoreCombo(10));
          emit("brick");
          emit("combo");
          burst(
            brick.x + brick.w / 2,
            brick.y + brick.h / 2,
            14,
            [pal.ink, pal.accent, "#c9a25a"],
            110,
          );
          shake(1);
          if (rng() < 0.18) {
            spawnTokenAt(brick.x + brick.w / 2, brick.y + brick.h / 2);
          }
        }
        break;
      }
    }

    updateTokenDrops(dt, (t) => {
      if (
        t.x > bat.x - effW / 2 - 6 &&
        t.x < bat.x + effW / 2 + 6 &&
        t.y > batY - 14 &&
        t.y < batY + 22
      ) {
        applyToken(t.id);
        t.ttl = 0;
      }
    });

    if (ball.y - ball.r > field.y + field.h) {
      loseRun("The piece slipped the press");
      return;
    }

    if (spec.twist === "decade" && score >= 500) {
      winRun();
      return;
    }
    if (bricks.every((b) => !b.alive)) winRun();
  }

  // ----- Update: Serpent -------------------------------------------------------

  // ----- Mould: Stereoscope (first-person maze) ---------------------------------

  interface Cell {
    north: boolean;
    east: boolean;
    south: boolean;
    west: boolean;
  }

  const maze = {
    cells: [] as Cell[],
    cols: 8,
    rows: 8,
    px: 1.5,
    py: 1.5,
    heading: 0,
    checkpoints: [] as { x: number; y: number }[],
    claimed: 0,
    fuse: 120,
    elapsed: 0,
  };

  function buildMaze() {
    const girth = 8 + clamp(spec.gridDensity, 0, 9) * 2;
    maze.cols = girth;
    maze.rows = girth;
    maze.cells = [];
    for (let i = 0; i < maze.cols * maze.rows; i++) {
      maze.cells.push({ north: true, east: true, south: true, west: true });
    }
    // Iterative DFS carve (stack-based, deterministic under the injected rng).
    const visited = new Array(maze.cols * maze.rows).fill(false);
    const stack: number[] = [0];
    visited[0] = true;
    const neighbours = (idx: number) => {
      const col = idx % maze.cols;
      const row = Math.floor(idx / maze.cols);
      const out: { idx: number; wall: "north" | "east" | "south" | "west"; opp: "north" | "east" | "south" | "west" }[] = [];
      if (row > 0) out.push({ idx: idx - maze.cols, wall: "north", opp: "south" });
      if (col < maze.cols - 1) out.push({ idx: idx + 1, wall: "east", opp: "west" });
      if (row < maze.rows - 1) out.push({ idx: idx + maze.cols, wall: "south", opp: "north" });
      if (col > 0) out.push({ idx: idx - 1, wall: "west", opp: "east" });
      return out;
    };
    while (stack.length > 0) {
      const cur = stack[stack.length - 1];
      const opts = neighbours(cur).filter((n) => !visited[n.idx]);
      if (opts.length === 0) {
        stack.pop();
        continue;
      }
      const pick = opts[randInt(opts.length)];
      maze.cells[cur][pick.wall] = false;
      maze.cells[pick.idx][pick.opp] = false;
      visited[pick.idx] = true;
      stack.push(pick.idx);
    }
    // Braided shortcuts (skip when hazards dial is low → keep it a pure maze).
    if (spec.hazards >= 3) {
      const shortcuts = Math.floor((spec.hazards - 2) * 1.5);
      for (let i = 0; i < shortcuts; i++) {
        const idx = randInt(maze.cells.length);
        const col = idx % maze.cols;
        const row = Math.floor(idx / maze.cols);
        if (col < maze.cols - 1 && maze.cells[idx].east) {
          maze.cells[idx].east = false;
          maze.cells[idx + 1].west = false;
        }
      }
    }
    maze.px = 0.5 + 0.001;
    maze.py = 0.5 + 0.001;
    maze.heading = 0;
    maze.checkpoints = [];
    maze.claimed = 0;
    maze.fuse = 100 + spec.pace * 30;
    maze.elapsed = 0;
    const farthest = maze.cols * maze.rows - 1;
    for (let i = 0; i < Math.max(3, spec.tokens + 2); i++) {
      maze.checkpoints.push({
        x: (randInt(maze.cols - 2) + 1) + 0.5,
        y: (randInt(maze.rows - 2) + 1) + 0.5,
      });
    }
    void farthest;
    refillTokenBudget();
  }

  function mazeWallAt(x: number, y: number): boolean {
    const col = Math.floor(x);
    const row = Math.floor(y);
    if (col < 0 || row < 0 || col >= maze.cols || row >= maze.rows) return true;
    const c = maze.cells[row * maze.cols + col];
    const fx = x - col;
    const fy = y - row;
    if (fy < 0.12 && c.north) return true;
    if (fx > 0.88 && c.east) return true;
    if (fy > 0.76 && c.south) return true;
    if (fy > 0.12 && c.south) return false;
    if (fx < 0.12 && c.west) return true;
    return false;
  }

  function updateMaze(dt: number, input: EngineInput) {
    const turn = 2.6 * dt;
    const walk = 1.55 * (0.8 + spec.pace * 0.12) * dt;
    if (input.left) maze.heading -= turn;
    if (input.right) maze.heading += turn;
    const dx = Math.cos(maze.heading);
    const dy = Math.sin(maze.heading);
    let moved = false;
    if (input.up) {
      const nx = maze.px + dx * walk;
     const ny = maze.py + dy * walk;
      if (!mazeWallAt(nx, maze.py)) maze.px = nx;
      if (!mazeWallAt(maze.px, ny)) maze.py = ny;
      moved = true;
    }
    if (input.down) {
      const nx = maze.px - dx * walk;
      const ny = maze.py - dy * walk;
      if (!mazeWallAt(nx, maze.py)) maze.px = nx;
      if (!mazeWallAt(maze.px, ny)) maze.py = ny;
      moved = true;
      breakCombo();
    }
    if (moved) {
      score += windfallScore(1);
    }
    maze.elapsed += dt;
    if (maze.elapsed >= maze.fuse) {
      loseRun("The time fuse burned out");
      return;
    }
    for (let i = maze.checkpoints.length - 1; i >= 0; i--) {
      const cp = maze.checkpoints[i];
      if (
        Math.hypot(cp.x - maze.px, cp.y - maze.py) < 0.45
      ) {
        maze.checkpoints.splice(i, 1);
        maze.claimed += 1;
        score += windfallScore(scoreCombo(150));
        emit("checkpoint");
        emit("combo");
        shake(1);
        burst(W / 2, H / 2, 18, [pal.accent, pal.ink, "#c9a25a"], 120, 40);
      }
    }
    if (maze.checkpoints.length === 0) winRun();
  }

  // ----- Mould: Aerodrome ---------------------------------------------------------

  const flyer = {
    plane: { y: 0.5, vy: 0, tilt: 0 },
    gates: [] as { x: number; y: number; w: number; hit: boolean }[],
    balloons: [] as { x: number; y: number; r: number; phase: number }[],
    tokens: [] as { x: number; y: number; id: TokenId }[],
    distance: 0,
    bombTimer: 0,
  };

  function buildFlyer() {
    flyer.plane = { y: 0.5, vy: 0, tilt: 0 };
    flyer.gates = [];
    flyer.balloons = [];
    flyer.tokens = [];
    flyer.distance = 0;
    flyer.bombTimer = 0;
    refillTokenBudget();
  }
  let flyerSpawn = 0;

  function updateFlyer(dt: number, input: EngineInput) {
    const wind = 0.32 + spec.pace * 0.09;
    flyer.distance += wind * dt;
    flyer.plane.vy += (input.up ? -1.6 : 0) * dt + (input.down ? 1.6 : 0) * dt;
    flyer.plane.vy *= 0.92;
    flyer.plane.y = clamp(flyer.plane.y + flyer.plane.vy * dt, 0.06, 0.94);
    flyer.plane.tilt = clamp(flyer.plane.vy * 0.6, -0.5, 0.5);
    flyerSpawn -= dt;
    if (flyerSpawn <= 0) {
      flyerSpawn = Math.max(0.9, 1.9 - spec.hazards * 0.12) / (0.7 + spec.pace * 0.12);
      const gy = 0.15 + rng() * 0.7;
      flyer.gates.push({ x: 1.15, y: gy, w: 0.16 + spec.handling * 0.012, hit: false });
      if (rng() < 0.5 + spec.hazards * 0.04) {
        flyer.balloons.push({
          x: 1.25 + rng() * 0.2,
          y: rng(),
          r: 0.045 + rng() * 0.02,
          phase: rng() * Math.PI * 2,
        });
      }
      if (tokenBudget > 0 && rng() < 0.25) {
        const ids: TokenId[] = ["widen", "slowpress", "windfall"];
        flyer.tokens.push({ x: 1.2, y: rng(), id: ids[Math.floor(rng() * ids.length)] });
      }
    }
    const scroll = wind * dt;
    for (const g of flyer.gates) g.x -= scroll;
    for (const b of flyer.balloons) {
      b.x -= scroll;
      b.phase += dt * 1.4;
      b.y += Math.sin(b.phase) * 0.05 * dt;
    }
    for (const t of flyer.tokens) t.x -= scroll;
    flyer.gates = flyer.gates.filter((g) => g.x > -0.2);
    flyer.balloons = flyer.balloons.filter((b) => b.x > -0.15);
    flyer.tokens = flyer.tokens.filter((t) => t.x > -0.15);
    // gate crossings: the plane sits at x ≈ 0.22 of the field
    for (const g of flyer.gates) {
      if (g.hit) continue;
      if (g.x <= 0.24 && g.x > 0.1) {
        g.hit = true;
        if (Math.abs(flyer.plane.y - g.y) < g.w / 2 + 0.03) {
          score += windfallScore(scoreCombo(120));
          emit("gate");
          emit("combo");
          burst(W * 0.24, field.y + field.h * (0.32 + g.y * 0.6), 10, [pal.accent, "#c9a25a"], 80, 40);
        } else {
          breakCombo();
        }
      }
    }
    // balloon collisions
    for (const b of flyer.balloons) {
      const bx = b.x;
      const by = b.y;
      if (
        Math.abs(bx - 0.22) < b.r + 0.03 &&
        Math.abs(by - flyer.plane.y) < b.r * 1.4 + 0.04
      ) {
        b.x = -1;
        loseRun("A barrage balloon burst against the plane");
        return;
      }
    }
    // house tokens drift into the plane
    for (const t of flyer.tokens) {
      if (
        Math.abs(t.x - 0.22) < 0.04 &&
        Math.abs(t.y - flyer.plane.y) < 0.06
      ) {
        applyToken(t.id);
        t.x = -1;
      }
    }
    if (spec.twist === "decade" && score >= 500) {
      winRun();
      return;
    }
  }

  // ----- Update: Serpent -------------------------------------------------------

  function updateSnake(dt: number, input: EngineInput) {
    const { ox, oy } = snakeOrigin();

    // Tokens fall continuously, even between steps.
    updateTokenDrops(dt, (t) => {
      const headCell = snake.cells[0];
      const col = Math.floor((t.x - ox) / snake.cell);
      const row = Math.floor((t.y - oy) / snake.cell);
      if (headCell && col === headCell.x && row === headCell.y) {
        applyToken(t.id);
        t.ttl = 0;
      }
    });

    if (input.up && snake.dir.y === 0) snake.dir = { x: 0, y: -1 };
    else if (input.down && snake.dir.y === 0) snake.dir = { x: 0, y: 1 };
    else if (input.left && snake.dir.x === 0) snake.dir = { x: -1, y: 0 };
    else if (input.right && snake.dir.x === 0) snake.dir = { x: 1, y: 0 };

    snake.stepTimer += dt * paceMul;
    if (snake.stepTimer < snake.stepInterval / slowFactor) return;
    snake.stepTimer = 0;

    const head = snake.cells[0];
    let nx = head.x + snake.dir.x;
    let ny = head.y + snake.dir.y;

    const burrowIdx = snake.burrows.findIndex((b) => b.x === nx && b.y === ny);
    if (burrowIdx >= 0 && snake.burrows.length > 1) {
      const exit = snake.burrows[(burrowIdx + 1) % snake.burrows.length];
      nx = exit.x + snake.dir.x;
      ny = exit.y + snake.dir.y;
    }

    if (nx < 0 || ny < 0 || nx >= snake.cols || ny >= snake.rows) {
      loseRun("The serpent met the frame");
      return;
    }
    const bodyToCheck = snake.cells.slice(0, snake.cells.length - 1);
    if (bodyToCheck.some((c) => c.x === nx && c.y === ny)) {
      loseRun("The serpent bit its own coil");
      return;
    }

    snake.cells.unshift({ x: nx, y: ny });
    if (snake.grow > 0) snake.grow -= 1;
    else snake.cells.pop();

    const markIdx = snake.marks.findIndex((m) => m.x === nx && m.y === ny);
    if (markIdx >= 0) {
      snake.marks.splice(markIdx, 1);
      snake.eaten += 1;
      score += windfallScore(scoreCombo(100));
      snake.grow += 1 + Math.floor(spec.handling / 3);
      emit("mark");
      emit("combo");
      burst(
        ox + (nx + 0.5) * snake.cell,
        oy + (ny + 0.5) * snake.cell,
        10,
        [pal.ink, pal.accent],
        80,
        60,
      );
      if (rng() < 0.3) {
        spawnTokenAt(ox + (nx + 0.5) * snake.cell, oy + (ny + 1.5) * snake.cell);
      }
    }

    if (spec.twist === "decade" && score >= 500) {
      winRun();
      return;
    }
    if (snake.eaten >= snake.target) winRun();
  }

  // ----- Update: Sentinels -------------------------------------------------------

  function updateInvaders(dt: number, input: EngineInput) {
    const cannonSpeed = 240;
    if (input.left) invaders.cannon.x -= cannonSpeed * dt;
    if (input.right) invaders.cannon.x += cannonSpeed * dt;
    invaders.cannon.x = clamp(
      invaders.cannon.x,
      field.x + 14,
      field.x + field.w - 14,
    );

    if (invaders.rotor) invaders.rotor.angle += invaders.rotor.speed * dt;

    invaders.cannon.cooldown = Math.max(0, invaders.cannon.cooldown - dt);
    if (input.fire && invaders.cannon.cooldown <= 0) {
      invaders.bullets.push({ x: invaders.cannon.x, y: field.y + field.h - 40 });
      invaders.cannon.cooldown = Math.max(0.15, 0.5 - spec.handling * 0.06);
    }

    for (const b of invaders.bullets) b.y -= 430 * dt;
    invaders.bullets = invaders.bullets.filter((b) => b.y > field.y + 8);
    for (const b of invaders.bombs) b.y += 190 * dt * paceMul * slowFactor;
    invaders.bombs = invaders.bombs.filter((b) => b.y < field.y + field.h + 10);

    const total = invaders.alive.length || 1;
    const aliveCount = invaders.alive.filter(Boolean).length;
    invaders.stepTimer += dt * paceMul;
    const interval =
      (invaders.stepInterval * (0.35 + (0.65 * aliveCount) / total)) / slowFactor;
    if (invaders.stepTimer >= interval) {
      invaders.stepTimer = 0;
      const cell = W / (invaders.cols + 2);
      invaders.origin.x += invaders.dirX * cell * 0.5;
      let minX = Infinity;
      let maxX = -Infinity;
      for (let c = 0; c < invaders.cols; c++) {
        const colAlive = invaders.alive.some(
          (a, i) => a && i % invaders.cols === c,
        );
        if (!colAlive) continue;
        const p = sentinelPos(c, 0);
        minX = Math.min(minX, p.x - p.s / 2);
        maxX = Math.max(maxX, p.x + p.s / 2);
      }
      if (
        minX !== Infinity &&
        (minX < field.x + 6 || maxX > field.x + field.w - 6)
      ) {
        invaders.dirX *= -1;
        invaders.origin.x += invaders.dirX * cell * 0.5;
        invaders.origin.y += cell * 0.7;
      }
      if (rng() < 0.25 + spec.pace * 0.07) {
        const aliveIdx: number[] = [];
        invaders.alive.forEach((a, i) => {
          if (a) aliveIdx.push(i);
        });
        if (aliveIdx.length) {
          const idx = aliveIdx[randInt(aliveIdx.length)];
          const col = idx % invaders.cols;
          const row = Math.floor(idx / invaders.cols);
          const p = sentinelPos(col, row);
          invaders.bombs.push({ x: p.x, y: p.y + p.s });
        }
      }
    }

    // bullets vs rotor / sentinels / barriers
    bulletLoop: for (const b of invaders.bullets) {
      if (invaders.rotor) {
        for (const arm of [invaders.rotor.angle, invaders.rotor.angle + Math.PI]) {
          const ex = invaders.rotor.cx + Math.cos(arm) * invaders.rotor.radius;
          const ey = invaders.rotor.cy + Math.sin(arm) * invaders.rotor.radius;
          if (segDist(b.x, b.y, invaders.rotor.cx, invaders.rotor.cy, ex, ey) < 6) {
            b.y = -100;
            break;
          }
        }
      }
      for (let i = 0; i < invaders.alive.length; i++) {
        if (!invaders.alive[i]) continue;
        const col = i % invaders.cols;
        const row = Math.floor(i / invaders.cols);
        const p = sentinelPos(col, row);
        if (
          b.x > p.x - p.s / 2 - 4 &&
          b.x < p.x + p.s / 2 + 4 &&
          b.y > p.y - p.s / 2 - 4 &&
          b.y < p.y + p.s / 2 + 4
        ) {
          invaders.alive[i] = false;
          b.y = -100;
          score += windfallScore(scoreCombo(30));
          emit("sentinel");
          emit("combo");
          burst(p.x, p.y, 12, [pal.ink, pal.accent], 100);
          shake(0.8);
          if (rng() < 0.15) spawnTokenAt(p.x, p.y);
          break bulletLoop;
        }
      }
      for (const bar of invaders.barriers) {
        if (
          b.x > bar.x &&
          b.x < bar.x + bar.w &&
          b.y > bar.y &&
          b.y < bar.y + bar.h
        ) {
          b.y = -100;
          break;
        }
      }
    }
    invaders.bullets = invaders.bullets.filter((b) => b.y > 0);

    // bombs vs cannon / barriers
    for (const bomb of invaders.bombs) {
      if (
        bomb.x > invaders.cannon.x - 12 &&
        bomb.x < invaders.cannon.x + 12 &&
        bomb.y > field.y + field.h - 46 &&
        bomb.y < field.y + field.h - 20
      ) {
        bomb.y = field.y + field.h + 100;
        loseRun("A bomb found its mark");
        return;
      }
      for (const bar of invaders.barriers) {
        if (
          bomb.x > bar.x &&
          bomb.x < bar.x + bar.w &&
          bomb.y > bar.y &&
          bomb.y < bar.y + bar.h
        ) {
          bomb.y = field.y + field.h + 100;
          break;
        }
      }
    }

    updateTokenDrops(dt, (t) => {
      const cy = field.y + field.h - 36;
      if (
        t.x > invaders.cannon.x - 16 &&
        t.x < invaders.cannon.x + 16 &&
        t.y > cy - 16 &&
        t.y < cy + 14
      ) {
        applyToken(t.id);
        t.ttl = 0;
      }
    });

    // formation reaching the cannon line
    let lowestRow = -1;
    invaders.alive.forEach((a, i) => {
      if (a) lowestRow = Math.max(lowestRow, Math.floor(i / invaders.cols));
    });
    if (lowestRow >= 0) {
      const p = sentinelPos(0, lowestRow);
      if (p.y > field.y + field.h - 60) {
        loseRun("The ranks overran the line");
        return;
      }
    }

    if (spec.twist === "decade" && score >= 500) {
      winRun();
      return;
    }
    if (invaders.alive.every((a) => !a)) winRun();
  }

  // ----- Update dispatch --------------------------------------------------------

  let lastFire = false;

  function update(dt: number, input: EngineInput) {
    if (state !== "playing") {
      const fireEdge = input.fire && !lastFire;
      lastFire = input.fire;
      if (fireEdge) {
        start();
        // Swallow the starting press so a held key/tap does not also launch
        // the ball or fire the cannon on the first frame.
        input.fire = false;
      }
      return;
    }
    lastFire = input.fire;
    const step = Math.min(dt, 0.033);
    if (spec.mould === "breakout") updateBreakout(step, input);
    else if (spec.mould === "snake") updateSnake(step, input);
    else if (spec.mould === "maze") updateMaze(step, input);
    else if (spec.mould === "flyer") updateFlyer(step, input);
    else if (spec.mould === "burrower") updateBurrower(step, input);
    else if (spec.mould === "scaffolding") updateScaffolding(step, input);
    else if (spec.mould === "stacker") updateMenagerie(step, input);
    else if (spec.mould === "crossing") updateCrossing(step, input);
    else updateInvaders(step, input);
    tickEffects(step);
    tickBlackout(step);
    stepParticles(step);
    stepDebris(debrisField, step, field.y + field.h);
    squashScale(squash, step);
    shakeAmount *= 0.86;
    if (comboTimer > 0) {
      comboTimer = Math.max(0, comboTimer - step);
      if (comboTimer === 0) breakCombo();
    }
    if (state === "playing") publishScore();
  }

  // ----- Rendering -----------------------------------------------------------------

  function render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    // Authentic pitch-black arcade tube.
    ctx.fillStyle = CRT_BLACK;
    ctx.fillRect(0, 0, W, H);

    if (shakeAmount > 0.05) {
      ctx.translate(
        (rng() - 0.5) * 2 + (rng() - 0.5) * shakeAmount,
        (rng() - 0.5) * 2 + (rng() - 0.5) * shakeAmount,
      );
    }

    // Cabinet interior behind the playfield.
    ctx.fillStyle = pal.background;
    ctx.fillRect(field.x, field.y, field.w, field.h);

    ctx.save();
    ctx.beginPath();
    ctx.rect(field.x, field.y, field.w, field.h);
    ctx.clip();

    if (spec.mould === "breakout") renderBreakout(ctx);
    else if (spec.mould === "snake") renderSnake(ctx);
    else if (spec.mould === "maze") renderMaze(ctx);
    else if (spec.mould === "flyer") renderFlyer(ctx);
    else if (spec.mould === "burrower") renderBurrower(ctx);
    else if (spec.mould === "scaffolding") renderScaffolding(ctx);
    else if (spec.mould === "stacker") renderMenagerie(ctx);
    else if (spec.mould === "crossing") renderCrossing(ctx);
    else renderInvaders(ctx);

    renderParticles(ctx);
    renderDebris(ctx, debrisField);
    if (finish.grain) drawGrain(ctx);
    if (scanlines) drawScanlineGrille(ctx, field.x, field.y, field.w, field.h);
    if (blackoutOn) drawBlackout(ctx);
    ctx.restore();

    drawMarquee(ctx);
    drawFrameOverlay(ctx);
    if (finish.glow) drawGlow(ctx);
    drawBarrelCorners(ctx, 0, 0, W, H);
    drawVignette(ctx);

    if (state !== "playing") drawStateCard(ctx);
    ctx.restore();
  }

  // ----- Mould: Burrower (subterranean excavation) ---------------------------

  const BURROW_COLS = 20;
  const BURROW_ROWS = 26;
  // Four geological strata, top to bottom.
  const STRATA_COLORS = ["#c98f3d", "#a85c32", "#6e3a24", "#3d2140"];

  const burrow = {
    grid: [] as boolean[], // true = dug open
    px: 10,
    py: 1,
    dirX: 0,
    dirY: 1,
    marks: [] as { x: number; y: number }[],
    collected: 0,
    target: 8,
    pursuers: [] as { x: number; y: number; dx: number; dy: number; ghost: number; pops: number }[],
    hose: 0, // remaining inflate pulses on a caught pursuer
    hoseTarget: -1,
    boulders: [] as { x: number; y: number; falling: boolean }[],
    ghostTimer: 0,
  };

  function bgIdx(x: number, y: number) {
    return y * BURROW_COLS + x;
  }

  function bgOpen(x: number, y: number) {
    if (x < 0 || y < 0 || x >= BURROW_COLS || y >= BURROW_ROWS) return false;
    return burrow.grid[bgIdx(x, y)];
  }

  function bgDig(x: number, y: number) {
    if (x < 0 || y < 0 || x >= BURROW_COLS || y >= BURROW_ROWS) return;
    burrow.grid[bgIdx(x, y)] = true;
  }

  function strataOf(row: number) {
    const band = BURROW_ROWS / 4;
    return Math.min(3, Math.floor(row / band));
  }

  function buildBurrower() {
    burrow.grid = new Array(BURROW_COLS * BURROW_ROWS).fill(false);
    // Starter gallery: top row open + a shaft down the middle.
    for (let x = 0; x < BURROW_COLS; x++) bgDig(x, 0);
    for (let y = 0; y < 4; y++) bgDig(10, y);
    burrow.px = 10;
    burrow.py = 0;
    burrow.dirX = 0;
    burrow.dirY = 1;
    burrow.collected = 0;
    burrow.target = 8;
    burrow.marks = [];
    burrow.pursuers = [];
    burrow.hose = 0;
    burrow.hoseTarget = -1;
    burrow.boulders = [];
    burrow.ghostTimer = 0;
    const pursuerCount = 1 + Math.floor(clamp(spec.gridDensity, 0, 9) / 2);
    for (let i = 0; i < pursuerCount; i++) {
      burrow.pursuers.push({ x: 2 + i * 6, y: 0, dx: 1, dy: 0, ghost: 0, pops: 0 });
    }
    // Bury marks across the lower three strata.
    for (let i = 0; i < burrow.target; i++) {
      burrow.marks.push({
        x: randInt(BURROW_COLS),
        y: 6 + randInt(BURROW_ROWS - 7),
      });
    }
    // Overhead boulders embedded in strata.
    const boulderCount = 2 + Math.floor(clamp(spec.hazards, 0, 9) / 3);
    for (let i = 0; i < boulderCount; i++) {
      const bx = 1 + randInt(BURROW_COLS - 2);
      const by = 3 + randInt(BURROW_ROWS - 5);
      burrow.boulders.push({ x: bx, y: by, falling: false });
    }
    refillTokenBudget();
  }

  function updateBurrower(dt: number, input: EngineInput) {
    const speed = (2.6 + spec.pace * 0.25) * dt;
    let dirSet = false;
    if (input.left) {
      burrow.dirX = -1;
      burrow.dirY = 0;
      dirSet = true;
    } else if (input.right) {
      burrow.dirX = 1;
      burrow.dirY = 0;
      dirSet = true;
    } else if (input.up) {
      burrow.dirX = 0;
      burrow.dirY = -1;
      dirSet = true;
    } else if (input.down) {
      burrow.dirX = 0;
      burrow.dirY = 1;
      dirSet = true;
    }
    if (dirSet) triggerSquash(squash, burrow.dirX, burrow.dirY);

    // freeform movement with continuous digging
    const nx = burrow.px + burrow.dirX * speed;
    const ny = burrow.py + burrow.dirY * speed;
    if (
      nx > 0.2 &&
      nx < BURROW_COLS - 0.2 &&
      ny > 0.2 &&
      ny < BURROW_ROWS - 0.2
    ) {
      burrow.px = nx;
      burrow.py = ny;
      const cx = Math.floor(burrow.px);
      const cy = Math.floor(burrow.py);
      if (!bgOpen(cx, cy)) {
        bgDig(cx, cy);
        score += windfallScore(2);
      }
    }

    // collect marks
    for (let i = burrow.marks.length - 1; i >= 0; i--) {
      const m = burrow.marks[i];
      if (
        Math.abs(m.x + 0.5 - burrow.px) < 0.6 &&
        Math.abs(m.y + 0.5 - burrow.py) < 0.6
      ) {
        burrow.marks.splice(i, 1);
        burrow.collected += 1;
        score += windfallScore(scoreCombo(100));
        emit("mark");
        emit("combo");
        const cell = field.w / BURROW_COLS;
        popDebris(
          field.x + (m.x + 0.5) * cell,
          field.y + (m.y + 0.5) * cell,
          ["#ffd23f", pal.accent, "#ffffff"],
          8,
        );
        shake(1.5);
        triggerSquash(squash, 0, -1);
      }
    }

    // hose: hold fire to inflate the pursuer you face (up to 3 tiles)
    const pursuers = burrow.pursuers;
    if (input.fire) {
      if (burrow.hoseTarget < 0) {
        for (let i = 0; i < pursuers.length; i++) {
          const p = pursuers[i];
          const rx = p.x + 0.5 - burrow.px;
          const ry = p.y + 0.5 - burrow.py;
          const facing = rx * burrow.dirX + ry * burrow.dirY;
          const lateral = Math.abs(rx * burrow.dirY - ry * burrow.dirX);
          if (facing > 0 && facing <= 3 && lateral < 0.8) {
            burrow.hoseTarget = i;
            burrow.hose = 0;
            break;
          }
        }
      }
      if (burrow.hoseTarget >= 0) {
        burrow.hose += dt;
        const pulses = Math.floor(burrow.hose / 1.0); // one pulse per second
        const p = pursuers[burrow.hoseTarget];
        if (p && pulses >= 3) {
          // popped!
          p.pops += 1;
          score += windfallScore(200);
          emit("pop");
          popDebris(field.x + (p.x + 0.5) * (field.w / BURROW_COLS), field.y + (p.y + 0.5) * (field.h / BURROW_ROWS), ["#ff5a5a", "#ffd23f", "#ffffff"], 10);
          shake(2.5);
          pursuers.splice(burrow.hoseTarget, 1);
          burrow.hoseTarget = -1;
          burrow.hose = 0;
        }
      }
    } else {
      burrow.hoseTarget = -1;
      burrow.hose = 0;
    }

    // pursuers: patrol open tunnels, ghost through strata when idle/aggro
    burrow.ghostTimer += dt;
    const ghostPhase = burrow.ghostTimer % 12;
    const ghosting = ghostPhase > 8; // aggressive window
    for (const p of pursuers) {
      if (ghosting) {
        p.ghost = Math.min(1, p.ghost + dt * 0.7);
        // drift slowly toward player through anything
        const dx = burrow.px - p.x;
        const dy = burrow.py - p.y;
        const d = Math.hypot(dx, dy) || 1;
        const gs = 0.55 * dt;
        p.x += (dx / d) * gs;
        p.y += (dy / d) * gs;
      } else {
        p.ghost = Math.max(0, p.ghost - dt * 0.7);
        // patrol along open cells
        const pxC = Math.floor(p.x);
        const pyC = Math.floor(p.y);
        if (!bgOpen(pxC + p.dx, pyC + p.dy)) {
          // pick a new open direction
          const dirs = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ].filter(([dx, dy]) => bgOpen(pxC + dx, pyC + dy));
          if (dirs.length) {
            const pick = dirs[randInt(dirs.length)];
            p.dx = pick[0];
            p.dy = pick[1];
          } else {
            p.dx = 0;
            p.dy = 0;
          }
        }
        p.x += p.dx * (1.3 + spec.pace * 0.12) * dt;
        p.y += p.dy * (1.3 + spec.pace * 0.12) * dt;
      }
      // catch the player
      if (
        Math.abs(p.x + 0.5 - burrow.px) < 0.55 &&
        Math.abs(p.y + 0.5 - burrow.py) < 0.55 &&
        p.ghost < 0.5
      ) {
        loseRun("A pursuer caught the burrower");
        return;
      }
    }

    // boulders fall when the cell below them is dug
    for (const b of burrow.boulders) {
      const belowOpen = bgOpen(b.x, b.y + 1);
      const playerBelow =
        Math.floor(burrow.px) === b.x && burrow.py > b.y + 1;
      if (!b.falling && (belowOpen || playerBelow)) b.falling = true;
      if (b.falling) {
        b.y += (3.2 + spec.pace * 0.3) * dt;
        // crush pursuers
        for (let i = pursuers.length - 1; i >= 0; i--) {
          const p = pursuers[i];
          if (
            Math.floor(p.x) === b.x &&
            Math.abs(p.y - b.y) < 0.7
          ) {
            pursuers.splice(i, 1);
            score += windfallScore(200);
            emit("pop");
            shake(2.5);
            popDebris(field.x + (p.x + 0.5) * (field.w / BURROW_COLS), field.y + (p.y + 0.5) * (field.h / BURROW_ROWS), [STRATA_COLORS[2], "#555", "#888"], 10);
          }
        }
        // crush the player
        if (
          Math.floor(burrow.px) === b.x &&
          Math.abs(burrow.py - b.y) < 0.6
        ) {
          b.falling = false;
          b.y = 1 + randInt(BURROW_ROWS - 3);
          loseRun("A boulder came down the shaft");
          return;
        }
        if (b.y > BURROW_ROWS) {
          b.falling = false;
          b.y = 1 + randInt(BURROW_ROWS - 3);
        }
      }
    }

    if (burrow.collected >= burrow.target) winRun();
  }

  function renderBurrower(ctx: CanvasRenderingContext2D) {
    const cellW = field.w / BURROW_COLS;
    const cellH = field.h / BURROW_ROWS;
    // strata bands
    for (let row = 0; row < BURROW_ROWS; row++) {
      const s = strataOf(row);
      ctx.fillStyle = STRATA_COLORS[s];
      ctx.fillRect(field.x, field.y + row * cellH, field.w, cellH + 1);
      // stratification lines
      if (row % 4 === 3) {
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.fillRect(field.x, field.y + (row + 1) * cellH - 1, field.w, 1);
      }
    }
    // dug tunnels: dark negative space with inset shadow
    for (let y = 0; y < BURROW_ROWS; y++) {
      for (let x = 0; x < BURROW_COLS; x++) {
        if (!bgOpen(x, y)) continue;
        const px = field.x + x * cellW;
        const py = field.y + y * cellH;
        ctx.fillStyle = "#0a0608";
        ctx.fillRect(px, py, cellW + 1, cellH + 1);
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.strokeRect(px + 1.5, py + 1.5, cellW - 3, cellH - 3);
      }
    }
    // buried marks glow softly
    glowOn(ctx, "#ffd23f", 6);
    ctx.fillStyle = "#ffd23f";
    for (const m of burrow.marks) {
      const px = field.x + (m.x + 0.5) * cellW;
      const py = field.y + (m.y + 0.5) * cellH;
      ctx.fillRect(px - 3, py - 3, 6, 6);
    }
    glowOff(ctx);
    // boulders (bevelled plates)
    for (const b of burrow.boulders) {
      drawBevelPlate(
        ctx,
        field.x + b.x * cellW + 1,
        field.y + b.y * cellH + 1,
        cellW - 2,
        cellH - 2,
        "#7d7d85",
        "#c8c8d4",
        2,
      );
    }
    // pursuers (inflate with hose progress)
    for (const p of burrow.pursuers) {
      const px = field.x + (p.x + 0.5) * cellW;
      const py = field.y + (p.y + 0.5) * cellH;
      const inflate = 1 + (burrow.hoseTarget >= 0 ? Math.floor(burrow.hose) * 0.25 : 0);
      const r = cellW * 0.34 * inflate;
      ctx.globalAlpha = p.ghost > 0 ? 0.45 + p.ghost * 0.2 : 1;
      glowOn(ctx, p.ghost > 0.5 ? "#b06aff" : "#ff5a5a", 6);
      ctx.fillStyle = p.ghost > 0.5 ? "#b06aff" : "#ff5a5a";
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
      glowOff(ctx);
      ctx.fillStyle = "#fff";
      ctx.fillRect(px - r * 0.5, py - r * 0.3, r * 0.35, r * 0.35);
      ctx.fillRect(px + r * 0.15, py - r * 0.3, r * 0.35, r * 0.35);
      ctx.globalAlpha = 1;
    }
    // the burrower (squash & stretch)
    const { sx, sy } = squashScale(squash, 0);
    const bpx = field.x + burrow.px * cellW;
    const bpy = field.y + burrow.py * cellH;
    glowOn(ctx, "#5ad7ff", 6);
    ctx.fillStyle = "#5ad7ff";
    ctx.beginPath();
    ctx.ellipse(bpx, bpy, (cellW * 0.38 * sx), (cellH * 0.38 * sy), 0, 0, Math.PI * 2);
    ctx.fill();
    glowOff(ctx);
    ctx.fillStyle = "#0a0608";
    ctx.fillRect(bpx - 3, bpy - 2, 2, 2);
    ctx.fillRect(bpx + 1, bpy - 2, 2, 2);
    // hose beam when pumping
    if (burrow.hoseTarget >= 0 && input_beam) {
      const p = burrow.pursuers[burrow.hoseTarget];
      if (p) {
        glowOn(ctx, "#ffd23f", 6);
        ctx.strokeStyle = "#ffd23f";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bpx, bpy);
        ctx.lineTo(field.x + (p.x + 0.5) * cellW, field.y + (p.y + 0.5) * cellH);
        ctx.stroke();
        glowOff(ctx);
        ctx.lineWidth = 1;
      }
    }
  }

  // holder for hose beam visibility (set in update, read in render)
  let input_beam = false;

  // ----- Mould: Scaffolding (tiers, inclines, barrels) -------------------------

  const SCAFF_TIERS = 6;
  const scaffold = {
    px: 0.12,
    py: 0,
    vx: 0,
    vy: 0,
    onLadder: false,
    facing: 1,
    tier: 0,
    barrels: [] as { x: number; y: number; tier: number; dx: number; roll: number }[],
    mallet: 0, // seconds remaining
    malletItem: { x: 0.5, tier: 3, taken: false },
    apexReached: false,
  };

  /** Tier y positions (normalized 0..1 from bottom); zigzag incline direction per tier. */
  function scaffoldTierY(tier: number) {
    return 0.16 + (SCAFF_TIERS - 1 - tier) * (0.72 / (SCAFF_TIERS - 1));
  }
  function scaffoldTierDir(tier: number) {
    return tier % 2 === 0 ? 1 : -1;
  }

  function buildScaffolding() {
    scaffold.px = 0.12;
    scaffold.py = 0;
    scaffold.vx = 0;
    scaffold.vy = 0;
    scaffold.tier = 0;
    scaffold.facing = 1;
    scaffold.barrels = [];
    scaffold.mallet = 0;
    scaffold.malletItem = { x: 0.5, tier: 3, taken: false };
    scaffold.apexReached = false;
  }

  let scaffoldSpawn = 1.2;

  function updateScaffolding(dt: number, input: EngineInput) {
    const runSpeed = 0.34 + spec.handling * 0.02;
    const grav = 1.9;
    const tier = scaffold.tier;
    const tierY = scaffoldTierY(tier);

    // horizontal run
    let move = 0;
    if (input.left) move = -1;
    if (input.right) move = 1;
    if (move !== 0) {
      scaffold.facing = move;
      scaffold.vx = move * runSpeed;
      if (move !== scaffold.facing) triggerSquash(squash, move, 0);
    } else {
      scaffold.vx = 0;
    }
    scaffold.px = clamp(scaffold.px + scaffold.vx * dt, 0.03, 0.97);

    // ladders at alternating ends per tier; climb with up/down
    const ladderX = scaffoldTierDir(tier) === 1 ? 0.9 : 0.1;
    const nearLadder = Math.abs(scaffold.px - ladderX) < 0.05;
    scaffold.onLadder = nearLadder;
    if (nearLadder && input.up && tier < SCAFF_TIERS - 1) {
      scaffold.py -= 0.5 * dt;
      if (scaffold.py < -0.02) {
        scaffold.tier += 1;
        scaffold.py = 0;
        score += windfallScore(80);
        emit("checkpoint");
        if (scaffold.tier === SCAFF_TIERS - 1) {
          scaffold.apexReached = true;
          emit("apex");
          winRun();
          return;
        }
      }
    } else if (nearLadder && input.down && tier > 0 && scaffold.py < 0) {
      scaffold.py += 0.5 * dt;
      if (scaffold.py > 0) {
        scaffold.tier -= 1;
        scaffold.py = 0;
      }
    } else if (!nearLadder) {
      scaffold.py = Math.min(0, scaffold.py + grav * dt * 0.2);
    }

    // barrels spawn at the apex and roll down
    scaffoldSpawn -= dt;
    if (scaffoldSpawn <= 0) {
      scaffoldSpawn = Math.max(0.8, 2.2 - spec.pace * 0.25);
      scaffold.barrels.push({
        x: scaffoldTierDir(SCAFF_TIERS - 1) === 1 ? 0.06 : 0.94,
        y: 0,
        tier: SCAFF_TIERS - 1,
        dx: scaffoldTierDir(SCAFF_TIERS - 1),
        roll: 0,
      });
    }
    for (let i = scaffold.barrels.length - 1; i >= 0; i--) {
      const b = scaffold.barrels[i];
      b.roll += dt * 9 * b.dx;
      b.x += b.dx * (0.16 + spec.pace * 0.025) * dt;
      const edge = b.dx === 1 ? 0.94 : 0.06;
      if (
        (b.dx === 1 && b.x >= edge) ||
        (b.dx === -1 && b.x <= edge)
      ) {
        if (b.tier > 0) {
          b.tier -= 1;
          b.dx = scaffoldTierDir(b.tier);
          b.x = edge;
        } else {
          scaffold.barrels.splice(i, 1);
          continue;
        }
      }
      // mallet smash
      if (
        scaffold.mallet > 0 &&
        b.tier === scaffold.tier &&
        Math.abs(b.x - scaffold.px) < 0.05
      ) {
        scaffold.barrels.splice(i, 1);
        score += windfallScore(scoreCombo(200));
        emit("barrel");
        popDebris(
          field.x + b.x * field.w,
          field.y + (1 - scaffoldTierY(b.tier)) * field.h,
          ["#FF0055", "#ffd23f", "#fff"],
          8,
        );
        shake(2);
        continue;
      }
      // hit the player
      if (
        b.tier === scaffold.tier &&
        Math.abs(b.x - scaffold.px) < 0.045 &&
        scaffold.mallet <= 0
      ) {
        scaffold.barrels.splice(i, 1);
        loseRun("A barrel caught the climber");
        return;
      }
    }

    // mallet pickup
    if (
      !scaffold.malletItem.taken &&
      scaffold.tier === scaffold.malletItem.tier &&
      Math.abs(scaffold.px - scaffold.malletItem.x) < 0.05
    ) {
      scaffold.malletItem.taken = true;
      scaffold.mallet = 8;
      emit("token");
    }
    if (scaffold.mallet > 0) scaffold.mallet = Math.max(0, scaffold.mallet - dt);
  }

  function renderScaffolding(ctx: CanvasRenderingContext2D) {
    // starfield backdrop twinkle
    ctx.fillStyle = CRT_BLACK;
    ctx.fillRect(field.x, field.y, field.w, field.h);
    for (let i = 0; i < 40; i++) {
      const sx2 = field.x + ((i * 89) % field.w);
      const sy2 = field.y + ((i * 149) % field.h);
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(i * 2.7 + performance.now() * 0.002));
      ctx.fillStyle = `rgba(255,255,255,${0.18 * tw})`;
      ctx.fillRect(sx2, sy2, 1.5, 1.5);
    }
    // tiers as magenta/crimson bevelled girders with rivets
    for (let t = 0; t < SCAFF_TIERS; t++) {
      const y = field.y + (1 - scaffoldTierY(t)) * field.h;
      drawGirder(
        ctx,
        field.x,
        y,
        field.w,
        10,
        "#FF0055",
        "#ff77aa",
        "#ffd23f",
      );
      // ladder rails at the tier's ladder end
      const lx = scaffoldTierDir(t) === 1 ? 0.9 : 0.1;
      const topY = field.y + (1 - scaffoldTierY(t + 1 < SCAFF_TIERS ? t + 1 : t)) * field.h;
      ctx.strokeStyle = "#ffd23f";
      glowOn(ctx, "#ffd23f", 4);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(field.x + lx * field.w, y);
      ctx.lineTo(field.x + lx * field.w, topY);
      ctx.stroke();
      glowOff(ctx);
      for (let rung = 0; rung < 5; rung++) {
        const ry = y - (rung + 0.5) * ((y - topY) / 5);
        ctx.beginPath();
        ctx.moveTo(field.x + lx * field.w - 6, ry);
        ctx.lineTo(field.x + lx * field.w + 6, ry);
        ctx.stroke();
      }
      ctx.lineWidth = 1;
    }
    // mallet pickup
    if (!scaffold.malletItem.taken) {
      const mx = field.x + scaffold.malletItem.x * field.w;
      const my = field.y + (1 - scaffoldTierY(scaffold.malletItem.tier)) * field.h - 18;
      glowOn(ctx, "#ffd23f", 6);
      ctx.fillStyle = "#ffd23f";
      ctx.fillRect(mx - 4, my - 10, 8, 8);
      ctx.fillRect(mx - 1.5, my - 2, 3, 10);
      glowOff(ctx);
    }
    // barrels rolling down inclines
    for (const b of scaffold.barrels) {
      const bx = field.x + b.x * field.w;
      const by = field.y + (1 - scaffoldTierY(b.tier)) * field.h - 8;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(b.roll);
      glowOn(ctx, "#ff8866", 5);
      ctx.fillStyle = "#ff8866";
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      glowOff(ctx);
      ctx.strokeStyle = "#662211";
      ctx.stroke();
      ctx.fillStyle = "#662211";
      ctx.fillRect(-1.5, -6, 3, 12);
      ctx.fillRect(-6, -1.5, 12, 3);
      ctx.restore();
    }
    // the climber (squash & stretch)
    const { sx, sy } = squashScale(squash, 0);
    const cxp = field.x + scaffold.px * field.w;
    const cyp = field.y + (1 - scaffoldTierY(scaffold.tier)) * field.h - 12 + scaffold.py * 40;
    glowOn(ctx, "#5ad7ff", 6);
    ctx.fillStyle = scaffold.mallet > 0 ? "#ffd23f" : "#5ad7ff";
    ctx.fillRect(cxp - 5 * sx, cyp - 12 * sy, 10 * sx, 12 * sy);
    glowOff(ctx);
    ctx.fillStyle = "#fff";
    ctx.fillRect(cxp - 3 * sx, cyp - 15 * sy, 6 * sx, 4 * sy);
  }

  // ----- Mould: Stereoscope rendering (raycast walls) ------------------------

  function renderMaze(ctx: CanvasRenderingContext2D) {
    const cx = field.x + field.w / 2;
    const fovHalf = Math.PI / 4;
    const rays = 72;
    const colW = field.w / rays;
    const maxDepth = 14;
    const sky = withAlpha(pal.background, 1);
    const floorY = field.y + field.h * 0.62;
    ctx.fillStyle = sky;
    ctx.fillRect(field.x, field.y, field.w, floorY - field.y);
    // Vector-cabinet floor grid: perspective receding lines + rungs.
    ctx.fillStyle = withAlpha(pal.grid, 0.4);
    ctx.fillRect(field.x, floorY, field.w, field.y + field.h - floorY);
    ctx.strokeStyle = "rgba(94, 234, 212, 0.5)";
    ctx.lineWidth = 1;
    const vpx = cx;
    for (let i = 0; i <= 12; i++) {
      const x = field.x + (i / 12) * field.w;
      ctx.beginPath();
      ctx.moveTo(vpx, floorY);
      ctx.lineTo(x, field.y + field.h);
      ctx.stroke();
    }
    for (let i = 0; i < 26; i++) {
      const y = floorY + (i / 26) ** 1.6 * (field.y + field.h - floorY);
      ctx.strokeStyle = `rgba(94, 234, 212, ${0.08 + (i / 26) * 0.3})`;
      ctx.beginPath();
      ctx.moveTo(field.x, y);
      ctx.lineTo(field.x + field.w, y);
      ctx.stroke();
    }
    for (let i = 0; i < rays; i++) {
      const angle = maze.heading - fovHalf + (i / (rays - 1)) * fovHalf * 2;
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);
      let dist = 0;
      let side = 0;
      const stepLen = 0.02;
      let px = maze.px;
      let py = maze.py;
      while (dist < maxDepth) {
        px += dirX * stepLen;
        py += dirY * stepLen;
        dist += stepLen;
        if (mazeWallAt(px, py)) break;
      }
      if (dist >= maxDepth) {
        ctx.fillStyle = withAlpha(pal.grid, 0.12);
        ctx.fillRect(field.x + i * colW, field.y, colW + 1, floorY - field.y);
        continue;
      }
      side = px % 1 < 0.5 && Math.abs(px - Math.round(px)) < stepLen * 2 ? 1 : 0;
      const corrected = dist * Math.cos(angle - maze.heading);
      const wallH = (field.h * 0.72) / corrected;
      const wallTop = field.y + field.h / 2 - wallH / 2;
      const shade = clamp(1 - corrected / maxDepth, 0.12, 1);
      ctx.fillStyle = side
        ? withAlpha(pal.ink, shade)
        : withAlpha(pal.accent, shade * 0.85);
      ctx.fillRect(field.x + i * colW, wallTop, colW + 1, wallH);
      if (corrected < 3.2) {
        ctx.fillStyle = withAlpha(pal.ink, 0.55);
        ctx.fillRect(field.x + i * colW, wallTop, colW + 1, 2);
        ctx.fillRect(field.x + i * i * colW, wallTop + wallH - 2, colW + 1, 2);
      }
    }
    // compass ring
    ctx.strokeStyle = withAlpha(pal.ink, 0.4);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, field.y + 26, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = withAlpha(pal.accent, 0.9);
    ctx.beginPath();
    ctx.moveTo(cx, field.y + 26);
    ctx.lineTo(cx + Math.cos(maze.heading) * 8, field.y + 26 + Math.sin(maze.heading) * 8);
    ctx.stroke();
    // checkpoint beacons projected into the view
    for (const cp of maze.checkpoints) {
      const rel = Math.atan2(cp.y - maze.py, cp.x - maze.px) - maze.heading;
      const wrapped = Math.atan2(Math.sin(rel), Math.cos(rel));
      if (Math.abs(wrapped) > fovHalf * 1.1) continue;
      const screenX = cx + (wrapped / fovHalf) * (field.w / 2);
      const d = Math.hypot(cp.x - maze.px, cp.y - maze.py);
      const s = clamp(90 / Math.max(1, d * 3), 5, 26);
      ctx.fillStyle = "#c9a25a";
      ctx.beginPath();
      ctx.arc(screenX, field.y + field.h / 2, s, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = withAlpha(pal.ink, 0.8);
      ctx.stroke();
    }
  }

  // ----- Mould: Aerodrome rendering -------------------------------------------

  function renderFlyer(ctx: CanvasRenderingContext2D) {
    const horizon = field.y + field.h * 0.3;
    ctx.fillStyle = withAlpha(pal.background, 1);
    ctx.fillRect(field.x, field.y, field.w, horizon - field.y);
    ctx.fillStyle = withAlpha(pal.grid, 0.5);
    ctx.fillRect(field.x, horizon, field.w, field.y + field.h - horizon);
    // receding runway stripes
    ctx.fillStyle = withAlpha(pal.ink, 0.25);
    for (let i = 0; i < 10; i++) {
      const t = (flyer.distance * 0.8 + i * 0.1) % 1;
      const y = horizon + t * t * (field.h * 0.7);
      const w = 2 + t * 8;
      ctx.fillRect(W / 2 - w / 2, y, w, 2 + t * 3);
    }
    // balloons behind gates
    for (const b of flyer.balloons) {
      const bx = field.x + b.x * field.w;
      const by = field.y + field.h * (0.32 + b.y * 0.6);
      const r = b.r * field.w;
      ctx.fillStyle = withAlpha(pal.accent, 0.9);
      ctx.beginPath();
      ctx.ellipse(bx, by, r, r * 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = withAlpha(pal.ink, 0.6);
      ctx.stroke();
      ctx.strokeStyle = withAlpha(pal.ink, 0.5);
      ctx.beginPath();
      ctx.moveTo(bx, by + r * 1.2);
      ctx.lineTo(bx, by + r * 1.2 + r);
      ctx.stroke();
    }
    // gates (barrage rings)
    for (const g of flyer.gates) {
      const gx = field.x + g.x * field.w;
      const gy = field.y + field.h * (0.32 + g.y * 0.6);
      const grow = clamp(1.15 - g.x, 0.08, 1);
      const rw = field.w * 0.09 * grow;
      const rh = field.h * 0.16 * grow;
      ctx.strokeStyle = g.hit ? withAlpha(pal.accent, 0.45) : withAlpha(pal.ink, 0.85);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(gx, gy, rw, rh, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (!g.hit && g.x < 0.35) {
        ctx.strokeStyle = withAlpha("#c9a25a", 0.8);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(gx, gy, rw + 4, rh + 6, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // token drops
    for (const t of flyer.tokens) {
      drawToken(ctx, field.x + t.x * field.w, field.y + field.h * (0.32 + t.y * 0.6), t.id);
    }
    // the biplane (vintage silhouette)
    const planeX = field.x + field.w * 0.22;
    const planeY = field.y + field.h * (0.32 + flyer.plane.y * 0.6);
    ctx.save();
    ctx.translate(planeX, planeY);
    ctx.rotate(flyer.plane.tilt);
    ctx.fillStyle = pal.ink;
    ctx.fillRect(-16, -3, 32, 6);
    ctx.fillRect(-2, -12, 4, 10);
    ctx.fillRect(-18, -10, 5, 20);
    ctx.fillRect(12, -8, 3, 16);
    ctx.fillStyle = pal.accent;
    ctx.fillRect(-18, -2, 5, 4);
    ctx.fillRect(-2, -12, 4, 3);
    ctx.restore();
    // distance ledger
    ctx.fillStyle = pal.ink;
    ctx.font = '600 10px "Courier New", monospace';
    ctx.textAlign = "right";
    ctx.fillText(
      `CHAIN ${Math.floor(flyer.distance * 100)} yd`,
      field.x + field.w - 10,
      field.y + 34,
    );
    ctx.textAlign = "left";
  }

  function renderParticles(ctx: CanvasRenderingContext2D) {
    for (const p of particles) {
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.fillStyle = withAlpha(p.color, alpha * 0.9);
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
  }

  // Classic arcade brick row bands: red, orange, amber, emerald, azure.
  const ARCADE_ROW_COLORS = [
    "#ff3344",
    "#ff7733",
    "#ffcc33",
    "#33cc66",
    "#33aaff",
  ];

  function renderBreakout(ctx: CanvasRenderingContext2D) {
    for (const brick of bricks) {
      if (!brick.alive) continue;
      const band = ARCADE_ROW_COLORS[brick.tone % ARCADE_ROW_COLORS.length];
      drawBevelPlate(ctx, brick.x, brick.y, brick.w, brick.h, band, "#ffffff", 2);
      if (brick.hits > 1) {
        ctx.strokeStyle = withAlpha("#ffffff", 0.9);
        ctx.strokeRect(brick.x + 2.5, brick.y + 2.5, brick.w - 5, brick.h - 5);
      }
    }

    for (const rotor of rotors) {
      ctx.strokeStyle = withAlpha(pal.accent, 0.9);
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (const arm of [rotor.angle, rotor.angle + Math.PI]) {
        ctx.moveTo(rotor.cx, rotor.cy);
        ctx.lineTo(
          rotor.cx + Math.cos(arm) * rotor.radius,
          rotor.cy + Math.sin(arm) * rotor.radius,
        );
      }
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = pal.accent;
      ctx.beginPath();
      ctx.arc(rotor.cx, rotor.cy, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    const batY = field.y + field.h - 26;
    const effW = bat.baseW * widenFactor;
    // glossy paddle with specular streak
    drawBevelPlate(ctx, bat.x - effW / 2, batY, effW, 12, pal.accent, "#ffffff", 2);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(bat.x - effW / 2 + 4, batY + 2, Math.max(4, effW * 0.25), 2);
    if (widenTimer > 0) {
      glowOn(ctx, "#ffd23f", 6);
      ctx.strokeStyle = "#ffd23f";
      ctx.strokeRect(bat.x - effW / 2 - 2, batY - 2, effW + 4, 16);
      glowOff(ctx);
    }

    // ball with phosphor glow + fading trail
    ballTrail.push({ x: ball.x, y: ball.y });
    if (ballTrail.length > 8) ballTrail.shift();
    for (let i = 0; i < ballTrail.length; i++) {
      const t = ballTrail[i];
      const a = (i / ballTrail.length) * 0.4;
      ctx.fillStyle = withAlpha("#ffffff", a);
      ctx.beginPath();
      ctx.arc(t.x, t.y, ball.r * (0.4 + (i / ballTrail.length) * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    glowOn(ctx, "#ffffff", 6);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    glowOff(ctx);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(ball.x - 2, ball.y - 2, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function renderSnake(ctx: CanvasRenderingContext2D) {
    const { ox, oy } = snakeOrigin();
    const cs = snake.cell;

    ctx.fillStyle = withAlpha(pal.accent, 0.9);
    for (const b of snake.burrows) {
      ctx.beginPath();
      ctx.arc(ox + b.x * cs + cs / 2, oy + b.y * cs + cs / 2, cs * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = withAlpha(pal.ink, 0.5);
      ctx.stroke();
    }

    ctx.fillStyle = pal.accent;
    for (const m of snake.marks) {
      ctx.beginPath();
      ctx.arc(ox + m.x * cs + cs / 2, oy + m.y * cs + cs / 2, cs * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = withAlpha(pal.ink, 0.7);
      ctx.stroke();
    }

    snake.cells.forEach((c, i) => {
      // Spherical beveled bead with radial gradient + spine glow every 3rd seg.
      const bx = ox + c.x * cs + cs / 2;
      const by = oy + c.y * cs + cs / 2;
      const r = (cs - (i === 0 ? 4 : 8)) / 2;
      const g = ctx.createRadialGradient(bx - r * 0.35, by - r * 0.35, r * 0.15, bx, by, r);
      if (i === 0) {
        g.addColorStop(0, "#d0fff0");
        g.addColorStop(0.5, "#5ad7a0");
        g.addColorStop(1, "#0d5c3a");
      } else {
        g.addColorStop(0, "#c8f5ff");
        g.addColorStop(0.5, "#33bbdd");
        g.addColorStop(1, "#0d3a5c");
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();
      if (i % 3 === 0) {
        glowOn(ctx, "#5ad7ff", 6);
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.stroke();
        glowOff(ctx);
      }
    });

    for (const t of tokens) {
      drawToken(ctx, t.x, t.y, t.id);
    }
  }

  // Neon invader ranks: hazard yellow, electric cyan, hot magenta.
  const INVADER_NEON = ["#ffe135", "#00e5ff", "#ff2fd6"];

  function renderInvaders(ctx: CanvasRenderingContext2D) {
    // starfield parallax twinkle in the CRT background
    const tNow = performance.now() * 0.002;
    for (let i = 0; i < 46; i++) {
      const sx2 = field.x + ((i * 97 + Math.floor(flyer.distance * 8)) % field.w);
      const sy2 = field.y + ((i * 151) % field.h);
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(i * 2.3 + tNow + i % 5));
      ctx.fillStyle = `rgba(255,255,255,${0.22 * tw})`;
      ctx.fillRect(sx2, sy2, 1.5, 1.5);
    }
    for (let i = 0; i < invaders.alive.length; i++) {
      if (!invaders.alive[i]) continue;
      const col = i % invaders.cols;
      const row = Math.floor(i / invaders.cols);
      const p = sentinelPos(col, row);
      const neon = INVADER_NEON[row % INVADER_NEON.length];
      glowOn(ctx, neon, 6);
      ctx.fillStyle = neon;
      ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s * 0.72);
      ctx.fillRect(p.x - p.s * 0.18, p.y - p.s / 2 - p.s * 0.2, p.s * 0.36, p.s * 0.2);
      glowOff(ctx);
      ctx.fillStyle = "#050508";
      ctx.fillRect(p.x - p.s * 0.3, p.y, p.s * 0.16, p.s * 0.16);
      ctx.fillRect(p.x + p.s * 0.14, p.y, p.s * 0.16, p.s * 0.16);
    }

    if (invaders.rotor) {
      const r = invaders.rotor;
      ctx.strokeStyle = withAlpha(pal.accent, 0.9);
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (const arm of [r.angle, r.angle + Math.PI]) {
        ctx.moveTo(r.cx, r.cy);
        ctx.lineTo(r.cx + Math.cos(arm) * r.radius, r.cy + Math.sin(arm) * r.radius);
      }
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    for (const bar of invaders.barriers) {
      ctx.fillStyle = withAlpha(pal.ink, 0.85);
      ctx.fillRect(bar.x, bar.y, bar.w, bar.h);
      ctx.fillStyle = pal.field;
      ctx.fillRect(bar.x + bar.w / 2 - 6, bar.y + 4, 12, bar.h);
    }

    ctx.fillStyle = pal.accent;
    for (const b of invaders.bullets) ctx.fillRect(b.x - 1.5, b.y - 8, 3, 8);
    ctx.fillStyle = withAlpha(pal.ink, 0.9);
    for (const b of invaders.bombs) ctx.fillRect(b.x - 2, b.y, 4, 8);

    for (const t of tokens) drawToken(ctx, t.x, t.y, t.id);

    const cy = field.y + field.h - 36;
    ctx.fillStyle = pal.ink;
    ctx.fillRect(invaders.cannon.x - 12, cy, 24, 10);
    ctx.fillRect(invaders.cannon.x - 3, cy - 8, 6, 8);
  }

  function drawToken(ctx: CanvasRenderingContext2D, x: number, y: number, id: TokenId) {
    ctx.fillStyle = "#c9a25a";
    ctx.strokeStyle = withAlpha(pal.ink, 0.7);
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = pal.background;
    ctx.font = '700 9px "Courier New", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(id === "widen" ? "W" : id === "slowpress" ? "S" : "§", x, y + 0.5);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
  }

  function drawMarquee(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = pal.ink;
    ctx.font = '600 11px "Courier New", monospace';
    ctx.textAlign = "left";
    ctx.fillText(spec.title.toUpperCase(), 10, 18);
    ctx.textAlign = "right";
    ctx.fillText(`SCORE ${String(score).padStart(5, "0")}`, W - 10, 18);
    ctx.textAlign = "center";
    if (state === "playing" && combo >= 2) {
      ctx.fillStyle = pal.accent;
      ctx.fillText(`COMBO ×${combo}`, W / 2, 18);
    } else {
      ctx.fillStyle = withAlpha(pal.ink, 0.75);
      ctx.fillText("SEALS " + "◉ ".repeat(Math.max(0, seals)).trim(), W / 2, 18);
    }
    ctx.textAlign = "left";
  }

  function drawStateCard(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = withAlpha(pal.background, 0.72);
    ctx.fillRect(0, 0, W, H);

    const cardW = 250;
    const cardH = 150;
    const cx = W / 2;
    const cy = H / 2;
    ctx.fillStyle = pal.field;
    ctx.fillRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH);
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - cardW / 2 + 6, cy - cardH / 2 + 6, cardW - 12, cardH - 12);
    ctx.lineWidth = 1;

    const heading =
      state === "title"
        ? "READY TO PRESS"
        : state === "paused"
          ? "PAUSED"
          : state === "won"
            ? "PRESSED & APPROVED"
            : "PIECE RUINED";
    const detail =
      state === "title"
        ? "SPACE or tap to begin"
        : state === "paused"
          ? "SPACE or tap to resume"
          : `FINAL SCORE ${score}`;
    const sub =
      state === "won" || state === "lost"
        ? combo >= 3
          ? `BEST STREAK ×${combo}`
          : "FILED TO THE LEDGER"
        : "";

    ctx.fillStyle = pal.ink;
    ctx.textAlign = "center";
    ctx.font = '700 17px "Courier New", monospace';
    ctx.fillText(heading, cx, cy - 14);
    ctx.font = '400 12px "Courier New", monospace';
    ctx.fillStyle = withAlpha(pal.ink, 0.8);
    ctx.fillText(detail, cx, cy + 8);
    ctx.fillText(objectiveText(), cx, cy + 30);
    if (sub) ctx.fillText(sub, cx, cy + 52);
    ctx.textAlign = "left";
  }

  function drawFrameOverlay(ctx: CanvasRenderingContext2D) {
    if (spec.frame === "none") return;
    if (spec.frame === "plaque") {
      ctx.strokeStyle = withAlpha(pal.ink, 0.55);
      ctx.lineWidth = 6;
      ctx.strokeRect(field.x + 3, field.y + 3, field.w - 6, field.h - 6);
      ctx.strokeStyle = withAlpha("#c9a25a", 0.9);
      ctx.lineWidth = 2;
      const c = 18;
      const corners: [number, number][] = [
        [field.x + 8, field.y + 8],
        [field.x + field.w - 8, field.y + 8],
        [field.x + 8, field.y + field.h - 8],
        [field.x + field.w - 8, field.y + field.h - 8],
      ];
      for (const [x, y] of corners) ctx.strokeRect(x - c / 2, y - c / 2, c, c);
    }
    if (spec.frame === "engraved") {
      ctx.strokeStyle = withAlpha(pal.ink, 0.55);
      ctx.lineWidth = 4;
      ctx.strokeRect(field.x + 2, field.y + 2, field.w - 4, field.h - 4);
      ctx.strokeStyle = withAlpha(pal.ink, 0.35);
      ctx.lineWidth = 1;
      ctx.strokeRect(field.x + 12, field.y + 12, field.w - 24, field.h - 24);
      ctx.strokeRect(field.x + 18, field.y + 18, field.w - 36, field.h - 36);
    }
    if (spec.frame === "gilt") {
      ctx.strokeStyle = "#c9a25a";
      ctx.lineWidth = 8;
      ctx.strokeRect(field.x + 4, field.y + 4, field.w - 8, field.h - 8);
      ctx.strokeStyle = withAlpha("#8a5a2b", 0.9);
      ctx.lineWidth = 2;
      ctx.strokeRect(field.x + 10, field.y + 10, field.w - 20, field.h - 20);
      ctx.strokeStyle = withAlpha("#c9a25a", 0.55);
      ctx.fillStyle = withAlpha("#c9a25a", 0.55);
      for (let x = field.x + 16; x < field.x + field.w - 16; x += 16) {
        for (const y of [field.y + 10, field.y + field.h - 10]) {
          ctx.beginPath();
          ctx.arc(x, y, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    if (spec.frame === "ticket") {
      ctx.strokeStyle = withAlpha(pal.ink, 0.8);
      ctx.lineWidth = 2;
      ctx.strokeRect(field.x + 2, field.y + 2, field.w - 4, field.h - 4);
      ctx.fillStyle = pal.background;
      for (let y = field.y + 8; y < field.y + field.h - 4; y += 12) {
        ctx.beginPath();
        ctx.arc(field.x + 2, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(field.x + field.w - 2, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.lineWidth = 1;
  }

  function drawScanlines(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    ctx.fillStyle = "rgba(30, 20, 8, 0.06)";
    for (let yy = y; yy < y + h; yy += 3) ctx.fillRect(x, yy, w, 1);
  }

  /** Lithograph grain: fine stone-print speckle, re-seeded per frame. */
  function drawGrain(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "rgba(60, 40, 20, 0.05)";
    for (let i = 0; i < 90; i++) {
      const x = field.x + rng() * field.w;
      const y = field.y + rng() * field.h;
      ctx.fillRect(x, y, 1.2, 1.2);
    }
  }

  /** Electric varnish: soft brass glow around the playfield edges. */
  function drawGlow(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.strokeStyle = withAlpha("#c9a25a", 0.35);
    ctx.lineWidth = 10;
    ctx.strokeRect(field.x + 5, field.y + 5, field.w - 10, field.h - 10);
    ctx.strokeStyle = withAlpha("#fff8e6", 0.12);
    ctx.lineWidth = 3;
    ctx.strokeRect(field.x + 8, field.y + 8, field.w - 16, field.h - 16);
    ctx.restore();
  }

  function drawBlackout(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = withAlpha(pal.background, 0.78);
    ctx.fillRect(field.x, field.y, field.w, field.h);
    const cx = ball.stuck ? bat.x : ball.x;
    const cy2 = ball.stuck ? field.y + field.h - 34 : ball.y;
    const grad = ctx.createRadialGradient(cx, cy2, 8, cx, cy2, 70);
    grad.addColorStop(0, "rgba(255,248,230,0.16)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(field.x, field.y, field.w, field.h);
  }

  function drawVignette(ctx: CanvasRenderingContext2D) {
    const grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.72);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(30, 18, 6, 0.22)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  reset();

  return {
    reset,
    start,
    togglePause,
    update,
    render,
    get hud() {
      return hud;
    },
    onEvent(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setScanlines(on) {
      scanlines = on;
    },
  };
}