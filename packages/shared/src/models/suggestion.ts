import { z } from "zod";

// ============================================================================
// Enums
// ============================================================================

export enum SuggestionStatus {
  NEW = "NEW",
  NOTIFIED = "NOTIFIED",
  ACTED_ON = "ACTED_ON",
  SKIPPED = "SKIPPED",
  EXPIRED = "EXPIRED",
}

export enum SuggestionType {
  CODE_FIX = "CODE_FIX",
  DEPENDENCY_UPDATE = "DEPENDENCY_UPDATE",
  NEXT_STEP = "NEXT_STEP",
  REFACTOR = "REFACTOR",
  TEST_FIX = "TEST_FIX",
}

// ============================================================================
// Constants
// ============================================================================

export const SUGGESTION_TTL_HOURS = 24;

// ============================================================================
// Schemas
// ============================================================================

export const SuggestionSchema = z.object({
  id: z.string(),
  type: z.enum(SuggestionType),
  status: z.enum(SuggestionStatus),
  title: z.string(),
  description: z.string(),
  jobRunId: z.string().optional(),
  workspaceId: z.string(),
  createdAt: z.string(),
  expiresAt: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type Suggestion = z.infer<typeof SuggestionSchema>;
