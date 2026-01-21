import { z } from "zod";

export const LockSchema = z.object({
  agentId: z.string().min(1),
  ttlSeconds: z.number().positive(),
});

export const UnlockSchema = z.object({
  agentId: z.string().min(1),
});

export type Lock = z.infer<typeof LockSchema>;
export type Unlock = z.infer<typeof UnlockSchema>;
