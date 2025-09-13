import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { screeningToolValidator } from "./schema";

export const submitScreening = mutation({
  args: {
    toolType: screeningToolValidator,
    responses: v.array(v.number()),
    isAnonymous: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Ensure the user has an institution. If missing, try to assign one.
    if (!user.institutionId) {
      let institutionId = null as null | typeof user.institutionId;

      // Try to infer from email domain if present
      const email = (user as any).email as string | undefined;
      if (email && email.includes("@")) {
        const domain = email.split("@")[1]!;
        const match = await ctx.db
          .query("institutions")
          .withIndex("by_domain", (q) => q.eq("domain", domain))
          .first();
        if (match) {
          institutionId = match._id as any;
        }
      }

      // Fallback to first institution if none found
      if (!institutionId) {
        const first = await ctx.db.query("institutions").first();
        if (first) {
          institutionId = first._id as any;
        }
      }

      // Create a default institution if still none exists
      if (!institutionId) {
        const createdId = await ctx.db.insert("institutions", {
          name: "Sample University",
          domain: "sample.edu",
          settings: {
            supportedLanguages: ["en", "hi"],
            primaryColor: "#3b82f6",
          },
          isActive: true,
        });
        institutionId = createdId as any;
      }

      // Patch user with the resolved institution
      await ctx.db.patch(user._id, { institutionId } as any);

      // Mutations don't rehydrate user; set it locally for this request
      (user as any).institutionId = institutionId;
    }

    // Calculate score based on tool type
    const score = args.responses.reduce((sum, response) => sum + response, 0);

    // Determine risk level and recommendations
    let riskLevel = "low";
    let recommendations: string[] = [];

    if (args.toolType === "phq9") {
      if (score >= 20) {
        riskLevel = "high";
        recommendations = [
          "Consider speaking with a mental health professional immediately",
          "Contact your institution's counseling center",
          "Reach out to a trusted friend or family member",
        ];
      } else if (score >= 10) {
        riskLevel = "moderate";
        recommendations = [
          "Consider scheduling an appointment with a counselor",
          "Practice self-care activities",
          "Monitor your symptoms",
        ];
      } else {
        recommendations = [
          "Continue maintaining good mental health habits",
          "Stay connected with friends and family",
        ];
      }
    } else if (args.toolType === "gad7") {
      if (score >= 15) {
        riskLevel = "high";
        recommendations = [
          "Consider speaking with a mental health professional",
          "Practice relaxation techniques",
          "Limit caffeine intake",
        ];
      } else if (score >= 10) {
        riskLevel = "moderate";
        recommendations = [
          "Try stress management techniques",
          "Consider counseling if symptoms persist",
          "Maintain regular sleep schedule",
        ];
      } else {
        recommendations = [
          "Continue current coping strategies",
          "Practice mindfulness when feeling anxious",
        ];
      }
    }

    return await ctx.db.insert("screeningResults", {
      userId: user._id,
      institutionId: (user as any).institutionId,
      toolType: args.toolType,
      score,
      responses: args.responses,
      riskLevel,
      recommendations,
      isAnonymous: args.isAnonymous,
    });
  },
});

export const getUserScreenings = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    return await ctx.db
      .query("screeningResults")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const getInstitutionAnalytics = query({
  args: { institutionId: v.id("institutions") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized");
    }

    const screenings = await ctx.db
      .query("screeningResults")
      .withIndex("by_institution", (q) =>
        q.eq("institutionId", args.institutionId),
      )
      .collect();

    // Aggregate anonymous statistics
    const analytics = {
      totalScreenings: screenings.length,
      riskLevels: {
        low: screenings.filter((s) => s.riskLevel === "low").length,
        moderate: screenings.filter((s) => s.riskLevel === "moderate").length,
        high: screenings.filter((s) => s.riskLevel === "high").length,
      },
      toolUsage: {
        phq9: screenings.filter((s) => s.toolType === "phq9").length,
        gad7: screenings.filter((s) => s.toolType === "gad7").length,
        ghq: screenings.filter((s) => s.toolType === "ghq").length,
      },
      averageScores: {
        phq9:
          screenings
            .filter((s) => s.toolType === "phq9")
            .reduce((sum, s) => sum + s.score, 0) /
            screenings.filter((s) => s.toolType === "phq9").length || 0,
        gad7:
          screenings
            .filter((s) => s.toolType === "gad7")
            .reduce((sum, s) => sum + s.score, 0) /
            screenings.filter((s) => s.toolType === "gad7").length || 0,
        ghq:
          screenings
            .filter((s) => s.toolType === "ghq")
            .reduce((sum, s) => sum + s.score, 0) /
            screenings.filter((s) => s.toolType === "ghq").length || 0,
      },
    };

    return analytics;
  },
});
