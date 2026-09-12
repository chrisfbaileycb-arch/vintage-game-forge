/**
 * The Foundry Pattern Book — 50 named cartridge patterns.
 *
 * Each entry is a complete dial setting: a genuinely distinct playable game
 * from one of the five moulds. The Studio, the landing shelf, and the
 * standalone cabinet all cast directly from these patterns.
 */

import type { CartridgeSpec } from "./moulds";
import { normalizeSpec } from "./moulds";

export interface PatternEntry {
  id: string;
  name: string;
  blurb: string;
  spec: CartridgeSpec;
}

interface RawPattern {
  id: string;
  name: string;
  blurb: string;
  dial: Record<string, unknown>;
}

const RAW_PATTERNS: RawPattern[] = [
  // --- Mould №1 — Breaker (breakout) ---------------------------------------
  { id: "the-wall-1907", name: "The Wall, 1907", blurb: "The house classic: five rows, honest bat, no tricks.", dial: { mould: "breakout", title: "THE WALL, 1907", brickRows: 5, handling: 2, hazards: 0, tokens: 2, pace: 3, palette: "sepia", frame: "plaque", twist: "none", finish: "lithograph", bells: true, hue: 0 } },
  { id: "granite-yard", name: "Granite Yard", blurb: "Nine rows of double-hit stone. Bring patience.", dial: { mould: "breakout", title: "GRANITE YARD", brickRows: 9, handling: 3, hazards: 7, tokens: 3, pace: 3, palette: "nocturne", frame: "engraved", twist: "none", finish: "matte", bells: false, hue: 0 } },
  { id: "laundromat-blues", name: "Laundromat Blues", blurb: "Cobalt-toned, tight quarters, one seal only.", dial: { mould: "breakout", title: "LAUNDROMAT BLUES", brickRows: 6, handling: 1, hazards: 2, tokens: 1, pace: 4, palette: "blueprint", frame: "ticket", twist: "brittle", finish: "electric", bells: true, hue: 210 } },
  { id: "mangle-and-press", name: "Mangle & Press", blurb: "Twin rotors guard the wall at a frantic pace.", dial: { mould: "breakout", title: "MANGLE & PRESS", brickRows: 7, handling: 2, hazards: 6, tokens: 2, pace: 4, palette: "cabinet", frame: "plaque", twist: "none", finish: "lithograph", bells: true, hue: 0 } },
  { id: "windfall-hall", name: "Windfall Hall", blurb: "Every fifth point paid double; clear at leisure.", dial: { mould: "breakout", title: "WINDFALL HALL", brickRows: 6, handling: 3, hazards: 0, tokens: 4, pace: 2, palette: "halftone", frame: "gilt", twist: "windfall", finish: "matte", bells: true, hue: 45 } },
  { id: "blackout-basement", name: "Blackout Basement", blurb: "The lamps fail in waves; play the wall by memory.", dial: { mould: "breakout", title: "BLACKOUT BASEMENT", brickRows: 5, handling: 3, hazards: 3, tokens: 2, pace: 3, palette: "nocturne", frame: "plaque", twist: "blackout", finish: "matte", bells: true, hue: 0 } },
  { id: "the-500-club", name: "The 500 Club", blurb: "Win at five hundred points, however you get there.", dial: { mould: "breakout", title: "THE 500 CLUB", brickRows: 8, handling: 2, hazards: 4, tokens: 5, pace: 3, palette: "emerald", frame: "engraved", twist: "decade", finish: "lithograph", bells: true, hue: 0 } },
  { id: "vermilion-parlour", name: "Vermilion Parlour", blurb: "Crimson-toned speed-run with a narrow bat.", dial: { mould: "breakout", title: "VERMILION PARLOUR", brickRows: 4, handling: 0, hazards: 2, tokens: 2, pace: 5, palette: "halftone", frame: "ticket", twist: "none", finish: "electric", bells: true, hue: 345 } },
  { id: "paper-lanterns", name: "Paper Lanterns", blurb: "Gold-bathed rows of one-hit lanterns; serene but quick.", dial: { mould: "breakout", title: "PAPER LANTERNS", brickRows: 6, handling: 3, hazards: 0, tokens: 3, pace: 2, palette: "sepia", frame: "gilt", twist: "none", finish: "lithograph", bells: true, hue: 60 } },
  { id: "the-counting-house", name: "The Counting House", blurb: "Tight quarters, double-hit bricks, three rotors of risk.", dial: { mould: "breakout", title: "THE COUNTING HOUSE", brickRows: 7, handling: 1, hazards: 9, tokens: 4, pace: 3, palette: "cabinet", frame: "plaque", twist: "compact", finish: "matte", bells: false, hue: 0 } },

  // --- Mould №2 — Serpent (snake) ------------------------------------------
  { id: "garden-serpent", name: "Garden Serpent", blurb: "The house coil: roomy board, gentle pace.", dial: { mould: "snake", title: "GARDEN SERPENT", gridDensity: 3, handling: 5, hazards: 3, tokens: 2, pace: 3, palette: "emerald", frame: "engraved", twist: "none", finish: "matte", bells: true, hue: 0 } },
  { id: "boa-constrictor", name: "Boa Constrictor", blurb: "Dense board, heavy growth per mark, no burrows.", dial: { mould: "snake", title: "BOA CONSTRICTOR", gridDensity: 0, handling: 9, hazards: 0, tokens: 1, pace: 3, palette: "nocturne", frame: "plaque", twist: "none", finish: "lithograph", bells: false, hue: 0 } },
  { id: "wormhole-express", name: "Wormhole Express", blurb: "Triple burrows teleport you across the board.", dial: { mould: "snake", title: "WORMHOLE EXPRESS", gridDensity: 4, handling: 4, hazards: 8, tokens: 2, pace: 4, palette: "blueprint", frame: "ticket", twist: "none", finish: "electric", bells: true, hue: 195 } },
  { id: "serpents-sabbath", name: "Serpent's Sabbath", blurb: "Frantic pace, six marks on the board at once.", dial: { mould: "snake", title: "SERPENT'S SABBATH", gridDensity: 2, handling: 3, hazards: 5, tokens: 3, pace: 5, palette: "halftone", frame: "plaque", twist: "none", finish: "matte", bells: true, hue: 0 } },
  { id: "the-tight-coil", name: "The Tight Coil", blurb: "Field shrinks to 80%; one seal only.", dial: { mould: "snake", title: "THE TIGHT COIL", gridDensity: 1, handling: 6, hazards: 2, tokens: 2, pace: 3, palette: "cabinet", frame: "engraved", twist: "compact", finish: "matte", bells: true, hue: 0 } },
  { id: "brittle-whip", name: "Brittle Whip", blurb: "One strike ruins the piece — perfection or nothing.", dial: { mould: "snake", title: "BRITTLE WHIP", gridDensity: 5, handling: 4, hazards: 1, tokens: 2, pace: 3, palette: "sepia", frame: "plaque", twist: "brittle", finish: "lithograph", bells: false, hue: 0 } },
  { id: "mark-of-five-hundred", name: "Mark of Five Hundred", blurb: "Win at 500 pts by chaining marks with combos.", dial: { mould: "snake", title: "MARK OF FIVE HUNDRED", gridDensity: 0, handling: 6, hazards: 6, tokens: 4, pace: 4, palette: "emerald", frame: "gilt", twist: "decade", finish: "electric", bells: true, hue: 120 } },
  { id: "orchid-run", name: "Orchid Run", blurb: "Violet-toned twilight board with burrow pairs.", dial: { mould: "snake", title: "ORCHID RUN", gridDensity: 6, handling: 5, hazards: 4, tokens: 3, pace: 3, palette: "nocturne", frame: "engraved", twist: "none", finish: "lithograph", bells: true, hue: 300 } },
  { id: "ouroboros", name: "Ouroboros", blurb: "Blackout drill: the coil by lamplight waves.", dial: { mould: "snake", title: "OUROBOROS", gridDensity: 3, handling: 4, hazards: 3, tokens: 2, pace: 3, palette: "nocturne", frame: "plaque", twist: "blackout", finish: "matte", bells: true, hue: 0 } },
  { id: "the-long-audit", name: "The Long Audit", blurb: "Twelve marks to consume; the slow ledger grows.", dial: { mould: "snake", title: "THE LONG AUDIT", gridDensity: 7, handling: 2, hazards: 2, tokens: 2, pace: 2, palette: "halftone", frame: "ticket", twist: "none", finish: "matte", bells: false, hue: 0 } },

  // --- Mould №3 — Sentinels (invaders) -------------------------------------
  { id: "sentinel-ranks", name: "Sentinel Ranks", blurb: "The house formation: six across, steady descent.", dial: { mould: "invaders", title: "SENTINEL RANKS", gridDensity: 6, handling: 2, hazards: 4, tokens: 3, pace: 2, palette: "nocturne", frame: "gilt", twist: "none", finish: "electric", bells: true, hue: 0 } },
  { id: "the-phalanx", name: "The Phalanx", blurb: "Thirteen across, fast march, tight sky.", dial: { mould: "invaders", title: "THE PHALANX", gridDensity: 9, handling: 3, hazards: 6, tokens: 3, pace: 3, palette: "cabinet", frame: "engraved", twist: "none", finish: "lithograph", bells: true, hue: 0 } },
  { id: "holding-the-line", name: "Holding the Line", blurb: "Brittle moulding: no barriers, one seal.", dial: { mould: "invaders", title: "HOLDING THE LINE", gridDensity: 5, handling: 2, hazards: 3, tokens: 2, pace: 2, palette: "sepia", frame: "plaque", twist: "brittle", finish: "matte", bells: false, hue: 0 } },
  { id: "cobalt-watch", name: "Cobalt Watch", blurb: "Azure bath, rotor hazard, lively pace.", dial: { mould: "invaders", title: "COBALT WATCH", gridDensity: 7, handling: 2, hazards: 5, tokens: 3, pace: 3, palette: "blueprint", frame: "ticket", twist: "none", finish: "electric", bells: true, hue: 225 } },
  { id: "the-lamplight-legation", name: "The Lamplight Legation", blurb: "Emerald lamp-lit ranks at a measured pace.", dial: { mould: "invaders", title: "THE LAMPLIGHT LEGATION", gridDensity: 4, handling: 3, hazards: 2, tokens: 2, pace: 2, palette: "emerald", frame: "plaque", twist: "none", finish: "lithograph", bells: true, hue: 0 } },
  { id: "bombardiers-ball", name: "Bombardier's Ball", blurb: "Max hazards: deep ranks, rotor, relentless bombs.", dial: { mould: "invaders", title: "BOMBARDIER'S BALL", gridDensity: 6, handling: 1, hazards: 9, tokens: 4, pace: 4, palette: "nocturne", frame: "engraved", twist: "none", finish: "electric", bells: true, hue: 0 } },
  { id: "crimson-carnival", name: "Crimson Carnival", blurb: "Rose-toned, frantic, tight quarters.", dial: { mould: "invaders", title: "CRIMSON CARNIVAL", gridDensity: 8, handling: 2, hazards: 5, tokens: 3, pace: 5, palette: "halftone", frame: "gilt", twist: "compact", finish: "lithograph", bells: true, hue: 330 } },
  { id: "the-quiet-quartermaster", name: "The Quiet Quartermaster", blurb: "Slow breeze-up for patient marksmen.", dial: { mould: "invaders", title: "THE QUIET QUARTERMASTER", gridDensity: 3, handling: 5, hazards: 1, tokens: 2, pace: 1, palette: "sepia", frame: "plaque", twist: "none", finish: "matte", bells: false, hue: 0 } },
  { id: "ledger-of-500", name: "Ledger of 500", blurb: "Reach the house target before the ranks reach you.", dial: { mould: "invaders", title: "LEDGER OF 500", gridDensity: 5, handling: 3, hazards: 4, tokens: 5, pace: 3, palette: "emerald", frame: "engraved", twist: "decade", finish: "lithograph", bells: true, hue: 0 } },
  { id: "lights-out-battery", name: "Lights-Out Battery", blurb: "Blackout drill over a full salvo battery.", dial: { mould: "invaders", title: "LIGHTS-OUT BATTERY", gridDensity: 7, handling: 3, hazards: 7, tokens: 3, pace: 3, palette: "nocturne", frame: "plaque", twist: "blackout", finish: "matte", bells: true, hue: 0 } },

  // --- Mould №4 — Stereoscope (first-person maze) --------------------------
  { id: "the-glass-corridors", name: "The Glass Corridors", blurb: "The house maze: blueprint walls, girth eight.", dial: { mould: "maze", title: "THE GLASS CORRIDORS", gridDensity: 2, handling: 3, hazards: 4, tokens: 4, pace: 3, palette: "blueprint", frame: "engraved", twist: "none", finish: "lithograph", bells: true, hue: 0 } },
  { id: "minotaur-s-account", name: "Minotaur's Account", blurb: "Sprawling labyrinth, girth eighteen.", dial: { mould: "maze", title: "MINOTAUR'S ACCOUNT", gridDensity: 5, handling: 2, hazards: 5, tokens: 4, pace: 3, palette: "cabinet", frame: "plaque", twist: "none", finish: "matte", bells: true, hue: 0 } },
  { id: "tapestry-of-threads", name: "Tapestry of Threads", blurb: "Orchid-toned corridors braided with shortcuts.", dial: { mould: "maze", title: "TAPESTRY OF THREADS", gridDensity: 3, handling: 3, hazards: 6, tokens: 3, pace: 3, palette: "nocturne", frame: "engraved", twist: "none", finish: "lithograph", bells: true, hue: 300 } },
  { id: "the-frantic-cataloguer", name: "The Frantic Cataloguer", blurb: "Short fuse; claim beacons at a sprint.", dial: { mould: "maze", title: "THE FRANTIC CATALOGUER", gridDensity: 1, handling: 4, hazards: 3, tokens: 3, pace: 5, palette: "halftone", frame: "ticket", twist: "none", finish: "electric", bells: true, hue: 0 } },
  { id: "cloisters-of-iron", name: "Cloisters of Iron", blurb: "Tight quarters in stone-toned passes.", dial: { mould: "maze", title: "CLOISTERS OF IRON", gridDensity: 4, handling: 2, hazards: 5, tokens: 3, pace: 2, palette: "nocturne", frame: "plaque", twist: "compact", finish: "matte", bells: false, hue: 0 } },
  { id: "one-lantern-left", name: "One Lantern Left", blurb: "Brittle rule: one seal, no mercy in the dark.", dial: { mould: "maze", title: "ONE LANTERN LEFT", gridDensity: 2, handling: 3, hazards: 4, tokens: 2, pace: 3, palette: "sepia", frame: "plaque", twist: "brittle", finish: "lithograph", bells: true, hue: 0 } },
  { id: "the-braided-vault", name: "The Braided Vault", blurb: "Maximum shortcuts; get lost fast, exit faster.", dial: { mould: "maze", title: "THE BRAIDED VAULT", gridDensity: 6, handling: 3, hazards: 9, tokens: 5, pace: 4, palette: "emerald", frame: "engraved", twist: "none", finish: "electric", bells: true, hue: 150 } },
  { id: "celadon-passages", name: "Celadon Passages", blurb: "Spring-bathed maze at a contemplative pace.", dial: { mould: "maze", title: "CELADON PASSAGES", gridDensity: 3, handling: 4, hazards: 3, tokens: 3, pace: 2, palette: "emerald", frame: "gilt", twist: "none", finish: "lithograph", bells: true, hue: 135 } },
  { id: "lamps-fail-at-nine", name: "Lamps Fail at Nine", blurb: "Blackout drill beneath the deepest corridors.", dial: { mould: "maze", title: "LAMPS FAIL AT NINE", gridDensity: 5, handling: 3, hazards: 6, tokens: 4, pace: 3, palette: "nocturne", frame: "plaque", twist: "blackout", finish: "matte", bells: true, hue: 0 } },
  { id: "the-five-hundred-steps", name: "The Five Hundred Steps", blurb: "Chain beacons to the 500-point target.", dial: { mould: "maze", title: "THE FIVE HUNDRED STEPS", gridDensity: 2, handling: 3, hazards: 4, tokens: 5, pace: 4, palette: "halftone", frame: "ticket", twist: "decade", finish: "lithograph", bells: true, hue: 0 } },

  // --- Mould №5 — Aerodrome (flyer) ----------------------------------------
  { id: "aerodrome-no-5", name: "Aerodrome No. 5", blurb: "The house circuit: nocturne sky, gilt frame.", dial: { mould: "flyer", title: "AERODROME NO. 5", gridDensity: 3, handling: 2, hazards: 3, tokens: 3, pace: 3, palette: "nocturne", frame: "gilt", twist: "windfall", finish: "electric", bells: true, hue: 210 } },
  { id: "barnstormer-s-delight", name: "Barnstormer's Delight", blurb: "Dense barrages, wide gates, gentle wind.", dial: { mould: "flyer", title: "BARNSTORMER'S DELIGHT", gridDensity: 2, handling: 5, hazards: 6, tokens: 3, pace: 2, palette: "sepia", frame: "plaque", twist: "none", finish: "lithograph", bells: true, hue: 0 } },
  { id: "the-mail-run", name: "The Mail Run", blurb: "Narrow gates, steady wind, honest flying.", dial: { mould: "flyer", title: "THE MAIL RUN", gridDensity: 4, handling: 0, hazards: 2, tokens: 2, pace: 3, palette: "halftone", frame: "ticket", twist: "none", finish: "matte", bells: false, hue: 0 } },
  { id: "squadron-of-nine", name: "Squadron of Nine", blurb: "Max barrage density; thread every ring.", dial: { mould: "flyer", title: "SQUADRON OF NINE", gridDensity: 9, handling: 2, hazards: 8, tokens: 4, pace: 4, palette: "cabinet", frame: "engraved", twist: "none", finish: "electric", bells: true, hue: 0 } },
  { id: "tailwind-ledger", name: "Tailwind Ledger", blurb: "Every fifth point paid double across the field.", dial: { mould: "flyer", title: "TAILWIND LEDGER", gridDensity: 3, handling: 3, hazards: 3, tokens: 4, pace: 3, palette: "emerald", frame: "plaque", twist: "windfall", finish: "lithograph", bells: true, hue: 90 } },
  { id: "the-fog-line", name: "The Fog Line", blurb: "Blackout banks roll in; fly by memory.", dial: { mould: "flyer", title: "THE FOG LINE", gridDensity: 2, handling: 2, hazards: 4, tokens: 3, pace: 3, palette: "nocturne", frame: "plaque", twist: "blackout", finish: "matte", bells: true, hue: 0 } },
  { id: "gale-over-marrow", name: "Gale Over Marrow", blurb: "Frantic pace, tight quarters, narrow gates.", dial: { mould: "flyer", title: "GALE OVER MARROW", gridDensity: 5, handling: 1, hazards: 7, tokens: 3, pace: 5, palette: "halftone", frame: "gilt", twist: "compact", finish: "electric", bells: true, hue: 30 } },
  { id: "one-wingspan", name: "One Wingspan", blurb: "Brittle moulding: one clip ends the circuit.", dial: { mould: "flyer", title: "ONE WINGSPAN", gridDensity: 4, handling: 2, hazards: 5, tokens: 2, pace: 3, palette: "blueprint", frame: "ticket", twist: "brittle", finish: "lithograph", bells: false, hue: 0 } },
  { id: "sapphire-altitude", name: "Sapphire Altitude", blurb: "Sapphire-bathed sky at a touring pace.", dial: { mould: "flyer", title: "SAPPHIRE ALTITUDE", gridDensity: 3, handling: 4, hazards: 3, tokens: 3, pace: 2, palette: "blueprint", frame: "engraved", twist: "none", finish: "lithograph", bells: true, hue: 240 } },
  { id: "the-golden-circuit", name: "The Golden Circuit", blurb: "Win at 500 pts on the amber show circuit.", dial: { mould: "flyer", title: "THE GOLDEN CIRCUIT", gridDensity: 3, handling: 3, hazards: 4, tokens: 5, pace: 4, palette: "cabinet", frame: "gilt", twist: "decade", finish: "electric", bells: true, hue: 45 } },

  // --- Mould №6 — The Burrower (subterranean excavation) -------------------
  { id: "strata-one", name: "Strata One", blurb: "The house dig: gentle soil, two pursuers on patrol.", dial: { mould: "burrower", title: "STRATA ONE", gridDensity: 2, handling: 2, hazards: 3, tokens: 3, pace: 3, palette: "sepia", frame: "plaque", twist: "none", finish: "lithograph", bells: true, hue: 0 } },
  { id: "pneumatic-vault", name: "Pneumatic Vault", blurb: "Wide hose handling; pump pursuers in a single breath.", dial: { mould: "burrower", title: "PNEUMATIC VAULT", gridDensity: 3, handling: 5, hazards: 4, tokens: 3, pace: 3, palette: "blueprint", frame: "engraved", twist: "none", finish: "electric", bells: true, hue: 0 } },
  { id: "quarry-run", name: "Quarry Run", blurb: "Boulder-rich quarry; drop stone on four patrols.", dial: { mould: "burrower", title: "QUARRY RUN", gridDensity: 4, handling: 2, hazards: 9, tokens: 4, pace: 4, palette: "nocturne", frame: "plaque", twist: "none", finish: "matte", bells: true, hue: 0 } },
  { id: "amber-drift", name: "Amber Drift", blurb: "Gold-bathed sand at a drifting, patient pace.", dial: { mould: "burrower", title: "AMBER DRIFT", gridDensity: 1, handling: 3, hazards: 2, tokens: 2, pace: 2, palette: "sepia", frame: "gilt", twist: "none", finish: "lithograph", bells: true, hue: 45 } },
  { id: "loam-and-boulder", name: "Loam & Boulder", blurb: "Soft loam above, treacherous boulder pockets below.", dial: { mould: "burrower", title: "LOAM & BOULDER", gridDensity: 3, handling: 3, hazards: 7, tokens: 3, pace: 3, palette: "cabinet", frame: "engraved", twist: "none", finish: "matte", bells: false, hue: 0 } },
  { id: "the-deep-sump", name: "The Deep Sump", blurb: "Tight quarters at depth; the sump floods with ghosts.", dial: { mould: "burrower", title: "THE DEEP SUMP", gridDensity: 5, handling: 2, hazards: 5, tokens: 3, pace: 3, palette: "nocturne", frame: "plaque", twist: "compact", finish: "matte", bells: true, hue: 0 } },
  { id: "bellows-drill", name: "Bellows Drill", blurb: "Frantic pump drill — ghosts cycle twice as restless.", dial: { mould: "burrower", title: "BELLOWS DRILL", gridDensity: 4, handling: 4, hazards: 4, tokens: 4, pace: 5, palette: "halftone", frame: "ticket", twist: "none", finish: "electric", bells: true, hue: 0 } },
  { id: "granite-pressure", name: "Granite Pressure", blurb: "Brittle moulding: one crush ends the shift.", dial: { mould: "burrower", title: "GRANITE PRESSURE", gridDensity: 4, handling: 3, hazards: 6, tokens: 2, pace: 3, palette: "cabinet", frame: "plaque", twist: "brittle", finish: "lithograph", bells: false, hue: 0 } },
  { id: "bedrock-stroll", name: "Bedrock Stroll", blurb: "A slow, wide tour of the deepest strata.", dial: { mould: "burrower", title: "BEDROCK STROLL", gridDensity: 2, handling: 4, hazards: 3, tokens: 3, pace: 1, palette: "emerald", frame: "engraved", twist: "none", finish: "lithograph", bells: true, hue: 0 } },
  { id: "subterranean-500", name: "Subterranean 500", blurb: "Reach the 500-point seam before the lamps fail.", dial: { mould: "burrower", title: "SUBTERRANEAN 500", gridDensity: 3, handling: 3, hazards: 5, tokens: 5, pace: 4, palette: "emerald", frame: "gilt", twist: "decade", finish: "electric", bells: true, hue: 0 } },

  // --- Mould №7 — The Scaffolding (tiers, inclines & barrels) --------------
  { id: "girder-yard-81", name: "Girder Yard 81", blurb: "The house climb: six tiers of crimson steel.", dial: { mould: "scaffolding", title: "GIRDER YARD 81", gridDensity: 3, handling: 2, hazards: 3, tokens: 3, pace: 3, palette: "nocturne", frame: "plaque", twist: "none", finish: "electric", bells: true, hue: 0 } },
  { id: "rivet-ramp", name: "Rivet Ramp", blurb: "Wide-climb handling on gently rolling inclines.", dial: { mould: "scaffolding", title: "RIVET RAMP", gridDensity: 2, handling: 5, hazards: 2, tokens: 2, pace: 2, palette: "cabinet", frame: "engraved", twist: "none", finish: "lithograph", bells: true, hue: 0 } },
  { id: "the-high-hoist", name: "The High Hoist", blurb: "Sparse barrels, sheer height — a climb of nerve.", dial: { mould: "scaffolding", title: "THE HIGH HOIST", gridDensity: 1, handling: 3, hazards: 1, tokens: 2, pace: 1, palette: "blueprint", frame: "plaque", twist: "none", finish: "matte", bells: false, hue: 0 } },
  { id: "cinder-clamber", name: "Cinder Clamber", blurb: "Ash-toned tiers with a restless barrel furnace.", dial: { mould: "scaffolding", title: "CINDER CLAMBER", gridDensity: 4, handling: 2, hazards: 6, tokens: 3, pace: 4, palette: "halftone", frame: "ticket", twist: "none", finish: "electric", bells: true, hue: 0 } },
  { id: "rolling-hazard", name: "Rolling Hazard", blurb: "Maximum barrel rain; dodge first, climb later.", dial: { mould: "scaffolding", title: "ROLLING HAZARD", gridDensity: 5, handling: 3, hazards: 9, tokens: 4, pace: 5, palette: "nocturne", frame: "engraved", twist: "none", finish: "electric", bells: true, hue: 0 } },
  { id: "iron-incline", name: "Iron Incline", blurb: "Tight quarters up iron tiers; footwork is everything.", dial: { mould: "scaffolding", title: "IRON INCLINE", gridDensity: 4, handling: 2, hazards: 5, tokens: 3, pace: 3, palette: "cabinet", frame: "plaque", twist: "compact", finish: "matte", bells: true, hue: 0 } },
  { id: "apex-ledger", name: "Apex Ledger", blurb: "Every tier pays the combo ledger on the way up.", dial: { mould: "scaffolding", title: "APEX LEDGER", gridDensity: 3, handling: 3, hazards: 3, tokens: 5, pace: 3, palette: "emerald", frame: "gilt", twist: "windfall", finish: "lithograph", bells: true, hue: 0 } },
  { id: "broken-rung", name: "Broken Rung", blurb: "Brittle moulding: one barrel ends the shift.", dial: { mould: "scaffolding", title: "BROKEN RUNG", gridDensity: 3, handling: 2, hazards: 4, tokens: 2, pace: 3, palette: "sepia", frame: "plaque", twist: "brittle", finish: "lithograph", bells: false, hue: 0 } },
  { id: "steeplejack-run", name: "Steeplejack Run", blurb: "Sprint the whole tower at a frantic pace.", dial: { mould: "scaffolding", title: "STEEPLEJACK RUN", gridDensity: 4, handling: 4, hazards: 5, tokens: 3, pace: 5, palette: "halftone", frame: "gilt", twist: "none", finish: "electric", bells: true, hue: 0 } },
  { id: "the-gantry-500", name: "The Gantry 500", blurb: "Bank 500 pts among the gantries before the apex.", dial: { mould: "scaffolding", title: "THE GANTRY 500", gridDensity: 3, handling: 3, hazards: 4, tokens: 5, pace: 4, palette: "emerald", frame: "engraved", twist: "decade", finish: "lithograph", bells: true, hue: 0 } },
];

export const PATTERNS: PatternEntry[] = RAW_PATTERNS.map((p) => ({
  id: p.id,
  name: p.name,
  blurb: p.blurb,
  spec: normalizeSpec(p.dial),
}));

export const PATTERN_COUNT = PATTERNS.length;

/** Look up a pattern by id; used by share links and the shelf. */
export function getPattern(id: string): PatternEntry | undefined {
  return PATTERNS.find((p) => p.id === id);
}

/** Patterns grouped by mould for the shelf display. */
export function patternsByMould(): Map<string, PatternEntry[]> {
  const map = new Map<string, PatternEntry[]>();
  for (const p of PATTERNS) {
    const list = map.get(p.spec.mould) ?? [];
    list.push(p);
    map.set(p.spec.mould, list);
  }
  return map;
}
