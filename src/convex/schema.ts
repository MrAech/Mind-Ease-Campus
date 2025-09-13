import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  STUDENT: "student",
  COUNSELLOR: "counsellor",
  PEER_VOLUNTEER: "peer_volunteer",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.STUDENT),
  v.literal(ROLES.COUNSELLOR),
  v.literal(ROLES.PEER_VOLUNTEER),
);
export type Role = Infer<typeof roleValidator>;

// Appointment status types
export const APPOINTMENT_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export const appointmentStatusValidator = v.union(
  v.literal(APPOINTMENT_STATUS.PENDING),
  v.literal(APPOINTMENT_STATUS.CONFIRMED),
  v.literal(APPOINTMENT_STATUS.COMPLETED),
  v.literal(APPOINTMENT_STATUS.CANCELLED),
);

// Resource types
export const RESOURCE_TYPES = {
  VIDEO: "video",
  AUDIO: "audio",
  GUIDE: "guide",
  ARTICLE: "article",
} as const;

export const resourceTypeValidator = v.union(
  v.literal(RESOURCE_TYPES.VIDEO),
  v.literal(RESOURCE_TYPES.AUDIO),
  v.literal(RESOURCE_TYPES.GUIDE),
  v.literal(RESOURCE_TYPES.ARTICLE),
);

// Screening tool types
export const SCREENING_TOOLS = {
  PHQ9: "phq9",
  GAD7: "gad7",
  GHQ: "ghq",
} as const;

export const screeningToolValidator = v.union(
  v.literal(SCREENING_TOOLS.PHQ9),
  v.literal(SCREENING_TOOLS.GAD7),
  v.literal(SCREENING_TOOLS.GHQ),
);

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
      languagePreference: v.optional(v.string()), // preferred language
      institutionId: v.optional(v.id("institutions")), // institution they belong to
      anonymousId: v.optional(v.string()), // anonymous identifier for privacy
    })
      .index("email", ["email"]) // index for the email. do not remove or modify
      .index("by_institution", ["institutionId"])
      .index("by_role", ["role"]),

    // Institutions table for multi-tenancy
    institutions: defineTable({
      name: v.string(),
      domain: v.string(), // email domain for auto-assignment
      settings: v.object({
        supportedLanguages: v.array(v.string()),
        primaryColor: v.optional(v.string()),
        logo: v.optional(v.string()),
      }),
      isActive: v.boolean(),
    }).index("by_domain", ["domain"]),

    // Counsellors table
    counsellors: defineTable({
      userId: v.id("users"),
      institutionId: v.id("institutions"),
      specialization: v.array(v.string()), // e.g., ["anxiety", "depression", "academic_stress"]
      bio: v.optional(v.string()),
      qualifications: v.optional(v.string()),
      availability: v.object({
        monday: v.array(v.string()), // time slots like ["09:00", "10:00"]
        tuesday: v.array(v.string()),
        wednesday: v.array(v.string()),
        thursday: v.array(v.string()),
        friday: v.array(v.string()),
        saturday: v.array(v.string()),
        sunday: v.array(v.string()),
      }),
      isActive: v.boolean(),
    })
      .index("by_institution", ["institutionId"])
      .index("by_user", ["userId"]),

    // Appointments table
    appointments: defineTable({
      studentId: v.id("users"),
      counsellorId: v.id("counsellors"),
      institutionId: v.id("institutions"),
      scheduledDate: v.string(), // ISO date string
      timeSlot: v.string(), // e.g., "14:00"
      status: appointmentStatusValidator,
      notes: v.optional(v.string()),
      isAnonymous: v.boolean(), // for privacy
      // Added fields for session results and diagnostics
      sessionNotes: v.optional(v.string()),
      diagnosis: v.optional(v.string()),
      followUp: v.optional(v.string()),
      preSessionForm: v.optional(
        v.object({
          generalQueries: v.string(),
        }),
      ),
    })
      .index("by_student", ["studentId"])
      .index("by_counsellor", ["counsellorId"])
      .index("by_institution", ["institutionId"])
      .index("by_date", ["scheduledDate"]),

    // Resources table
    resources: defineTable({
      title: v.string(),
      description: v.string(),
      type: resourceTypeValidator,
      content: v.string(), // URL or content text
      language: v.string(),
      tags: v.array(v.string()), // for categorization
      institutionId: v.optional(v.id("institutions")), // null for global resources
      createdBy: v.id("users"),
      isPublished: v.boolean(),
      viewCount: v.number(),
    })
      .index("by_type", ["type"])
      .index("by_language", ["language"])
      .index("by_institution", ["institutionId"])
      .index("by_published", ["isPublished"]),

    // Forum posts table
    forumPosts: defineTable({
      userId: v.id("users"),
      institutionId: v.id("institutions"),
      title: v.string(),
      content: v.string(),
      isAnonymous: v.boolean(),
      tags: v.array(v.string()),
      parentId: v.optional(v.id("forumPosts")), // for replies
      isModerated: v.boolean(),
      isHidden: v.boolean(),
      likeCount: v.number(),
      replyCount: v.number(),
    })
      .index("by_institution", ["institutionId"])
      .index("by_user", ["userId"])
      .index("by_parent", ["parentId"])
      .index("by_moderated", ["isModerated"]),

    // Forum likes table
    forumLikes: defineTable({
      userId: v.id("users"),
      postId: v.id("forumPosts"),
    })
      .index("by_user_post", ["userId", "postId"])
      .index("by_post", ["postId"]),

    // Screening results table
    screeningResults: defineTable({
      userId: v.id("users"),
      institutionId: v.id("institutions"),
      toolType: screeningToolValidator,
      score: v.number(),
      responses: v.array(v.number()), // individual question responses
      riskLevel: v.string(), // "low", "moderate", "high"
      recommendations: v.array(v.string()),
      isAnonymous: v.boolean(),
    })
      .index("by_user", ["userId"])
      .index("by_institution", ["institutionId"])
      .index("by_tool", ["toolType"]),

    // Chat conversations table
    chatConversations: defineTable({
      userId: v.id("users"),
      institutionId: v.id("institutions"),
      isActive: v.boolean(),
      lastMessageAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_institution", ["institutionId"]),

    // Chat messages table
    chatMessages: defineTable({
      conversationId: v.id("chatConversations"),
      content: v.string(),
      isFromBot: v.boolean(),
      messageType: v.optional(v.string()), // "text", "resource_suggestion", "referral"
      metadata: v.optional(
        v.object({
          resourceId: v.optional(v.id("resources")),
          counsellorId: v.optional(v.id("counsellors")),
          urgencyLevel: v.optional(v.string()),
        }),
      ),
    }).index("by_conversation", ["conversationId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
