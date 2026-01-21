import { z } from "zod";

export const ConfigSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(8000),
  DATABASE_URL: z.string(),
  DATABASE_SYNC: z.enum(["true", "false"]).default("false"),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("7d") as z.ZodType<"7d">,
  RESEND_API_KEY: z.string(),
  OTP_EXPIRES_IN_MINUTES: z.coerce.number().default(10),
  CORS_ORIGIN: z.string().default("*"),
});

export type Config = z.infer<typeof ConfigSchema>;

export default () => {
  const result = ConfigSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables:", result.error.format());
    throw new Error("Invalid api configuration");
  }

  return result.data;
};
