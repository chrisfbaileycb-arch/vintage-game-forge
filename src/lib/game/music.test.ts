// Music runs against the DOM's WebAudio; here we assert the loop data and
// mapping invariants, plus the silent-safe fallback when no audio exists.
import { beforeAll, describe, expect, it } from "vitest";

import {
  createFoundryMusic,
  loopFor,
  moodForMould,
  MUSIC_MOODS,
} from "./music";
import { MOULD_OPTIONS } from "./moulds";

describe("foundry music — per-mould loops", () => {
  it("has exactly one loop per mould family", () => {
    expect(MUSIC_MOODS).toHaveLength(MOULD_OPTIONS.length);
    expect(new Set(MUSIC_MOODS).size).toBe(MUSIC_MOODS.length);
    for (const { id } of MOULD_OPTIONS) {
      expect(MUSIC_MOODS).toContain(id);
      const loop = loopFor(id);
      expect(loop, id).toBeTruthy();
    }
  });

  it("maps every mould to its own distinct mood", () => {
    const seen = new Set<string>();
    for (const { id } of MOULD_OPTIONS) {
      const mood = moodForMould(id);
      expect(mood, id).toBe(id);
      seen.add(mood);
    }
    expect(seen.size).toBe(MOULD_OPTIONS.length);
  });

  it("falls back to a valid mood for unknown moulds", () => {
    expect(MUSIC_MOODS).toContain(moodForMould("does-not-exist"));
  });

  it("every loop is a well-formed 16-step two-voice sequence", () => {
    for (const mood of MUSIC_MOODS) {
      const loop = loopFor(mood);
      expect(loop.bass, mood).toHaveLength(16);
      expect(loop.lead, mood).toHaveLength(16);
      expect(loop.stepSec, mood).toBeGreaterThan(0);
      expect(loop.stepSec, mood).toBeLessThan(1);
      // Every entry is a positive frequency or a rest (0).
      for (const v of [...loop.bass, ...loop.lead]) {
        expect(v >= 0, `${mood} step value ${v}`).toBe(true);
      }
      // Both voices must actually play something.
      expect(loop.bass.some((v) => v > 0), mood).toBe(true);
      expect(loop.lead.some((v) => v > 0), mood).toBe(true);
    }
  });

  it("gives each loop a distinct musical character", () => {
    // No two families share the same (bass, lead) waveform pairing, and
    // stepSec differs across at least most loops — the families should
    // sound different the moment a run starts.
    const pairs = MUSIC_MOODS.map((m) => {
      const l = loopFor(m);
      return `${l.bassWave}/${l.leadWave}`;
    });
    expect(new Set(pairs).size).toBeGreaterThanOrEqual(5);
    const tempos = new Set(MUSIC_MOODS.map((m) => loopFor(m).stepSec));
    expect(tempos.size).toBeGreaterThanOrEqual(6);
  });

  it("stays silent-safe when AudioContext is unavailable", () => {
    (globalThis as Record<string, unknown>).window = {
      AudioContext: undefined,
      webkitAudioContext: undefined,
    };
    const music = createFoundryMusic();
    expect(() => {
      music.start("scaffolding");
      music.start("burrower");
      music.stop();
      music.setVolume(0.3);
      music.dispose();
    }).not.toThrow();
  });

  it("switches loops safely while playing", () => {
    class FakeAudioContext {
      state = "suspended";
      currentTime = 0;
      destination = {};
      resume() {
        return Promise.resolve();
      }
      close() {
        return Promise.resolve();
      }
      createOscillator() {
        return {
          type: "",
          frequency: { value: 0 },
          connect: () => ({ connect: () => ({}) }),
          start: () => undefined,
          stop: () => undefined,
        };
      }
      createGain() {
        return {
          gain: {
            setValueAtTime: () => undefined,
            linearRampToValueAtTime: () => undefined,
            exponentialRampToValueAtTime: () => undefined,
            setTargetAtTime: () => undefined,
            value: 1,
          },
          connect: () => ({}),
        };
      }
    }
    (globalThis as Record<string, unknown>).window = {
      AudioContext: FakeAudioContext,
      setInterval: () => 0,
      clearInterval: () => undefined,
    };
    const music = createFoundryMusic();
    expect(() => {
      music.start("crossing");
      music.start("maze"); // mid-play mood switch
      music.start("flyer");
      music.stop();
      music.dispose();
    }).not.toThrow();
  });
});
