import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { appointmentStatusValidator } from "./schema";
import { action } from "./_generated/server";

export const create = mutation({
  args: {
    counsellorId: v.id("counsellors"),
    scheduledDate: v.string(),
    timeSlot: v.string(),
    notes: v.optional(v.string()),
    isAnonymous: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    // Allow first-time users with no role to become "student" automatically
    if (!user) {
      throw new Error("Only students can book appointments");
    }
    if (user.role !== "student") {
      if (user.role == null) {
        await ctx.db.patch(user._id, { role: "student", isAnonymous: false });
      } else {
        throw new Error("Only students can book appointments");
      }
    }

    const counsellor = await ctx.db.get(args.counsellorId);
    if (!counsellor) throw new Error("Counsellor not found");

    // Check if slot is available
    const existingAppointment = await ctx.db
      .query("appointments")
      .withIndex("by_counsellor", (q) =>
        q.eq("counsellorId", args.counsellorId),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("scheduledDate"), args.scheduledDate),
          q.eq(q.field("timeSlot"), args.timeSlot),
          q.neq(q.field("status"), "cancelled"),
        ),
      )
      .first();

    if (existingAppointment) {
      throw new Error("Time slot is already booked");
    }

    return await ctx.db.insert("appointments", {
      studentId: user._id,
      counsellorId: args.counsellorId,
      institutionId: counsellor.institutionId,
      scheduledDate: args.scheduledDate,
      timeSlot: args.timeSlot,
      status: "pending",
      notes: args.notes,
      isAnonymous: args.isAnonymous,
    });
  },
});

export const listByStudent = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_student", (q) => q.eq("studentId", user._id))
      .collect();

    // Get counsellor details for each appointment
    const appointmentsWithDetails = await Promise.all(
      appointments.map(async (appointment) => {
        const counsellor = await ctx.db.get(appointment.counsellorId);
        const counsellorUser = counsellor
          ? await ctx.db.get(counsellor.userId)
          : null;

        return {
          ...appointment,
          counsellor: counsellor
            ? {
                ...counsellor,
                user: counsellorUser,
              }
            : null,
        };
      }),
    );

    return appointmentsWithDetails;
  },
});

export const listByCounsellor = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "counsellor") {
      throw new Error("Unauthorized");
    }

    // Find counsellor record
    const counsellor = await ctx.db
      .query("counsellors")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!counsellor) throw new Error("Counsellor profile not found");

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_counsellor", (q) => q.eq("counsellorId", counsellor._id))
      .collect();

    // Get student details (anonymized if needed) and include recent screening results
    const appointmentsWithDetails = await Promise.all(
      appointments.map(async (appointment) => {
        const student = await ctx.db.get(appointment.studentId);

        // Recent screenings for this student (limit 5)
        const screenings = student
          ? await ctx.db
              .query("screeningResults")
              .withIndex("by_user", (q) => q.eq("userId", student._id))
              .order("desc")
              .collect()
          : [];

        // Previous appointments for this student (limit 5), excluding the current appointment
        const previousAppointments = await ctx.db
          .query("appointments")
          .withIndex("by_student", (q) =>
            q.eq("studentId", appointment.studentId),
          )
          .order("desc")
          .collect();

        const filteredPrevious = previousAppointments
          .filter((a) => String(a._id) !== String(appointment._id))
          .slice(0, 5);

        return {
          ...appointment,
          student: appointment.isAnonymous
            ? {
                name: "Anonymous Student",
                email: "anonymous@student.com",
              }
            : student,
          screenings,
          previousSessions: filteredPrevious,
        };
      }),
    );

    return appointmentsWithDetails;
  },
});

/**
 * Alias for older clients: list active counsellors for the user's institution.
 * Mirrors `listAvailable` so both names work.
 */
export const listAvailableCounsellors = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // If user has no institution, fallback to first institution (demo-friendly)
    let institutionId = user.institutionId ?? null;
    if (!institutionId) {
      const firstInstitution = await ctx.db.query("institutions").first();
      if (!firstInstitution) return [];
      institutionId = firstInstitution._id as any;
    }

    const counsellors = await ctx.db
      .query("counsellors")
      .withIndex("by_institution", (q) => q.eq("institutionId", institutionId!))
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

export const listAvailable = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // If user has no institution, fallback to first institution (demo-friendly)
    let institutionId = user.institutionId ?? null;
    if (!institutionId) {
      const firstInstitution = await ctx.db.query("institutions").first();
      if (!firstInstitution) return [];
      institutionId = firstInstitution._id as any;
    }

    const counsellors = await ctx.db
      .query("counsellors")
      .withIndex("by_institution", (q) => q.eq("institutionId", institutionId!))
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

export const updateStatus = mutation({
  args: {
    appointmentId: v.id("appointments"),
    status: appointmentStatusValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new Error("Appointment not found");

    // Check authorization
    if (user.role === "student" && appointment.studentId !== user._id) {
      throw new Error("Unauthorized");
    }

    if (user.role === "counsellor") {
      const counsellor = await ctx.db
        .query("counsellors")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();

      if (!counsellor || appointment.counsellorId !== counsellor._id) {
        throw new Error("Unauthorized");
      }
    }

    await ctx.db.patch(args.appointmentId, {
      status: args.status,
    });
  },
});

export const cancel = mutation({
  args: {
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new Error("Appointment not found");

    // Check authorization
    if (user.role === "student" && appointment.studentId !== user._id) {
      throw new Error("Unauthorized");
    }

    if (user.role === "counsellor") {
      const counsellor = await ctx.db
        .query("counsellors")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();

      if (!counsellor || appointment.counsellorId !== counsellor._id) {
        throw new Error("Unauthorized");
      }
    }

    await ctx.db.patch(args.appointmentId, {
      status: "cancelled",
    });
  },
});

// Submit pre-session form by student for a given appointment
export const submitPreSessionForm = mutation({
  args: {
    appointmentId: v.id("appointments"),
    generalQueries: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new Error("Appointment not found");

    // Only the student of the appointment can submit
    if (appointment.studentId !== user._id) {
      throw new Error("Unauthorized");
    }

    // Allow form submission only for pending/confirmed upcoming sessions
    const isUpcoming =
      new Date(appointment.scheduledDate).getTime() >= new Date().getTime();
    if (!["pending", "confirmed"].includes(appointment.status) || !isUpcoming) {
      throw new Error("Form is only available for upcoming sessions");
    }

    await ctx.db.patch(args.appointmentId, {
      preSessionForm: { generalQueries: args.generalQueries },
    });
  },
});

// Add session result/diagnosis by counsellor or admin
export const addSessionResult = mutation({
  args: {
    appointmentId: v.id("appointments"),
    sessionNotes: v.optional(v.string()),
    diagnosis: v.optional(v.string()),
    followUp: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new Error("Appointment not found");

    // Only counsellor of this appointment or admin can add results
    if (user.role === "counsellor") {
      const counsellor = await ctx.db
        .query("counsellors")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
      if (!counsellor || appointment.counsellorId !== counsellor._id) {
        throw new Error("Unauthorized");
      }
    } else if (user.role !== "admin") {
      throw new Error("Unauthorized");
    }

    // Enrich appointment with latest screening summary for the student (if any)
    let screeningSummary = null as any;
    try {
      const latest = await ctx.db
        .query("screeningResults")
        .withIndex("by_user", (q) => q.eq("userId", appointment.studentId))
        .order("desc")
        .first();
      if (latest) {
        screeningSummary = {
          _id: latest._id,
          toolType: latest.toolType,
          score: latest.score,
          riskLevel: latest.riskLevel,
          recommendations: latest.recommendations,
          _creationTime: latest._creationTime,
        };
      }
    } catch (e) {
      // ignore
    }

    // Build audit entry
    const auditEntry = {
      by: user._id,
      byName: user.name ?? null,
      role: user.role ?? null,
      when: Date.now(),
      action: "completed_session",
      changes: {
        sessionNotes: args.sessionNotes ?? null,
        diagnosis: args.diagnosis ?? null,
        followUp: args.followUp ?? null,
      },
    };

    const existingAudit = (appointment as any).sessionAudit ?? [];
    const newAudit = [...existingAudit, auditEntry];

    await ctx.db.patch(args.appointmentId, {
      sessionNotes: args.sessionNotes,
      diagnosis: args.diagnosis,
      followUp: args.followUp,
      status: "completed",
      // store custom fields as `any` to avoid strict schema validation in TS
      sessionAudit: newAudit as any,
      screeningSummary: (screeningSummary ??
        (appointment as any).screeningSummary ??
        null) as any,
    } as any);
  },
});

export const clearPreSessionForm = mutation({
  args: {
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new Error("Appointment not found");

    // Only the student of the appointment can clear
    if (appointment.studentId !== user._id) {
      throw new Error("Unauthorized");
    }

    // Allow clearing only for pending/confirmed upcoming sessions
    const isUpcoming =
      new Date(appointment.scheduledDate).getTime() >= new Date().getTime();
    if (!["pending", "confirmed"].includes(appointment.status) || !isUpcoming) {
      throw new Error("Form is only available for upcoming sessions");
    }

    await ctx.db.patch(args.appointmentId, {
      preSessionForm: undefined,
    });
  },
});

export const aiChat = action({
  args: {
    messages: v.array(
      v.object({
        role: v.union(
          v.literal("system"),
          v.literal("user"),
          v.literal("assistant"),
        ),
        content: v.union(
          v.string(),
          v.array(
            v.union(
              v.object({
                type: v.literal("text"),
                text: v.string(),
              }),
              v.object({
                type: v.literal("image_url"),
                image_url: v.object({
                  url: v.string(),
                }),
              }),
            ),
          ),
        ),
      }),
    ),
    model: v.optional(v.string()),
    maxTokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OpenRouter API key not configured.");
    }

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://localhost",
        "X-Title": "MindCare",
      },
      body: JSON.stringify({
        model: args.model ?? "anthropic/claude-3-haiku",
        messages: args.messages as any,
        max_tokens: args.maxTokens ?? 400,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`OpenRouter error: ${res.status} ${errorText}`);
    }

    const data: any = await res.json();
    const choice: any = data?.choices?.[0];
    const msg: any = choice?.message ?? {};
    const rawContent: any = msg?.content;
    let content = "";

    if (typeof rawContent === "string") {
      content = rawContent;
    } else if (Array.isArray(rawContent)) {
      try {
        content = rawContent
          .map((part: any) => {
            if (!part) return "";
            if (typeof part === "string") return part;
            if (part.type === "text") return part.text ?? "";
            return "";
          })
          .join("")
          .trim();
      } catch {
        content = JSON.stringify(rawContent);
      }
    } else if (rawContent != null) {
      try {
        content = String(rawContent);
      } catch {
        content = "";
      }
    }

    return {
      content: content || "Sorry, I couldn't generate a response.",
      model: data?.model || (args.model ?? "anthropic/claude-3-haiku"),
      usage: data?.usage || null,
    };
  },
});
