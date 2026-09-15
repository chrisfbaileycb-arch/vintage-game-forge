// The Play page hosts three overlapping routes — /play/:cartridgeId,
// /play/standalone, and /s/:shareToken. These tests pin down which cartridge
// each shape of visit resolves to, including the bare shelf that carries no
// params at all (a regression guard: the static route never yields a
// `cartridgeId`, so an id-only check would leave "Play" on a dead page).
import { describe, expect, it } from "vitest";

import { HOUSE_SPEC, resolvePlaySpec } from "./playSetup";
import { normalizeSpec, type CartridgeSpec } from "./moulds";

const looseSpec: CartridgeSpec = normalizeSpec({
  mould: "snake",
  title: "LOOSE IMPRESSION",
});

describe("resolvePlaySpec — cartridge selection for the Play page", () => {
  it("lifts the house cartridge for the bare Play shelf (no id, no token)", () => {
    expect(
      resolvePlaySpec({ looseSpec: null, cartridgeId: undefined, shareToken: undefined }),
    ).toBe(HOUSE_SPEC);
  });

  it("returns nothing when a cartridge was named but could not be found", () => {
    // A bad id, a dead share token, or a private cartridge all land here and
    // must NOT quietly become the house sample.
    expect(
      resolvePlaySpec({ looseSpec: null, game: null, cartridgeId: "zzz" }),
    ).toBeNull();
    expect(
      resolvePlaySpec({ looseSpec: null, sharedGame: null, shareToken: "deadbeefdead" }),
    ).toBeNull();
  });

  it("prefers a loose impression over an id, a token, and the house spec", () => {
    const resolved = resolvePlaySpec({
      looseSpec,
      game: { spec: { mould: "breakout", title: "FROM SERVER" } },
      sharedGame: { spec: { mould: "maze", title: "FROM TOKEN" } },
      cartridgeId: "abcdefghijklmnop",
      shareToken: "abcdefghijklmnop",
    });
    expect(resolved).toBe(looseSpec);
  });

  it("resolves a by-id cartridge to its stored, normalized spec", () => {
    const resolved = resolvePlaySpec({
      looseSpec: null,
      game: { spec: { mould: "scaffolding", title: "GIRDER YARD" } },
      cartridgeId: "abcdefghijklmnop",
    });
    expect(resolved?.mould).toBe("scaffolding");
    expect(resolved?.title).toBe("GIRDER YARD");
    // normalizeSpec fills every dial, so the result is always playable.
    expect(typeof resolved?.pace).toBe("number");
  });

  it("resolves a share-token cartridge to its stored spec", () => {
    const resolved = resolvePlaySpec({
      looseSpec: null,
      sharedGame: { spec: { mould: "burrower", title: "AMBER DRIFT" } },
      shareToken: "abcdefghijklmnop",
    });
    expect(resolved?.mould).toBe("burrower");
    expect(resolved?.title).toBe("AMBER DRIFT");
  });

  it("keeps the house cartridge addressable only by not naming one", () => {
    // A named token/id always wins over the house fallback, whatever it holds.
    const viaId = resolvePlaySpec({
      looseSpec: null,
      game: { spec: { mould: "breakout" } },
      cartridgeId: "abcdefghijklmnop",
    });
    expect(viaId).not.toBe(HOUSE_SPEC);
  });
});
