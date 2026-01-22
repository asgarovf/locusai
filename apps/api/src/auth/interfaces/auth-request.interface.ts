import { AuthenticatedUser } from "@locusai/shared";
import { Request } from "express";
import { ApiKey } from "@/entities/api-key.entity";

/**
 * Request with authenticated user context.
 * The user can be either a JWT-authenticated user or an API key.
 */
export interface AuthRequest extends Request {
  user: AuthenticatedUser;
  /** Present only for API key authentication */
  apiKey?: ApiKey;
}

/**
 * JWT payload structure from passport-jwt
 */
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  name: string;
  role: string;
  orgId?: string;
}
