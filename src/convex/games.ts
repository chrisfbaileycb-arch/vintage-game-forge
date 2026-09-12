import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Press a cartridge: persist a validated spec owned by the current user.
 * Returns the document id, which doubles as the public share key.
 */
export const press = mutation({
  args: {
    title: v.string(),
    spec: v.any(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in to press a cartridge.");

    const title = args.title.trim().slice(0, 40) || "Untitled Pressing";
    const spec = (args.spec ?? {}) as Record<string, unknown>;

    const id = await ctx.db.insert("gameDesigns", {
      title,
      spec,
      mould: typeof spec.mould === "string" ? spec.mould : "breakout",
      palette: typeof spec.palette === "string" ? spec.palette : "sepia",
      frame: typeof spec.frame === "string" ? spec.frame : "none",
      twist: typeof spec.twist === "string" ? spec.twist : "none",
      userId,
      isPublic: true,
      plays: 0,
      createdAt: Date.now(),
    });
    return id;
  },
});

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

/** Count a play when someone opens the cabinet. */
export const recordPlay = mutation({
  args: { id: v.id("gameDesigns") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.id);
    if (!game) return;
    await ctx.db.patch(args.id, { plays: (game.plays ?? 0) + 1 });
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
    await ctx.db.delete(args.id);
  },
});
