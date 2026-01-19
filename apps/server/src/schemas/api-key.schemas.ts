/**
 * API Key Schemas
 */

import { z } from "zod";

export const CreateApiKeyRequestSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(100),
  expiresInDays: z.number().int().positive().optional(),
});

export type CreateApiKeyRequest = z.infer<typeof CreateApiKeyRequestSchema>;
