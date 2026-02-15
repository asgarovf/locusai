import { z } from "zod";

// ============================================================================
// Context Payloads
// ============================================================================

/**
 * Active file context — path and optional language identifier.
 */
export const ActiveFileContextSchema = z.object({
  filePath: z.string(),
  languageId: z.string().optional(),
});

export type ActiveFileContext = z.infer<typeof ActiveFileContextSchema>;

/**
 * Text selection within a file.
 */
export const SelectionContextSchema = z.object({
  filePath: z.string(),
  languageId: z.string().optional(),
  startLine: z.number().int().min(0),
  startColumn: z.number().int().min(0),
  endLine: z.number().int().min(0),
  endColumn: z.number().int().min(0),
  text: z.string(),
});

export type SelectionContext = z.infer<typeof SelectionContextSchema>;

/**
 * Workspace context — root path of the current workspace.
 */
export const WorkspaceContextSchema = z.object({
  rootPath: z.string(),
  name: z.string().optional(),
});

export type WorkspaceContext = z.infer<typeof WorkspaceContextSchema>;

/**
 * Composite context payload attached to prompt submissions.
 * All fields are optional since context availability varies by command.
 */
export const ContextPayloadSchema = z.object({
  workspace: WorkspaceContextSchema.optional(),
  activeFile: ActiveFileContextSchema.optional(),
  selection: SelectionContextSchema.optional(),
});

export type ContextPayload = z.infer<typeof ContextPayloadSchema>;
