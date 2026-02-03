import { z } from "zod";

export const AIRoleSchema = z.enum(["user", "assistant", "system"]);
export type AIRole = z.infer<typeof AIRoleSchema>;

export const AIArtifactSchema = z.object({
  id: z.string().max(100),
  type: z.enum(["code", "document"]),
  title: z.string().max(255),
  content: z.string().max(100000),
  language: z.string().max(50).optional(),
  metadata: z.record(z.string().max(100), z.any()).optional(),
});
export type AIArtifact = z.infer<typeof AIArtifactSchema>;

export const SuggestedActionSchema = z.object({
  label: z.string().max(255),
  type: z.enum(["chat_suggestion", "create_doc"]),
  payload: z.any(),
});
export type SuggestedAction = z.infer<typeof SuggestedActionSchema>;

export const AIMessageSchema = z.object({
  id: z.string().max(100),
  role: AIRoleSchema,
  content: z.string().max(100000),
  timestamp: z
    .union([z.string().max(100), z.number()])
    .or(z.date())
    .or(z.any())
    .optional()
    .transform((val) => (val ? new Date(val) : new Date())),
  thoughtProcess: z.string().max(50000).optional(),
  artifacts: z.array(AIArtifactSchema).optional(),
  suggestedActions: z.array(SuggestedActionSchema).optional(),
});
export type AIMessage = z.infer<typeof AIMessageSchema>;

export const ChatRequestSchema = z.object({
  message: z.string().min(1, "Message is required").max(50000),
  sessionId: z.string().max(100).optional(),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const ChatResponseSchema = z.object({
  message: AIMessageSchema,
  sessionId: z.string().max(100),
  history: z.array(AIMessageSchema).optional(),
});
export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export const ShareChatRequestSchema = z.object({
  isShared: z.boolean(),
});
export type ShareChatRequest = z.infer<typeof ShareChatRequestSchema>;
