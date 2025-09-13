import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const create = mutation({
  args: {
    userId: v.id("users"),
    institutionId: v.id("institutions"),
    specialization: v.array(v.string()),
    bio: v.optional(v.string()),
    qualifications: v.optional(v.string()),
    availability: v.object({
      monday: v.array(v.string()),
      tuesday: v.array(v.string()),
      wednesday: v.array(v.string()),
      thursday: v.array(v.string()),
      friday: v.array(v.string()),
      saturday: v.array(v.string()),
      sunday: v.array(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || (user.role !== "admin" && user.role !== "counsellor")) {
      throw new Error("Unauthorized");
    }

    return await ctx.db.insert("counsellors", {
      ...args,
      isActive: true,
    });
  },
});

export const listByInstitution = query({
  args: { institutionId: v.id("institutions") },
  handler: async (ctx, args) => {
    const counsellors = await ctx.db
      .query("counsellors")
      .withIndex("by_institution", (q) =>
        q.eq("institutionId", args.institutionId),
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Get user details for each counsellor
    const counsellorsWithUsers = await Promise.all(
      counsellors.map(async (counsellor) => {
        const user = await ctx.db.get(counsellor.userId);
        return {
          ...counsellor,
          user,
        };
      }),
    );

    return counsellorsWithUsers;
  },
});

export const getById = query({
  args: { id: v.id("counsellors") },
  handler: async (ctx, args) => {
    const counsellor = await ctx.db.get(args.id);
    if (!counsellor) return null;

    const user = await ctx.db.get(counsellor.userId);
    return {
      ...counsellor,
      user,
    };
  },
});

export const updateAvailability = mutation({
  args: {
    counsellorId: v.id("counsellors"),
    availability: v.object({
      monday: v.array(v.string()),
      tuesday: v.array(v.string()),
      wednesday: v.array(v.string()),
      thursday: v.array(v.string()),
      friday: v.array(v.string()),
      saturday: v.array(v.string()),
      sunday: v.array(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const counsellor = await ctx.db.get(args.counsellorId);
    if (!counsellor) throw new Error("Counsellor not found");

    if (user.role !== "admin" && counsellor.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.counsellorId, {
      availability: args.availability,
    });
  },
});

export const listAvailable = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Fallback to first institution if the user doesn't have one yet
    let institutionId = user.institutionId ?? null;
    if (!institutionId) {
      const firstInstitution = await ctx.db.query("institutions").first();
      if (!firstInstitution) return [];
      institutionId = firstInstitution._id;
    }

    const counsellors = await ctx.db
      .query("counsellors")
      .withIndex("by_institution", (q) =>
        q.eq("institutionId", institutionId as any),
      )
      .collect();

    const active = counsellors.filter((c) => c.isActive);
    const enriched = await Promise.all(
      active.map(async (c) => {
        const u = await ctx.db.get(c.userId);
        return {
          ...c,
          user: u
            ? { _id: u._id, name: u.name ?? "", email: u.email ?? "" }
            : null,
        };
      }),
    );

    return enriched;
  },
});
