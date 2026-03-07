/**
 * Token management for Linear OAuth.
 *
 * Handles loading, saving, expiry checking, refreshing, and revoking
 * OAuth tokens for the Linear API.
 */

import type { TokenInfo } from "../types.js";
import {
  loadTokens as loadTokensFromConfig,
  saveTokens as saveTokensToConfig,
  clearTokens,
} from "../config.js";

const LINEAR_TOKEN_URL = "https://api.linear.app/oauth/token";
const LINEAR_REVOKE_URL = "https://api.linear.app/oauth/revoke";

/** Buffer (in ms) before actual expiry to trigger a refresh — 5 minutes. */
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

/**
 * Load stored OAuth tokens from `.locus/config.json`.
 */
export function loadTokens(cwd?: string): TokenInfo | null {
  return loadTokensFromConfig(cwd);
}

/**
 * Persist OAuth tokens to `.locus/config.json`.
 */
export function saveTokens(tokens: TokenInfo, cwd?: string): void {
  saveTokensToConfig(tokens, cwd);
}

/**
 * Check if the access token is expired or within the expiry buffer.
 */
export function isTokenExpired(tokens: TokenInfo): boolean {
  const expiresAt = new Date(tokens.expiresAt).getTime();
  return Date.now() >= expiresAt - EXPIRY_BUFFER_MS;
}

/**
 * Refresh the access token using the refresh token.
 * Returns the new token info, or throws on failure.
 */
export async function refreshAccessToken(
  tokens: TokenInfo,
  clientId: string,
  clientSecret: string,
  cwd?: string
): Promise<TokenInfo> {
  const response = await fetch(LINEAR_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Token refresh failed (${response.status}): ${body}`
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
  };

  const newTokens: TokenInfo = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? tokens.refreshToken,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    scope: data.scope ?? tokens.scope,
  };

  saveTokens(newTokens, cwd);
  return newTokens;
}

/**
 * Revoke the OAuth token by calling Linear's revoke endpoint.
 */
export async function revokeToken(
  accessToken: string,
  cwd?: string
): Promise<void> {
  const response = await fetch(LINEAR_REVOKE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token: accessToken }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Token revocation failed (${response.status}): ${body}`
    );
  }

  clearTokens(cwd);
}
