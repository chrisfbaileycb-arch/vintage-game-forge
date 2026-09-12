import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { MutationCtx, mutation, query } from "./_generated/server";
import { normalizeSpec } from "../lib/game/moulds";

/**
 * Sanitize an incoming spec through the engine's own normalizer — the single
 * source of truth for dial ranges, enum whitelists, and mould validation.
 * Everything unknown is dropped; the result is always a playable spec.
 */
function sanitizeSpec(raw: unknown): Record<string, unknown> {
  return { ...normalizeSpec((raw ?? {}) as Record<string, unknown>) };
}

/** Bump the per-user aggregate counters (creating the row on first press). */
async function bumpCounter(
  ctx: MutationCtx,
  userId: Id<"users">,
  patch: { presses?: number; plays?: number; totalScore?: number; bestScore?: number },
) {
  const existing = await ctx.db
    .query("counters")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (!existing) {
    await ctx.db.insert("counters", {
      userId,
      presses: patch.presses ?? 0,
      plays: patch.plays ?? 0,
      totalScore: patch.totalScore ?? 0,
      bestScore: patch.bestScore ?? 0,
    });
    return;
  }
  await ctx.db.patch(existing._id, {
    presses: existing.presses + (patch.presses ?? 0),
    plays: existing.plays + (patch.plays ?? 0),
    totalScore: existing.totalScore + (patch.totalScore ?? 0),
    bestScore: Math.max(existing.bestScore, patch.bestScore ?? 0),
  });
}

// ---------------------------------------------------------------------------
// Presses (writes)
// ---------------------------------------------------------------------------

/** Press a cartridge: persist a sanitized spec owned by the current user. */
export const press = mutation({
  args: { title: v.string(), spec: v.any() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in to press a cartridge.");

    const spec = sanitizeSpec(args.spec);
    const title = args.title.trim().slice(0, 40) || "Untitled Pressing";
    spec.title = title;
    const now = Date.now();

    const id = await ctx.db.insert("gameDesigns", {
      title,
      spec,
      mould: String(spec.mould),
      palette: String(spec.palette),
      frame: String(spec.frame),
      twist: String(spec.twist),
      userId,
      isPublic: true,
      plays: 0,
      playCount: 0,
      bestScore: 0,
      createdAt: now,
      updatedAt: now,
    });
    await bumpCounter(ctx, userId, { presses: 1 });
    return id;
  },
});

/** Re-title a cartridge. */
export const rename = mutation({
  args: { id: v.id("gameDesigns"), title: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in first.");
    const game = await ctx.db.get(args.id);
    if (!game) throw new Error("No such cartridge.");
    if (game.userId !== userId) throw new Error("Not your cartridge.");
    const title = args.title.trim().slice(0, 40) || "Untitled Pressing";
    await ctx.db.patch(args.id, {
      title,
      spec: { ...(game.spec as Record<string, unknown>), title },
      updatedAt: Date.now(),
    });
  },
});

/**
 * Remaster: overwrite the dials of one of your cartridges with a new spec,
 * keeping the same share link, catalogue number, and history.
 */
export const remaster = mutation({
  args: { id: v.id("gameDesigns"), spec: v.any(), title: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in first.");
    const game = await ctx.db.get(args.id);
    if (!game) throw new Error("No such cartridge.");
    if (game.userId !== userId) throw new Error("Not your cartridge.");

    const spec = sanitizeSpec(args.spec);
    const title =
      args.title !== undefined
        ? args.title.trim().slice(0, 40) || game.title
        : game.title;
    spec.title = title;
    await ctx.db.patch(args.id, {
      title,
      spec,
      mould: String(spec.mould),
      palette: String(spec.palette),
      frame: String(spec.frame),
      twist: String(spec.twist),
      updatedAt: Date.now(),
    });
  },
});

/** Toggle whether a cartridge appears in the public showcase. */
export const setPublic = mutation({
  args: { id: v.id("gameDesigns"), isPublic: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in first.");
    const game = await ctx.db.get(args.id);
    if (!game) throw new Error("No such cartridge.");
    if (game.userId !== userId) throw new Error("Not your cartridge.");
    await ctx.db.patch(args.id, { isPublic: args.isPublic });
  },
});

/** Remove a cartridge from the catalogue. */
export const remove = mutation({
  args: { id: v.id("gameDesigns") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in first.");
    const game = await ctx.db.get(args.id);
    if (!game) throw new Error("No such cartridge.");
    if (game.userId !== userId) throw new Error("Not your cartridge.");
    // Delete the cartridge and its score ledger entries.
    const scores = await ctx.db
      .query("scores")
      .withIndex("by_game", (q) => q.eq("gameId", args.id))
      .collect();
    for (const s of scores) await ctx.db.delete(s._id);
    await ctx.db.delete(args.id);
  },
});

/** Count a play when someone opens the cabinet. */
export const recordPlay = mutation({
  args: { id: v.id("gameDesigns") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.id);
    if (!game) return;
    await ctx.db.patch(args.id, {
      plays: (game.plays ?? 0) + 1,
      playCount: (game.playCount ?? 0) + 1,
    });
    if (game.userId) {
      await bumpCounter(ctx, game.userId, { plays: 1 });
    }
  },
});

/**
 * Submit a finished run to the ledger. Works signed-in (linked to the user,
 * shown as the maker name) or signed-out public players.
 */
export const submitScore = mutation({
  args: {
    gameId: v.id("gameDesigns"),
    score: v.number(),
    combo: v.optional(v.number()),
    playerName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("No such cartridge.");

    let playerName = (args.playerName ?? "").trim().slice(0, 24);
    if (!playerName) {
      if (userId) {
        const user = await ctx.db.get(userId);
        playerName = (user?.name ?? user?.email ?? "A maker").slice(0, 24);
      } else {
        playerName = "A visitor";
      }
    }

    const score = Math.max(0, Math.min(1_000_000, Math.round(args.score)));
    await ctx.db.insert("scores", {
      gameId: args.gameId,
      userId: userId ?? undefined,
      playerName,
      score,
      combo: Math.max(0, Math.min(999, Math.round(args.combo ?? 0))),
      createdAt: Date.now(),
    });
    await ctx.db.patch(game._id, {
      playCount: (game.playCount ?? 0) + 1,
      bestScore: Math.max(game.bestScore ?? 0, score),
    });
    if (userId) {
      await bumpCounter(ctx, userId, { plays: 1, totalScore: score, bestScore: score });
    }
    return { score, best: Math.max(game.bestScore ?? 0, score) };
  },
});

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** The signed-in maker's catalogue, newest first. */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("gameDesigns")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(200);
  },
});

/** Browse the public racks, optionally filtered by mould. */
export const browse = query({
  args: { mould: v.optional(v.string()), sort: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.mould) {
      return await ctx.db
        .query("gameDesigns")
        .withIndex("by_mould", (q) => q.eq("mould", args.mould!))
        .order("desc")
        .take(24);
    }
    const base = ctx.db
      .query("gameDesigns")
      .withIndex("by_public", (q) => q.eq("isPublic", true));
    return await base.order("desc").take(24);
  },
});

/** The public display case — most-played pressed cartridges. */
export const listShowcase = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("gameDesigns")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .order("desc")
      .take(24);
  },
});

/** Fetch one cartridge for the public play page. */
export const getPublic = query({
  args: { id: v.id("gameDesigns") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/** Top scores for one cartridge. */
export const leaderboard = query({
  args: { gameId: v.id("gameDesigns"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(20, Math.max(1, args.limit ?? 10));
    return await ctx.db
      .query("scores")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .order("desc")
      .take(limit);
  },
});

/** The signed-in maker's aggregate workshop stats. */
export const myStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("counters")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
  },
});
