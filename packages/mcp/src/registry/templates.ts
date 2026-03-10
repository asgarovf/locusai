/**
 * Built-in MCP server templates.
 *
 * Each template provides a pre-configured setup for a popular MCP server
 * so users can quickly add them via `locus pkg mcp add --template <name>`.
 */

import type { McpServerConfig, McpServerTemplate } from "./types.js";

// ---------------------------------------------------------------------------
// Built-in templates
// ---------------------------------------------------------------------------

const postgresTemplate: McpServerTemplate = {
  name: "postgres",
  displayName: "PostgreSQL",
  description: "Query and manage PostgreSQL databases via MCP",
  transport: "stdio",
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-postgres"],
  npmPackage: "@modelcontextprotocol/server-postgres",
  envPrompts: [
    {
      key: "POSTGRES_CONNECTION",
      description:
        "PostgreSQL connection string (e.g. postgresql://user:pass@localhost:5432/db)",
      required: true,
      sensitive: true,
    },
  ],
  defaultProviders: ["claude", "codex"],
};

const filesystemTemplate: McpServerTemplate = {
  name: "filesystem",
  displayName: "Filesystem",
  description: "Read, write, and manage files on the local filesystem via MCP",
  transport: "stdio",
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-filesystem"],
  npmPackage: "@modelcontextprotocol/server-filesystem",
  envPrompts: [],
  defaultProviders: ["claude", "codex"],
};

const githubTemplate: McpServerTemplate = {
  name: "github",
  displayName: "GitHub",
  description:
    "Interact with GitHub repositories, issues, and pull requests via MCP",
  transport: "stdio",
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-github"],
  npmPackage: "@modelcontextprotocol/server-github",
  envPrompts: [
    {
      key: "GITHUB_PERSONAL_ACCESS_TOKEN",
      description: "GitHub personal access token for API authentication",
      required: true,
      sensitive: true,
    },
  ],
  defaultProviders: ["claude", "codex"],
};

const fetchTemplate: McpServerTemplate = {
  name: "fetch",
  displayName: "Fetch",
  description: "Fetch and process content from URLs via MCP",
  transport: "stdio",
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-fetch"],
  npmPackage: "@modelcontextprotocol/server-fetch",
  envPrompts: [],
  defaultProviders: ["claude", "codex"],
};

const memoryTemplate: McpServerTemplate = {
  name: "memory",
  displayName: "Memory",
  description: "Persistent memory and knowledge graph storage via MCP",
  transport: "stdio",
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-memory"],
  npmPackage: "@modelcontextprotocol/server-memory",
  envPrompts: [],
  defaultProviders: ["claude", "codex"],
};

/** All built-in templates indexed by name. */
const TEMPLATES: ReadonlyMap<string, McpServerTemplate> = new Map([
  [postgresTemplate.name, postgresTemplate],
  [filesystemTemplate.name, filesystemTemplate],
  [githubTemplate.name, githubTemplate],
  [fetchTemplate.name, fetchTemplate],
  [memoryTemplate.name, memoryTemplate],
]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Get a template by name. Returns `undefined` if not found. */
export function getTemplate(name: string): McpServerTemplate | undefined {
  return TEMPLATES.get(name);
}

/** List all built-in templates, sorted alphabetically by name. */
export function listTemplates(): McpServerTemplate[] {
  return [...TEMPLATES.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Resolve a template into a complete `McpServerConfig` by merging
 * user-provided environment variable values and optional directory paths.
 *
 * @param template - The template to resolve.
 * @param userInputs - User-provided values keyed by env var name.
 *   For the filesystem template, pass directory paths as an array under
 *   the special key `"__paths"`.
 * @returns A fully resolved `McpServerConfig` ready for storage.
 */
export function resolveTemplate(
  template: McpServerTemplate,
  userInputs: Record<string, string | string[]>
): McpServerConfig {
  const env: Record<string, string> = {};

  for (const prompt of template.envPrompts) {
    const value = userInputs[prompt.key];
    if (typeof value === "string" && value.length > 0) {
      env[prompt.key] = value;
    } else if (prompt.required && !prompt.default) {
      throw new Error(
        `Missing required environment variable: ${prompt.key} (${prompt.description})`
      );
    } else if (prompt.default) {
      env[prompt.key] = prompt.default;
    }
  }

  // Build args — start with the template args, then append user paths
  const args = [...template.args];
  const paths = userInputs.__paths;
  if (Array.isArray(paths)) {
    args.push(...paths);
  }

  return {
    transport: template.transport,
    name: template.displayName,
    enabled: true,
    command: template.command,
    args,
    ...(Object.keys(env).length > 0 ? { env } : {}),
  } as McpServerConfig;
}
