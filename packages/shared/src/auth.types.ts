/**
 * Authentication Types
 *
 * Types for JWT tokens, auth context, and session management.
 */

/**
 * JWT token payload structure
 */
export interface JWTPayload {
  sub: string; // User ID
  email: string;
  name: string;
  role: string;
  orgId?: string; // Current organization context
  iat: number; // Issued at
  exp: number; // Expiration
}

/**
 * API Key payload extracted from the key
 */
export interface APIKeyPayload {
  userId: string;
  projectId: string;
  keyId: string;
}

/**
 * Auth context available in request handlers
 */
export interface AuthContext {
  userId: string;
  email: string;
  name: string;
  role: string;
  orgId?: string;
  projectId?: string;
  /** Source of authentication */
  authType: "jwt" | "api_key" | "local";
}

/**
 * Login request body
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Login response
 */
export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

/**
 * Register request body
 */
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

/**
 * Token refresh request
 */
export interface RefreshTokenRequest {
  token: string;
}

/**
 * API Key creation response (includes the raw key only once)
 */
export interface APIKeyCreateResponse {
  id: string;
  name: string;
  keyPrefix: string;
  /** The full API key - only shown once at creation time */
  key: string;
  createdAt: number;
}
