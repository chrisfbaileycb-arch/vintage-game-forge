/**
 * Foundry music — original chiptune loop engine.
 *
 * Nine original step-sequenced loops — one per mould family — written for
 * this project: simple pentatonic and modal figures over a steady bass.
 * No sampled or transcribed material — every note below was chosen for this
 * game. Scheduling uses the standard look-ahead pattern: a 25ms timer queues
 * notes on the WebAudio clock 120ms ahead, so the groove never stutters.
 */

import type { MouldKind } from "./moulds";

// Note frequencies (Hz) for the octaves we use.
const N: Record<string, number> = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0, B5: 987.77,
  C6: 1046.5,
  REST: 0,
};

/** Each mould family gets its own mood loop. */
export type MusicMood = MouldKind;

export const MUSIC_MOODS: readonly MusicMood[] = [
  "breakout",
  "snake",
  "invaders",
  "maze",
  "flyer",
  "burrower",
  "scaffolding",
  "stacker",
  "crossing",
];

/** Which mood loop fits each mould (identity map; unknown falls back). */
export function moodForMould(mould: string): MusicMood {
  return (MUSIC_MOODS as readonly string[]).includes(mould)
    ? (mould as MusicMood)
    : "breakout";
}

interface Loop {
  /** Seconds per 16th-note step. */
  stepSec: number;
  /** 16-step bass sequence. */
  bass: number[];
  /** 16-step lead sequence. */
  lead: number[];
  /** Waveform character for the bass voice. */
  bassWave: OscillatorType;
  /** Waveform character for the lead voice. */
  leadWave: OscillatorType;
}

/**
 * The original loops, one per mould. Zero frequency = rest.
 * Each is composed to match its family's tempo and temper:
 * paddle-industrial, slinking, martial, lantern-lit, airborne, chugging,
 * climbing, bouncy, and brisk.
 */
const LOOPS: Record<MusicMood, Loop> = {
  // Breaker — steady industrial pulse: root-fifth bass, patient pentatonic lead.
  breakout: {
    stepSec: 0.14,
    bass: [N.C3, 0, N.G3, 0, N.C3, 0, N.G3, 0, N.A3, 0, N.E3, 0, N.F3, 0, N.G3, 0],
    lead: [N.C5, 0, N.E5, N.G5, 0, N.E5, 0, N.C5, N.D5, 0, N.E5, 0, N.G5, 0, N.E5, 0],
    bassWave: "triangle",
    leadWave: "square",
  },
  // Serpent — sinuous minor wander: smooth winding bass, slinky round lead.
  snake: {
    stepSec: 0.165,
    bass: [N.A3, 0, 0, N.C4, 0, 0, N.G3, 0, 0, N.E3, 0, 0, N.F3, 0, N.G3, 0],
    lead: [0, N.E5, 0, 0, N.A5, 0, 0, N.G5, 0, N.E5, 0, N.D5, 0, N.C5, 0, 0],
    bassWave: "sine",
    leadWave: "sine",
  },
  // Sentinels — martial stomp: raspy driving bass, call-and-answer lead.
  invaders: {
    stepSec: 0.11,
    bass: [N.A3, N.A3, 0, N.A3, 0, N.G3, 0, N.E3, N.F3, N.F3, 0, N.F3, 0, N.G3, 0, N.G3],
    lead: [N.E5, 0, N.C5, 0, N.E5, 0, N.A5, 0, N.G5, 0, N.E5, 0, N.C5, N.D5, N.E5, 0],
    bassWave: "sawtooth",
    leadWave: "square",
  },
  // Stereoscope — lantern-lit corridors: sparse bass, echoing minor lead.
  maze: {
    stepSec: 0.17,
    bass: [N.D3, 0, 0, 0, N.A3, 0, 0, 0, N.F3, 0, 0, 0, N.G3, 0, 0, 0],
    lead: [0, N.D5, 0, N.F5, 0, 0, N.E5, 0, 0, N.C5, 0, N.D5, 0, 0, 0, 0],
    bassWave: "sine",
    leadWave: "triangle",
  },
  // Aerodrome — airborne arpeggio: rolling bass, bright circling lead.
  flyer: {
    stepSec: 0.1,
    bass: [N.F3, 0, N.C4, 0, N.A3, 0, N.C4, 0, N.G3, 0, N.D4, 0, N.B3, 0, N.C4, 0],
    lead: [N.A5, N.F5, N.C5, N.F5, 0, N.A5, 0, N.C5, N.G5, N.E5, N.C5, N.E5, 0, N.G5, 0, N.C5],
    bassWave: "sine",
    leadWave: "square",
  },
  // Burrower — low digging chug: raspy saw bass, sparse earthy lead.
  burrower: {
    stepSec: 0.15,
    bass: [N.E3, 0, N.E3, 0, N.G3, 0, N.E3, 0, N.A3, 0, N.G3, 0, N.E3, 0, N.D3, 0],
    lead: [0, N.D5, 0, N.E5, 0, 0, N.G5, 0, N.E5, 0, N.D5, 0, N.B4, 0, 0, 0],
    bassWave: "sawtooth",
    leadWave: "triangle",
  },
  // Scaffolding — the climb: walking bass that ascends, mellow lead reaching upward.
  scaffolding: {
    stepSec: 0.12,
    bass: [N.C3, N.D3, N.E3, 0, N.F3, N.G3, N.A3, 0, N.G3, 0, N.E3, 0, N.F3, 0, N.G3, 0],
    lead: [N.E5, N.G5, N.A5, 0, N.C6, 0, N.A5, N.G5, N.E5, 0, N.G5, 0, N.C5, N.D5, N.E5, 0],
    bassWave: "triangle",
    leadWave: "triangle",
  },
  // Menagerie — dockside bounce: jaunty swing bass, round cheery lead.
  stacker: {
    stepSec: 0.13,
    bass: [N.C3, 0, N.G3, 0, N.E3, 0, N.G3, 0, N.F3, 0, N.C4, 0, N.A3, 0, N.G3, 0],
    lead: [N.G5, 0, N.E5, 0, N.C5, 0, N.E5, 0, N.A5, 0, N.G5, 0, N.E5, 0, N.D5, N.C5],
    bassWave: "triangle",
    leadWave: "sine",
  },
  // Crossing guard — brisk traffic chirp: bright hop bass, cutting lead.
  crossing: {
    stepSec: 0.12,
    bass: [N.F3, N.F3, 0, N.F3, 0, N.C4, 0, N.A3, N.B3, N.B3, 0, N.B3, 0, N.C4, 0, N.A3],
    lead: [N.C5, N.D5, N.F5, 0, N.A5, 0, N.F5, N.D5, N.C5, 0, N.D5, N.F5, 0, N.D5, N.C5, 0],
    bassWave: "square",
    leadWave: "triangle",
  },
};

/** Internal accessor exposed for tests and tooling. */
export function loopFor(mood: MusicMood): Readonly<Loop> {
  return LOOPS[mood];
}

export interface FoundryMusic {
  /** Start the loop for a mood. Safe to call repeatedly. */
  start(mood: MusicMood): void;
  /** Stop playback (keeps the audio context for a quick restart). */
  stop(): void;
  /** Set master volume 0..1. */
  setVolume(v: number): void;
  dispose(): void;
}

export function createFoundryMusic(): FoundryMusic {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let timer: number | null = null;
  let loop: Loop = LOOPS.breakout;
  let step = 0;
  let nextNoteTime = 0;
  let volume = 0.7;
  let playing = false;

  function context(): AudioContext | null {
    if (ctx) return ctx;
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = volume * 0.25; // music sits under the chimes
      master.connect(ctx.destination);
      return ctx;
    } catch {
      return null;
    }
  }

  function voice(
    freq: number,
    time: number,
    type: OscillatorType,
    duration: number,
    level: number,
  ) {
    if (!ctx || !master || freq <= 0) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(level, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain).connect(master);
    osc.start(time);
    osc.stop(time + duration + 0.03);
  }

  function scheduleAhead(): void {
    if (!ctx) return;
    const horizon = ctx.currentTime + 0.12;
    while (nextNoteTime < horizon) {
      const b = loop.bass[step % 16]!;
      const l = loop.lead[step % 16]!;
      if (b > 0) voice(b, nextNoteTime, loop.bassWave, loop.stepSec * 1.6, 0.5);
      if (l > 0) voice(l, nextNoteTime, loop.leadWave, loop.stepSec * 0.9, 0.16);
      nextNoteTime += loop.stepSec;
      step += 1;
    }
  }

  return {
    start(mood) {
      loop = LOOPS[mood];
      const ac = context();
      if (!ac) return;
      if (ac.state === "suspended") void ac.resume();
      if (playing) return;
      playing = true;
      step = 0;
      nextNoteTime = ac.currentTime + 0.06;
      timer = window.setInterval(scheduleAhead, 25);
    },
    stop() {
      playing = false;
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    },
    setVolume(v) {
      volume = Math.min(1, Math.max(0, v));
      if (master && ctx) {
        master.gain.setTargetAtTime(volume * 0.25, ctx.currentTime, 0.05);
      }
    },
    dispose() {
      this.stop();
      if (ctx) {
        void ctx.close().catch(() => undefined);
        ctx = null;
        master = null;
      }
    },
  };
}
