import type { ReplayGame } from "@/types/replay";
import { normalizeSpec, type CartridgeSpec, type MouldKind } from "./game/moulds";
import { toast } from "sonner";

export interface SystemRomData {
  format: "REPLAY_SYSTEM_ROM";
  version: "2.4.0";
  id: string;
  title: string;
  category: string;
  year: number;
  description: string;
  creatorName?: string;
  exportedAt: string;
  spec: CartridgeSpec;
}

/**
 * Maps each of the 20 built-in arcade games to a rich, authentic retro engine mould.
 */
const DEFAULT_GAME_SPECS: Record<string, Partial<CartridgeSpec>> = {
  "star-voyager": {
    mould: "invaders",
    title: "STAR VOYAGER",
    description: "Deep space patrol interception along the galactic rim.",
    pace: 3,
    gridDensity: 4,
    handling: 4,
    hazards: 2,
    palette: "emerald",
    frame: "engraved",
    twist: "none",
    finish: "electric",
    bells: true,
  },
  "crypt-crawler": {
    mould: "burrower",
    title: "CRYPT CRAWLER",
    description: "Descent through the vaulted catacombs of the forgotten king.",
    pace: 3,
    gridDensity: 3,
    handling: 3,
    hazards: 4,
    palette: "sepia",
    frame: "engraved",
    twist: "compact",
    finish: "lithograph",
    bells: true,
  },
  "turbo-drift": {
    mould: "crossing",
    title: "TURBO DRIFT '88",
    description: "High-octane city drift under neon skylines and rain-slick asphalt.",
    pace: 4,
    gridDensity: 4,
    handling: 5,
    hazards: 6,
    palette: "cabinet",
    frame: "plaque",
    twist: "windfall",
    finish: "electric",
    bells: true,
  },
  "ninja-shadow": {
    mould: "scaffolding",
    title: "NINJA SHADOW",
    description: "Silent steel across moonlight rooftops and fortress gates.",
    pace: 3,
    gridDensity: 3,
    handling: 4,
    hazards: 4,
    palette: "halftone",
    frame: "engraved",
    twist: "none",
    finish: "matte",
    bells: true,
  },
  "void-hopper": {
    mould: "snake",
    title: "VOID HOPPER",
    description: "Pocket dimensional jumps with four-shade phosphor optics.",
    pace: 3,
    gridDensity: 3,
    handling: 4,
    hazards: 2,
    palette: "emerald",
    frame: "engraved",
    twist: "blackout",
    finish: "lithograph",
    bells: true,
  },
  "robo-rumble": {
    mould: "breakout",
    title: "ROBO RUMBLE",
    description: "Heavy chassis arena duels with hydraulic recoil.",
    pace: 3,
    brickRows: 7,
    handling: 3,
    hazards: 4,
    palette: "blueprint",
    frame: "engraved",
    twist: "compact",
    finish: "electric",
    bells: true,
  },
  "mega-miner": {
    mould: "burrower",
    title: "MEGA MINER",
    description: "Bedrock excavation and explosive mineral seams.",
    pace: 3,
    gridDensity: 4,
    handling: 3,
    hazards: 3,
    palette: "sepia",
    frame: "ticket",
    twist: "compact",
    finish: "matte",
    bells: true,
  },
  "cyber-samurai": {
    mould: "breakout",
    title: "CYBER SAMURAI",
    description: "Honor code in the Megacity sprawl, one strike one quarter.",
    pace: 4,
    brickRows: 8,
    handling: 4,
    hazards: 3,
    palette: "cabinet",
    frame: "plaque",
    twist: "windfall",
    finish: "electric",
    bells: true,
  },
  "venom-strike": {
    mould: "flyer",
    title: "VENOM STRIKE",
    description: "Jungle infiltration with aerial dive-bombers and thermal sights.",
    pace: 3,
    gridDensity: 4,
    handling: 4,
    hazards: 4,
    palette: "emerald",
    frame: "engraved",
    twist: "brittle",
    finish: "electric",
    bells: true,
  },
  "pocket-pirate": {
    mould: "crossing",
    title: "POCKET PIRATE",
    description: "Broadside cannon salvos on a dot-matrix horizon.",
    pace: 2,
    gridDensity: 3,
    handling: 4,
    hazards: 3,
    palette: "emerald",
    frame: "engraved",
    twist: "none",
    finish: "matte",
    bells: true,
  },
  "frog-avenue": {
    mould: "crossing",
    title: "FROG AVENUE",
    description: "Leap across four lanes of bumper-to-bumper pixel chaos.",
    pace: 3,
    gridDensity: 4,
    handling: 4,
    hazards: 5,
    palette: "cabinet",
    frame: "ticket",
    twist: "windfall",
    finish: "lithograph",
    bells: true,
  },
  "meow-force": {
    mould: "invaders",
    title: "MEOW FORCE",
    description: "Feline starfighters clearing the asteroid belt in formation.",
    pace: 3,
    gridDensity: 4,
    handling: 4,
    hazards: 2,
    palette: "cabinet",
    frame: "engraved",
    twist: "compact",
    finish: "electric",
    bells: true,
  },
  "donut-panic": {
    mould: "breakout",
    title: "DONUT PANIC",
    description: "Bakery factory breakout with runaway jelly conveyor belts.",
    pace: 3,
    brickRows: 6,
    handling: 4,
    hazards: 3,
    palette: "halftone",
    frame: "ticket",
    twist: "compact",
    finish: "electric",
    bells: true,
  },
  "graveyard-shift": {
    mould: "maze",
    title: "GRAVEYARD SHIFT",
    description: "Midnight lantern patrol among the crumbling headstones.",
    pace: 2,
    gridDensity: 3,
    handling: 3,
    hazards: 4,
    palette: "emerald",
    frame: "engraved",
    twist: "blackout",
    finish: "lithograph",
    bells: true,
  },
  "skate-wizard": {
    mould: "scaffolding",
    title: "SKATE WIZARD",
    description: "Grinding cursed rails and casting fireball kickflips.",
    pace: 4,
    gridDensity: 4,
    handling: 5,
    hazards: 4,
    palette: "cabinet",
    frame: "engraved",
    twist: "none",
    finish: "electric",
    bells: true,
  },
  "pluto-patrol": {
    mould: "flyer",
    title: "PLUTO PATROL",
    description: "Sub-zero surveillance along the farthest planetoid.",
    pace: 3,
    gridDensity: 4,
    handling: 3,
    hazards: 3,
    palette: "blueprint",
    frame: "engraved",
    twist: "brittle",
    finish: "matte",
    bells: true,
  },
  "burrito-bandito": {
    mould: "stacker",
    title: "BURRITO BANDITO",
    description: "Spicy salsa showdowns across sun-baked cantina rooftops.",
    pace: 3,
    gridDensity: 3,
    handling: 4,
    hazards: 3,
    palette: "sepia",
    frame: "plaque",
    twist: "brittle",
    finish: "lithograph",
    bells: true,
  },
  "kaiju-kafe": {
    mould: "breakout",
    title: "KAIJU KAFE",
    description: "Serving espresso and milkshakes to fifty-foot atomic lizards.",
    pace: 3,
    brickRows: 7,
    handling: 4,
    hazards: 3,
    palette: "cabinet",
    frame: "plaque",
    twist: "compact",
    finish: "electric",
    bells: true,
  },
  "slug-racing": {
    mould: "snake",
    title: "SLUG RACING",
    description: "Calculated, high-stakes snail pace championship circuits.",
    pace: 2,
    gridDensity: 3,
    handling: 3,
    hazards: 2,
    palette: "emerald",
    frame: "engraved",
    twist: "compact",
    finish: "matte",
    bells: true,
  },
  "neon-narwhal": {
    mould: "flyer",
    title: "NEON NARWHAL",
    description: "Bioluminescent arctic diving with sonar laser tusk.",
    pace: 3,
    gridDensity: 4,
    handling: 4,
    hazards: 3,
    palette: "blueprint",
    frame: "engraved",
    twist: "none",
    finish: "electric",
    bells: true,
  },
};

/**
 * Returns a validated CartridgeSpec for any game.
 */
export function getSpecForReplayGame(game: ReplayGame): CartridgeSpec {
  if (game.cartridgeSpec) {
    return normalizeSpec(game.cartridgeSpec);
  }

  const preset = DEFAULT_GAME_SPECS[game.id];
  if (preset) {
    return normalizeSpec({
      title: game.title,
      description: game.description || "",
      ...preset,
    });
  }

  // Fallback spec based on console category
  const defaultMould: MouldKind =
    game.cat === "GB" ? "snake" : game.cat === "NES" ? "invaders" : game.cat === "SNES" ? "burrower" : "breakout";

  return normalizeSpec({
    title: game.title,
    description: game.description || "Replay System ROM",
    mould: defaultMould,
    palette: game.cat === "GB" ? "emerald" : "cabinet",
    frame: "engraved",
    pace: 3,
  });
}

/**
 * Triggers a download of a .replay system file.
 */
export function downloadSystemRom(
  game: ReplayGame | { title: string; spec: CartridgeSpec; id?: string; cat?: string; description?: string; creatorName?: string }
): void {
  try {
    const spec = "spec" in game ? normalizeSpec(game.spec) : getSpecForReplayGame(game as ReplayGame);
    const id = "id" in game && game.id ? game.id : `rom_${Date.now()}`;
    const title = game.title || spec.title || "CARTRIDGE";
    const category = ("cat" in game && game.cat ? game.cat : "ARCADE") as string;
    const year = ("year" in game && typeof game.year === "number" ? game.year : 1990) as number;
    const description = ("description" in game && game.description ? game.description : spec.description) || "Standalone System ROM";
    const creatorName = ("creatorName" in game && game.creatorName ? game.creatorName : "RetroDev") as string;

    const romData: SystemRomData = {
      format: "REPLAY_SYSTEM_ROM",
      version: "2.4.0",
      id,
      title,
      category,
      year,
      description,
      creatorName,
      exportedAt: new Date().toISOString(),
      spec,
    };

    const jsonStr = JSON.stringify(romData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const safeSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const fileName = `${safeSlug || "system-cartridge"}.replay`;

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`System file "${fileName}" downloaded!`);
  } catch (err) {
    console.error("Failed to download system ROM:", err);
    toast.error("Failed to generate system ROM file.");
  }
}

/**
 * Parses and loads a .replay system file from disk.
 */
export async function readSystemRomFile(file: File): Promise<ReplayGame> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Invalid ROM file: Could not parse JSON format.");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Invalid ROM file: Root must be an object.");
  }

  const obj = parsed as Record<string, unknown>;

  // Check format or bare spec
  let spec: CartridgeSpec;
  let title = "Loaded System ROM";
  let description = "Imported from standalone system file";
  let cat: ReplayGame["cat"] = "ARCADE";
  let year = 1990;
  let creatorName = "Unknown Pilot";

  if (obj.format === "REPLAY_SYSTEM_ROM" && obj.spec) {
    spec = normalizeSpec(obj.spec as Partial<CartridgeSpec>);
    if (typeof obj.title === "string") title = obj.title;
    if (typeof obj.description === "string") description = obj.description;
    if (typeof obj.category === "string" && ["NES", "SNES", "GENESIS", "ARCADE", "GB"].includes(obj.category)) {
      cat = obj.category as ReplayGame["cat"];
    }
    if (typeof obj.year === "number") year = obj.year;
    if (typeof obj.creatorName === "string") creatorName = obj.creatorName;
  } else if ("mould" in obj) {
    spec = normalizeSpec(obj as unknown as Partial<CartridgeSpec>);
    if (typeof obj.title === "string") title = obj.title;
    if (typeof obj.description === "string") description = obj.description;
  } else {
    throw new Error("Unrecognized ROM signature: missing 'mould' or 'spec' definition.");
  }

  const fileSlug = file.name.replace(/\.[^/.]+$/, "");
  const gameId = `imported_${Date.now()}_${fileSlug}`;

  const game: ReplayGame = {
    id: gameId,
    title: title || spec.title || fileSlug.toUpperCase(),
    cat,
    year,
    rating: 5,
    plays: 1,
    description: description || spec.description,
    accentColor: "#2ee6ff",
    themeColors: ["#2ee6ff", "#ff2e88", "#ffd23f", "#35f2a8"],
    cartridgeSpec: spec,
    creatorName,
  };

  return game;
}
