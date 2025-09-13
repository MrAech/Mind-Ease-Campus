import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const create = mutation({
  args: {
    name: v.string(),
    domain: v.string(),
    supportedLanguages: v.array(v.string()),
    primaryColor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized");
    }

    return await ctx.db.insert("institutions", {
      name: args.name,
      domain: args.domain,
      settings: {
        supportedLanguages: args.supportedLanguages,
        primaryColor: args.primaryColor,
      },
      isActive: true,
    });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized");
    }

    return await ctx.db.query("institutions").collect();
  },
});

export const getByDomain = query({
  args: { domain: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("institutions")
      .withIndex("by_domain", (q) => q.eq("domain", args.domain))
      .unique();
  },
});
