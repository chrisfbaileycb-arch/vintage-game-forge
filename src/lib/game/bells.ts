/**
 * Foundry bells — a tiny WebAudio chime accent for notable engine events.
 *
 * The audio context is created lazily on the first user gesture (browser
 * autoplay policies), and every call is silent-safe: nothing throws if the
 * context is unavailable or the user has the cartridge muted.
 */

export type BellEvent =
  | "brick"
  | "mark"
  | "sentinel"
  | "token"
  | "sealLost"
  | "won"
  | "lost"
  | "combo"
  | "checkpoint"
  | "gate";

const NOTES_HZ: Record<BellEvent, number> = {
  brick: 660,
  mark: 523.25,
  sentinel: 587.33,
  token: 783.99,
  sealLost: 196,
  won: 1046.5,
  lost: 146.83,
  combo: 880,
  checkpoint: 987.77,
  gate: 739.99,
};

export interface FoundryBells {
  play(event: BellEvent): void;
  dispose(): void;
}

export function createFoundryBells(): FoundryBells {
  let ctx: AudioContext | null = null;
  let lastComboChime = 0;

  function context(): AudioContext | null {
    if (ctx) return ctx;
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      return ctx;
    } catch {
      return null;
    }
  }

  function tone(freq: number, duration: number, gainValue: number) {
    const ac = context();
    if (!ac) return;
    if (ac.state === "suspended") void ac.resume();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const t = ac.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(gainValue, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  return {
    play(event: BellEvent) {
      switch (event) {
        case "combo": {
          // Chime at most twice a second so streaks shimmer, not machine-gun.
          const now = performance.now();
          if (now - lastComboChime < 500) return;
          lastComboChime = now;
          tone(NOTES_HZ.combo, 0.12, 0.05);
          return;
        }
        case "brick":
          tone(NOTES_HZ.brick, 0.09, 0.05);
          return;
        case "mark":
          tone(NOTES_HZ.mark, 0.14, 0.06);
          return;
        case "sentinel":
          tone(NOTES_HZ.sentinel, 0.11, 0.05);
          return;
        case "token":
          tone(NOTES_HZ.token, 0.18, 0.07);
          return;
        case "sealLost":
          tone(NOTES_HZ.sealLost, 0.3, 0.08);
          return;
        case "won":
          tone(NOTES_HZ.won, 0.35, 0.08);
          return;
        case "lost":
          tone(NOTES_HZ.lost, 0.4, 0.08);
          return;
        case "checkpoint":
          tone(NOTES_HZ.checkpoint, 0.16, 0.07);
          return;
        case "gate":
          tone(NOTES_HZ.gate, 0.13, 0.06);
          return;
      }
    },
    dispose() {
      if (ctx) {
        void ctx.close().catch(() => undefined);
        ctx = null;
      }
    },
  };
}
