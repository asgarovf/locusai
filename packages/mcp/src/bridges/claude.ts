/**
 * Claude Code bridge — syncs canonical `.locus/mcp.json` to `.claude/mcp.json`.
 *
 * Claude Code's MCP config format:
 * ```json
 * {
 *   "mcpServers": {
 *     "server-name": {
 *       "command": "npx",
 *       "args": ["-y", "@modelcontextprotocol/server-github"],
 *       "env": { "GITHUB_TOKEN": "..." }
 *     }
 *   }
 * }
 * ```
 *
 * Transport support:
 *   - stdio → command + args + env
 *   - http  → url for SSE-compatible endpoints; streamable-http is skipped with a warning
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type {
  McpHttpServerConfig,
  McpServerConfig,
  McpStdioServerConfig,
  ProviderBridge,
  SyncResult,
} from "../types.js";
import { isLocusManaged, toLocusName } from "./bridge.js";

// ---------------------------------------------------------------------------
// Claude config types
// ---------------------------------------------------------------------------

interface ClaudeStdioEntry {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

interface ClaudeHttpEntry {
  url: string;
  transport: "sse";
}

type ClaudeServerEntry = ClaudeStdioEntry | ClaudeHttpEntry;

interface ClaudeConfig {
  mcpServers: Record<string, ClaudeServerEntry>;
}

// ---------------------------------------------------------------------------
// ClaudeBridge
// ---------------------------------------------------------------------------

const CONFIG_RELATIVE_PATH = ".claude/mcp.json";

export class ClaudeBridge implements ProviderBridge {
  readonly provider = "claude";
  readonly configFileName = CONFIG_RELATIVE_PATH;

  /** Read existing `.claude/mcp.json` and return locus-managed server names. */
  async read(projectRoot: string): Promise<string[]> {
    const config = this.readExistingConfig(projectRoot);
    return this.getLocusServerNames(config);
  }

  /** Sync canonical servers to `.claude/mcp.json`. */
  async sync(
    projectRoot: string,
    servers: Record<string, McpServerConfig>
  ): Promise<SyncResult> {
    const configPath = join(projectRoot, CONFIG_RELATIVE_PATH);
    const existing = this.readExistingConfig(projectRoot);
    const errors: string[] = [];

    // Snapshot existing state for change detection
    const previousState = JSON.stringify(existing);

    // Remove all existing locus-managed servers
    const removedNames: string[] = [];
    for (const name of this.getLocusServerNames(existing)) {
      delete existing.mcpServers[name];
      removedNames.push(name);
    }

    // Add/update enabled servers with compatible transports
    let serversWritten = 0;
    for (const [name, config] of Object.entries(servers)) {
      if (!config.enabled) continue;

      const claudeEntry = this.toClaudeFormat(name, config, errors);
      if (claudeEntry) {
        const locusName = toLocusName(name);
        existing.mcpServers[locusName] = claudeEntry;
        serversWritten++;
      }
    }

    // Determine which locus- servers were actually removed (existed before, not re-added)
    const serversRemoved = removedNames.filter(
      (n) => !(n in existing.mcpServers)
    );

    // Write the merged config
    this.writeConfig(projectRoot, existing);

    const changed = JSON.stringify(existing) !== previousState;

    return {
      provider: this.provider,
      serversWritten,
      serversRemoved,
      configPath,
      changed,
      errors,
    };
  }

  /** Convert a canonical server config to Claude's format. Returns null if incompatible. */
  private toClaudeFormat(
    name: string,
    server: McpServerConfig,
    errors: string[]
  ): ClaudeServerEntry | null {
    if (server.transport === "stdio") {
      return this.stdioToClaudeFormat(server);
    }

    // HTTP transport — Claude supports SSE but not streamable-http.
    // Our canonical "http" type may be either; we sync it as SSE and warn
    // if the server is explicitly streamable-http (detected by metadata).
    if (server.transport === "http") {
      return this.httpToClaudeFormat(name, server, errors);
    }

    errors.push(
      `[claude] Skipped "${name}": unsupported transport "${(server as McpServerConfig).transport}"`
    );
    return null;
  }

  private stdioToClaudeFormat(server: McpStdioServerConfig): ClaudeStdioEntry {
    const entry: ClaudeStdioEntry = {
      command: server.command,
      args: server.args,
    };
    if (server.env && Object.keys(server.env).length > 0) {
      entry.env = { ...server.env };
    }
    return entry;
  }

  private httpToClaudeFormat(
    name: string,
    server: McpHttpServerConfig,
    errors: string[]
  ): ClaudeHttpEntry | null {
    // If metadata flags this as streamable-http only, skip it
    if (server.metadata?.transport === "streamable-http") {
      errors.push(
        `[claude] Skipped "${name}": streamable-http transport is not supported by Claude Code`
      );
      return null;
    }

    return {
      url: server.url,
      transport: "sse",
    };
  }

  /** Parse existing `.claude/mcp.json` or return empty config. */
  private readExistingConfig(projectRoot: string): ClaudeConfig {
    const configPath = join(projectRoot, CONFIG_RELATIVE_PATH);
    if (!existsSync(configPath)) {
      return { mcpServers: {} };
    }

    try {
      const raw = readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(raw) as Partial<ClaudeConfig>;
      return {
        mcpServers: parsed.mcpServers ?? {},
      };
    } catch {
      // If the file is corrupted, start fresh but don't destroy non-mcpServers keys
      return { mcpServers: {} };
    }
  }

  /** Write Claude config to `.claude/mcp.json` with pretty formatting. */
  private writeConfig(projectRoot: string, config: ClaudeConfig): void {
    const configPath = join(projectRoot, CONFIG_RELATIVE_PATH);
    const dir = dirname(configPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf-8");
  }

  /** Return names of all locus-managed servers in the Claude config. */
  private getLocusServerNames(config: ClaudeConfig): string[] {
    return Object.keys(config.mcpServers).filter(isLocusManaged);
  }
}
