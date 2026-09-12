/**
 * The Cartridge Foundry — shared mould & cartridge spec definitions.
 *
 * A "mould" is a preset game engine. A cartridge spec is the full set of
 * dropdown-selected values ("dials") that the corresponding engine executes.
 */

export type MouldKind =
  | "breakout"
  | "snake"
  | "invaders"
  | "maze"
  | "flyer";

export interface CartridgeSpec {
  /** Which preset engine executes this spec. */
  mould: MouldKind;
  /** Speed of the game loop, 1 (gentle) .. 5 (frantic). */
  pace: number;
  /** 0 .. 9, invader mould only (columns per rank); maze/flyer: corridor girth. */
  gridDensity: number;
  /** 0 .. 9, breakout mould only (rows of bricks). */
  brickRows: number;
  /** Paddle width / growth / reload dial, 0 .. 9. */
  handling: number;
  /** Number of extra hazards, 0 .. 9. */
  hazards: number;
  /** Colour treatment of the pressed screen. */
  palette: PaletteId;
  /** Cabinet-like overlay frame. */
  frame: FrameId;
  /** One extra rule layered onto the engine. */
  twist: TwistId;
  /** Plate finish: grain, glow, and shake treatment. */
  finish: FinishId;
  /** How many house tokens (bonus drops) the engine scatters, 0 .. 9. */
  tokens: number;
  /** Foundry bell: a small chime accent on notable events. */
  bells: boolean;
  /** Spectrum toning: hue rotation applied to the whole palette, 0..345 (degrees). */
  hue: number;
  /** Public display name pressed onto the label. */
  title: string;
}

export type PaletteId =
  | "sepia"
  | "cabinet"
  | "emerald"
  | "blueprint"
  | "nocturne"
  | "halftone";

export const PALETTE_OPTIONS: { id: PaletteId; label: string; hint: string }[] = [
  { id: "sepia", label: "Sepia Plate", hint: "Tarnished albumen print" },
  { id: "cabinet", label: "Oxblood Cabinet", hint: "Dark lacquer & brass" },
  { id: "emerald", label: "Emerald Ledger", hint: "Green library lamp" },
  { id: "blueprint", label: "Cyan Blueprint", hint: "Draughtsman's linen" },
  { id: "nocturne", label: "Nocturne Slate", hint: "Ink by lamplight" },
  { id: "halftone", label: "Halftone News", hint: "Saturday evening press" },
];

export type FrameId = "none" | "plaque" | "engraved" | "gilt" | "ticket";

export const FRAME_OPTIONS: { id: FrameId; label: string; hint: string }[] = [
  { id: "none", label: "Unframed", hint: "The bare plate" },
  { id: "plaque", label: "Brass Plaque", hint: "Mounted on walnut" },
  { id: "engraved", label: "Engraved Bezel", hint: "Etched glass surround" },
  { id: "gilt", label: "Gilt Salon Frame", hint: "Ornate museum gilding" },
  { id: "ticket", label: "Punched Ticket", hint: "Perforated admission stub" },
];

export type TwistId =
  | "none"
  | "compact"
  | "brittle"
  | "decade"
  | "blackout"
  | "windfall";

export const TWIST_OPTIONS: { id: TwistId; label: string; hint: string }[] = [
  { id: "none", label: "None", hint: "A faithful pressing" },
  { id: "compact", label: "Tight Quarters", hint: "Field shrinks to 80%" },
  { id: "brittle", label: "Brittle Moulding", hint: "One hit ruins the piece" },
  {
    id: "decade",
    label: "House Target",
    hint: "The run is won at 500 pts",
  },
  {
    id: "blackout",
    label: "Blackout Drill",
    hint: "Lamps fail in waves; play by memory",
  },
  {
    id: "windfall",
    label: "Windfall Ledger",
    hint: "Every fifth point paid double",
  },
];

export type FinishId = "matte" | "lithograph" | "electric";

export const FINISH_OPTIONS: { id: FinishId; label: string; hint: string }[] = [
  { id: "matte", label: "Matte Stock", hint: "Flat, honest paper" },
  {
    id: "lithograph",
    label: "Lithograph Grain",
    hint: "Stone-print grain & ember sparks",
  },
  {
    id: "electric",
    label: "Electric Varnish",
    hint: "Glow accents & force feedback",
  },
];

/** The full spectrum: 24 toning baths in 15° steps around the colour wheel. */
export const SPECTRUM_STEPS: { hue: number; label: string }[] = [
  { hue: 0, label: "As mixed" },
  { hue: 15, label: "Scarlet bath" },
  { hue: 30, label: "Vermilion bath" },
  { hue: 45, label: "Amber bath" },
  { hue: 60, label: "Gold bath" },
  { hue: 75, label: "Chartreuse bath" },
  { hue: 90, label: "Lime bath" },
  { hue: 105, label: "Olive bath" },
  { hue: 120, label: "Emerald bath" },
  { hue: 135, label: "Spring bath" },
  { hue: 150, label: "Jade bath" },
  { hue: 165, label: "Teal bath" },
  { hue: 180, label: "Cyan bath" },
  { hue: 195, label: "Azure bath" },
  { hue: 210, label: "Cobalt bath" },
  { hue: 225, label: "Sapphire bath" },
  { hue: 240, label: "Ultramarine bath" },
  { hue: 255, label: "Indigo bath" },
  { hue: 270, label: "Violet bath" },
  { hue: 285, label: "Aubergine bath" },
  { hue: 300, label: "Magenta bath" },
  { hue: 315, label: "Orchid bath" },
  { hue: 330, label: "Rose bath" },
  { hue: 345, label: "Crimson bath" },
];

/** Dial ranges so the Studio's dropdowns and public validation stay in sync. */
export const DIAL_RANGES = {
  pace: { min: 1, max: 5 },
  gridDensity: { min: 0, max: 9 },
  brickRows: { min: 0, max: 9 },
  handling: {
    min: 0,
    byMould: {
      breakout: 3,
      snake: 9,
      invaders: 5,
      maze: 5,
      flyer: 5,
    } as Record<MouldKind, number>,
  },
  hazards: { min: 0, max: 9 },
  tokens: { min: 0, max: 9 },
  hue: { min: 0, max: 345, step: 15 },
} as const;

export const MOULD_OPTIONS: {
  id: MouldKind;
  name: string;
  tagline: string;
  blurb: string;
  dials: string[];
}[] = [
  {
    id: "breakout",
    name: "Mould №1 — Breaker",
    tagline: "Ball, bat & wall of bricks",
    blurb: "A bat deflects a ball into a wall of bricks. Clear the wall to win.",
    dials: ["Brick rows", "Paddle width", "Tokens", "Twist"],
  },
  {
    id: "snake",
    name: "Mould №2 — Serpent",
    tagline: "The ever-growing coil",
    blurb: "A serpent grows with each mark it eats; avoid walls and itself.",
    dials: ["Marks on the board", "Growth dial", "Tokens", "Twist"],
  },
  {
    id: "invaders",
    name: "Mould №3 — Sentinels",
    tagline: "Ranks descend, you hold the line",
    blurb: "Marching ranks descend; hold the line until the ranks are cleared.",
    dials: ["Grid density", "Formation speed", "Tokens", "Twist"],
  },
  {
    id: "maze",
    name: "Mould №4 — Stereoscope",
    tagline: "A first-person labyrinth",
    blurb: "Walk the glass corridors of a cast maze in true first-person. Claim every checkpoint before the time fuse burns out.",
    dials: ["Corridor girth", "Fuse length", "Tokens", "Twist"],
  },
  {
    id: "flyer",
    name: "Mould №5 — Aerodrome",
    tagline: "Biplane through balloon barrages",
    blurb: "Bank a biplane down a scrolling aerodrome, threading balloon barrages and ringing gates for bonus pay.",
    dials: ["Barrage density", "Wind pace", "Tokens", "Twist"],
  },
];

export const MOULD_BASE_PACE: Record<MouldKind, number> = {
  breakout: 3,
  snake: 3,
  invaders: 2,
  maze: 3,
  flyer: 3,
};

/** Parse an unknown value into a valid palette, else default. */
export function toPalette(value: unknown): PaletteId {
  return value === "cabinet" ||
    value === "emerald" ||
    value === "blueprint" ||
    value === "nocturne" ||
    value === "halftone"
    ? value
    : "sepia";
}

export function toFrame(value: unknown): FrameId {
  return value === "plaque" ||
    value === "engraved" ||
    value === "gilt" ||
    value === "ticket"
    ? value
    : "none";
}

export function toTwist(value: unknown): TwistId {
  return value === "compact" ||
    value === "brittle" ||
    value === "decade" ||
    value === "blackout" ||
    value === "windfall"
    ? value
    : "none";
}

export function toFinish(value: unknown): FinishId {
  return value === "lithograph" || value === "electric" ? value : "matte";
}

/** Clamp & validate a spec coming from the database or a share link. */
export function normalizeSpec(input: unknown): CartridgeSpec {
  const raw = (input ?? {}) as Record<string, unknown>;
  const mouldRaw = raw.mould;
  const mould: MouldKind =
    mouldRaw === "snake" ||
    mouldRaw === "invaders" ||
    mouldRaw === "maze" ||
    mouldRaw === "flyer"
      ? mouldRaw
      : "breakout";

  const clamp = (v: unknown, min: number, max: number, dflt: number) => {
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) return dflt;
    return Math.min(max, Math.max(min, Math.round(n)));
  };

  const pace = clamp(raw.pace, 1, 5, MOULD_BASE_PACE[mould]);
  const gridDensity = clamp(raw.gridDensity, 0, 9, 5);
  const brickRows = clamp(raw.brickRows, 0, 9, 4);
  const handlingMax = DIAL_RANGES.handling.byMould[mould];
  const handling = clamp(raw.handling, 0, handlingMax, Math.round(handlingMax / 2));
  const hazards = clamp(raw.hazards, 0, 9, 2);
  const tokens = clamp(raw.tokens, 0, 9, 0);
  const hue = clamp(raw.hue, 0, 345, 0);
  const bells =
    typeof raw.bells === "boolean" ? raw.bells : raw.bells === "true";

  return {
    mould,
    pace,
    gridDensity,
    brickRows,
    handling,
    hazards,
    tokens,
    bells,
    hue,
    palette: toPalette(raw.palette),
    frame: toFrame(raw.frame),
    twist: toTwist(raw.twist),
    finish: toFinish(raw.finish),
    title:
      typeof raw.title === "string" && raw.title.trim()
        ? raw.title.trim().slice(0, 40)
        : "Untitled Pressing",
  };
}

/** Compact share-code: base64url of the JSON spec (URL-safe). */
export function encodeSpec(spec: CartridgeSpec): string {
  const json = JSON.stringify(spec);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decode a share code, returning null when malformed. */
export function decodeSpec(code: string): CartridgeSpec | null {
  try {
    const b64 = code.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    return normalizeSpec(JSON.parse(json));
  } catch {
    return null;
  }
}

/** Archival-style display number derived from a document id. */
export function catalogueNumber(id: string): string {
  let sum = 0;
  for (const ch of id) sum = (sum * 31 + ch.charCodeAt(0)) % 97;
  return `№ ${String(sum).padStart(3, "0")}`;
}

const DIAL_TERMS: Record<string, string> = {
  pace: "Pressing speed",
  gridDensity: "Grid density",
  brickRows: "Brick rows",
  handling: "Handling",
  hazards: "Extra fixtures",
  tokens: "House tokens",
};

/** Short human summary of the dials on a spec, for label plates. */
export function describeSpec(spec: CartridgeSpec): string[] {
  const parts: string[] = [];
  if (spec.mould === "breakout") parts.push(`${spec.brickRows} brick rows`);
  if (spec.mould === "invaders") parts.push(`grid of ${4 + spec.gridDensity}`);
  if (spec.mould === "snake") parts.push(`${12 + spec.gridDensity * 2} columns`);
  parts.push(DIAL_TERMS.handling.toLowerCase());
  if (spec.mould === "maze") parts.push(`fuse ${100 + spec.pace * 30}s`);
  if (spec.mould === "flyer") parts.push(`wind pace ${spec.pace}/5`);
  if (spec.hazards > 0) parts.push(`${spec.hazards} fixtures`);
  if (spec.tokens > 0) parts.push(`${spec.tokens} tokens`);
  if (spec.hue > 0) parts.push(`toned ${spec.hue}°`);
  parts.push(`speed ${spec.pace}/5`);
  return parts;
}

/** The three house tokens the foundry scatters, by engine effect. */
export type TokenId = "widen" | "slowpress" | "windfall";

export const TOKEN_META: { id: TokenId; label: string; hint: string }[] = [
  { id: "widen", label: "Widened Works", hint: "widens your instrument" },
  { id: "slowpress", label: "Slow Press", hint: "eases the pace briefly" },
  { id: "windfall", label: "Windfall Coupon", hint: "a purse of bonus points" },
];

/** Upper bounds for runtime effects the tests pin down. */
export const EFFECT_LIMITS = {
  /** Widened Works may not more than double the instrument. */
  widenMulMax: 2,
  /** Slow Press may not drop below 60% of pace. */
  slowMulMin: 0.6,
  /** Windfall Coupon pays 100 points. */
  windfallPoints: 100,
} as const;
