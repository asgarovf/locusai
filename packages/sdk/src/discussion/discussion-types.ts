import { z } from "zod";

// ============================================================================
// Zod Schemas
// ============================================================================

export const DiscussionMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.number(),
});

export const DiscussionInsightSchema = z.object({
  id: z.string(),
  type: z.enum(["decision", "requirement", "idea", "concern", "learning"]),
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string(),
});

export const DiscussionSchema = z.object({
  id: z.string(),
  title: z.string(),
  topic: z.string(),
  status: z.enum(["active", "completed", "archived"]).default("active"),
  messages: z.array(DiscussionMessageSchema).default([]),
  insights: z.array(DiscussionInsightSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
  metadata: z.object({
    model: z.string(),
    provider: z.string(),
  }),
});

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface DiscussionMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface DiscussionInsight {
  id: string;
  type: "decision" | "requirement" | "idea" | "concern" | "learning";
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
}

export interface Discussion {
  id: string;
  title: string;
  topic: string;
  status: "active" | "completed" | "archived";
  messages: DiscussionMessage[];
  insights: DiscussionInsight[];
  createdAt: string;
  updatedAt: string;
  metadata: {
    model: string;
    provider: string;
  };
}
