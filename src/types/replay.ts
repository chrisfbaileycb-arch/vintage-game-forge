import type { CoverSpec } from "@/components/CartCover";
import type { CartridgeSpec } from "@/lib/game/moulds";

export const CONSOLES = ["ALL", "NES", "SNES", "GENESIS", "ARCADE", "GB"] as const;
export type ConsoleCat = (typeof CONSOLES)[number];

export interface ReplayGame {
  id: string;
  title: string;
  cat: Exclude<ConsoleCat, "ALL">;
  year: number;
  rating: number;
  plays: number;
  img?: string;
  cover?: CoverSpec;
  accentColor?: string;
  themeColors?: string[];
  description?: string;
  cartridgeSpec?: CartridgeSpec;
  creatorName?: string;
}
