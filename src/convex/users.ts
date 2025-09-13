/* eslint-disable @typescript-eslint/no-explicit-any */
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
      throw new Error("Unauthorized: admin role required to change user roles");
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    await ctx.db.patch(userId, { role });

    // If promoting to counsellor, ensure a counsellor profile exists so
    // front-end redirects to /counsellor won't hit missing-data errors.
    if (role === ROLES.COUNSELLOR) {
      const existing = await ctx.db
        .query("counsellors")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
      if (!existing) {
        // Use the user's institution if available, otherwise try to reuse the
        // admin's institution or find/create a default one so the counsellor
        // row has a valid non-null institution id (schema requires it).
        let finalInstitutionId = user.institutionId ?? me.institutionId ?? null;
        if (!finalInstitutionId) {
          const anyInst = await ctx.db.query("institutions").first();
          if (anyInst) finalInstitutionId = anyInst._id;
          else
            finalInstitutionId = await ctx.db.insert("institutions", {
              name: "Default Institution",
              domain: "example.edu",
              settings: { supportedLanguages: ["en"] },
              isActive: true,
            });
        }

        await ctx.db.insert("counsellors", {
          userId: userId,
          institutionId: finalInstitutionId,
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
        let finalInstitutionId = institutionId;
        if (!finalInstitutionId) {
          const anyInst = await ctx.db.query("institutions").first();
          if (anyInst) finalInstitutionId = anyInst._id;
          else
            finalInstitutionId = await ctx.db.insert("institutions", {
              name: "Default Institution",
              domain: "example.edu",
              settings: { supportedLanguages: ["en"] },
              isActive: true,
            });
        }

        await ctx.db.insert("counsellors", {
          userId: me._id,
          institutionId: finalInstitutionId,
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

    // Assign STUDENT to any other email only if role is not already set.
    // Previously this would overwrite roles on every login which caused
    // admin-promoted roles to be reverted back to student. Only set a
    // default role when the user's role is null/undefined.
    if (
      (me.email ?? "") !== ADMIN_EMAIL &&
      (me.email ?? "") !== COUNSELLOR_EMAIL &&
      me.role == null
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

export const removeUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const me = await getCurrentUser(ctx);
    if (!me || me.role !== ROLES.ADMIN) throw new Error("Unauthorized");

    if (me._id === args.userId) {
      throw new Error("Cannot remove yourself");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Remove counsellor profile and its appointments if present
    const counsellor = await ctx.db
      .query("counsellors")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (counsellor) {
      try {
        // delete counsellor appointments (best-effort)
        const appts = await ctx.db
          .query("appointments")
          .withIndex("by_counsellor", (q) =>
            q.eq("counsellorId", counsellor._id),
          )
          .collect();
        for (const a of appts) {
          try {
            await ctx.db.delete(a._id);
          } catch {
            // ignore
          }
        }
        await ctx.db.delete(counsellor._id);
      } catch {
        // ignore failures
      }
    }

    // Delete appointments created by the user (best-effort)
    try {
      const userAppts = await ctx.db
        .query("appointments")
        .withIndex("by_student", (q) => q.eq("studentId", args.userId))
        .collect();
      for (const a of userAppts) {
        try {
          await ctx.db.delete(a._id);
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }

    // Delete forum likes made by the user
    try {
      const likes = await ctx.db
        .query("forumLikes")
        .filter((q) => q.eq(q.field("userId"), args.userId))
        .collect();
      for (const l of likes) {
        try {
          await ctx.db.delete(l._id);
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }

    // Delete forum posts authored by the user (cleanup replies and likes)
    try {
      const posts = await ctx.db
        .query("forumPosts")
        .filter((q) => q.eq(q.field("userId"), args.userId))
        .collect();
      for (const p of posts) {
        try {
          // delete likes for the post
          const postLikes = await ctx.db
            .query("forumLikes")
            .filter((q) => q.eq(q.field("postId"), p._id))
            .collect();
          for (const pl of postLikes) {
            try {
              await ctx.db.delete(pl._id);
            } catch {
              // ignore
            }
          }

          // delete the post
          await ctx.db.delete(p._id);

          // decrement parent replyCount if it was a reply
          if (p.parentId) {
            try {
              const parent = await ctx.db.get(p.parentId);
              if (parent) {
                await ctx.db.patch(p.parentId, {
                  replyCount: Math.max(0, parent.replyCount - 1),
                });
              }
            } catch {
              // ignore
            }
          }
        } catch {
          // ignore per-post failures
        }
      }
    } catch {
      // ignore
    }

    // Finally delete the user record
    await ctx.db.delete(args.userId);

    return { success: true };
  },
});
