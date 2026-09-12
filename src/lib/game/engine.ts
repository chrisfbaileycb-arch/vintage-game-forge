/**
 * The Cartridge Foundry — cartridge execution engine.
 *
 * Pure TypeScript + Canvas 2D. One engine instance runs one cartridge spec.
 * The React component owns the requestAnimationFrame loop, keyboard/touch
 * input, and HUD wiring; the engine stays framework-free.
 */

import type { CartridgeSpec, PaletteId } from "./moulds";

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
}

export interface CartridgeHandle {
  reset(): void;
  start(): void;
  togglePause(): void;
  update(dt: number, input: EngineInput): void;
  render(ctx: CanvasRenderingContext2D): void;
  readonly hud: HudState;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const W = 360;
const H = 480;

function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v;
}

function randRange(min: number, max: number) {
  return min + Math.random() * (max - min);
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

function rectsOverlap(a: Rect, b: Rect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ---------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------

export function createCartridge(
  spec: CartridgeSpec,
  opts: { initialBest?: number; onHudChange?: (hud: HudState) => void } = {},
): CartridgeHandle {
  const pal = PALETTES[spec.palette];
  const paceMul = 0.55 + 0.22 * spec.pace;
  const maxSeals = spec.twist === "brittle" ? 1 : 3;

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
  }

  // ----- Breakout state -----------------------------------------------------
  const bat = { x: W / 2, w: 46 + (spec.handling / 3) * 36 };
  const ball = { x: W / 2, y: 0, vx: 0, vy: 0, r: 6, stuck: true };
  let bricks: Brick[] = [];
  let rotors: Rotor[] = [];
  let seals = maxSeals;
  let score = 0;

  function buildBreakout() {
    const rows = clamp(spec.brickRows, 3, 9);
    const cols = 8;
    const bw = (field.w - 24) / cols;
    const bh = 16;
    bricks = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        bricks.push({
          x: field.x + 12 + c * bw,
          y: field.y + 46 + r * (bh + 6),
          w: bw - 6,
          h: bh,
          alive: true,
          tone: (r + c) % 3,
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
        angle: Math.random() * Math.PI,
      });
    }
    if (spec.hazards >= 6) {
      rotors.push({
        cx: field.x + field.w * 0.28,
        cy: field.y + field.h * 0.68,
        radius: 22 + spec.hazards * 2,
        speed: -(1.1 + spec.hazards * 0.1) * paceMul,
        angle: Math.random() * Math.PI,
      });
    }
  }

  function resetBall() {
    ball.stuck = true;
    ball.x = bat.x;
    ball.y = field.y + field.h - 34;
    ball.vx = 0;
    ball.vy = 0;
  }

  // ----- Snake state ----------------------------------------------------------
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
  }

  function randInt(max: number) {
    return Math.floor(Math.random() * max);
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

  // ----- Invaders state -------------------------------------------------------
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
            angle: Math.random() * Math.PI,
          }
        : null;
  }

  // ----- Shared run control ---------------------------------------------------

  let state: GameState = "title";

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
    });
  }

  function winRun() {
    state = "won";
    publishScore("PRESSED & APPROVED");
  }

  function loseRun(reason: string) {
    seals -= 1;
    if (seals <= 0) {
      state = "lost";
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

  // ----- Update: breakout ------------------------------------------------------

  function updateBreakout(dt: number, input: EngineInput) {
    const speed = 300;
    if (input.left) bat.x -= speed * dt;
    if (input.right) bat.x += speed * dt;
    bat.x = clamp(bat.x, field.x + bat.w / 2, field.x + field.w - bat.w / 2);

    for (const rotor of rotors) {
      rotor.angle += rotor.speed * dt;
    }

    if (ball.stuck) {
      ball.x = bat.x;
      ball.y = field.y + field.h - 34;
      if (input.fire) {
        ball.stuck = false;
        const dir = input.left ? -1 : input.right ? 1 : Math.random() < 0.5 ? -1 : 1;
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
      ball.x >= bat.x - bat.w / 2 - ball.r &&
      ball.x <= bat.x + bat.w / 2 + ball.r
    ) {
      ball.y = batY - ball.r;
      const offset = clamp((ball.x - bat.x) / (bat.w / 2), -1, 1);
      const angle = offset * (Math.PI / 3);
      const sp = Math.hypot(ball.vx, ball.vy) * 1.015;
      ball.vx = Math.sin(angle) * sp;
      ball.vy = -Math.abs(Math.cos(angle) * sp);
      score += 1;
    }

    for (const brick of bricks) {
      if (!brick.alive) continue;
      if (
        ball.x + ball.r > brick.x &&
        ball.x - ball.r < brick.x + brick.w &&
        ball.y + ball.r > brick.y &&
        ball.y - ball.r < brick.y + brick.h
      ) {
        brick.alive = false;
        const fromSide =
          ball.x < brick.x || ball.x > brick.x + brick.w ? true : false;
        if (fromSide) ball.vx = -ball.vx;
        else ball.vy = -ball.vy;
        score += 10;
        break;
      }
    }

    for (const rotor of rotors) {
      for (const arm of [rotor.angle, rotor.angle + Math.PI]) {
        const ex = rotor.cx + Math.cos(arm) * rotor.radius;
        const ey = rotor.cy + Math.sin(arm) * rotor.radius;
        if (segDist(ball.x, ball.y, rotor.cx, rotor.cy, ex, ey) < ball.r + 5) {
          ball.vx = -ball.vx;
          ball.vy = -ball.vy;
          ball.x += ball.vx * dt * 2;
          ball.y += ball.vy * dt * 2;
        }
      }
    }

    if (ball.y - ball.r > field.y + field.h) {
      loseRun("The piece slipped the press");
      return;
    }

    if (spec.twist === "decade" && score >= 500) {
      winRun();
      return;
    }
    if (bricks.every((b) => !b.alive)) {
      winRun();
      return;
    }
  }

  // ----- Update: snake ---------------------------------------------------------

  function updateSnake(dt: number, input: EngineInput) {
    if (input.up && snake.dir.y === 0) snake.dir = { x: 0, y: -1 };
    else if (input.down && snake.dir.y === 0) snake.dir = { x: 0, y: 1 };
    else if (input.left && snake.dir.x === 0) snake.dir = { x: -1, y: 0 };
    else if (input.right && snake.dir.x === 0) snake.dir = { x: 1, y: 0 };

    snake.stepTimer += dt * paceMul;
    if (snake.stepTimer < snake.stepInterval) return;
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
      score += 100;
      snake.grow += 1 + Math.floor(spec.handling / 3);
      spawnMark();
    }

    if (spec.twist === "decade" && score >= 500) {
      winRun();
      return;
    }
    if (snake.eaten >= snake.target) winRun();
  }

  // ----- Update: invaders --------------------------------------------------------

  function updateInvaders(dt: number, input: EngineInput) {
    const cannonSpeed = 240;
    if (input.left) invaders.cannon.x -= cannonSpeed * dt;
    if (input.right) invaders.cannon.x += cannonSpeed * dt;
    invaders.cannon.x = clamp(invaders.cannon.x, field.x + 14, field.x + field.w - 14);

    if (invaders.rotor) invaders.rotor.angle += invaders.rotor.speed * dt;

    invaders.cannon.cooldown = Math.max(0, invaders.cannon.cooldown - dt);
    if (input.fire && invaders.cannon.cooldown <= 0) {
      invaders.bullets.push({ x: invaders.cannon.x, y: field.y + field.h - 40 });
      invaders.cannon.cooldown = Math.max(0.15, 0.5 - spec.handling * 0.06);
    }

    for (const b of invaders.bullets) b.y -= 430 * dt;
    invaders.bullets = invaders.bullets.filter((b) => b.y > field.y + 8);
    for (const b of invaders.bombs) b.y += 190 * dt * paceMul;
    invaders.bombs = invaders.bombs.filter(
      (b) => b.y < field.y + field.h + 10,
    );

    const total = invaders.alive.length || 1;
    const aliveCount = invaders.alive.filter(Boolean).length;
    invaders.stepTimer += dt * paceMul;
    const interval = invaders.stepInterval * (0.35 + (0.65 * aliveCount) / total);
    if (invaders.stepTimer >= interval) {
      invaders.stepTimer = 0;
      const cell = W / (invaders.cols + 2);
      invaders.origin.x += invaders.dirX * cell * 0.5;
      let minX = Infinity;
      let maxX = -Infinity;
      for (let c = 0; c < invaders.cols; c++) {
        const colAlive = invaders.alive.some((a, i) => a && i % invaders.cols === c);
        if (!colAlive) continue;
        const p = sentinelPos(c, 0);
        minX = Math.min(minX, p.x - p.s / 2);
        maxX = Math.max(maxX, p.x + p.s / 2);
      }
      if (minX !== Infinity && (minX < field.x + 6 || maxX > field.x + field.w - 6)) {
        invaders.dirX *= -1;
        invaders.origin.x += invaders.dirX * cell * 0.5;
        invaders.origin.y += cell * 0.7;
      }
      if (Math.random() < 0.25 + spec.pace * 0.07) {
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

    // bullets vs sentinels / rotor / barriers
    outer: for (const b of invaders.bullets) {
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
          score += 30;
          break outer;
        }
      }
      for (const bar of invaders.barriers) {
        if (b.x > bar.x && b.x < bar.x + bar.w && b.y > bar.y && b.y < bar.y + bar.h) {
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

    // formation reaching the cannon line
    const lowestRow = (() => {
      let lowest = -1;
      invaders.alive.forEach((a, i) => {
        if (!a) return;
        lowest = Math.max(lowest, Math.floor(i / invaders.cols));
      });
      return lowest;
    })();
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

  // ----- Update dispatch -----------------------------------------------------------

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
    if (state === "playing") publishScore();
  }

  // ----- Rendering -------------------------------------------------------------------

  function render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.fillStyle = pal.background;
    ctx.fillRect(0, 0, W, H);

    // playfield
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

    drawScanlines(ctx, field.x, field.y, field.w, field.h);
    ctx.restore();

    drawMarquee(ctx);
    drawFrameOverlay(ctx);
    drawVignette(ctx);

    if (state !== "playing") drawStateCard(ctx);
    ctx.restore();
  }

  function renderBreakout(ctx: CanvasRenderingContext2D) {
    const tones = [pal.ink, pal.accent, withAlpha(pal.ink, 0.75)];
    for (const brick of bricks) {
      if (!brick.alive) continue;
      ctx.fillStyle = tones[brick.tone];
      ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
      ctx.strokeStyle = withAlpha(pal.ink, 0.35);
      ctx.strokeRect(brick.x + 0.5, brick.y + 0.5, brick.w - 1, brick.h - 1);
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
    ctx.fillStyle = pal.ink;
    ctx.fillRect(bat.x - bat.w / 2, batY, bat.w, 12);
    ctx.fillStyle = pal.accent;
    ctx.fillRect(bat.x - bat.w / 2, batY, bat.w, 3);

    ctx.fillStyle = pal.accent;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = withAlpha(pal.ink, 0.6);
    ctx.stroke();
  }

  function renderSnake(ctx: CanvasRenderingContext2D) {
    const cs = snake.cell;
    const ox = field.x + (field.w - cs * snake.cols) / 2;
    const oy = field.y + (field.h - cs * snake.rows) / 2;

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
      const mx = ox + m.x * cs + cs / 2;
      const my = oy + m.y * cs + cs / 2;
      ctx.beginPath();
      ctx.arc(mx, my, cs * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = withAlpha(pal.ink, 0.7);
      ctx.stroke();
    }

    snake.cells.forEach((c, i) => {
      const pad = i === 0 ? 2 : 4;
      ctx.fillStyle = i === 0 ? pal.ink : withAlpha(pal.ink, 0.82);
      ctx.fillRect(
        ox + c.x * cs + pad,
        oy + c.y * cs + pad,
        cs - pad * 2,
        cs - pad * 2,
      );
    });
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

    const cy = field.y + field.h - 36;
    ctx.fillStyle = pal.ink;
    ctx.fillRect(invaders.cannon.x - 12, cy, 24, 10);
    ctx.fillRect(invaders.cannon.x - 3, cy - 8, 6, 8);
  }

  function drawMarquee(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = pal.ink;
    ctx.font = '600 11px "Courier New", monospace';
    ctx.textAlign = "left";
    ctx.fillText(spec.title.toUpperCase(), 10, 18);
    ctx.textAlign = "right";
    ctx.fillText(`SCORE ${String(score).padStart(5, "0")}`, W - 10, 18);
    if (state === "playing") {
      ctx.textAlign = "center";
      ctx.fillStyle = withAlpha(pal.ink, 0.75);
      const sealsText = "SEALS " + "\u25c9 ".repeat(seals).trim();
      ctx.fillText(sealsText, W / 2, 18);
    }
    ctx.textAlign = "left";
  }

  function drawStateCard(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = withAlpha(pal.background, 0.72);
    ctx.fillRect(0, 0, W, H);

    const cardW = 250;
    const cardH = 132;
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

    ctx.fillStyle = pal.ink;
    ctx.textAlign = "center";
    ctx.font = '700 17px "Courier New", monospace';
    ctx.fillText(heading, cx, cy - 12);
    ctx.font = '400 12px "Courier New", monospace';
    ctx.fillStyle = withAlpha(pal.ink, 0.8);
    ctx.fillText(detail, cx, cy + 12);
    ctx.fillText(objectiveText(), cx, cy + 34);
    ctx.textAlign = "left";
  }

  function drawFrameOverlay(ctx: CanvasRenderingContext2D) {
    if (spec.frame === "none") return;
    ctx.strokeStyle = withAlpha(pal.ink, 0.55);
    ctx.lineWidth = 6;
    ctx.strokeRect(field.x + 3, field.y + 3, field.w - 6, field.h - 6);
    if (spec.frame === "plaque") {
      ctx.strokeStyle = withAlpha("#c9a25a", 0.9);
      ctx.lineWidth = 2;
      const c = 18;
      const corners: [number, number][] = [
        [field.x + 8, field.y + 8],
        [field.x + field.w - 8, field.y + 8],
        [field.x + 8, field.y + field.h - 8],
        [field.x + field.w - 8, field.y + field.h - 8],
      ];
      for (const [x, y] of corners) {
        ctx.strokeRect(x - c / 2, y - c / 2, c, c);
      }
    }
    if (spec.frame === "engraved") {
      ctx.strokeStyle = withAlpha(pal.ink, 0.35);
      ctx.lineWidth = 1;
      ctx.strokeRect(field.x + 12, field.y + 12, field.w - 24, field.h - 24);
      ctx.strokeRect(field.x + 18, field.y + 18, field.w - 36, field.h - 36);
    }
    ctx.lineWidth = 1;
  }

  function drawScanlines(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    ctx.fillStyle = "rgba(30, 20, 8, 0.06)";
    for (let yy = y; yy < y + h; yy += 3) {
      ctx.fillRect(x, yy, w, 1);
    }
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
  };
}

// ---------------------------------------------------------------------------
// Canvas helpers
// ---------------------------------------------------------------------------

function withAlpha(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
