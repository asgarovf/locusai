/**
 * Authentication Models and Schemas
 */

import { z } from "zod";
import { UserRole } from "../enums";
import { UserSchema } from "./user";

// ============================================================================
// Authenticated User Types (for request context)
// ============================================================================

/**
 * User authenticated via JWT (web dashboard)
 */
export const JwtAuthUserSchema = z.object({
  authType: z.literal("jwt"),
  id: z.uuid(),
  email: z.string().email().max(320),
  name: z.string().max(100),
  role: z.enum(UserRole),
  orgId: z.uuid().nullable().optional(),
  workspaceId: z.uuid().nullable().optional(),
});

export type JwtAuthUser = z.infer<typeof JwtAuthUserSchema>;

/**
 * User authenticated via API Key (CLI/agents)
 * Note: API keys don't have a real user ID - they represent organization-level access
 */
export const ApiKeyAuthUserSchema = z.object({
  authType: z.literal("api_key"),
  apiKeyId: z.string().max(100),
  apiKeyName: z.string().max(100),
  orgId: z.string().max(100).optional(),
  workspaceId: z.string().max(100).optional(),
});

export type ApiKeyAuthUser = z.infer<typeof ApiKeyAuthUserSchema>;

/**
 * Union type for any authenticated request
 */
export const AuthenticatedUserSchema = z.discriminatedUnion("authType", [
  JwtAuthUserSchema,
  ApiKeyAuthUserSchema,
]);

export type AuthenticatedUser = z.infer<typeof AuthenticatedUserSchema>;

/**
 * Type guard to check if user is JWT authenticated
 */
export function isJwtUser(user: AuthenticatedUser): user is JwtAuthUser {
  return user.authType === "jwt";
}

/**
 * Type guard to check if user is API key authenticated
 */
export function isApiKeyUser(user: AuthenticatedUser): user is ApiKeyAuthUser {
  return user.authType === "api_key";
}

/**
 * Get the user ID for event logging. Returns null for API key users.
 * Use this when you need to store a reference to the user in the database.
 */
export function getAuthUserId(user: AuthenticatedUser): string | null {
  return isJwtUser(user) ? user.id : null;
}

// ============================================================================
// Auth Responses
// ============================================================================

export const AuthResponseSchema = z.object({
  token: z.string().max(2000),
  user: UserSchema,
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type LoginResponse = AuthResponse;

// ============================================================================
// OTP-Based Auth (Cloud)
// ============================================================================

export const OtpRequestSchema = z.object({
  email: z.string().email("Invalid email address").max(320),
});

export type OtpRequest = z.infer<typeof OtpRequestSchema>;

export const VerifyOtpSchema = z.object({
  email: z.string().email("Invalid email address").max(320),
  otp: z.string().length(6, "Verification code must be 6 digits"),
});

export type VerifyOtp = z.infer<typeof VerifyOtpSchema>;

export const CompleteRegistrationSchema = z.object({
  email: z.string().email("Invalid email address").max(320),
  otp: z.string().length(6, "Verification code must be 6 digits"),
  name: z.string().min(1, "Name is required").max(100),
  companyName: z.string().max(100).optional(),
  teamSize: z.enum(["solo", "2-10", "11-50", "51-200", "200+"]).optional(),
  userRole: z
    .enum(["developer", "designer", "product_manager", "other"])
    .optional(),
  workspaceName: z.string().max(100).optional(),
  invitedEmails: z.array(z.string().email().max(320)).optional(),
});

export type CompleteRegistration = z.infer<typeof CompleteRegistrationSchema>;

// ============================================================================
// Internal Context & API Keys
// ============================================================================

export const JWTPayloadSchema = z.object({
  sub: z.string().max(100), // User ID
  email: z.string().email().max(320),
  name: z.string().max(100),
  role: z.string().max(50),
  orgId: z.uuid().optional(),
  iat: z.number(),
  exp: z.number(),
});

export type JWTPayload = z.infer<typeof JWTPayloadSchema>;

export const AuthContextSchema = z.object({
  userId: z.string().max(100),
  email: z.string().email().max(320),
  name: z.string().max(100),
  role: z.string().max(50),
  orgId: z.uuid().optional(),
  workspaceId: z.uuid().optional(),
  authType: z.enum(["jwt", "api_key", "local"]),
});

export type AuthContext = z.infer<typeof AuthContextSchema>;

export const APIKeySchema = z.object({
  id: z.string().max(100),
  name: z.string().max(100),
  keyPrefix: z.string().max(50),
  workspaceId: z.string().max(100),
  lastUsedAt: z.number().nullable(),
  createdAt: z.number(),
});

export type APIKey = z.infer<typeof APIKeySchema>;

export const APIKeyCreateResponseSchema = z.object({
  id: z.string().max(100),
  name: z.string().max(100),
  keyPrefix: z.string().max(50),
  key: z.string().max(500),
  createdAt: z.number(),
});

export type APIKeyCreateResponse = z.infer<typeof APIKeyCreateResponseSchema>;

// ============================================================================
// Parameter & Query Schemas
// ============================================================================

export const ApiKeyIdParamSchema = z.object({
  id: z.string().uuid("Invalid API Key ID"),
});

export type ApiKeyIdParam = z.infer<typeof ApiKeyIdParamSchema>;

export const ApiKeyQuerySchema = z.object({
  workspaceId: z.string().uuid("Invalid Workspace ID").optional(),
});

export type ApiKeyQuery = z.infer<typeof ApiKeyQuerySchema>;

export const CreateApiKeySchema = z.object({
  workspaceId: z.string().uuid("Invalid Workspace ID").optional(),
  name: z.string().min(1, "Name is required").max(100),
  expiresInDays: z.number().int().positive().optional(),
});

export type CreateApiKey = z.infer<typeof CreateApiKeySchema>;
