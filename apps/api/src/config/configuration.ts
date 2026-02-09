import { z } from "zod";

export const ConfigSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(8000),
  DATABASE_URL: z.string(),
  DATABASE_SYNC: z.enum(["true", "false"]).default("false"),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.union([z.string(), z.number()]).default("7d"),
  RESEND_API_KEY: z.string().optional(),
  OTP_EXPIRES_IN_MINUTES: z.coerce.number().default(10),
  CORS_ORIGIN: z.string().default("*"),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
});

export type Config = z.infer<typeof ConfigSchema>;

export default () => {
  const result = ConfigSchema.safeParse(process.env);

  if (!result.success) {
    console.error(
      "❌ Invalid environment variables:",
      z.treeifyError(result.error)
    );
    throw new Error("Invalid api configuration");
  }

  return result.data;
};
