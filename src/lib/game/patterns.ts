/**
 * The Cartridge Foundry — the Pattern Book.
 *
 * One hundred named cartridge patterns: ten per classic mould, fifteen each
 * for the two character moulds. Every entry is a complete dial setting: a
 * distinct, playable game with its own name, blurb, palette, tone, frame,
 * twist, and finish. The Studio, the landing shelf, and the standalone
 * cabinet all cast directly from these patterns. Original characters only —
 * no borrowed IP.
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
  // ------------------------------------------------------------------
  // Mould №1 — Breaker
  // ------------------------------------------------------------------
  {
    id: "the-wall-1907",
    name: "The Wall, 1907",
    blurb: "The foundry's founding pressing: a tall wall at a gentleman's pace.",
    dial: { mould: "breakout", title: "THE WALL, 1907", gridDensity: 3, brickRows: 7, handling: 2, hazards: 0, tokens: 2, pace: 2, palette: "sepia", frame: "engraved", twist: "none", finish: "matte", bells: true, hue: 0 },
  },
  {
    id: "granite-yard",
    name: "Granite Yard",
    blurb: "Nine rows of dressed granite; every block takes two strikes.",
    dial: { mould: "breakout", title: "GRANITE YARD", gridDensity: 3, brickRows: 9, handling: 2, hazards: 1, tokens: 3, pace: 3, palette: "cabinet", frame: "plaque", twist: "none", finish: "lithograph", bells: true, hue: 0 },
  },
  {
    id: "laundromat-blues",
    name: "Laundromat Blues",
    blurb: "A cobalt-washed wall in a brittle moulding — one slip ruins the sheet.",
    dial: { mould: "breakout", title: "LAUNDROMAT BLUES", gridDensity: 3, brickRows: 6, handling: 3, hazards: 0, tokens: 2, pace: 3, palette: "blueprint", frame: "plaque", twist: "brittle", finish: "matte", bells: false, hue: 0 },
  },
  {
    id: "mangle-and-press",
    name: "Mangle & Press",
    blurb: "Rotors churn mid-field; thread the mangle to reach the top rows.",
    dial: { mould: "breakout", title: "MANGLE & PRESS", gridDensity: 3, brickRows: 5, handling: 3, hazards: 7, tokens: 3, pace: 4, palette: "halftone", frame: "ticket", twist: "none", finish: "lithograph", bells: true, hue: 0 },
  },
  {
    id: "windfall-hall",
    name: "Windfall Hall",
    blurb: "Every fifth point paid double in the grand hall.",
    dial: { mould: "breakout", title: "WINDFALL HALL", gridDensity: 3, brickRows: 6, handling: 3, hazards: 2, tokens: 4, pace: 3, palette: "cabinet", frame: "gilt", twist: "windfall", finish: "electric", bells: true, hue: 0 },
  },
  {
    id: "blackout-basement",
    name: "Blackout Basement",
    blurb: "The lamps fail wave on wave; clear the wall by memory.",
    dial: { mould: "breakout", title: "BLACKOUT BASEMENT", gridDensity: 3, brickRows: 5, handling: 3, hazards: 1, tokens: 2, pace: 3, palette: "nocturne", frame: "plaque", twist: "blackout", finish: "lithograph", bells: true, hue: 0 },
  },
  {
    id: "the-500-club",
    name: "The 500 Club",
    blurb: "Bank 500 marks before the wall wins the argument.",
    dial: { mould: "breakout", title: "THE 500 CLUB", gridDensity: 3, brickRows: 6, handling: 3, hazards: 2, tokens: 4, pace: 4, palette: "halftone", frame: "engraved", twist: "decade", finish: "lithograph", bells: true, hue: 0 },
  },
  {
    id: "vermilion-parlour",
    name: "Vermilion Parlour",
    blurb: "A scarlet-toned pressing for the parlour set.",
    dial: { mould: "breakout", title: "VERMILION PARLOUR", gridDensity: 3, brickRows: 6, handling: 3, hazards: 1, tokens: 3, pace: 3, palette: "sepia", frame: "gilt", twist: "none", finish: "lithograph", bells: true, hue: 15 },
  },
  {
    id: "paper-lanterns",
    name: "Paper Lanterns",
    blurb: "Amber lantern-glow over a gentle wall.",
    dial: { mould: "breakout", title: "PAPER LANTERNS", gridDensity: 3, brickRows: 6, handling: 4, hazards: 0, tokens: 3, pace: 2, palette: "halftone", frame: "ticket", twist: "none", finish: "electric", bells: true, hue: 45 },
  },
  {
    id: "the-counting-house",
    name: "The Counting House",
    blurb: "Nine hazards, cramped quarters, and a ledger to settle.",
    dial: { mould: "breakout", title: "THE COUNTING HOUSE", gridDensity: 3, brickRows: 6, handling: 3, hazards: 9, tokens: 3, pace: 4, palette: "emerald", frame: "engraved", twist: "compact", finish: "lithograph", bells: true, hue: 0 },
  },

  // ------------------------------------------------------------------
  // Mould №2 — Serpent
  // ------------------------------------------------------------------
  {
    id: "garden-serpent",
    name: "Garden Serpent",
    blurb: "A quiet garden plot; the coil grows at its leisure.",
    dial: { mould: "snake", title: "GARDEN SERPENT", gridDensity: 2, brickRows: 3, handling: 2, hazards: 0, tokens: 2, pace: 1, palette: "emerald", frame: "plaque", twist: "none", finish: "matte", bells: true, hue: 0 },
  },
  {
    id: "boa-constrictor",
    name: "Boa Constrictor",
    blurb: "A heavy coil that tightens fast.",
    dial: { mould: "snake", title: "BOA CONSTRICTOR", gridDensity: 5, brickRows: 3, handling: 6, hazards: 3, tokens: 3, pace: 3, palette: "cabinet", frame: "engraved", twist: "none", finish: "lithograph", bells: true, hue: 0 },
  },
  {
    id: "wormhole-express",
    name: "Wormhole Express",
    blurb: "Three burrows pierce the board; the express never waits.",
    dial: { mould: "snake", title: "WORMHOLE EXPRESS", gridDensity: 4, brickRows: 3, handling: 4, hazards: 9, tokens: 4, pace: 4, palette: "blueprint", frame: "ticket", twist: "none", finish: "electric", bells: true, hue: 0 },
  },
  {
    id: "serpents-sabbath",
    name: "Serpent's Sabbath",
    blurb: "The sabbath of serpents: a frantic, writhing press.",
    dial: { mould: "snake", title: "SERPENT'S SABBATH", gridDensity: 6, brickRows: 3, handling: 7, hazards: 5, tokens: 3, pace: 5, palette: "cabinet", frame: "gilt", twist: "none", finish: "electric", bells: true, hue: 300 },
  },
  {
    id: "the-tight-coil",
    name: "The Tight Coil",
    blurb: "A cramped board for a long coil.",
    dial: { mould: "snake", title: "THE TIGHT COIL", gridDensity: 8, brickRows: 3, handling: 4, hazards: 2, tokens: 2, pace: 3, palette: "nocturne", frame: "engraved", twist: "compact", finish: "matte", bells: false, hue: 0 },
  },
  {
    id: "brittle-whip",
    name: "Brittle Whip",
    blurb: "One self-crossing ends the run.",
    dial: { mould: "snake", title: "BRITTLE WHIP", gridDensity: 4, brickRows: 3, handling: 4, hazards: 1, tokens: 2, pace: 4, palette: "halftone", frame: "ticket", twist: "brittle", finish: "matte", bells: false, hue: 0 },
  },
  {
    id: "mark-of-five-hundred",
    name: "Mark of Five Hundred",
    blurb: "Five hundred marks to settle the account.",
    dial: { mould: "snake", title: "MARK OF FIVE HUNDRED", gridDensity: 5, brickRows: 3, handling: 4, hazards: 2, tokens: 4, pace: 4, palette: "sepia", frame: "engraved", twist: "decade", finish: "lithograph", bells: true, hue: 0 },
  },
  {
    id: "orchid-run",
    name: "Orchid Run",
    blurb: "The coil dressed in orchid tones.",
    dial: { mould: "snake", title: "ORCHID RUN", gridDensity: 4, brickRows: 3, handling: 4, hazards: 2, tokens: 3, pace: 3, palette: "emerald", frame: "gilt", twist: "none", finish: "lithograph", bells: true, hue: 315 },
  },
  {
    id: "ouroboros",
    name: "Ouroboros",
    blurb: "The tail-chaser: growth without end.",
    dial: { mould: "snake", title: "OUROBOROS", gridDensity: 7, brickRows: 3, handling: 8, hazards: 2, tokens: 3, pace: 4, palette: "nocturne", frame: "gilt", twist: "none", finish: "electric", bells: true, hue: 0 },
  },
  {
    id: "the-long-audit",
    name: "The Long Audit",
    blurb: "A patient, methodical audit of every mark on the board.",
    dial: { mould: "snake", title: "THE LONG AUDIT", gridDensity: 9, brickRows: 3, handling: 3, hazards: 0, tokens: 5, pace: 2, palette: "sepia", frame: "plaque", twist: "none", finish: "matte", bells: false, hue: 0 },
  },

  // ------------------------------------------------------------------
  // Mould №3 — Sentinels
  // ------------------------------------------------------------------
  {
    id: "sentinel-ranks",
    name: "Sentinel Ranks",
    blurb: "The founding pressing of the descent.",
    dial: { mould: "invaders", title: "SENTINEL RANKS", gridDensity: 5, brickRows: 3, handling: 3, hazards: 1, tokens: 2, pace: 2, palette: "sepia", frame: "engraved", twist: "none", finish: "matte", bells: true, hue: 0 },
  },
  {
    id: "the-phalanx",
    name: "The Phalanx",
    blurb: "Thirteen abreast and marching.",
    dial: { mould: "invaders", title: "THE PHALANX", gridDensity: 9, brickRows: 3, handling: 2, hazards: 1, tokens: 2, pace: 2, palette: "cabinet", frame: "plaque", twist: "none", finish: "lithograph", bells: true, hue: 0 },
  },
  {
    id: "holding-the-line",
    name: "Holding the Line",
    blurb: "Reinforced barriers and a patient defence.",
    dial: { mould: "invaders", title: "HOLDING THE LINE", gridDensity: 5, brickRows: 3, handling: 5, hazards: 6, tokens: 3, pace: 3, palette: "emerald", frame: "engraved", twist: "none", finish: "matte", bells: true, hue: 0 },
  },
  {
    id: "cobalt-watch",
    name: "Cobalt Watch",
    blurb: "The night watch, bathed in cobalt.",
    dial: { mould: "invaders", title: "COBALT WATCH", gridDensity: 6, brickRows: 3, handling: 3, hazards: 2, tokens: 3, pace: 3, palette: "blueprint", frame: "ticket", twist: "none", finish: "matte", bells: true, hue: 210 },
  },
  {
    id: "the-lamplight-legation",
    name: "The Lamplight Legation",
    blurb: "A diplomatic defence by lamplight.",
    dial: { mould: "invaders", title: "THE LAMPLIGHT LEGATION", gridDensity: 5, brickRows: 3, handling: 4, hazards: 1, tokens: 3, pace: 2, palette: "nocturne", frame: "gilt", twist: "none", finish: "lithograph", bells: true, hue: 0 },
  },
  {
    id: "bombardiers-ball",
    name: "Bombardier's Ball",
    blurb: "Bombs fall thick as festival confetti.",
    dial: { mould: "invaders", title: "BOMBARDIER'S BALL", gridDensity: 6, brickRows: 3, handling: 3, hazards: 7, tokens: 3, pace: 4, palette: "halftone", frame: "ticket", twist: "none", finish: "electric", bells: true, hue: 0 },
  },
  {
    id: "crimson-carnival",
    name: "Crimson Carnival",
    blurb: "A scarlet carnival of descending ranks.",
    dial: { mould: "invaders", title: "CRIMSON CARNIVAL", gridDensity: 7, brickRows: 3, handling: 3, hazards: 3, tokens: 4, pace: 4, palette: "cabinet", frame: "gilt", twist: "none", finish: "electric", bells: true, hue: 15 },
  },
  {
    id: "the-quiet-quartermaster",
    name: "The Quiet Quartermaster",
    blurb: "Slow ranks, steady supply, no wasted shots.",
    dial: { mould: "invaders", title: "THE QUIET QUARTERMASTER", gridDensity: 4, brickRows: 3, handling: 5, hazards: 0, tokens: 2, pace: 1, palette: "sepia", frame: "plaque", twist: "none", finish: "matte", bells: false, hue: 0 },
  },
  {
    id: "ledger-of-500",
    name: "Ledger of 500",
    blurb: "Rout the ranks and bank five hundred.",
    dial: { mould: "invaders", title: "LEDGER OF 500", gridDensity: 6, brickRows: 3, handling: 4, hazards: 2, tokens: 4, pace: 3, palette: "emerald", frame: "engraved", twist: "decade", finish: "lithograph", bells: true, hue: 0 },
  },
  {
    id: "lights-out-battery",
    name: "Lights-Out Battery",
    blurb: "The lamps fail; the battery holds.",
    dial: { mould: "invaders", title: "LIGHTS-OUT BATTERY", gridDensity: 5, brickRows: 3, handling: 4, hazards: 2, tokens: 2, pace: 3, palette: "nocturne", frame: "plaque", twist: "blackout", finish: "lithograph", bells: true, hue: 0 },
  },

  // ------------------------------------------------------------------
  // Mould №4 — Stereoscope
  // ------------------------------------------------------------------
  {
    id: "the-glass-corridors",
    name: "The Glass Corridors",
    blurb: "Clear glass walls in a draughtsman's maze.",
    dial: { mould: "maze", title: "THE GLASS CORRIDORS", gridDensity: 3, brickRows: 3, handling: 3, hazards: 2, tokens: 2, pace: 2, palette: "blueprint", frame: "engraved", twist: "none", finish: "matte", bells: true, hue: 0 },
  },
  {
    id: "minotaurs-account",
    name: "Minotaur's Account",
    blurb: "An eighteen-yard girth; the account must be settled.",
    dial: { mould: "maze", title: "MINOTAUR'S ACCOUNT", gridDensity: 9, brickRows: 3, handling: 3, hazards: 3, tokens: 3, pace: 2, palette: "cabinet", frame: "plaque", twist: "none", finish: "lithograph", bells: true, hue: 0 },
  },
  {
    id: "tapestry-of-threads",
    name: "Tapestry of Threads",
    blurb: "Corridors woven like a loom's threads.",
    dial: { mould: "maze", title: "TAPESTRY OF THREADS", gridDensity: 5, brickRows: 3, handling: 3, hazards: 3, tokens: 3, pace: 3, palette: "halftone", frame: "gilt", twist: "none", finish: "lithograph", bells: true, hue: 0 },
  },
  {
    id: "the-frantic-cataloguer",
    name: "The Frantic Cataloguer",
    blurb: "File every beacon before the fuse — quickly!",
    dial: { mould: "maze", title: "THE FRANTIC CATALOGUER", gridDensity: 4, brickRows: 3, handling: 4, hazards: 4, tokens: 3, pace: 5, palette: "halftone", frame: "ticket", twist: "none", finish: "electric", bells: true, hue: 0 },
  },
  {
    id: "cloisters-of-iron",
    name: "Cloisters of Iron",
    blurb: "Iron cloisters in a monastery gloom.",
    dial: { mould: "maze", title: "CLOISTERS OF IRON", gridDensity: 6, brickRows: 3, handling: 3, hazards: 3, tokens: 2, pace: 2, palette: "nocturne", frame: "engraved", twist: "none", finish: "matte", bells: false, hue: 0 },
  },
  {
    id: "one-lantern-left",
    name: "One Lantern Left",
    blurb: "One lantern, failing, and a maze of claims.",
    dial: { mould: "maze", title: "ONE LANTERN LEFT", gridDensity: 4, brickRows: 3, handling: 3, hazards: 3, tokens: 2, pace: 3, palette: "nocturne", frame: "plaque", twist: "blackout", finish: "lithograph", bells: true, hue: 0 },
  },
  {
    id: "the-braided-vault",
    name: "The Braided Vault",
    blurb: "Braided passages loop through the vault.",
    dial: { mould: "maze", title: "THE BRAIDED VAULT", gridDensity: 7, brickRows: 3, handling: 3, hazards: 7, tokens: 3, pace: 3, palette: "cabinet", frame: "gilt", twist: "none", finish: "electric", bells: true, hue: 0 },
  },
  {
    id: "celadon-passages",
    name: "Celadon Passages",
    blurb: "Jade-washed corridors, calm and cool.",
    dial: { mould: "maze", title: "CELADON PASSAGES", gridDensity: 5, brickRows: 3, handling: 3, hazards: 2, tokens: 3, pace: 2, palette: "blueprint", frame: "engraved", twist: "none", finish: "lithograph", bells: true, hue: 150 },
  },
  {
    id: "lamps-fail-at-nine",
    name: "Lamps Fail at Nine",
    blurb: "At the ninth minute the lamps fail — plan ahead.",
    dial: { mould: "maze", title: "LAMPS FAIL AT NINE", gridDensity: 6, brickRows: 3, handling: 3, hazards: 4, tokens: 2, pace: 4, palette: "nocturne", frame: "ticket", twist: "blackout", finish: "lithograph", bells: true, hue: 0 },
  },
  {
    id: "the-five-hundred-steps",
    name: "The Five Hundred Steps",
    blurb: "Five hundred marks of careful footsteps.",
    dial: { mould: "maze", title: "THE FIVE HUNDRED STEPS", gridDensity: 5, brickRows: 3, handling: 3, hazards: 3, tokens: 4, pace: 3, palette: "sepia", frame: "engraved", twist: "decade", finish: "lithograph", bells: true, hue: 0 },
  },

  // ------------------------------------------------------------------
  // Mould №5 — Aerodrome
  // ------------------------------------------------------------------
  {
    id: "aerodrome-no-5",
    name: "Aerodrome No. 5",
    blurb: "The fifth aerodrome pressing; a proper Sunday fly-past.",
    dial: { mould: "flyer", title: "AERODROME NO. 5", gridDensity: 3, brickRows: 3, handling: 3, hazards: 3, tokens: 3, pace: 3, palette: "sepia", frame: "plaque", twist: "none", finish: "matte", bells: true, hue: 0 },
  },
  {
    id: "barnstormers-delight",
    name: "Barnstormer's Delight",
    blurb: "Loop the balloons, ring the gates, thrill the crowd.",
    dial: { mould: "flyer", title: "BARNSTORMER'S DELIGHT", gridDensity: 3, brickRows: 3, handling: 4, hazards: 6, tokens: 4, pace: 4, palette: "halftone", frame: "ticket", twist: "none", finish: "electric", bells: true, hue: 0 },
  },
  {
    id: "the-mail-run",
    name: "The Mail Run",
    blurb: "A steady mail run — the post must arrive.",
    dial: { mould: "flyer", title: "THE MAIL RUN", gridDensity: 2, brickRows: 3, handling: 3, hazards: 2, tokens: 2, pace: 2, palette: "blueprint", frame: "engraved", twist: "none", finish: "matte", bells: false, hue: 0 },
  },
  {
    id: "squadron-of-nine",
    name: "Squadron of Nine",
    blurb: "Nine balloons to a squadron, and more squadrons coming.",
    dial: { mould: "flyer", title: "SQUADRON OF NINE", gridDensity: 4, brickRows: 3, handling: 3, hazards: 9, tokens: 3, pace: 4, palette: "cabinet", frame: "engraved", twist: "none", finish: "lithograph", bells: true, hue: 0 },
  },
  {
    id: "tailwind-ledger",
    name: "Tailwind Ledger",
    blurb: "A following wind and a generous ledger.",
    dial: { mould: "flyer", title: "TAILWIND LEDGER", gridDensity: 3, brickRows: 3, handling: 4, hazards: 3, tokens: 5, pace: 3, palette: "emerald", frame: "plaque", twist: "windfall", finish: "matte", bells: true, hue: 0 },
  },
  {
    id: "the-fog-line",
    name: "The Fog Line",
    blurb: "Fly the fog line by instrument and memory.",
    dial: { mould: "flyer", title: "THE FOG LINE", gridDensity: 3, brickRows: 3, handling: 3, hazards: 4, tokens: 2, pace: 3, palette: "halftone", frame: "ticket", twist: "blackout", finish: "lithograph", bells: true, hue: 0 },
  },
  {
    id: "gale-over-marrow",
    name: "Gale Over Marrow",
    blurb: "A gale over the marrow flats — hold her steady.",
    dial: { mould: "flyer", title: "GALE OVER MARROW", gridDensity: 3, brickRows: 3, handling: 2, hazards: 5, tokens: 3, pace: 5, palette: "nocturne", frame: "engraved", twist: "none", finish: "electric", bells: true, hue: 0 },
  },
  {
    id: "one-wingspan",
    name: "One Wingspan",
    blurb: "Cramped skies; a wingspan between disaster and glory.",
    dial: { mould: "flyer", title: "ONE WINGSPAN", gridDensity: 3, brickRows: 3, handling: 3, hazards: 3, tokens: 2, pace: 3, palette: "cabinet", frame: "plaque", twist: "compact", finish: "matte", bells: false, hue: 0 },
  },
  {
    id: "sapphire-altitude",
    name: "Sapphire Altitude",
    blurb: "High altitude in sapphire tones.",
    dial: { mould: "flyer", title: "SAPPHIRE ALTITUDE", gridDensity: 3, brickRows: 3, handling: 3, hazards: 3, tokens: 3, pace: 3, palette: "blueprint", frame: "gilt", twist: "none", finish: "lithograph", bells: true, hue: 225 },
  },
  {
    id: "the-golden-circuit",
    name: "The Golden Circuit",
    blurb: "The golden circuit pays its pilots in marks.",
    dial: { mould: "flyer", title: "THE GOLDEN CIRCUIT", gridDensity: 3, brickRows: 3, handling: 4, hazards: 4, tokens: 5, pace: 4, palette: "cabinet", frame: "gilt", twist: "decade", finish: "electric", bells: true, hue: 60 },
  },

  // ------------------------------------------------------------------
  // Mould №6 — The Burrower
  // ------------------------------------------------------------------
  {
    id: "strata-one",
    name: "Strata One",
    blurb: "The first stratum: gentle soil, two patrols, eight marks.",
    dial: { mould: "burrower", title: "STRATA ONE", gridDensity: 2, brickRows: 3, handling: 4, hazards: 2, tokens: 3, pace: 2, palette: "sepia", frame: "plaque", twist: "none", finish: "matte", bells: true, hue: 0 },
  },
  {
    id: "pneumatic-vault",
    name: "Pneumatic Vault",
    blurb: "A powerful pump for vaulted clay.",
    dial: { mould: "burrower", title: "PNEUMATIC VAULT", gridDensity: 3, brickRows: 3, handling: 7, hazards: 4, tokens: 3, pace: 3, palette: "blueprint", frame: "engraved", twist: "none", finish: "electric", bells: true, hue: 0 },
  },
  {
    id: "quarry-run",
    name: "Quarry Run",
    blurb: "Quarry conditions: hard soil, hard pursuers.",
    dial: { mould: "burrower", title: "QUARRY RUN", gridDensity: 4, brickRows: 3, handling: 4, hazards: 6, tokens: 3, pace: 4, palette: "halftone", frame: "ticket", twist: "none", finish: "lithograph", bells: true, hue: 0 },
  },
  {
    id: "amber-drift",
    name: "Amber Drift",
    blurb: "Drift through amber-lit sand at leisure.",
    dial: { mould: "burrower", title: "AMBER DRIFT", gridDensity: 2, brickRows: 3, handling: 4, hazards: 1, tokens: 3, pace: 2, palette: "cabinet", frame: "gilt", twist: "none", finish: "matte", bells: false, hue: 45 },
  },
  {
    id: "loam-boulder",
    name: "Loam & Boulder",
    blurb: "Rich loam loaded with droppable boulders.",
    dial: { mould: "burrower", title: "LOAM & BOULDER", gridDensity: 3, brickRows: 3, handling: 4, hazards: 8, tokens: 4, pace: 3, palette: "emerald", frame: "plaque", twist: "none", finish: "lithograph", bells: true, hue: 0 },
  },
  {
    id: "the-deep-sump",
    name: "The Deep Sump",
    blurb: "The flooded deeps play by lantern memory.",
    dial: { mould: "burrower", title: "THE DEEP SUMP", gridDensity: 4, brickRows: 3, handling: 4, hazards: 4, tokens: 2, pace: 2, palette: "nocturne", frame: "plaque", twist: "blackout", finish: "lithograph", bells: true, hue: 0 },
  },
  {
    id: "bellows-drill",
    name: "Bellows Drill",
    blurb: "Full bellows; inflate anything that drifts near.",
    dial: { mould: "burrower", title: "BELLOWS DRILL", gridDensity: 3, brickRows: 3, handling: 9, hazards: 3, tokens: 3, pace: 4, palette: "halftone", frame: "ticket", twist: "none", finish: "electric", bells: true, hue: 0 },
  },
  {
    id: "granite-pressure",
    name: "Granite Pressure",
    blurb: "Granite strata at full pressure.",
    dial: { mould: "burrower", title: "GRANITE PRESSURE", gridDensity: 5, brickRows: 3, handling: 4, hazards: 5, tokens: 3, pace: 5, palette: "cabinet", frame: "engraved", twist: "none", finish: "electric", bells: true, hue: 0 },
  },
  {
    id: "bedrock-stroll",
    name: "Bedrock Stroll",
    blurb: "A Sunday stroll through bedrock — almost.",
    dial: { mould: "burrower", title: "BEDROCK STROLL", gridDensity: 2, brickRows: 3, handling: 5, hazards: 1, tokens: 3, pace: 1, palette: "sepia", frame: "engraved", twist: "none", finish: "matte", bells: false, hue: 0 },
  },
  {
    id: "subterranean-500",
    name: "Subterranean 500",
    blurb: "Five hundred marks beneath the foundry floor.",
    dial: { mould: "burrower", title: "SUBTERRANEAN 500", gridDensity: 4, brickRows: 3, handling: 4, hazards: 5, tokens: 4, pace: 4, palette: "emerald", frame: "gilt", twist: "decade", finish: "lithograph", bells: true, hue: 0 },
  },

  // ------------------------------------------------------------------
  // Mould №7 — The Scaffolding
  // ------------------------------------------------------------------
  {
    id: "girder-yard-81",
    name: "Girder Yard 81",
    blurb: "Yard 81: the founding girder shift.",
    dial: { mould: "scaffolding", title: "GIRDER YARD 81", gridDensity: 3, handling: 3, hazards: 3, tokens: 3, pace: 3, palette: "sepia", frame: "plaque", twist: "none", finish: "matte", bells: true, hue: 0 },
  },
  {
    id: "rivet-ramp",
    name: "Rivet Ramp",
    blurb: "Fresh rivets and rolling drums at pace.",
    dial: { mould: "scaffolding", title: "RIVET RAMP", gridDensity: 3, handling: 4, hazards: 4, tokens: 3, pace: 4, palette: "halftone", frame: "ticket", twist: "none", finish: "electric", bells: true, hue: 0 },
  },
  {
    id: "the-high-hoist",
    name: "The High Hoist",
    blurb: "The hoist runs high; the drums run often.",
    dial: { mould: "scaffolding", title: "THE HIGH HOIST", gridDensity: 3, handling: 3, hazards: 6, tokens: 3, pace: 3, palette: "cabinet", frame: "engraved", twist: "none", finish: "lithograph", bells: true, hue: 0 },
  },
  {
    id: "cinder-clamber",
    name: "Cinder Clamber",
    blurb: "A cinder-dusted clamber for beginners.",
    dial: { mould: "scaffolding", title: "CINDER CLAMBER", gridDensity: 3, handling: 2, hazards: 3, tokens: 2, pace: 2, palette: "nocturne", frame: "plaque", twist: "none", finish: "matte", bells: false, hue: 0 },
  },
  {
    id: "rolling-hazard",
    name: "Rolling Hazard",
    blurb: "Drums on every tier, all shift long.",
    dial: { mould: "scaffolding", title: "ROLLING HAZARD", gridDensity: 3, handling: 3, hazards: 9, tokens: 3, pace: 4, palette: "halftone", frame: "engraved", twist: "none", finish: "electric", bells: true, hue: 0 },
  },
  {
    id: "iron-incline",
    name: "Iron Incline",
    blurb: "Iron tiers, steep inclines, honest work.",
    dial: { mould: "scaffolding", title: "IRON INCLINE", gridDensity: 3, handling: 3, hazards: 5, tokens: 3, pace: 3, palette: "emerald", frame: "engraved", twist: "none", finish: "lithograph", bells: true, hue: 0 },
  },
  {
    id: "apex-ledger",
    name: "Apex Ledger",
    blurb: "Every tier pays the combo ledger on the way up.",
    dial: { mould: "scaffolding", title: "APEX LEDGER", gridDensity: 3, handling: 3, hazards: 3, tokens: 5, pace: 3, palette: "emerald", frame: "gilt", twist: "windfall", finish: "lithograph", bells: true, hue: 0 },
  },
  {
    id: "broken-rung",
    name: "Broken Rung",
    blurb: "Brittle moulding: one barrel ends the shift.",
    dial: { mould: "scaffolding", title: "BROKEN RUNG", gridDensity: 3, handling: 2, hazards: 4, tokens: 2, pace: 3, palette: "sepia", frame: "plaque", twist: "brittle", finish: "lithograph", bells: false, hue: 0 },
  },
  {
    id: "steeplejack-run",
    name: "Steeplejack Run",
    blurb: "Sprint the whole tower at a frantic pace.",
    dial: { mould: "scaffolding", title: "STEEPLEJACK RUN", gridDensity: 4, handling: 4, hazards: 5, tokens: 3, pace: 5, palette: "halftone", frame: "gilt", twist: "none", finish: "electric", bells: true, hue: 0 },
  },
  {
    id: "the-gantry-500",
    name: "The Gantry 500",
    blurb: "Bank 500 pts among the gantries before the apex.",
    dial: { mould: "scaffolding", title: "THE GANTRY 500", gridDensity: 3, handling: 3, hazards: 4, tokens: 5, pace: 4, palette: "emerald", frame: "engraved", twist: "decade", finish: "lithograph", bells: true, hue: 0 },
  },

  // ------------------------------------------------------------------
  // Mould №8 — Menagerie (Boots the Badger's dock crew)
  // ------------------------------------------------------------------
  {
    id: "dock-one",
    name: "Dock One",
    blurb: "Boots' first morning shift: a gentle swing and calm bees.",
    dial: { mould: "stacker", title: "DOCK ONE", gridDensity: 3, handling: 4, hazards: 1, tokens: 3, pace: 1, palette: "sepia", frame: "plaque", twist: "none", finish: "matte", bells: true, hue: 0 },
  },
  {
    id: "the-noon-shift",
    name: "The Noon Shift",
    blurb: "The crane runs hot at midday; the bee colony wakes.",
    dial: { mould: "stacker", title: "THE NOON SHIFT", gridDensity: 3, handling: 3, hazards: 4, tokens: 3, pace: 3, palette: "halftone", frame: "engraved", twist: "none", finish: "lithograph", bells: true, hue: 0 },
  },
  {
    id: "sprockets-gambit",
    name: "Sprocket's Gambit",
    blurb: "A wide hook and a bold squirrel — wobble the stack with style.",
    dial: { mould: "stacker", title: "SPROCKET'S GAMBIT", gridDensity: 3, handling: 0, hazards: 2, tokens: 5, pace: 2, palette: "cabinet", frame: "gilt", twist: "windfall", finish: "electric", bells: true, hue: 210 },
  },
  {
    id: "brittle-pallets",
    name: "Brittle Pallets",
    blurb: "One toppled crate ends the shift. Steady hands only.",
    dial: { mould: "stacker", title: "BRITTLE PALLETS", gridDensity: 3, handling: 3, hazards: 2, tokens: 2, pace: 2, palette: "emerald", frame: "plaque", twist: "brittle", finish: "lithograph", bells: false, hue: 0 },
  },
  {
    id: "the-quayside-500",
    name: "The Quayside 500",
    blurb: "Bank 500 marks on the docks before the stack gives out.",
    dial: { mould: "stacker", title: "THE QUAYSIDE 500", gridDensity: 3, handling: 3, hazards: 4, tokens: 5, pace: 4, palette: "cabinet", frame: "engraved", twist: "decade", finish: "lithograph", bells: true, hue: 0 },
  },
  {
    id: "granite-hook",
    name: "Granite Hook",
    blurb: "A tight hook radius — the crane barely leaves the middle.",
    dial: { mould: "stacker", title: "GRANITE HOOK", gridDensity: 3, handling: 0, hazards: 3, tokens: 2, pace: 3, palette: "nocturne", frame: "engraved", twist: "none", finish: "matte", bells: false, hue: 0 },
  },
  {
    id: "bee-season",
    name: "Bee Season",
    blurb: "The whole hive is cranky. Sprocket works overtime.",
    dial: { mould: "stacker", title: "BEE SEASON", gridDensity: 3, handling: 4, hazards: 9, tokens: 4, pace: 3, palette: "halftone", frame: "ticket", twist: "none", finish: "electric", bells: true, hue: 45 },
  },
  {
    id: "night-loading",
    name: "Night Loading",
    blurb: "Dock work by lamplight; the swing is slow but sly.",
    dial: { mould: "stacker", title: "NIGHT LOADING", gridDensity: 3, handling: 5, hazards: 3, tokens: 3, pace: 2, palette: "nocturne", frame: "plaque", twist: "blackout", finish: "lithograph", bells: true, hue: 0 },
  },
  {
    id: "the-tall-order",
    name: "The Tall Order",
    blurb: "Ten crates high and the bees are furious about it.",
    dial: { mould: "stacker", title: "THE TALL ORDER", gridDensity: 3, handling: 2, hazards: 6, tokens: 4, pace: 4, palette: "sepia", frame: "gilt", twist: "none", finish: "lithograph", bells: true, hue: 300 },
  },
  {
    id: "foremans-favourite",
    name: "Foreman's Favourite",
    blurb: "Everything at once: fast swing, cranky bees, windfall pay.",
    dial: { mould: "stacker", title: "FOREMAN'S FAVOURITE", gridDensity: 3, handling: 3, hazards: 5, tokens: 5, pace: 5, palette: "cabinet", frame: "gilt", twist: "windfall", finish: "electric", bells: true, hue: 60 },
  },
  {
    id: "swinging-sepia",
    name: "Swinging Sepia",
    blurb: "A classic dock pressing in aged albumen tones.",
    dial: { mould: "stacker", title: "SWINGING SEPIA", gridDensity: 3, handling: 4, hazards: 3, tokens: 3, pace: 3, palette: "sepia", frame: "engraved", twist: "none", finish: "lithograph", bells: true, hue: 0 },
  },
  {
    id: "crane-weather",
    name: "Crane Weather",
    blurb: "High winds on the dock; the crane answers slowly.",
    dial: { mould: "stacker", title: "CRANE WEATHER", gridDensity: 3, handling: 1, hazards: 3, tokens: 3, pace: 4, palette: "nocturne", frame: "ticket", twist: "none", finish: "electric", bells: true, hue: 0 },
  },
  {
    id: "the-double-deck",
    name: "The Double Deck",
    blurb: "Cramped dock walls force a tidy, disciplined stack.",
    dial: { mould: "stacker", title: "THE DOUBLE DECK", gridDensity: 3, handling: 2, hazards: 1, tokens: 3, pace: 3, palette: "emerald", frame: "gilt", twist: "compact", finish: "matte", bells: true, hue: 120 },
  },
  {
    id: "consolidated-freight",
    name: "Consolidated Freight",
    blurb: "The full consignment at a frantic dock pace.",
    dial: { mould: "stacker", title: "CONSOLIDATED FREIGHT", gridDensity: 3, handling: 4, hazards: 4, tokens: 4, pace: 5, palette: "halftone", frame: "engraved", twist: "none", finish: "electric", bells: true, hue: 90 },
  },
  {
    id: "the-last-pallet",
    name: "The Last Pallet",
    blurb: "Brittle pallets, failing lamps, and one crate to go.",
    dial: { mould: "stacker", title: "THE LAST PALLET", gridDensity: 3, handling: 3, hazards: 7, tokens: 2, pace: 3, palette: "nocturne", frame: "plaque", twist: "brittle", finish: "lithograph", bells: true, hue: 270 },
  },

  // ------------------------------------------------------------------
  // Mould №9 — Crossing Guard (Pip the Pigeon's thoroughfare)
  // ------------------------------------------------------------------
  {
    id: "first-fig",
    name: "First Fig",
    blurb: "Pip's first crossing: sparse lorries and a calm current.",
    dial: { mould: "crossing", title: "FIRST FIG", gridDensity: 3, handling: 3, hazards: 1, tokens: 3, pace: 1, palette: "blueprint", frame: "ticket", twist: "none", finish: "matte", bells: true, hue: 0 },
  },
  {
    id: "market-morning",
    name: "Market Morning",
    blurb: "Delivery lorries everywhere; the buttons gleam between them.",
    dial: { mould: "crossing", title: "MARKET MORNING", gridDensity: 3, handling: 4, hazards: 5, tokens: 4, pace: 3, palette: "halftone", frame: "plaque", twist: "none", finish: "lithograph", bells: true, hue: 0 },
  },
  {
    id: "the-ten-lane-dash",
    name: "The Ten-Lane Dash",
    blurb: "All ten lanes at a frantic pace — for veteran pigeons only.",
    dial: { mould: "crossing", title: "THE TEN-LANE DASH", gridDensity: 3, handling: 5, hazards: 6, tokens: 3, pace: 5, palette: "cabinet", frame: "engraved", twist: "none", finish: "electric", bells: true, hue: 0 },
  },
  {
    id: "brittle-feathers",
    name: "Brittle Feathers",
    blurb: "One clip in traffic and the run is over.",
    dial: { mould: "crossing", title: "BRITTLE FEATHERS", gridDensity: 3, handling: 4, hazards: 3, tokens: 2, pace: 2, palette: "sepia", frame: "plaque", twist: "brittle", finish: "matte", bells: false, hue: 0 },
  },
  {
    id: "the-pavement-500",
    name: "The Pavement 500",
    blurb: "Bank 500 marks among the log floats and steam lorries.",
    dial: { mould: "crossing", title: "THE PAVEMENT 500", gridDensity: 3, handling: 4, hazards: 4, tokens: 5, pace: 4, palette: "emerald", frame: "engraved", twist: "decade", finish: "lithograph", bells: true, hue: 0 },
  },
  {
    id: "button-hunt",
    name: "Button Hunt",
    blurb: "Five brass buttons per run, scattered wide across the lanes.",
    dial: { mould: "crossing", title: "BUTTON HUNT", gridDensity: 3, handling: 3, hazards: 4, tokens: 6, pace: 3, palette: "cabinet", frame: "gilt", twist: "windfall", finish: "electric", bells: true, hue: 45 },
  },
  {
    id: "the-night-current",
    name: "The Night Current",
    blurb: "Headlamps only. Cross by memory of the lane rhythm.",
    dial: { mould: "crossing", title: "THE NIGHT CURRENT", gridDensity: 3, handling: 4, hazards: 5, tokens: 3, pace: 3, palette: "nocturne", frame: "plaque", twist: "blackout", finish: "lithograph", bells: true, hue: 0 },
  },
  {
    id: "log-float-alley",
    name: "Log Float Alley",
    blurb: "Long timber floats close whole lanes at a time.",
    dial: { mould: "crossing", title: "LOG FLOAT ALLEY", gridDensity: 3, handling: 3, hazards: 7, tokens: 4, pace: 3, palette: "emerald", frame: "ticket", twist: "none", finish: "lithograph", bells: true, hue: 120 },
  },
  {
    id: "steam-and-brass",
    name: "Steam & Brass",
    blurb: "Everything on the thoroughfare at once — and windfall pay.",
    dial: { mould: "crossing", title: "STEAM & BRASS", gridDensity: 3, handling: 4, hazards: 6, tokens: 5, pace: 4, palette: "cabinet", frame: "engraved", twist: "windfall", finish: "electric", bells: true, hue: 210 },
  },
  {
    id: "double-crossing",
    name: "Double Crossing",
    blurb: "March the full lap there and back for double pay.",
    dial: { mould: "crossing", title: "DOUBLE CROSSING", gridDensity: 3, handling: 4, hazards: 5, tokens: 4, pace: 4, palette: "blueprint", frame: "ticket", twist: "windfall", finish: "lithograph", bells: true, hue: 180 },
  },
  {
    id: "the-lorries-of-nine",
    name: "The Lorries of Nine",
    blurb: "Nine busy lanes at pace five. Bring feathers.",
    dial: { mould: "crossing", title: "THE LORRIES OF NINE", gridDensity: 3, handling: 4, hazards: 8, tokens: 3, pace: 5, palette: "halftone", frame: "engraved", twist: "none", finish: "electric", bells: true, hue: 15 },
  },
  {
    id: "the-last-button",
    name: "The Last Button",
    blurb: "Brittle feathers, blackout lamps, and one brass prize.",
    dial: { mould: "crossing", title: "THE LAST BUTTON", gridDensity: 3, handling: 3, hazards: 5, tokens: 2, pace: 3, palette: "nocturne", frame: "plaque", twist: "blackout", finish: "lithograph", bells: true, hue: 270 },
  },
  {
    id: "the-courier-run",
    name: "The Courier Run",
    blurb: "Pip carries the post across all ten lanes, twice if you dare.",
    dial: { mould: "crossing", title: "THE COURIER RUN", gridDensity: 3, handling: 5, hazards: 5, tokens: 5, pace: 4, palette: "sepia", frame: "ticket", twist: "decade", finish: "lithograph", bells: true, hue: 0 },
  },
  {
    id: "pigeon-post-500",
    name: "Pigeon Post 500",
    blurb: "Five hundred marks of overtime for the brave courier bird.",
    dial: { mould: "crossing", title: "PIGEON POST 500", gridDensity: 3, handling: 4, hazards: 6, tokens: 5, pace: 5, palette: "cabinet", frame: "gilt", twist: "decade", finish: "electric", bells: true, hue: 45 },
  },
  {
    id: "the-works-closure",
    name: "The Works Closure",
    blurb: "The foundry's last crossing: every lane, every hazard, every mark.",
    dial: { mould: "crossing", title: "THE WORKS CLOSURE", gridDensity: 3, handling: 4, hazards: 9, tokens: 5, pace: 5, palette: "cabinet", frame: "engraved", twist: "brittle", finish: "electric", bells: true, hue: 0 },
  },
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
