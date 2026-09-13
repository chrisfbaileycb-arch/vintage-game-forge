/**
 * The Maker's Cabinet — local persistence for anonymously-created cartridges.
 *
 * A small repository layer over localStorage. Every function is written
 * against an interface that a hosted backend can implement later without the
 * game runtime or pages knowing the difference. When a Convex account is in
 * play, the Workshop (server-persisted) is the source of truth; the local
 * cabinet keeps anonymous visitors' presses safe between visits.
 *
 * Stored shapes are versioned (SCHEMA_KEY) and every read is defensive:
 * corrupt rows are dropped, not thrown.
 */

import { SCHEMA_VERSION, normalizeSpec, type CartridgeSpec, type MouldKind } from "./game/moulds";

const CABINET_KEY = "foundry.cabinet.v1";
const SCORES_KEY = "foundry.scores.v1";
const MAX_CARTRIDGES = 200;
const MAX_SCORES_PER_CARTRIDGE = 50;

export interface LocalCartridge {
  id: string;
  title: string;
  /** Normalized, validated spec — never trusted raw from storage. */
  spec: CartridgeSpec;
  mould: MouldKind;
  createdAt: number;
  updatedAt: number;
  bestScore: number;
  plays: number;
}

export type RunOutcome = "won" | "lost" | "abandoned";

export interface LocalScore {
  id: string;
  cartridgeId: string | null;
  /** Pattern-book preset id, when the run was made from a preset. */
  presetId: string | null;
  cartridgeTitle: string;
  score: number;
  level: number;
  durationSec: number;
  outcome: RunOutcome;
  createdAt: number;
  /** Runtime version that recorded the run. */
  runtimeVersion: number;
}

export interface CabinetRepository {
  listCartridges(): LocalCartridge[];
  getCartridge(id: string): LocalCartridge | null;
  saveCartridge(input: { id?: string; title: string; spec: CartridgeSpec }): LocalCartridge;
  removeCartridge(id: string): void;
  recordScore(score: Omit<LocalScore, "id" | "createdAt" | "runtimeVersion">): LocalScore;
  listScores(cartridgeId: string | null, presetId?: string | null): LocalScore[];
  clearScores(cartridgeId: string): void;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function storage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

function makeId(): string {
  const bytes = new Uint8Array(12);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function readCartridges(): LocalCartridge[] {
  const store = storage();
  if (!store) return [];
  const rows = safeParse<unknown[]>(store.getItem(CABINET_KEY));
  if (!Array.isArray(rows)) return [];
  const out: LocalCartridge[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const spec = normalizeSpec(r.spec);
    if (typeof r.id !== "string" || typeof r.title !== "string") continue;
    out.push({
      id: r.id,
      title: r.title.slice(0, 40),
      spec,
      mould: spec.mould,
      createdAt: typeof r.createdAt === "number" ? r.createdAt : Date.now(),
      updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : Date.now(),
      bestScore: typeof r.bestScore === "number" ? r.bestScore : 0,
      plays: typeof r.plays === "number" ? r.plays : 0,
    });
  }
  return out;
}

function writeCartridges(list: LocalCartridge[]): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(CABINET_KEY, JSON.stringify(list.slice(0, MAX_CARTRIDGES)));
  } catch {
    /* storage full or blocked — the cabinet is best-effort by design */
  }
}

function readScores(): LocalScore[] {
  const store = storage();
  if (!store) return [];
  const rows = safeParse<unknown[]>(store.getItem(SCORES_KEY));
  if (!Array.isArray(rows)) return [];
  const out: LocalScore[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.id !== "string") continue;
    const score = typeof r.score === "number" ? Math.max(0, Math.min(1_000_000, Math.round(r.score))) : 0;
    out.push({
      id: r.id,
      cartridgeId: typeof r.cartridgeId === "string" ? r.cartridgeId : null,
      presetId: typeof r.presetId === "string" ? r.presetId : null,
      cartridgeTitle: typeof r.cartridgeTitle === "string" ? r.cartridgeTitle.slice(0, 40) : "Untitled",
      score,
      level: typeof r.level === "number" ? Math.max(0, Math.round(r.level)) : 1,
      durationSec: typeof r.durationSec === "number" ? Math.max(0, Math.round(r.durationSec)) : 0,
      outcome: r.outcome === "won" || r.outcome === "lost" || r.outcome === "abandoned" ? r.outcome : "abandoned",
      createdAt: typeof r.createdAt === "number" ? r.createdAt : Date.now(),
      runtimeVersion: typeof r.runtimeVersion === "number" ? r.runtimeVersion : SCHEMA_VERSION,
    });
  }
  return out;
}

function writeScores(list: LocalScore[]): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(SCORES_KEY, JSON.stringify(list.slice(0, MAX_SCORES_PER_CARTRIDGE * MAX_CARTRIDGES)));
  } catch {
    /* best-effort */
  }
}

export const cabinet: CabinetRepository = {
  listCartridges() {
    return readCartridges().sort((a, b) => b.updatedAt - a.updatedAt);
  },

  getCartridge(id) {
    return readCartridges().find((c) => c.id === id) ?? null;
  },

  saveCartridge(input) {
    const spec = normalizeSpec(input.spec);
    const title = input.title.trim().slice(0, 40) || "Untitled Pressing";
    spec.title = title;
    const now = Date.now();
    const list = readCartridges();
    const existing = input.id ? list.find((c) => c.id === input.id) : undefined;
    let cartridge: LocalCartridge;
    if (existing) {
      cartridge = { ...existing, title, spec, mould: spec.mould, updatedAt: now };
      const idx = list.indexOf(existing);
      list[idx] = cartridge;
    } else {
      cartridge = {
        id: makeId(),
        title,
        spec,
        mould: spec.mould,
        createdAt: now,
        updatedAt: now,
        bestScore: 0,
        plays: 0,
      };
      list.unshift(cartridge);
    }
    writeCartridges(list);
    return cartridge;
  },

  removeCartridge(id) {
    writeCartridges(readCartridges().filter((c) => c.id !== id));
  },

  recordScore(entry) {
    // Treat client-supplied values as untrusted: clamp at the boundary.
    const record: LocalScore = {
      ...entry,
      score: Math.max(0, Math.min(1_000_000, Math.round(entry.score))),
      level: Math.max(0, Math.min(9999, Math.round(entry.level))),
      durationSec: Math.max(0, Math.min(86400, Math.round(entry.durationSec))),
      id: makeId(),
      createdAt: Date.now(),
      runtimeVersion: SCHEMA_VERSION,
    };
    const list = readScores();
    list.unshift(record);
    // Prune: keep the best 50 per cartridge/preset bucket.
    const buckets = new Map<string, LocalScore[]>();
    for (const s of list) {
      const key = s.cartridgeId ?? `preset:${s.presetId ?? "loose"}`;
      const bucket = buckets.get(key) ?? [];
      bucket.push(s);
      buckets.set(key, bucket);
    }
    const pruned: LocalScore[] = [];
    for (const bucket of buckets.values()) {
      bucket.sort((a, b) => b.score - a.score || b.createdAt - a.createdAt);
      pruned.push(...bucket.slice(0, MAX_SCORES_PER_CARTRIDGE));
    }
    pruned.sort((a, b) => b.createdAt - a.createdAt);
    writeScores(pruned);

    // Bump the cartridge's own ledger.
    if (record.cartridgeId) {
      const cartridges = readCartridges();
      const target = cartridges.find((c) => c.id === record.cartridgeId);
      if (target) {
        target.bestScore = Math.max(target.bestScore, record.score);
        target.plays += 1;
        target.updatedAt = Date.now();
        writeCartridges(cartridges);
      }
    }
    return record;
  },

  listScores(cartridgeId, presetId = null) {
    return readScores()
      .filter((s) =>
        cartridgeId
          ? s.cartridgeId === cartridgeId
          : presetId
            ? s.cartridgeId === null && s.presetId === presetId
            : s.cartridgeId === null,
      )
      .sort((a, b) => b.score - a.score || b.createdAt - a.createdAt);
  },

  clearScores(cartridgeId) {
    writeScores(readScores().filter((s) => s.cartridgeId !== cartridgeId));
  },
};
