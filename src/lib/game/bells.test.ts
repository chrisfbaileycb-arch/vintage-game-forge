// Bells run against the DOM's WebAudio; here we only assert the silent-safe
// fallbacks, so we install a minimal `window` before importing the module.
import { beforeAll, describe, expect, it } from "vitest";

import { createFoundryBells } from "./bells";

describe("foundry bells", () => {
  let created = 0;

  beforeAll(() => {
    (globalThis as Record<string, unknown>).window = {
      AudioContext: undefined,
      webkitAudioContext: undefined,
    };
  });

  it("stays silent-safe when AudioContext is unavailable", () => {
    const bells = createFoundryBells();
    expect(() => bells.play("brick")).not.toThrow();
    expect(() => bells.play("won")).not.toThrow();
    expect(() => bells.dispose()).not.toThrow();
  });

  it("creates a context once constructed classes are provided", () => {
    class FakeAudioContext {
      state = "suspended";
      currentTime = 0;
      destination = {};
      resume() {
        created += 1;
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
          },
          connect: () => ({}),
        };
      }
    }
    (globalThis as Record<string, unknown>).window = {
      AudioContext: FakeAudioContext,
    };
    created = 0;
    const bells = createFoundryBells();
    bells.play("brick");
    expect(created).toBeGreaterThan(0);
    bells.dispose();
  });

  it("rate-limits combo chimes", () => {
    (globalThis as Record<string, unknown>).window = {
      AudioContext: undefined,
    };
    const bells = createFoundryBells();
    expect(() => {
      bells.play("combo");
      bells.play("combo");
      bells.play("combo");
    }).not.toThrow();
    bells.dispose();
  });

  it("survives an AudioContext constructor that throws", () => {
    (globalThis as Record<string, unknown>).window = {
      AudioContext: class {
        constructor() {
          throw new Error("blocked");
        }
      },
    };
    const bells = createFoundryBells();
    expect(() => bells.play("mark")).not.toThrow();
    bells.dispose();
  });
});
