/**
 * Which cartridge is on the platter for a `/play/...` or `/s/:token` route.
 *
 * This is the one piece of the Play page that is worth reasoning about in
 * isolation, because the routes overlap: `/play/:cartridgeId` and the static
 * `/play/standalone` both exist, so a bare "Play" visit arrives with *no*
 * params at all and must still resolve to something playable.
 */

import { normalizeSpec, type CartridgeSpec } from "./moulds";

/** The Foundry's own house cartridge, shown when no code or id is supplied. */
export const HOUSE_SPEC: CartridgeSpec = normalizeSpec({
  mould: "breakout",
  title: "THE FOUNDRY SAMPLE",
  brickRows: 5,
  handling: 2,
  hazards: 3,
  pace: 3,
  palette: "sepia",
  frame: "plaque",
  twist: "none",
});

export interface PlaySetupInput {
  /** A spec decoded from `?code=` or resolved from `?pattern=`. */
  looseSpec: CartridgeSpec | null;
  /** Record fetched by `:cartridgeId` (public, or owned by the viewer). */
  game?: { spec: unknown } | null;
  /** Record resolved from `:shareToken` (revoked tokens resolve to null). */
  sharedGame?: { spec: unknown } | null;
  cartridgeId?: string;
  shareToken?: string;
}

/**
 * Resolve the cartridge for the current route, in priority order:
 * a loose impression (`?code=`/`?pattern=`) → the id → the share token → the
 * house cartridge for the open "Play" shelf → nothing (an empty sleeve).
 *
 * The house cartridge only applies when the visit named *no* cartridge and no
 * token — i.e. the bare standalone shelf. A bad id, a dead share token, or a
 * private cartridge never fall back to it; those render the empty sleeve.
 */
export function resolvePlaySpec(input: PlaySetupInput): CartridgeSpec | null {
  const { looseSpec, game, sharedGame, cartridgeId, shareToken } = input;
  if (looseSpec) return looseSpec;
  if (game) return normalizeSpec(game.spec);
  if (sharedGame) return normalizeSpec(sharedGame.spec);
  if (!cartridgeId && !shareToken) return HOUSE_SPEC;
  return null;
}
