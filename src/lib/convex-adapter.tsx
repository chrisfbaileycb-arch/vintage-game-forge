import React, { useEffect, useState, useMemo } from "react";
import { getFunctionName } from "convex/server";
import { cabinet, type LocalCartridge } from "./cabinet";
import { normalizeSpec } from "./game/moulds";

const STORE_EVENT = "foundry:convex-store-change";
const AUTH_EVENT = "foundry:convex-auth-change";

export interface MockUser {
  _id: string;
  _creationTime: number;
  name: string;
  email: string;
  role: "admin" | "user";
  isAnonymous?: boolean;
}

const DEFAULT_USER: MockUser = {
  _id: "user-master",
  _creationTime: 1700000000000,
  name: "Foundry Master",
  email: "master@cartridge.foundry",
  role: "admin",
};

// Seed initial cartridges if cabinet is empty
function ensureSeeded() {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  const existing = cabinet.listCartridges();
  if (existing.length < 5) {
    const retroSeeds: { id: string; title: string; mould: any; palette: any; plays: number; best: number }[] = [
      { id: "star-voyager", title: "STAR VOYAGER", mould: "invaders", palette: "blueprint", plays: 2400000, best: 94200 },
      { id: "crypt-crawler", title: "CRYPT CRAWLER", mould: "burrower", palette: "sepia", plays: 1800000, best: 78500 },
      { id: "turbo-drift", title: "TURBO DRIFT '88", mould: "breakout", palette: "verdigris", plays: 3200000, best: 125000 },
      { id: "ninja-shadow", title: "NINJA SHADOW", mould: "scaffolding", palette: "monochrome", plays: 2900000, best: 114000 },
      { id: "void-hopper", title: "VOID HOPPER", mould: "flyer", palette: "sage", plays: 1200000, best: 62000 },
      { id: "robo-rumble", title: "ROBO RUMBLE", mould: "stacker", palette: "steel", plays: 980000, best: 45000 },
      { id: "mega-miner", title: "MEGA MINER", mould: "burrower", palette: "sepia", plays: 1500000, best: 89000 },
      { id: "cyber-samurai", title: "CYBER SAMURAI", mould: "scaffolding", palette: "verdigris", plays: 3700000, best: 148000 },
      { id: "venom-strike", title: "VENOM STRIKE", mould: "flyer", palette: "emerald", plays: 1100000, best: 59000 },
      { id: "pocket-pirate", title: "POCKET PIRATE", mould: "stacker", palette: "sage", plays: 890000, best: 42000 },
      { id: "frog-avenue", title: "FROG AVENUE", mould: "crossing", palette: "gold", plays: 2600000, best: 102000 },
      { id: "meow-force", title: "MEOW FORCE", mould: "invaders", palette: "blueprint", plays: 2200000, best: 91000 },
      { id: "donut-panic", title: "DONUT PANIC", mould: "breakout", palette: "rose", plays: 2900000, best: 118000 },
      { id: "graveyard-shift", title: "GRAVEYARD SHIFT", mould: "burrower", palette: "sage", plays: 760000, best: 39000 },
      { id: "skate-wizard", title: "SKATE WIZARD", mould: "scaffolding", palette: "verdigris", plays: 1600000, best: 74000 },
      { id: "pluto-patrol", title: "PLUTO PATROL", mould: "breakout", palette: "blueprint", plays: 840000, best: 48000 },
      { id: "burrito-bandito", title: "BURRITO BANDITO", mould: "crossing", palette: "gold", plays: 2200000, best: 95000 },
      { id: "kaiju-kafe", title: "KAIJU KAFE", mould: "stacker", palette: "rose", plays: 1900000, best: 83000 },
      { id: "slug-racing", title: "SLUG RACING", mould: "snake", palette: "sage", plays: 610000, best: 31000 },
      { id: "neon-narwhal", title: "NEON NARWHAL", mould: "invaders", palette: "verdigris", plays: 1300000, best: 67000 },
    ];

    for (const r of retroSeeds) {
      const c = cabinet.saveCartridge({
        id: r.id,
        title: r.title,
        spec: normalizeSpec({
          mould: r.mould,
          title: r.title,
          gridDensity: 3,
          brickRows: 5,
          handling: 3,
          hazards: 2,
          tokens: 3,
          pace: 3,
          palette: r.palette,
          frame: "engraved",
          twist: "none",
          finish: "matte",
          bells: true,
          hue: 0,
        }),
      });
      cabinet.recordScore({
        cartridgeId: c.id,
        presetId: null,
        cartridgeTitle: r.title,
        score: r.best,
        level: 2,
        durationSec: 140,
        outcome: "won",
      });
    }
  }
}

// Client stub
export class ConvexReactClient {
  address: string;
  constructor(address?: string) {
    this.address = address || "mock://cartridge-foundry";
    ensureSeeded();
  }
}

export function ConvexProvider({ children }: { children: React.ReactNode; client?: any }) {
  useEffect(() => {
    ensureSeeded();
  }, []);
  return <>{children}</>;
}

export function useConvex() {
  return useMemo(() => new ConvexReactClient(), []);
}

export function useConvexConnectionState() {
  return { hasEverConnected: true, isWebSocketConnected: true };
}

export function useAction() {
  return async () => {};
}

// Resolves reference name
function resolveName(ref: any): string {
  if (typeof ref === "string") return ref;
  if (!ref) return "";
  try {
    return getFunctionName(ref);
  } catch {
    return ref._name || ref.name || "";
  }
}

function getStoredUser(): MockUser | null {
  try {
    if (typeof localStorage === "undefined") return DEFAULT_USER;
    const raw = localStorage.getItem("foundry.user");
    if (raw === "guest") return null;
    if (raw) return JSON.parse(raw);
    return DEFAULT_USER;
  } catch {
    return DEFAULT_USER;
  }
}

export function useConvexAuth() {
  const [user, setUser] = useState<MockUser | null>(getStoredUser);

  useEffect(() => {
    const onAuth = () => setUser(getStoredUser());
    window.addEventListener(AUTH_EVENT, onAuth);
    return () => window.removeEventListener(AUTH_EVENT, onAuth);
  }, []);

  return {
    isLoading: false,
    isAuthenticated: user !== null,
  };
}

function cartridgeToDoc(c: LocalCartridge) {
  return {
    _id: c.id as any,
    _creationTime: c.createdAt,
    title: c.title,
    spec: c.spec,
    mould: c.mould,
    palette: c.spec.palette || "sepia",
    frame: c.spec.frame || "engraved",
    twist: c.spec.twist || "none",
    userId: "user-master" as any,
    isPublic: true,
    plays: c.plays,
    playCount: c.plays,
    bestScore: c.bestScore,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

// Local share links cache
function getShareLinks(): Record<string, string> {
  try {
    if (typeof localStorage === "undefined") return {};
    const raw = localStorage.getItem("foundry.shares");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setShareLinks(shares: Record<string, string>) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem("foundry.shares", JSON.stringify(shares));
  } catch {
    // Ignore
  }
}

export function useQuery(queryRef: any, args?: any): any {
  const [_tick, setTick] = useState(0);

  useEffect(() => {
    const onStore = () => setTick((t) => t + 1);
    window.addEventListener(STORE_EVENT, onStore);
    return () => window.removeEventListener(STORE_EVENT, onStore);
  }, []);

  if (args === "skip") {
    return undefined;
  }

  const name = resolveName(queryRef);

  switch (name) {
    case "users:currentUser": {
      return getStoredUser();
    }

    case "games:listMine":
    case "games:browse": {
      ensureSeeded();
      const cartridges = cabinet.listCartridges();
      return cartridges.map(cartridgeToDoc);
    }

    case "games:listShowcase": {
      ensureSeeded();
      const cartridges = cabinet.listCartridges();
      return cartridges.map(cartridgeToDoc);
    }

    case "games:getPublic": {
      ensureSeeded();
      const id = args?.id;
      if (!id) return null;
      const found = cabinet.getCartridge(id);
      return found ? cartridgeToDoc(found) : null;
    }

    case "games:getByShareToken": {
      ensureSeeded();
      const token = args?.token;
      if (!token) return null;
      const shares = getShareLinks();
      // Match by direct ID or token mapping
      let matchedId = Object.entries(shares).find(([_, t]) => t === token)?.[0];
      if (!matchedId && token.startsWith("cf-")) {
        matchedId = token.slice(3);
      }
      const found = matchedId ? cabinet.getCartridge(matchedId) : cabinet.listCartridges()[0];
      return found ? cartridgeToDoc(found) : null;
    }

    case "games:listShareLinks": {
      const gameId = args?.gameId;
      if (!gameId) return [];
      const shares = getShareLinks();
      const token = shares[gameId];
      if (!token) return [];
      return [
        {
          _id: ("link-" + gameId) as any,
          _creationTime: Date.now(),
          gameId,
          token,
          createdBy: "user-master" as any,
          revoked: false,
          createdAt: Date.now(),
        },
      ];
    }

    case "games:leaderboard": {
      const gameId = args?.gameId;
      if (!gameId) return [];
      const scores = cabinet.listScores(gameId);
      return scores.map((s) => ({
        _id: s.id as any,
        _creationTime: s.createdAt,
        gameId: (s.cartridgeId || gameId) as any,
        playerName: s.cartridgeTitle || "Maker",
        score: s.score,
        combo: 1,
        createdAt: s.createdAt,
      }));
    }

    case "games:myStats": {
      ensureSeeded();
      const cartridges = cabinet.listCartridges();
      const plays = cartridges.reduce((sum, c) => sum + (c.plays || 0), 0);
      const best = cartridges.reduce((max, c) => Math.max(max, c.bestScore || 0), 0);
      return {
        _id: "counter-master" as any,
        _creationTime: 1700000000000,
        userId: "user-master" as any,
        presses: cartridges.length,
        plays,
        totalScore: best * 2,
        bestScore: best,
      };
    }

    default:
      return undefined;
  }
}

export function useMutation(mutationRef: any): any {
  const name = resolveName(mutationRef);

  return async (args: any) => {
    switch (name) {
      case "games:press": {
        const saved = cabinet.saveCartridge({
          title: args.title,
          spec: args.spec,
        });
        window.dispatchEvent(new CustomEvent(STORE_EVENT));
        return saved.id;
      }

      case "games:remaster": {
        const saved = cabinet.saveCartridge({
          id: args.id,
          title: args.title || "Remaster",
          spec: args.spec,
        });
        window.dispatchEvent(new CustomEvent(STORE_EVENT));
        return saved.id;
      }

      case "games:rename": {
        const existing = cabinet.getCartridge(args.id);
        if (existing) {
          cabinet.saveCartridge({
            id: args.id,
            title: args.title,
            spec: existing.spec,
          });
          window.dispatchEvent(new CustomEvent(STORE_EVENT));
        }
        return;
      }

      case "games:remove": {
        cabinet.removeCartridge(args.id);
        window.dispatchEvent(new CustomEvent(STORE_EVENT));
        return;
      }

      case "games:setPublic": {
        // All local cartridges are viewable in display case
        window.dispatchEvent(new CustomEvent(STORE_EVENT));
        return;
      }

      case "games:recordPlay": {
        const found = cabinet.getCartridge(args.id);
        if (found) {
          found.plays = (found.plays || 0) + 1;
          cabinet.saveCartridge({
            id: found.id,
            title: found.title,
            spec: found.spec,
          });
          window.dispatchEvent(new CustomEvent(STORE_EVENT));
        }
        return;
      }

      case "games:submitScore": {
        cabinet.recordScore({
          cartridgeId: args.gameId,
          presetId: null,
          cartridgeTitle: args.playerName || "Challenger",
          score: args.score,
          level: 1,
          durationSec: 45,
          outcome: "won",
        });
        const found = cabinet.getCartridge(args.gameId);
        let best = args.score;
        if (found) {
          if (args.score > found.bestScore) {
            found.bestScore = args.score;
            cabinet.saveCartridge({ id: found.id, title: found.title, spec: found.spec });
          }
          best = found.bestScore;
        }
        window.dispatchEvent(new CustomEvent(STORE_EVENT));
        return { score: args.score, best };
      }

      case "games:createShareLink": {
        const shares = getShareLinks();
        const token = "cf-" + args.id;
        shares[args.id] = token;
        setShareLinks(shares);
        window.dispatchEvent(new CustomEvent(STORE_EVENT));
        return { token };
      }

      case "games:revokeShareLink": {
        const shares = getShareLinks();
        delete shares[args.gameId];
        setShareLinks(shares);
        window.dispatchEvent(new CustomEvent(STORE_EVENT));
        return { revoked: 1 };
      }

      default:
        window.dispatchEvent(new CustomEvent(STORE_EVENT));
        return undefined;
    }
  };
}
