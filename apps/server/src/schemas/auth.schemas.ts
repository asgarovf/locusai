/**
 * Auth Schemas
 *
 * Request and response schemas for authentication endpoints.
 */

import { z } from "zod";

// ============================================================================
// Request Schemas
// ============================================================================

export const RegisterRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long"),
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
});

export const LoginRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const CreateAPIKeyRequestSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
});

// OTP-Based Authentication Schemas
export const RegisterWithOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const VerifyOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export const CompleteRegistrationSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 digits"),
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  companyName: z.string().max(100).optional(),
  teamSize: z.enum(["solo", "2-10", "11-50", "51-200", "200+"]).optional(),
  userRole: z
    .enum(["developer", "designer", "product_manager", "other"])
    .optional(),
});

export const ResendOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const UserResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.string(),
  avatarUrl: z.string().nullable(),
});

export const RegisterResponseSchema = z.object({
  success: z.literal(true),
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
  }),
});

export const LoginResponseSchema = z.object({
  success: z.literal(true),
  token: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    role: z.string(),
  }),
});

export const APIKeyResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  keyPrefix: z.string(),
  projectId: z.string(),
  lastUsedAt: z.number().nullable(),
  createdAt: z.number(),
});

export const CreateAPIKeyResponseSchema = z.object({
  success: z.literal(true),
  apiKey: z.object({
    id: z.string(),
    name: z.string(),
    keyPrefix: z.string(),
    key: z.string(), // Only shown at creation
    createdAt: z.number(),
  }),
  warning: z.string(),
});

export const ListAPIKeysResponseSchema = z.object({
  success: z.literal(true),
  apiKeys: z.array(APIKeyResponseSchema),
});

// ============================================================================
// Type Exports
// ============================================================================

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type CreateAPIKeyRequest = z.infer<typeof CreateAPIKeyRequestSchema>;

export type RegisterWithOtpRequest = z.infer<typeof RegisterWithOtpSchema>;
export type VerifyOtpRequest = z.infer<typeof VerifyOtpSchema>;
export type CompleteRegistrationRequest = z.infer<
  typeof CompleteRegistrationSchema
>;
export type ResendOtpRequest = z.infer<typeof ResendOtpSchema>;

export type UserResponse = z.infer<typeof UserResponseSchema>;
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type APIKeyResponse = z.infer<typeof APIKeyResponseSchema>;
export type CreateAPIKeyResponse = z.infer<typeof CreateAPIKeyResponseSchema>;
export type ListAPIKeysResponse = z.infer<typeof ListAPIKeysResponseSchema>;
