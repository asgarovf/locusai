/**
 * Doc Schemas
 */

import { z } from "zod";

export const WriteDocRequestSchema = z.object({
  path: z.string().min(1, "Path is required"),
  content: z.string(),
  projectId: z.string().optional(),
});

export type WriteDocRequest = z.infer<typeof WriteDocRequestSchema>;
