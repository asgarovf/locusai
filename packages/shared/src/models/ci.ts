import { z } from "zod";

export const RecordCiSchema = z.object({
  taskId: z.uuid(),
  workspaceId: z.uuid(),
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

export type RecordCi = z.infer<typeof RecordCiSchema>;
