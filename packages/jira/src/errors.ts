/**
 * Structured error classes and centralized error handler for @locusai/locus-jira.
 *
 * Maps Jira REST API HTTP status codes to typed error classes,
 * and provides `handleJiraError()` for use with axios error responses.
 */

import type { AxiosError } from "axios";

// ─── Error Classes ──────────────────────────────────────────────────────────

export class JiraAuthError extends Error {
  constructor(message = "Jira authentication failed (401).") {
    super(message);
    this.name = "JiraAuthError";
  }
}

export class JiraTokenExpiredError extends Error {
  constructor(message = "Jira OAuth token refresh failed.") {
    super(message);
    this.name = "JiraTokenExpiredError";
  }
}

export class JiraPermissionError extends Error {
  constructor(message = "Jira permission denied (403).") {
    super(message);
    this.name = "JiraPermissionError";
  }
}

export class JiraNotFoundError extends Error {
  constructor(message = "Jira resource not found (404).") {
    super(message);
    this.name = "JiraNotFoundError";
  }
}

export class JiraRateLimitError extends Error {
  constructor(message = "Jira API rate limit exceeded (429).") {
    super(message);
    this.name = "JiraRateLimitError";
  }
}

// ─── Error Handler ──────────────────────────────────────────────────────────

/**
 * Map an axios error to the appropriate Jira error class and throw.
 * Call this in catch blocks when making Jira API requests.
 */
export function handleJiraError(error: AxiosError): never {
  const status = error.response?.status;
  const data = error.response?.data as Record<string, unknown> | undefined;
  const detail =
    (data?.message as string) ??
    (data?.errorMessages as string[] | undefined)?.[0] ??
    error.message;

  switch (status) {
    case 401:
      throw new JiraAuthError(
        `Jira authentication failed (401): ${detail}`,
      );
    case 403:
      throw new JiraPermissionError(
        `Jira permission denied (403): ${detail}`,
      );
    case 404:
      throw new JiraNotFoundError(
        `Jira resource not found (404): ${detail}`,
      );
    case 429:
      throw new JiraRateLimitError(
        `Jira API rate limit exceeded (429): ${detail}`,
      );
    default:
      throw new Error(`Jira API error (${status ?? "unknown"}): ${detail}`);
  }
}

// ─── Command Error Handler ──────────────────────────────────────────────────

/**
 * Shared error handler for locus-jira commands.
 * Categorizes errors into actionable messages for the user.
 */
export function handleCommandError(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);

  if (err instanceof JiraAuthError || msg.includes("Not authenticated")) {
    process.stderr.write(
      "\n  Not authenticated. Run:\n    locus jira auth\n\n",
    );
    process.exit(1);
  }

  if (err instanceof JiraTokenExpiredError) {
    process.stderr.write(
      "\n  Your Jira OAuth token has expired and could not be refreshed.\n" +
        "  Run:\n    locus jira auth --revoke\n    locus jira auth\n\n",
    );
    process.exit(1);
  }

  if (err instanceof JiraPermissionError) {
    process.stderr.write(
      "\n  Jira permission denied (403).\n" +
        "  Your token may lack required scopes. Run:\n" +
        "    locus jira auth --revoke\n    locus jira auth\n\n",
    );
    process.exit(1);
  }

  if (err instanceof JiraNotFoundError) {
    process.stderr.write(`\n  ${msg}\n\n`);
    process.exit(1);
  }

  if (err instanceof JiraRateLimitError) {
    process.stderr.write(
      "\n  Jira API rate limit exceeded. Wait a moment and try again.\n\n",
    );
    process.exit(1);
  }

  if (
    msg.includes("ECONNREFUSED") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("ECONNRESET") ||
    msg.includes("socket hang up")
  ) {
    process.stderr.write(
      "\n  Network error — could not reach the Jira API.\n" +
        "  Check your internet connection and try again.\n\n" +
        `  Details: ${msg}\n\n`,
    );
    process.exit(1);
  }

  process.stderr.write(`\n  Error: ${msg}\n\n`);
  process.exit(1);
}
