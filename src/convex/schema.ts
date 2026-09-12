import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // Pressed cartridges: validated specs with owner + public share metadata.
    gameDesigns: defineTable({
      title: v.string(),
      spec: v.any(), // CartridgeSpec (validated via normalizeSpec on read)
      mould: v.string(),
      palette: v.string(),
      frame: v.string(),
      twist: v.string(),
      userId: v.id("users"),
      isPublic: v.boolean(),
      plays: v.number(),
      playCount: v.number(), // ledger of registered runs (replaces plays going forward)
      bestScore: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId", "createdAt"])
      .index("by_public", ["isPublic", "plays"])
      .index("by_mould", ["mould"])
      .index("by_public_recent", ["isPublic", "createdAt"]),

    // High scores: one ledger entry per submitted run.
    scores: defineTable({
      gameId: v.id("gameDesigns"),
      userId: v.optional(v.id("users")),
      playerName: v.string(),
      score: v.number(),
      combo: v.number(),
      createdAt: v.number(),
    })
      .index("by_game", ["gameId", "score"])
      .index("by_user", ["userId", "createdAt"]),

    // Per-user aggregate counters, one row per user.
    counters: defineTable({
      userId: v.id("users"),
      presses: v.number(),
      plays: v.number(),
      totalScore: v.number(),
      bestScore: v.number(),
    }).index("by_user", ["userId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
