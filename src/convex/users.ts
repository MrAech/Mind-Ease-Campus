import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { ROLES, roleValidator } from "./schema";

/**
 * Get the current signed in user. Returns null if the user is not signed in.
 * Usage: const signedInUser = await ctx.runQuery(api.authHelpers.currentUser);
 * THIS FUNCTION IS READ-ONLY. DO NOT MODIFY.
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if (user === null) {
      return null;
    }

    return user;
  },
});

/**
 * Use this function internally to get the current user data. Remember to handle the null user case.
 * @param ctx
 * @returns
 */
export const getCurrentUser = async (ctx: QueryCtx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    return null;
  }
  return await ctx.db.get(userId);
};

// List all users (admin only)
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUser(ctx);
    if (!me || me.role !== ROLES.ADMIN) {
      throw new Error("Unauthorized");
    }
    // Return essential fields only
    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({
      _id: u._id,
      name: u.name ?? "",
      email: u.email ?? "",
      role: u.role ?? null,
      institutionId: u.institutionId ?? null,
      isAnonymous: u.isAnonymous ?? false,
    }));
  },
});

// Set role for a user (admin only)
export const setRole = mutation({
  args: {
    userId: v.id("users"),
    role: roleValidator,
  },
  handler: async (ctx, { userId, role }) => {
    const me = await getCurrentUser(ctx);
    if (!me || me.role !== ROLES.ADMIN) {
      throw new Error("Unauthorized");
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    await ctx.db.patch(userId, { role });
    return { success: true };
  },
});

// Add: check if any admin exists (used for first-time bootstrap)
export const hasAdmin = query({
  args: {},
  handler: async (ctx) => {
    const admin = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", ROLES.ADMIN))
      .first();
    return admin !== null;
  },
});

export const ensureInitialRoles = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUser(ctx);
    if (!me) {
      throw new Error("Unauthorized");
    }

    const ADMIN_EMAIL = "happy2006sharma@gmail.com";
    const COUNSELLOR_EMAIL = "nishantsingh2131@gmail.com";

    let changed = false;

    // Ensure an institution exists or create a default one if needed
    let institutionId = me.institutionId ?? null;
    if (!institutionId) {
      const inst = await ctx.db.query("institutions").first();
      if (inst) {
        institutionId = inst._id;
      } else {
        institutionId = await ctx.db.insert("institutions", {
          name: "Default Institution",
          domain: "example.edu",
          settings: {
            supportedLanguages: ["en"],
          },
          isActive: true,
        });
      }
      await ctx.db.patch(me._id, { institutionId });
    }

    if ((me.email ?? "") === ADMIN_EMAIL && me.role !== ROLES.ADMIN) {
      await ctx.db.patch(me._id, { role: ROLES.ADMIN });
      changed = true;
    }

    if ((me.email ?? "") === COUNSELLOR_EMAIL && me.role !== ROLES.COUNSELLOR) {
      await ctx.db.patch(me._id, { role: ROLES.COUNSELLOR });
      changed = true;

      // Ensure counsellor profile exists
      const existing = await ctx.db
        .query("counsellors")
        .withIndex("by_user", (q) => q.eq("userId", me._id))
        .first();
      if (!existing) {
        await ctx.db.insert("counsellors", {
          userId: me._id,
          institutionId: institutionId as any,
          specialization: [],
          bio: "",
          qualifications: "",
          availability: {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: [],
          },
          isActive: true,
        });
      }
    }

    // Assign STUDENT to any other email if not already set
    if (
      (me.email ?? "") !== ADMIN_EMAIL &&
      (me.email ?? "") !== COUNSELLOR_EMAIL &&
      me.role !== ROLES.STUDENT
    ) {
      await ctx.db.patch(me._id, { role: ROLES.STUDENT });
      changed = true;
    }

    return {
      success: true,
      changed,
      role: changed
        ? (me.email ?? "") === ADMIN_EMAIL
          ? ROLES.ADMIN
          : (me.email ?? "") === COUNSELLOR_EMAIL
            ? ROLES.COUNSELLOR
            : ROLES.STUDENT
        : (me.role ?? null),
    };
  },
});
