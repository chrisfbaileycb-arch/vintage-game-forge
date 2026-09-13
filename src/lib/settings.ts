/**
 * User settings — remappable controls & audio preferences.
 *
 * Everything here is device-local (localStorage) and cheap to read. Changes
 * broadcast a `foundry:settings-changed` event so mounted game cabinets pick
 * up new bindings without a reload.
 */

import { seedFromString } from "./game/rng";

// ---------------------------------------------------------------------------
// Control bindings
// ---------------------------------------------------------------------------

export type GameAction = "left" | "right" | "up" | "down" | "fire" | "pause";

export const GAME_ACTIONS: { action: GameAction; label: string; hint: string }[] = [
  { action: "left", label: "Left", hint: "Steer / move left" },
  { action: "right", label: "Right", hint: "Steer / move right" },
  { action: "up", label: "Up", hint: "Climb, walk, or hop" },
  { action: "down", label: "Down", hint: "Descend or back up" },
  { action: "fire", label: "Act", hint: "Fire, drop, or hop forward" },
  { action: "pause", label: "Pause", hint: "Pause / resume the run" },
];

export type ControlBindings = Record<GameAction, string[]>;

/** Default bindings: arrows + WASD, Space/Enter to act, P to pause. */
export const DEFAULT_BINDINGS: ControlBindings = {
  left: ["ArrowLeft", "a", "A"],
  right: ["ArrowRight", "d", "D"],
  up: ["ArrowUp", "w", "W"],
  down: ["ArrowDown", "s", "S"],
  fire: [" ", "Enter"],
  pause: ["p", "P"],
};

const CONTROLS_KEY = "foundry.controls.v1";

function safeParse(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function loadControls(): ControlBindings {
  if (typeof localStorage === "undefined") return { ...DEFAULT_BINDINGS };
  const stored = safeParse(localStorage.getItem(CONTROLS_KEY)) as
    | Partial<Record<GameAction, unknown>>
    | null;
  if (!stored) return { ...DEFAULT_BINDINGS };
  const out = { ...DEFAULT_BINDINGS };
  for (const { action } of GAME_ACTIONS) {
    const list = stored[action];
    if (
      Array.isArray(list) &&
      list.every((k) => typeof k === "string") &&
      list.length > 0
    ) {
      out[action] = list as string[];
    }
  }
  return out;
}

export function saveControls(bindings: ControlBindings): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(CONTROLS_KEY, JSON.stringify(bindings));
  } catch {
    /* best-effort */
  }
  emitChanged();
}

export function resetControls(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(CONTROLS_KEY);
  } catch {
    /* best-effort */
  }
  emitChanged();
}

/**
 * Bind a key to an action, removing that key from every other action so a
 * binding can never drive two actions at once. Pure: returns new bindings.
 */
export function applyBinding(
  bindings: ControlBindings,
  action: GameAction,
  key: string,
): ControlBindings {
  const out = { ...bindings } as ControlBindings;
  for (const { action: other } of GAME_ACTIONS) {
    out[other] =
      other === action
        ? [key]
        : out[other].filter((k) => k !== key);
  }
  return out;
}

/** Does a keyboard event match an action under these bindings? */
export function eventMatchesAction(
  e: KeyboardEvent,
  action: GameAction,
  bindings: ControlBindings,
): boolean {
  return bindings[action].includes(e.key);
}

/** Human-readable label for a stored key value. */
export function keyLabel(key: string): string {
  if (key === " ") return "Space";
  if (key === "Enter") return "Enter";
  if (key.startsWith("Arrow")) return key.slice(5);
  return key.length === 1 ? key.toUpperCase() : key;
}

// ---------------------------------------------------------------------------
// Audio preferences
// ---------------------------------------------------------------------------

export interface AudioSettings {
  /** Master volume 0..1 (applies to chimes and music). */
  volume: number;
  /** Chiptune music loops on/off. */
  music: boolean;
  /** Default state of the per-cabinet foundry bells. */
  bells: boolean;
}

export const DEFAULT_AUDIO: AudioSettings = {
  volume: 0.7,
  music: true,
  bells: true,
};

const AUDIO_KEY = "foundry.audio.v1";

export function loadAudio(): AudioSettings {
  if (typeof localStorage === "undefined") return { ...DEFAULT_AUDIO };
  const stored = safeParse(localStorage.getItem(AUDIO_KEY)) as
    | Partial<AudioSettings>
    | null;
  if (!stored) return { ...DEFAULT_AUDIO };
  return {
    volume:
      typeof stored.volume === "number"
        ? Math.min(1, Math.max(0, stored.volume))
        : DEFAULT_AUDIO.volume,
    music: typeof stored.music === "boolean" ? stored.music : DEFAULT_AUDIO.music,
    bells: typeof stored.bells === "boolean" ? stored.bells : DEFAULT_AUDIO.bells,
  };
}

export function saveAudio(settings: AudioSettings): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(AUDIO_KEY, JSON.stringify(settings));
  } catch {
    /* best-effort */
  }
  emitChanged();
}

// ---------------------------------------------------------------------------
// Change broadcast
// ---------------------------------------------------------------------------

const SETTINGS_EVENT = "foundry:settings-changed";

function emitChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SETTINGS_EVENT));
}

/** Subscribe to any settings change; returns an unsubscribe function. */
export function subscribeSettings(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(SETTINGS_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(SETTINGS_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

/** Stable per-device salt for token-adjacent ids (not a secret). */
export function deviceSalt(): string {
  return String(seedFromString("foundry.device"));
}
