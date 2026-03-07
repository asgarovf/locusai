/**
 * Shared error handling for locus-linear commands.
 *
 * Categorizes errors into actionable messages for the user:
 *   - Unauthenticated: prompt `locus pkg linear auth`
 *   - Token expired / refresh failed: prompt re-auth
 *   - Network errors: clear message with retry suggestion
 *   - Missing team config: prompt `locus pkg linear team`
 */

export function handleCommandError(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);

  // Unauthenticated / missing auth
  if (
    msg.includes("Not authenticated") ||
    msg.includes("missing access token")
  ) {
    process.stderr.write(
      "\n  Not authenticated. Run:\n    locus pkg linear auth\n\n"
    );
    process.exit(1);
  }

  // Token expired or refresh failed
  if (
    msg.includes("Token refresh failed") ||
    (msg.includes("token") && msg.includes("expired"))
  ) {
    process.stderr.write(
      "\n  Your Linear token has expired and could not be refreshed.\n" +
        "  Run:\n    locus pkg linear auth --revoke\n    locus pkg linear auth\n\n"
    );
    process.exit(1);
  }

  // Missing team configuration
  if (
    msg.includes("No team configured") ||
    msg.includes("not found. Run: locus pkg linear team")
  ) {
    process.stderr.write(
      `\n  ${msg}\n  Run:\n    locus pkg linear team <KEY>\n\n`
    );
    process.exit(1);
  }

  // Network errors
  if (
    msg.includes("fetch failed") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("network") ||
    msg.includes("ECONNRESET") ||
    msg.includes("socket hang up")
  ) {
    process.stderr.write(
      "\n  Network error — could not reach the Linear API.\n" +
        "  Check your internet connection and try again.\n\n" +
        `  Details: ${msg}\n\n`
    );
    process.exit(1);
  }

  // GraphQL / API errors (Linear SDK wraps these)
  if (msg.includes("GraphQL") || msg.includes("401") || msg.includes("403")) {
    if (msg.includes("401") || msg.includes("authentication")) {
      process.stderr.write(
        "\n  Linear API authentication error (401).\n" +
          "  Your token may be invalid or revoked. Run:\n" +
          "    locus pkg linear auth --revoke\n    locus pkg linear auth\n\n"
      );
    } else if (msg.includes("403")) {
      process.stderr.write(
        "\n  Linear API permission denied (403).\n" +
          "  Your token may lack required scopes. Run:\n" +
          "    locus pkg linear auth --revoke\n    locus pkg linear auth\n\n"
      );
    } else {
      process.stderr.write(`\n  Linear API error: ${msg}\n\n`);
    }
    process.exit(1);
  }

  // Generic fallback
  process.stderr.write(`\n  Error: ${msg}\n\n`);
  process.exit(1);
}
