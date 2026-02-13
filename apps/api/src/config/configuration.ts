import { z } from "zod";

const INSECURE_JWT_SECRETS = ["secret", "changeme", "jwt_secret"];

export const ConfigSchema = z
  .object({
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
    // Rate limiting
    THROTTLE_TTL: z.coerce.number().default(60),
    THROTTLE_LIMIT: z.coerce.number().default(100),

    // Account lockout
    LOCKOUT_MAX_ATTEMPTS: z.coerce.number().default(5),
    LOCKOUT_WINDOW_MINUTES: z.coerce.number().default(15),
    LOCKOUT_DURATION_MINUTES: z.coerce.number().default(30),

    // OTP security
    OTP_MAX_ATTEMPTS: z.coerce.number().default(5),
    // Swagger docs
    SWAGGER_DOCS_ENABLED: z.enum(["true", "false"]).default("false"),
    SWAGGER_DOCS_USERNAME: z.string().optional(),
    SWAGGER_DOCS_PASSWORD: z.string().optional(),
  })
  .superRefine((config, ctx) => {
    if (config.SWAGGER_DOCS_ENABLED !== "true") {
      return;
    }

    if (!config.SWAGGER_DOCS_USERNAME?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SWAGGER_DOCS_USERNAME"],
        message:
          "SWAGGER_DOCS_USERNAME is required when SWAGGER_DOCS_ENABLED=true",
      });
    }

    if (!config.SWAGGER_DOCS_PASSWORD?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SWAGGER_DOCS_PASSWORD"],
        message:
          "SWAGGER_DOCS_PASSWORD is required when SWAGGER_DOCS_ENABLED=true",
      });
    }
  });

export type Config = z.infer<typeof ConfigSchema>;

function validateSecurityConfig(config: Config): void {
  const isProduction = config.NODE_ENV === "production";

  // Reject insecure JWT secrets
  if (INSECURE_JWT_SECRETS.includes(config.JWT_SECRET.toLowerCase())) {
    throw new Error(
      "JWT_SECRET is set to a known insecure default. Please use a strong, unique secret."
    );
  }

  // Production-specific warnings
  if (isProduction && config.CORS_ORIGIN === "*") {
    console.warn(
      "⚠️  [Security] CORS_ORIGIN is set to '*' in production. Consider restricting to specific origins."
    );
  }

  if (isProduction && config.DATABASE_SYNC === "true") {
    console.warn(
      "⚠️  [Security] DATABASE_SYNC is enabled in production. This can cause data loss. Set DATABASE_SYNC=false."
    );
  }
}

function logSecuritySummary(config: Config): void {
  const lines = [
    "🔒 Security Configuration Summary:",
    `   Rate Limiting: ${config.THROTTLE_LIMIT} requests per ${config.THROTTLE_TTL}s`,
    `   CORS Origin: ${config.CORS_ORIGIN === "*" ? "wildcard (*)" : "restricted"}`,
    `   Account Lockout: ${config.LOCKOUT_MAX_ATTEMPTS} attempts within ${config.LOCKOUT_WINDOW_MINUTES}min, locked for ${config.LOCKOUT_DURATION_MINUTES}min`,
    `   OTP Max Attempts: ${config.OTP_MAX_ATTEMPTS}`,
    `   Database Sync: ${config.DATABASE_SYNC}`,
  ];
  console.log(lines.join("\n"));
}

export default () => {
  const result = ConfigSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
      .join("; ");
    console.error(
      "❌ Invalid environment variables:",
      z.treeifyError(result.error)
    );
    throw new Error(`Invalid api configuration: ${issues}`);
  }

  validateSecurityConfig(result.data);
  logSecuritySummary(result.data);

  return result.data;
};
