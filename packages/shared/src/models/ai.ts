import { z } from "zod";

export const AIRoleSchema = z.enum(["user", "assistant", "system"]);
export type AIRole = z.infer<typeof AIRoleSchema>;

export const AIArtifactSchema = z.object({
  id: z.string(),
  type: z.enum(["code", "document", "sprint", "task_list", "task"]),
  title: z.string(),
  content: z.string(),
  language: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});
export type AIArtifact = z.infer<typeof AIArtifactSchema>;

export const SuggestedActionSchema = z.object({
  label: z.string(),
  type: z.enum([
    "create_task",
    "create_doc",
    "chat_suggestion",
    "start_sprint",
    "plan_sprint",
  ]),
  payload: z.any(),
});
export type SuggestedAction = z.infer<typeof SuggestedActionSchema>;

export const AIMessageSchema = z.object({
  id: z.string(),
  role: AIRoleSchema,
  content: z.string(),
  timestamp: z
    .union([z.string(), z.number()])
    .or(z.date())
    .or(z.any())
    .optional()
    .transform((val) => (val ? new Date(val) : new Date())),
  thoughtProcess: z.string().optional(),
  artifacts: z.array(AIArtifactSchema).optional(),
  suggestedActions: z.array(SuggestedActionSchema).optional(),
});
export type AIMessage = z.infer<typeof AIMessageSchema>;

export const ChatRequestSchema = z.object({
  message: z.string().min(1, "Message is required"),
  sessionId: z.string().optional(),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const ChatResponseSchema = z.object({
  message: AIMessageSchema,
  sessionId: z.string(),
  history: z.array(AIMessageSchema).optional(),
});
export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export const ShareChatRequestSchema = z.object({
  isShared: z.boolean(),
});
export type ShareChatRequest = z.infer<typeof ShareChatRequestSchema>;
