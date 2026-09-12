/**
 * The Cartridge Foundry — shared mould & cartridge spec definitions.
 *
 * A "mould" is a preset game engine. A cartridge spec is the full set of
 * dropdown-selected values ("dials") that the corresponding engine executes.
 */

export type MouldKind = "breakout" | "snake" | "invaders";

export interface CartridgeSpec {
  /** Which preset engine executes this spec. */
  mould: MouldKind;
  /** Speed of the game loop, 1 (gentle) .. 5 (frantic). */
  pace: number;
  /** 0 .. 9, invader mould only (columns per rank). */
  gridDensity: number;
  /** 0 .. 9, breakout mould only (rows of bricks). */
  brickRows: number;
  /** Paddle width / growth dial, 0 .. 9. */
  handling: number;
  /** Number of extra hazards, 0 .. 9. */
  hazards: number;
  /** Colour treatment of the pressed screen. */
  palette: PaletteId;
  /** Cabinet-like overlay frame. */
  frame: FrameId;
  /** One extra rule layered onto the engine. */
  twist: TwistId;
  /** Public display name pressed onto the label. */
  title: string;
}

export type PaletteId = "sepia" | "cabinet" | "emerald";

export const PALETTE_OPTIONS: { id: PaletteId; label: string; hint: string }[] =
  [
    { id: "sepia", label: "Sepia Plate", hint: "Tarnished albumen print" },
    { id: "cabinet", label: "Oxblood Cabinet", hint: "Dark lacquer & brass" },
    { id: "emerald", label: "Emerald Ledger", hint: "Green library lamp" },
  ];

export type FrameId = "none" | "plaque" | "engraved";

export const FRAME_OPTIONS: { id: FrameId; label: string; hint: string }[] = [
  { id: "none", label: "Unframed", hint: "The bare plate" },
  { id: "plaque", label: "Brass Plaque", hint: "Mounted on walnut" },
  { id: "engraved", label: "Engraved Bezel", hint: "Etched glass surround" },
];

export type TwistId = "none" | "compact" | "brittle" | "decade";

export const TWIST_OPTIONS: { id: TwistId; label: string; hint: string }[] = [
  { id: "none", label: "None", hint: "A faithful pressing" },
  { id: "compact", label: "Tight Quarters", hint: "Field shrinks to 80%" },
  { id: "brittle", label: "Brittle Moulding", hint: "One hit ruins the piece" },
  {
    id: "decade",
    label: "House Target",
    hint: "The run is won at 500 pts",
  },
];

/** Dial ranges so the Studio's dropdowns and public validation stay in sync. */
export const DIAL_RANGES = {
  pace: { min: 1, max: 5 },
  gridDensity: { min: 0, max: 9 },
  brickRows: { min: 0, max: 9 },
  handling: {
    min: 0,
    byMould: { breakout: 3, snake: 9, invaders: 5 } as Record<MouldKind, number>,
  },
  hazards: { min: 0, max: 9 },
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
    dials: ["Brick rows", "Paddle width", "Twist"],
  },
  {
    id: "snake",
    name: "Mould №2 — Serpent",
    tagline: "The ever-growing coil",
    blurb: "A serpent grows with each mark it eats; avoid walls and itself.",
    dials: ["Marks on the board", "Growth dial", "Twist"],
  },
  {
    id: "invaders",
    name: "Mould №3 — Sentinels",
    tagline: "Ranks descend, you hold the line",
    blurb: "Marching ranks descend; hold the line until the ranks are cleared.",
    dials: ["Grid density", "Formation speed", "Twist"],
  },
];

export const MOULD_BASE_PACE: Record<MouldKind, number> = {
  breakout: 3,
  snake: 3,
  invaders: 2,
};

/** Parse an unknown value into a valid palette, else default. */
export function toPalette(value: unknown): PaletteId {
  return value === "cabinet" || value === "emerald" ? value : "sepia";
}

export function toFrame(value: unknown): FrameId {
  return value === "plaque" || value === "engraved" ? value : "none";
}

export function toTwist(value: unknown): TwistId {
  return value === "compact" ||
    value === "brittle" ||
    value === "decade"
    ? value
    : "none";
}

/** Clamp & validate a spec coming from the database or a share link. */
export function normalizeSpec(input: unknown): CartridgeSpec {
  const raw = (input ?? {}) as Record<string, unknown>;
  const mouldRaw = raw.mould;
  const mould: MouldKind =
    mouldRaw === "snake" || mouldRaw === "invaders" ? mouldRaw : "breakout";

  const clamp = (v: unknown, min: number, max: number, dflt: number) => {
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) return dflt;
    return Math.min(max, Math.max(min, Math.round(n)));
  };

  const pace = clamp(raw.pace, 1, 5, MOULD_BASE_PACE[mould]);
  const gridDensity = clamp(raw.gridDensity, 0, 9, 5);
  const brickRows = clamp(raw.brickRows, 0, 9, 4);
  const handlingMax = DIAL_RANGES.handling.byMould[mould];
  const handling = clamp(
    raw.handling,
    0,
    handlingMax,
    Math.round(handlingMax / 2),
  );
  const hazards = clamp(raw.hazards, 0, 9, 2);

  return {
    mould,
    pace,
    gridDensity,
    brickRows,
    handling,
    hazards,
    palette: toPalette(raw.palette),
    frame: toFrame(raw.frame),
    twist: toTwist(raw.twist),
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
};

/** Short human summary of the dials on a spec, for label plates. */
export function describeSpec(spec: CartridgeSpec): string[] {
  const parts: string[] = [];
  if (spec.mould === "breakout") parts.push(`${spec.brickRows} brick rows`);
  if (spec.mould === "invaders") parts.push(`grid of ${4 + spec.gridDensity}`);
  if (spec.mould === "snake") parts.push(`${12 + spec.gridDensity * 2} columns`);
  parts.push(DIAL_TERMS.handling.toLowerCase());
  if (spec.hazards > 0) parts.push(`${spec.hazards} fixtures`);
  parts.push(`speed ${spec.pace}/5`);
  return parts;
}
