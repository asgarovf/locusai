import { z } from "zod";

const ConfigSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:8000/api"),
});

export type Config = z.infer<typeof ConfigSchema>;

function loadConfig(): Config {
  // Safe parse for Next.js environment variables
  const result = ConfigSchema.safeParse({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  });

  if (!result.success) {
    console.error("❌ Invalid environment variables:", result.error.format());
    return {
      NEXT_PUBLIC_API_URL: "http://localhost:3080/api",
    } as Config;
  }

  return result.data;
}

export const config = loadConfig();
