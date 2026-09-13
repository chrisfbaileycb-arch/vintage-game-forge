/**
 * Dial metadata & difficulty rating.
 *
 * Every dial a mould exposes carries a friendly name and an explanation of
 * its gameplay effect (shown in the Studio as you turn it). The rating
 * functions derive the live summary: pace, complexity, reflex demand,
 * strategy demand, expected session length, and overall difficulty — all
 * pure functions of the cartridge spec so tests can pin them.
 */

import type { CartridgeSpec, MouldKind } from "./moulds";

/** Which dials a mould exposes in the Studio, and what each one does. */
export interface DialInfo {
  key: string;
  label: string;
  effect: string;
  moulds: MouldKind[];
}

export const DIAL_INFO: DialInfo[] = [
  {
    key: "pace",
    label: "Pressing speed",
    effect: "Drives the master loop speed: ball flight, serpent crawl, rank march, wind, barrel rate, traffic.",
    moulds: ["breakout", "snake", "invaders", "maze", "flyer", "burrower", "scaffolding", "stacker", "crossing"],
  },
  {
    key: "brickRows",
    label: "Brick rows",
    effect: "Wall height (3–9 rows). More rows means a longer clearing job and more rebounds.",
    moulds: ["breakout"],
  },
  {
    key: "gridDensity",
    label: "Board density",
    effect: "Formation width, serpent board columns, maze girth, or pursuit count depending on the mould.",
    moulds: ["snake", "invaders", "maze", "burrower"],
  },
  {
    key: "handling",
    label: "Handling",
    effect: "Your instrument: paddle width, growth per mark, reload rate, lantern, pump power, or hop speed.",
    moulds: ["breakout", "snake", "invaders", "maze", "flyer", "burrower", "scaffolding", "stacker", "crossing"],
  },
  {
    key: "hazards",
    label: "Extra fixtures",
    effect: "Rotors, barriers, bombs, boulders, balloons, bees, or traffic density — the hazard dial.",
    moulds: ["breakout", "snake", "invaders", "maze", "flyer", "burrower", "scaffolding", "stacker", "crossing"],
  },
  {
    key: "tokens",
    label: "House tokens",
    effect: "How many bonus drops the engine scatters: widen, slow-press, or windfall coupons.",
    moulds: ["breakout", "snake", "invaders", "maze", "flyer", "burrower", "scaffolding", "stacker", "crossing"],
  },
  {
    key: "twist",
    label: "House twist",
    effect: "One extra rule: cramped field, brittle one-hit pressing, 500-point target, blackout lamps, or windfall pay.",
    moulds: ["breakout", "snake", "invaders", "maze", "flyer", "burrower", "scaffolding", "stacker", "crossing"],
  },
  {
    key: "hue",
    label: "Spectrum toning",
    effect: "Rotates the whole palette around the colour wheel without changing contrast. Pure appearance.",
    moulds: ["breakout", "snake", "invaders", "maze", "flyer", "burrower", "scaffolding", "stacker", "crossing"],
  },
];

/** Live derived ratings, each normalised to 0..1 (except minutes). */
export interface DifficultyRating {
  /** Raw speed of the game loop. */
  pace: number;
 /** How much is happening at once: rows, ranks, traffic, fixtures. */
  complexity: number;
  /** Twitch demand: how soon an untended mistake costs a seal. */
  reflex: number;
  /** Planning demand: routing, stacking discipline, resource timing. */
  strategy: number;
  /** Expected casual session length in minutes. */
  sessionMinutes: number;
  /** Overall 1..10 foundry grade. */
  overall: number;
  /** One-line verdict for the stamp plate. */
  verdict: string;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/**
 * Rate a cartridge spec. Pure: same spec in, same rating out.
 * The overall grade is a weighted blend biased toward pace + complexity,
 * with reflex and strategy contributing according to the mould's character.
 */
export function rateSpec(spec: CartridgeSpec): DifficultyRating {
  const pace = clamp01((spec.pace - 1) / 4);
  const hazards = spec.hazards / 9;
  const tokens = spec.tokens / 9;
  const handlingMax = { breakout: 3, snake: 9, invaders: 5, maze: 5, flyer: 5, burrower: 5, scaffolding: 5, stacker: 3, crossing: 4 }[spec.mould];
  const handling = handlingMax > 0 ? spec.handling / handlingMax : 0.5;

  // Complexity: how much the mould puts on the board at once.
  let complexity = 0.2 + hazards * 0.5;
  if (spec.mould === "breakout") complexity += (spec.brickRows / 9) * 0.3;
  if (spec.mould === "invaders") complexity += (spec.gridDensity / 9) * 0.35;
  if (spec.mould === "snake") complexity += (spec.gridDensity / 9) * 0.3;
  if (spec.mould === "maze") complexity += (spec.gridDensity / 9) * 0.35;
  if (spec.mould === "burrower") complexity += (spec.gridDensity / 9) * 0.3;
  complexity = clamp01(complexity);

  // Reflex moulds punish instantly; strategy moulds punish slowly.
  const reflexMoulds: MouldKind[] = ["breakout", "flyer", "crossing", "scaffolding"];
  const reflexLean = reflexMoulds.includes(spec.mould) ? 0.25 : 0.1;
  const reflex = clamp01(pace * 0.55 + hazards * 0.3 + reflexLean - handling * 0.15);

  const strategyMoulds: MouldKind[] = ["snake", "maze", "burrower", "stacker"];
  const strategyLean = strategyMoulds.includes(spec.mould) ? 0.25 : 0.1;
  const strategy = clamp01(complexity * 0.4 + tokens * 0.15 + strategyLean + handling * 0.1);

  // Twist modifiers.
  const twistBoost =
    spec.twist === "brittle" ? 0.12 :
    spec.twist === "blackout" ? 0.1 :
    spec.twist === "compact" ? 0.06 :
    spec.twist === "decade" ? -0.08 :
    spec.twist === "windfall" ? -0.04 : 0;

  const overall = Math.min(
    10,
    Math.max(
      1,
      Math.round((pace * 0.3 + complexity * 0.3 + reflex * 0.25 + strategy * 0.15 + twistBoost) * 10 * 10) / 10,
    ),
  );

  // Session length: clearing jobs and mazes run longer than score chases.
  const lengthBase: Record<MouldKind, number> = {
    breakout: 3 + spec.brickRows * 0.7,
    snake: 4 + spec.gridDensity * 0.5,
    invaders: 3 + spec.gridDensity * 0.6,
    maze: 4 + spec.gridDensity * 0.9,
    flyer: 3 + spec.pace,
    burrower: 4 + spec.gridDensity * 0.7,
    scaffolding: 3 + spec.pace * 0.8,
    stacker: 4 + spec.pace * 0.6,
    crossing: 3 + spec.pace * 0.7,
  };
  const sessionMinutes = Math.max(2, Math.round(lengthBase[spec.mould] + hazards * 2));

  const verdict =
    overall >= 8.5 ? "BRUTAL PRESSING" :
    overall >= 7 ? "HARD PRESSED" :
    overall >= 5.5 ? "STOUT WORK" :
    overall >= 3.5 ? "HONEST LABOUR" :
    "GENTLE APPRENTICE";

  return { pace, complexity, reflex, strategy, sessionMinutes, overall, verdict };
}
