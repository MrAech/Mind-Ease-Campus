/* eslint-disable @typescript-eslint/no-explicit-any */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { ROLES } from "./schema";

export const createPost = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    isAnonymous: v.boolean(),
    tags: v.array(v.string()),
    parentId: v.optional(v.id("forumPosts")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || !user.institutionId) {
      throw new Error("Unauthorized");
    }

    const postId = await ctx.db.insert("forumPosts", {
      userId: user._id,
      institutionId: user.institutionId,
      title: args.title,
      content: args.content,
      isAnonymous: args.isAnonymous,
      tags: args.tags,
      parentId: args.parentId,
      isModerated: false,
      isHidden: false,
      likeCount: 0,
      replyCount: 0,
    });

    // Update parent post reply count if this is a reply
    if (args.parentId) {
      const parentPost = await ctx.db.get(args.parentId);
      if (parentPost) {
        await ctx.db.patch(args.parentId, {
          replyCount: parentPost.replyCount + 1,
        });
      }
    }

    return postId;
  },
});

export const listPosts = query({
  args: {
    institutionId: v.id("institutions"),
    parentId: v.optional(v.id("forumPosts")),
  },
  handler: async (ctx, args) => {
    const posts = await ctx.db
      .query("forumPosts")
      .withIndex("by_institution", (q) =>
        q.eq("institutionId", args.institutionId),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("isHidden"), false),
          args.parentId
            ? q.eq(q.field("parentId"), args.parentId)
            : q.eq(q.field("parentId"), undefined),
        ),
      )
      .order("desc")
      .collect();

    // Get user details for each post (anonymized if needed)
    const postsWithUsers = await Promise.all(
      posts.map(async (post) => {
        const user = await ctx.db.get(post.userId);

        return {
          ...post,
          user: post.isAnonymous
            ? {
                name: "Anonymous",
                image: null,
              }
            : {
                name: user?.name || "Unknown User",
                image: user?.image || null,
              },
        };
      }),
    );

    return postsWithUsers;
  },
});

export const likePost = mutation({
  args: { postId: v.id("forumPosts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Check if already liked
    const existingLike = await ctx.db
      .query("forumLikes")
      .withIndex("by_user_post", (q) =>
        q.eq("userId", user._id).eq("postId", args.postId),
      )
      .first();

    if (existingLike) {
      // Unlike
      await ctx.db.delete(existingLike._id);

      const post = await ctx.db.get(args.postId);
      if (post) {
        await ctx.db.patch(args.postId, {
          likeCount: Math.max(0, post.likeCount - 1),
        });
      }
    } else {
      // Like
      await ctx.db.insert("forumLikes", {
        userId: user._id,
        postId: args.postId,
      });

      const post = await ctx.db.get(args.postId);
      if (post) {
        await ctx.db.patch(args.postId, {
          likeCount: post.likeCount + 1,
        });
      }
    }
  },
});

export const updatePost = mutation({
  args: {
    postId: v.id("forumPosts"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");

    if (post.userId !== user._id && user.role !== "admin") {
      throw new Error("Unauthorized");
    }

    const { postId, ...updates } = args;
    await ctx.db.patch(postId, updates);
  },
});

export const deletePost = mutation({
  args: { postId: v.id("forumPosts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");

    if (post.userId !== user._id && user.role !== "admin") {
      throw new Error("Unauthorized");
    }

    // Hide post instead of deleting to preserve thread structure
    await ctx.db.patch(args.postId, {
      isHidden: true,
    });
  },
});

export const moderatePost = mutation({
  args: {
    postId: v.id("forumPosts"),
    isModerated: v.boolean(),
    isHidden: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (
      !user ||
      (user.role !== ROLES.ADMIN && user.role !== ROLES.PEER_VOLUNTEER)
    ) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.postId, {
      isModerated: args.isModerated,
      isHidden: args.isHidden ?? false,
    });
  },
});

export const flagPost = mutation({
  args: { postId: v.id("forumPosts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");

    // Only users within the same institution can flag posts
    if (post.institutionId !== user.institutionId) {
      throw new Error("Unauthorized");
    }

    // Mark post as moderated for admin review
    await ctx.db.patch(args.postId, { isModerated: true });
  },
});

export const restorePost = mutation({
  args: { postId: v.id("forumPosts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== ROLES.ADMIN) throw new Error("Unauthorized");

    await ctx.db.patch(args.postId, { isHidden: false, isModerated: false });
  },
});

export const removePost = mutation({
  args: { postId: v.id("forumPosts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== ROLES.ADMIN) throw new Error("Unauthorized");

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");

    // Delete likes associated with this post (best-effort cleanup)
    const likes = await ctx.db
      .query("forumLikes")
      .filter((q) => q.eq(q.field("postId"), args.postId))
      .collect();
    for (const l of likes) {
      try {
        await ctx.db.delete(l._id);
      } catch {
        // ignore individual delete failures
      }
    }

    // Delete the post record
    await ctx.db.delete(args.postId);

    // If this was a reply, decrement parent replyCount (best-effort)
    if (post.parentId) {
      const parent = await ctx.db.get(post.parentId);
      if (parent) {
        await ctx.db.patch(post.parentId, {
          replyCount: Math.max(0, parent.replyCount - 1),
        });
      }
    }
  },
});
