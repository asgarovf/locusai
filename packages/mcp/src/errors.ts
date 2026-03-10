/**
 * Shared error handling for locus-mcp commands.
 *
 * Categorizes errors into actionable messages:
 *   - Config not found / invalid: guide to `locus pkg mcp init`
 *   - Server not found: suggest `locus pkg mcp list`
 *   - Connection / transport errors: clear message with retry hint
 *   - Provider sync failures: suggest checking provider installation
 */

export class McpConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "McpConfigError";
  }
}

export class McpServerError extends Error {
  constructor(
    message: string,
    public readonly serverName: string,
  ) {
    super(message);
    this.name = "McpServerError";
  }
}

export class McpProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
  ) {
    super(message);
    this.name = "McpProviderError";
  }
}

export function handleCommandError(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);

  // Missing or invalid config file
  if (
    msg.includes("mcp.json not found") ||
    msg.includes("Config file not found") ||
    msg.includes("ENOENT") && msg.includes("mcp.json")
  ) {
    process.stderr.write(
      "\n  No MCP config found. Run:\n    locus pkg mcp init\n\n",
    );
    process.exit(1);
  }

  // Config validation errors
  if (
    err instanceof McpConfigError ||
    msg.includes("Invalid config") ||
    msg.includes("validation failed")
  ) {
    process.stderr.write(
      `\n  Invalid MCP configuration: ${msg}\n` +
        "  Check .locus/mcp.json and fix the errors above.\n\n",
    );
    process.exit(1);
  }

  // Server not found
  if (
    msg.includes("Server not found") ||
    msg.includes("Unknown server")
  ) {
    const name =
      err instanceof McpServerError ? err.serverName : "unknown";
    process.stderr.write(
      `\n  Server "${name}" not found. Run:\n    locus pkg mcp list\n  to see configured servers.\n\n`,
    );
    process.exit(1);
  }

  // Connection / transport errors
  if (
    msg.includes("ECONNREFUSED") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("ECONNRESET") ||
    msg.includes("socket hang up") ||
    msg.includes("fetch failed")
  ) {
    process.stderr.write(
      "\n  Connection error — could not reach the MCP server.\n" +
        "  Check that the server is running and try again.\n\n" +
        `  Details: ${msg}\n\n`,
    );
    process.exit(1);
  }

  // Spawn / process errors (stdio servers)
  if (
    msg.includes("ENOENT") ||
    msg.includes("spawn") ||
    msg.includes("command not found")
  ) {
    process.stderr.write(
      `\n  Failed to start MCP server process: ${msg}\n` +
        "  Ensure the command is installed and available on PATH.\n\n",
    );
    process.exit(1);
  }

  // Provider sync errors
  if (err instanceof McpProviderError) {
    process.stderr.write(
      `\n  Provider sync failed (${err.provider}): ${msg}\n` +
        "  Ensure the provider is installed and its config directory exists.\n\n",
    );
    process.exit(1);
  }

  // Generic fallback
  process.stderr.write(`\n  Error: ${msg}\n\n`);
  process.exit(1);
}
