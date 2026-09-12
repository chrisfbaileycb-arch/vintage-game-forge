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
  | "combo";

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
  const pal = PALETTES[spec.palette];
  const finish = FINISH_FLAGS[spec.finish];
  const paceMul = 0.55 + 0.22 * spec.pace;
  const maxSeals = spec.twist === "brittle" ? 1 : 3;
  const rng: RandomSource = opts.random ?? Math.random;

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
    else updateInvaders(step, input);
    tickEffects(step);
    tickBlackout(step);
    stepParticles(step);
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
    ctx.fillStyle = pal.background;
    ctx.fillRect(0, 0, W, H);

    if (shakeAmount > 0.05) {
      ctx.translate((rng() - 0.5) * shakeAmount, (rng() - 0.5) * shakeAmount);
    }

    ctx.fillStyle = pal.field;
    ctx.fillRect(field.x, field.y, field.w, field.h);

    ctx.fillStyle = pal.grid;
    for (let gx = field.x + 12; gx < field.x + field.w; gx += 24) {
      for (let gy = field.y + 12; gy < field.y + field.h; gy += 24) {
        ctx.fillRect(gx, gy, 1.5, 1.5);
      }
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(field.x, field.y, field.w, field.h);
    ctx.clip();

    if (spec.mould === "breakout") renderBreakout(ctx);
    else if (spec.mould === "snake") renderSnake(ctx);
    else renderInvaders(ctx);

    renderParticles(ctx);
    if (finish.grain) {
      drawScanlines(ctx, field.x, field.y, field.w, field.h);
      drawGrain(ctx);
    } else {
      drawScanlines(ctx, field.x, field.y, field.w, field.h);
    }
    if (blackoutOn) drawBlackout(ctx);
    ctx.restore();

    drawMarquee(ctx);
    drawFrameOverlay(ctx);
    if (finish.glow) drawGlow(ctx);
    drawVignette(ctx);

    if (state !== "playing") drawStateCard(ctx);
    ctx.restore();
  }

  function renderParticles(ctx: CanvasRenderingContext2D) {
    for (const p of particles) {
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.fillStyle = withAlpha(p.color, alpha * 0.9);
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
  }

  function renderBreakout(ctx: CanvasRenderingContext2D) {
    const tones = [pal.ink, pal.accent, withAlpha(pal.ink, 0.75)];
    for (const brick of bricks) {
      if (!brick.alive) continue;
      ctx.fillStyle = tones[brick.tone];
      ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
      ctx.strokeStyle = withAlpha(pal.ink, 0.35);
      ctx.strokeRect(brick.x + 0.5, brick.y + 0.5, brick.w - 1, brick.h - 1);
      if (brick.hits > 1) {
        ctx.strokeStyle = withAlpha(pal.accent, 0.9);
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
    ctx.fillStyle = pal.ink;
    ctx.fillRect(bat.x - effW / 2, batY, effW, 12);
    ctx.fillStyle = pal.accent;
    ctx.fillRect(bat.x - effW / 2, batY, effW, 3);
    if (widenTimer > 0) {
      ctx.strokeStyle = withAlpha("#c9a25a", 0.9);
      ctx.strokeRect(bat.x - effW / 2 - 2, batY - 2, effW + 4, 16);
    }

    ctx.fillStyle = pal.accent;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = withAlpha(pal.ink, 0.6);
    ctx.stroke();
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
      const pad = i === 0 ? 2 : 4;
      ctx.fillStyle = i === 0 ? pal.ink : withAlpha(pal.ink, 0.82);
      ctx.fillRect(ox + c.x * cs + pad, oy + c.y * cs + pad, cs - pad * 2, cs - pad * 2);
    });

    for (const t of tokens) {
      drawToken(ctx, t.x, t.y, t.id);
    }
  }

  function renderInvaders(ctx: CanvasRenderingContext2D) {
    for (let i = 0; i < invaders.alive.length; i++) {
      if (!invaders.alive[i]) continue;
      const col = i % invaders.cols;
      const row = Math.floor(i / invaders.cols);
      const p = sentinelPos(col, row);
      ctx.fillStyle = row % 2 === 0 ? pal.ink : pal.accent;
      ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s * 0.72);
      ctx.fillRect(p.x - p.s * 0.18, p.y - p.s / 2 - p.s * 0.2, p.s * 0.36, p.s * 0.2);
      ctx.fillStyle = pal.field;
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
  };
}