import { z } from "zod";

export const RecordCiSchema = z.object({
  taskId: z.uuid(),
  workspaceId: z.uuid(),
  result: z.object({
    ok: z.boolean(),
    summary: z.string().max(5000),
    commands: z.array(
      z.object({
        cmd: z.string().max(1000),
        exitCode: z.number(),
        durationMs: z.number().optional(),
        error: z.string().max(5000).optional(),
      })
    ),
    preset: z.string().max(100),
  }),
});

export type RecordCi = z.infer<typeof RecordCiSchema>;
