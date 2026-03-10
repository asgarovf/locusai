/**
 * Core type definitions for locus-mcp.
 *
 * Covers MCP server configuration, provider bridging,
 * server process management, and health checking.
 */

// ---------------------------------------------------------------------------
// Server configuration
// ---------------------------------------------------------------------------

/** Fields shared by all MCP server transport types. */
export interface McpServerConfigBase {
  /** Human-readable display name. */
  name: string;
  /** Whether this server is currently enabled. */
  enabled: boolean;
  /** Optional environment variables passed to the server process. */
  env?: Record<string, string>;
  /** Free-form metadata (tags, notes, etc.). */
  metadata?: Record<string, unknown>;
}

/** Configuration for an MCP server using the stdio transport. */
export interface McpStdioServerConfig extends McpServerConfigBase {
  transport: "stdio";
  /** Executable command (e.g. "npx", "uvx", "node"). */
  command: string;
  /** Arguments passed to `command`. */
  args: string[];
}

/** Configuration for an MCP server using the HTTP (streamable-http / SSE) transport. */
export interface McpHttpServerConfig extends McpServerConfigBase {
  transport: "http";
  /** Full URL of the MCP HTTP endpoint. */
  url: string;
  /** Optional headers sent with every request. */
  headers?: Record<string, string>;
}

/** Discriminated union of all supported MCP server configurations. */
export type McpServerConfig = McpStdioServerConfig | McpHttpServerConfig;

// ---------------------------------------------------------------------------
// Server templates & env prompts
// ---------------------------------------------------------------------------

/** Describes an environment variable that must be provided during `mcp add`. */
export interface EnvPrompt {
  /** Environment variable name (e.g. "GITHUB_TOKEN"). */
  key: string;
  /** Human-readable description shown to the user. */
  description: string;
  /** Whether this variable is required. */
  required: boolean;
  /** Whether the value should be treated as sensitive (e.g. tokens, passwords). */
  sensitive?: boolean;
  /** Default value if the user provides none. */
  default?: string;
}

/** A reusable template for quickly adding well-known MCP servers. */
export interface McpServerTemplate {
  /** Template identifier used in `getTemplate()` (e.g. "github", "postgres"). */
  name: string;
  /** Human-readable display name (e.g. "GitHub", "PostgreSQL"). */
  displayName: string;
  /** Short description of what the server provides. */
  description: string;
  /** Transport type for this template. */
  transport: "stdio" | "http";
  /** Executable command (e.g. "npx"). */
  command: string;
  /** Arguments passed to `command` (should include `-y` flag for npx). */
  args: string[];
  /** npm package name for the MCP server. */
  npmPackage: string;
  /** Environment variables the template requires from the user. */
  envPrompts: EnvPrompt[];
  /** AI coding agent providers this template is compatible with. */
  defaultProviders: string[];
}

// ---------------------------------------------------------------------------
// Provider bridging
// ---------------------------------------------------------------------------

/** Result of syncing the canonical config to a provider-specific format. */
export interface SyncResult {
  /** Provider that was synced (e.g. "claude", "codex"). */
  provider: string;
  /** Number of servers written to the provider config. */
  serversWritten: number;
  /** Server names that were removed from the provider config. */
  serversRemoved: string[];
  /** Absolute path of the provider config file that was written. */
  configPath: string;
  /** Whether the sync introduced changes compared to the previous state. */
  changed: boolean;
  /** Warnings/errors for servers that were skipped (e.g. incompatible transport). */
  errors: string[];
}

/**
 * A bridge translates the canonical `.locus/mcp.json` config
 * into a provider-specific format and writes it to disk.
 */
export interface ProviderBridge {
  /** Provider identifier (e.g. "claude", "codex"). */
  provider: string;
  /** File name or path the provider expects (e.g. ".claude/mcp.json"). */
  configFileName: string;
  /** Read the provider's existing config and return known server names. */
  read(projectRoot: string): Promise<string[]>;
  /** Write the canonical server configs into the provider-specific file. */
  sync(
    projectRoot: string,
    servers: Record<string, McpServerConfig>
  ): Promise<SyncResult>;
}

// ---------------------------------------------------------------------------
// Server process & health
// ---------------------------------------------------------------------------

/** Represents a running MCP server process managed by locus-mcp. */
export interface ServerProcess {
  /** Server name (key in `mcp.json`). */
  name: string;
  /** OS process ID (stdio servers only). */
  pid?: number;
  /** Transport type of the running server. */
  transport: "stdio" | "http";
  /** Current status. */
  status: "running" | "stopped" | "error";
  /** ISO-8601 timestamp when the process was started. */
  startedAt: string;
}

/** Result of a health check against a single MCP server. */
export interface HealthCheckResult {
  /** Server name. */
  name: string;
  /** Whether the server responded successfully. */
  healthy: boolean;
  /** Round-trip latency in milliseconds (undefined if unhealthy). */
  latencyMs?: number;
  /** Error message if the check failed. */
  error?: string;
}

// ---------------------------------------------------------------------------
// MCP tools
// ---------------------------------------------------------------------------

/** Describes a tool exposed by an MCP server. */
export interface McpTool {
  /** Tool name as reported by the server. */
  name: string;
  /** Human-readable description of the tool. */
  description?: string;
  /** JSON Schema describing the tool's input parameters. */
  inputSchema: Record<string, unknown>;
  /** Name of the server that exposes this tool. */
  serverName: string;
}
