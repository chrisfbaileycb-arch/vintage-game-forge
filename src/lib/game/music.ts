/**
 * Foundry music — original chiptune loop engine.
 *
 * Four original step-sequenced loops (one per mould family mood), written
 * for this project: simple pentatonic and modal figures over a steady bass.
 * No sampled or transcribed material — every note below was chosen for this
 * game. Scheduling uses the standard look-ahead pattern: a 25ms timer queues
 * notes on the WebAudio clock 120ms ahead, so the groove never stutters.
 */

// Note frequencies (Hz) for the octave we use.
const N: Record<string, number> = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0,
  REST: 0,
};

export type MusicMood = "foundry" | "march" | "flight" | "underground";

/** Which mood loop fits each mould. */
export function moodForMould(mould: string): MusicMood {
  switch (mould) {
    case "invaders":
    case "crossing":
      return "march";
    case "flyer":
      return "flight";
    case "burrower":
    case "maze":
      return "underground";
    default:
      return "foundry";
  }
}

interface Loop {
  /** Seconds per 16th-note step. */
  stepSec: number;
  /** 16-step bass sequence. */
  bass: number[];
  /** 16-step lead sequence. */
  lead: number[];
}

/** The original loops. Zero frequency = rest. */
const LOOPS: Record<MusicMood, Loop> = {
  // Steady industrial pulse: root-fifth bass, patient pentatonic lead.
  foundry: {
    stepSec: 0.14,
    bass: [N.C3, 0, N.G3, 0, N.C3, 0, N.G3, 0, N.A3, 0, N.E3, 0, N.F3, 0, N.G3, 0],
    lead: [N.C5, 0, N.E5, N.G5, 0, N.E5, 0, N.C5, N.D5, 0, N.E5, 0, N.G5, 0, N.E5, 0],
  },
  // Brisk semaphore march: driving bass, call-and-answer lead.
  march: {
    stepSec: 0.115,
    bass: [N.A3, N.A3, 0, N.A3, 0, N.G3, 0, N.E3, N.F3, N.F3, 0, N.F3, 0, N.G3, 0, N.G3],
    lead: [N.E5, 0, N.C5, 0, N.E5, 0, N.A5, 0, N.G5, 0, N.E5, 0, N.C5, N.D5, N.E5, 0],
  },
  // Airborne arpeggio: rolling bass, circling lead line.
  flight: {
    stepSec: 0.1,
    bass: [N.F3, 0, N.C4, 0, N.A3, 0, N.C4, 0, N.G3, 0, N.D4, 0, N.B3, 0, N.C4, 0],
    lead: [N.A5, N.F5, N.C5, N.F5, 0, N.A5, 0, N.C5, N.G5, N.E5, N.C5, N.E5, 0, N.G5, 0, N.C5],
  },
  // Lantern-lit descent: sparse bass, echoing minor lead.
  underground: {
    stepSec: 0.16,
    bass: [N.D3, 0, 0, 0, N.A3, 0, 0, 0, N.F3, 0, 0, 0, N.G3, 0, 0, 0],
    lead: [0, N.D5, 0, N.F5, 0, 0, N.E5, 0, 0, N.C5, 0, N.D5, 0, 0, 0, 0],
  },
};

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
  let loop: Loop = LOOPS.foundry;
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
      if (b > 0) voice(b, nextNoteTime, "triangle", loop.stepSec * 1.6, 0.5);
      if (l > 0) voice(l, nextNoteTime, "square", loop.stepSec * 0.9, 0.16);
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
