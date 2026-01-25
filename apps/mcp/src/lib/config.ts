import { z } from "zod";

export const ConfigSchema = z.object({
  LOCUS_API_KEY: z.string().min(1, "LOCUS_API_KEY is required"),
  LOCUS_WORKSPACE_ID: z.string().min(1, "LOCUS_WORKSPACE_ID is required"),
  LOCUS_API_URL: z.string().default("https://api.locusai.dev/api"),
  ANTHROPIC_API_KEY: z.string().optional(),
  PORT: z.coerce.number().default(3000), // Useful if we ever switch to SSE/HTTP
});

export type Config = z.infer<typeof ConfigSchema>;

let cachedConfig: Config | null = null;

export function loadConfig(): Config {
  if (cachedConfig) return cachedConfig;

  const result = ConfigSchema.safeParse(process.env);

  if (!result.success) {
    const errorMsg = result.error;
    throw new Error(`Configuration validation failed:\n${errorMsg}`);
  }

  cachedConfig = result.data;
  return cachedConfig;
}
