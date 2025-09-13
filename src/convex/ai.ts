"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";

// Add a simple action to ensure the ai module is registered and reachable
export const ping = action({
  args: {},
  handler: async () => {
    return { ok: true, ts: Date.now() };
  },
});

export const chat = action({
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

    // Switch to a widely available model by default for reliability
    const model = args.model ?? "anthropic/claude-3-haiku";
    const max_tokens = args.maxTokens ?? 400;

    // Initialize OpenAI client pointing to OpenRouter with helpful headers
    const openai = new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://localhost", // safe default
        "X-Title": "MindCare",
      },
    });

    // Pass messages straight through; OpenAI SDK supports string or content array for multimodal
    const completion = await openai.chat.completions.create({
      model,
      messages: args.messages as any,
      max_tokens,
      temperature: 0.7,
    });

    // Safe extraction of content supporting both string and multimodal content arrays
    const choice: any = (completion as any).choices?.[0];
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
      model: (completion as any).model || model,
      usage: (completion as any).usage || null,
    };
  },
});
