import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Cabinet repository tests. localStorage is mocked in-memory so the tests
 * run in any environment; the repository code paths are the real ones.
 */

const store = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
});

import { cabinet } from "./cabinet";
import { normalizeSpec } from "./game/moulds";

function specFor(overrides: Record<string, unknown> = {}) {
  return normalizeSpec({ mould: "breakout", title: "TEST PRESSING", ...overrides });
}

beforeEach(() => {
  store.clear();
});

describe("cabinet cartridges", () => {
  it("saves, lists and reloads a cartridge", () => {
    const saved = cabinet.saveCartridge({ title: "Iron Wall", spec: specFor() });
    expect(saved.id).toBeTruthy();
    expect(saved.title).toBe("Iron Wall");
    const listed = cabinet.listCartridges();
    expect(listed).toHaveLength(1);
    expect(listed[0]!.title).toBe("Iron Wall");
    expect(listed[0]!.spec.mould).toBe("breakout");
  });

  it("updates in place when given an existing id", () => {
    const saved = cabinet.saveCartridge({ title: "First", spec: specFor() });
    cabinet.saveCartridge({ id: saved.id, title: "Second", spec: specFor({ pace: 5 }) });
    const listed = cabinet.listCartridges();
    expect(listed).toHaveLength(1);
    expect(listed[0]!.title).toBe("Second");
    expect(listed[0]!.spec.pace).toBe(5);
    expect(listed[0]!.createdAt).toBe(saved.createdAt);
  });

  it("removes a cartridge", () => {
    const saved = cabinet.saveCartridge({ title: "Doomed", spec: specFor() });
    cabinet.removeCartridge(saved.id);
    expect(cabinet.listCartridges()).toHaveLength(0);
    expect(cabinet.getCartridge(saved.id)).toBeNull();
  });

  it("survives corrupt stored rows", () => {
    store.set(
      "foundry.cabinet.v1",
      JSON.stringify([{ nonsense: true }, null, { id: 5 }]),
    );
    expect(cabinet.listCartridges()).toHaveLength(0);
  });

  it("survives corrupt JSON", () => {
    store.set("foundry.cabinet.v1", "{not json");
    expect(cabinet.listCartridges()).toHaveLength(0);
  });
});

describe("cabinet scores", () => {
  it("records and lists run scores", () => {
    const saved = cabinet.saveCartridge({ title: "Ledger Test", spec: specFor() });
    cabinet.recordScore({
      cartridgeId: saved.id,
      presetId: null,
      cartridgeTitle: saved.title,
      score: 250,
      level: 1,
      durationSec: 42,
      outcome: "lost",
    });
    const scores = cabinet.listScores(saved.id);
    expect(scores).toHaveLength(1);
    expect(scores[0]!.score).toBe(250);
    expect(scores[0]!.outcome).toBe("lost");
  });

  it("keeps the cartridge's best score and play count fresh", () => {
    const saved = cabinet.saveCartridge({ title: "Besty", spec: specFor() });
    cabinet.recordScore({
      cartridgeId: saved.id,
      presetId: null,
      cartridgeTitle: saved.title,
      score: 100,
      level: 1,
      durationSec: 10,
      outcome: "lost",
    });
    cabinet.recordScore({
      cartridgeId: saved.id,
      presetId: null,
      cartridgeTitle: saved.title,
      score: 400,
      level: 1,
      durationSec: 30,
      outcome: "won",
    });
    const reloaded = cabinet.getCartridge(saved.id);
    expect(reloaded!.bestScore).toBe(400);
    expect(reloaded!.plays).toBe(2);
  });

  it("clamps impossible payloads", () => {
    const record = cabinet.recordScore({
      cartridgeId: null,
      presetId: null,
      cartridgeTitle: "X",
      score: 99_999_999,
      level: 1,
      durationSec: 0,
      outcome: "won",
    });
    expect(record.score).toBeLessThanOrEqual(1_000_000);
  });
});
