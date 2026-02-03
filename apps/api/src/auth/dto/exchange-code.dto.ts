import { z } from "zod";

export const ExchangeCodeSchema = z.object({
  code: z
    .string()
    .min(1, "Authorization code is required")
    .max(100, "Invalid authorization code"),
});

export type ExchangeCode = z.infer<typeof ExchangeCodeSchema>;
