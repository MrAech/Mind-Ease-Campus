import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { resourceTypeValidator } from "./schema";

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    type: resourceTypeValidator,
    content: v.string(),
    language: v.string(),
    tags: v.array(v.string()),
    institutionId: v.optional(v.id("institutions")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || (user.role !== "admin" && user.role !== "counsellor")) {
      throw new Error("Unauthorized");
    }

    return await ctx.db.insert("resources", {
      ...args,
      createdBy: user._id,
      isPublished: true,
      viewCount: 0,
    });
  },
});

export const list = query({
  args: {
    type: v.optional(resourceTypeValidator),
    language: v.optional(v.string()),
    institutionId: v.optional(v.id("institutions")),
  },
  handler: async (ctx, args) => {
    let resources;

    if (args.type !== undefined) {
      const t = args.type as NonNullable<typeof args.type>;
      resources = await ctx.db
        .query("resources")
        .withIndex("by_type", (q) => q.eq("type", t))
        .filter((q) => q.eq(q.field("isPublished"), true))
        .collect();
    } else if (args.language !== undefined) {
      const lang = args.language as NonNullable<typeof args.language>;
      resources = await ctx.db
        .query("resources")
        .withIndex("by_language", (q) => q.eq("language", lang))
        .filter((q) => q.eq(q.field("isPublished"), true))
        .collect();
    } else if (args.institutionId !== undefined) {
      const instId = args.institutionId as NonNullable<
        typeof args.institutionId
      >;
      resources = await ctx.db
        .query("resources")
        .withIndex("by_institution", (q) => q.eq("institutionId", instId))
        .filter((q) => q.eq(q.field("isPublished"), true))
        .collect();
    } else {
      resources = await ctx.db
        .query("resources")
        .withIndex("by_published", (q) => q.eq("isPublished", true))
        .collect();
    }

    return resources;
  },
});

export const getById = query({
  args: { id: v.id("resources") },
  handler: async (ctx, args) => {
    const resource = await ctx.db.get(args.id);
    if (!resource || !resource.isPublished) return null;

    return resource;
  },
});

export const incrementViewCount = mutation({
  args: { id: v.id("resources") },
  handler: async (ctx, args) => {
    const resource = await ctx.db.get(args.id);
    if (!resource) return;

    await ctx.db.patch(args.id, {
      viewCount: resource.viewCount + 1,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("resources"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    content: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const resource = await ctx.db.get(args.id);
    if (!resource) throw new Error("Resource not found");

    if (user.role !== "admin" && resource.createdBy !== user._id) {
      throw new Error("Unauthorized");
    }

    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("resources") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const resource = await ctx.db.get(args.id);
    if (!resource) throw new Error("Resource not found");

    if (user.role !== "admin" && resource.createdBy !== user._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.id);
  },
});
