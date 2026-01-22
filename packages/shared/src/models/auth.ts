/**
 * Authentication Models and Schemas
 */

import { z } from "zod";
import { UserSchema } from "./user";

// ============================================================================
// Auth Responses
// ============================================================================

export const AuthResponseSchema = z.object({
  token: z.string(),
  user: UserSchema,
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type LoginResponse = AuthResponse;

// ============================================================================
// OTP-Based Auth (Cloud)
// ============================================================================

export const OtpRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export type OtpRequest = z.infer<typeof OtpRequestSchema>;

export const VerifyOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "Verification code must be 6 digits"),
});

export type VerifyOtp = z.infer<typeof VerifyOtpSchema>;

export const CompleteRegistrationSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "Verification code must be 6 digits"),
  name: z.string().min(1, "Name is required").max(100),
  companyName: z.string().max(100).optional(),
  teamSize: z.enum(["solo", "2-10", "11-50", "51-200", "200+"]).optional(),
  userRole: z
    .enum(["developer", "designer", "product_manager", "other"])
    .optional(),
  workspaceName: z.string().max(100).optional(),
  invitedEmails: z.array(z.string().email()).optional(),
});

export type CompleteRegistration = z.infer<typeof CompleteRegistrationSchema>;

// ============================================================================
// Internal Context & API Keys
// ============================================================================

export const JWTPayloadSchema = z.object({
  sub: z.string(), // User ID
  email: z.string().email(),
  name: z.string(),
  role: z.string(),
  orgId: z.string().uuid().optional(),
  iat: z.number(),
  exp: z.number(),
});

export type JWTPayload = z.infer<typeof JWTPayloadSchema>;

export const AuthContextSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.string(),
  orgId: z.string().uuid().optional(),
  workspaceId: z.string().uuid().optional(),
  authType: z.enum(["jwt", "api_key", "local"]),
});

export type AuthContext = z.infer<typeof AuthContextSchema>;

export const APIKeySchema = z.object({
  id: z.string(),
  name: z.string(),
  keyPrefix: z.string(),
  workspaceId: z.string(),
  lastUsedAt: z.number().nullable(),
  createdAt: z.number(),
});

export type APIKey = z.infer<typeof APIKeySchema>;

export const APIKeyCreateResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  keyPrefix: z.string(),
  key: z.string(),
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
