/**
 * Password Hashing Utilities
 *
 * Uses bcryptjs for secure password hashing.
 */

import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a cryptographically secure random string
 */
export function generateSecureToken(length = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generate an API key with a prefix
 * Format: lk_<random_hex>
 */
export function generateAPIKey(): { key: string; prefix: string } {
  const randomPart = generateSecureToken(24); // 48 hex chars
  const key = `lk_${randomPart}`;
  const prefix = key.substring(0, 11); // "lk_" + first 8 hex chars

  return { key, prefix };
}

/**
 * Hash an API key for storage
 * Uses SHA-256 for fast verification during API calls
 */
export async function hashAPIKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);

  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}
