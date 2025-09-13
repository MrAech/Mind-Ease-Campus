/* eslint-disable @typescript-eslint/no-explicit-any */
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const seedDatabase = mutation({
  args: {},
  handler: async (ctx) => {
    // Create a sample institution
    const institutionId = await ctx.db.insert("institutions", {
      name: "Sample University",
      domain: "sample.edu",
      settings: {
        supportedLanguages: ["en", "es", "hi"],
        primaryColor: "#3b82f6",
      },
      isActive: true,
    });

    // Create sample resources
    const resources = [
      {
        title: "Managing Academic Stress",
        description:
          "Learn effective strategies to handle academic pressure and maintain balance.",
        type: "guide" as const,
        content: 
  "Academic stress is a challenge many students face, but it can be managed with the right approach. \n Start by organizing your time with realistic schedules and clear priorities. \nBreak large tasks into smaller steps to avoid feeling overwhelmed. \nTake regular breaks, practice mindfulness, and engage in physical activity to recharge your mind. \nDon’t hesitate to seek support from friends, mentors, or counseling services when needed. \nRemember, maintaining balance between studies, rest, and personal activities is key to staying productive \nand protecting your well-being.",

        language: "en",
        tags: ["stress", "academic", "study-tips"],
        institutionId,
        isPublished: true,
        viewCount: 0,
      },
      {
        title: "Anxiety Coping Techniques",
        description:
          "Practical breathing exercises and mindfulness techniques for anxiety management.",
        type: "video" as const,
        content: "https://www.youtube.com/watch?v=wfDTp2GogaQ",
        language: "en",
        tags: ["anxiety", "breathing", "mindfulness"],
        institutionId,
        isPublished: true,
        viewCount: 0,
      },
      {
        title: "Sleep Hygiene Guide",
        description:
          "Improve your sleep quality with these evidence-based tips.",
        type: "article" as const,
        content: "Quality sleep is a foundation of good mental and physical health.\nTo improve your sleep hygiene, start by maintaining a consistent bedtime and wake-up schedule, even on weekends.\nCreate a relaxing pre-sleep routine—such as reading, light stretching, or meditation—to signal your body it’s time to wind down.\nLimit caffeine and heavy meals close to bedtime, and reduce screen exposure at least an hour before sleeping.\nEnsure your bedroom is quiet, dark, and cool for an optimal sleep environment.\nBy following these practices, you can enhance your sleep quality, improve focus, and support overall well-being.",
        language: "en",
        tags: ["sleep", "wellness", "health"],
        institutionId,
        isPublished: true,
        viewCount: 0,
      },
      {
        title: "Meditation for Beginners",
        description:
          "A guided meditation session for stress relief and relaxation.",
        type: "audio" as const,
        content: "https://example.com/meditation-audio",
        language: "en",
        tags: ["meditation", "relaxation", "mindfulness"],
        institutionId,
        isPublished: true,
        viewCount: 0,
      },
    ];

    // Insert resources
    for (const resource of resources) {
      await ctx.db.insert("resources", {
        ...resource,
        createdBy: "system" as any, // This would normally be a user ID
      });
    }

    console.log("Database seeded successfully!");
    return { success: true, institutionId };
  },
});

export const seedRoles = mutation({
  args: {},
  handler: async (ctx) => {
    // Ensure an institution exists
    let institution = await ctx.db.query("institutions").first();
    if (!institution) {
      const institutionId = await ctx.db.insert("institutions", {
        name: "Sample University",
        domain: "sample.edu",
        settings: {
          supportedLanguages: ["en", "hi"],
          primaryColor: "#3b82f6",
        },
        isActive: true,
      });
      institution = (await ctx.db.get(institutionId))!;
    }

    // Ensure non-null institution id for TS
    const institutionIdFinal = (institution as any)._id;

    // Helper to find or create a user by email with role
    async function upsertUser(
      name: string,
      email: string,
      role: "admin" | "student" | "counsellor",
    ) {
      const existing = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", email))
        .first();
      if (existing) return existing._id;
      return await ctx.db.insert("users", {
        name,
        email,
        role,
        institutionId: institutionIdFinal,
        isAnonymous: false,
      } as any);
    }

    const adminId = await upsertUser("Admin User", "admin@sample.edu", "admin");
    const studentId = await upsertUser(
      "Student User",
      "student@sample.edu",
      "student",
    );
    const counsellorUserId = await upsertUser(
      "Counsellor User",
      "counsellor@sample.edu",
      "counsellor",
    );

    // Ensure a counsellor profile exists
    const existingCounsellor = await ctx.db
      .query("counsellors")
      .withIndex("by_user", (q) => q.eq("userId", counsellorUserId as any))
      .first();
    if (!existingCounsellor) {
      await ctx.db.insert("counsellors", {
        userId: counsellorUserId as any,
        institutionId: institutionIdFinal,
        specialization: ["anxiety", "depression"],
        bio: "Experienced counsellor.",
        qualifications: "M.A. Psychology",
        availability: {
          monday: ["09:00", "10:00", "11:00"],
          tuesday: ["14:00", "15:00"],
          wednesday: ["09:00", "10:00"],
          thursday: ["14:00", "15:00"],
          friday: ["09:00", "10:00"],
          saturday: [],
          sunday: [],
        },
        isActive: true,
      });
    }

    return {
      success: true,
      adminId,
      studentId,
      counsellorUserId,
      institutionId: institutionIdFinal,
    };
  },
});

export const assignRolesByEmail = mutation({
  args: {
    adminEmail: v.string(),
    counsellorEmail: v.string(),
  },
  handler: async (ctx, { adminEmail, counsellorEmail }) => {
    // Ensure an institution exists
    let institution = await ctx.db.query("institutions").first();
    if (!institution) {
      const institutionId = await ctx.db.insert("institutions", {
        name: "Sample University",
        domain: "sample.edu",
        settings: {
          supportedLanguages: ["en", "hi"],
          primaryColor: "#3b82f6",
        },
        isActive: true,
      });
      institution = (await ctx.db.get(institutionId))!;
    }
    const institutionIdFinal = (institution as any)._id;

    async function upsertUserToRole(
      email: string,
      name: string,
      role: "admin" | "counsellor",
    ) {
      const existing = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", email))
        .first();

      if (existing) {
        if (existing.role !== role) {
          await ctx.db.patch(existing._id, {
            role,
            institutionId: institutionIdFinal,
            isAnonymous: false,
          });
        }
        return existing._id;
      }

      return await ctx.db.insert("users", {
        name,
        email,
        role,
        institutionId: institutionIdFinal,
        isAnonymous: false,
      } as any);
    }

    const adminId = await upsertUserToRole(adminEmail, "Admin", "admin");
    const counsellorUserId = await upsertUserToRole(
      counsellorEmail,
      "Counsellor",
      "counsellor",
    );

    // Ensure counsellor profile exists for the counsellor user
    const existingCounsellor = await ctx.db
      .query("counsellors")
      .withIndex("by_user", (q) => q.eq("userId", counsellorUserId as any))
      .first();

    if (!existingCounsellor) {
      await ctx.db.insert("counsellors", {
        userId: counsellorUserId as any,
        institutionId: institutionIdFinal,
        specialization: ["anxiety", "depression"],
        bio: "Experienced counsellor.",
        qualifications: "M.A. Psychology",
        availability: {
          monday: ["09:00", "10:00", "11:00"],
          tuesday: ["14:00", "15:00"],
          wednesday: ["09:00", "10:00"],
          thursday: ["14:00", "15:00"],
          friday: ["09:00", "10:00"],
          saturday: [],
          sunday: [],
        },
        isActive: true,
      });
    }

    return {
      success: true,
      adminId,
      counsellorUserId,
      institutionId: institutionIdFinal,
    };
  },
});
