/**
 * CI Schemas
 */

import { z } from "zod";

export const RecordCiRequestSchema = z.object({
  taskId: z.coerce.number().int(),
  projectId: z.string().uuid(),
  result: z.object({
    ok: z.boolean(),
    summary: z.string(),
    commands: z.array(
      z.object({
        cmd: z.string(),
        exitCode: z.number(),
        durationMs: z.number().optional(),
        error: z.string().optional(),
      })
    ),
    preset: z.string(),
  }),
});

export type RecordCiRequest = z.infer<typeof RecordCiRequestSchema>;
