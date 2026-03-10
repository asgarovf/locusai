/**
 * Codex CLI bridge — syncs canonical `.locus/mcp.json` to `.codex/config.toml`.
 *
 * Codex CLI's MCP config format (TOML):
 * ```toml
 * [mcp_servers.server-name]
 * command = "npx"
 * args = ["-y", "@modelcontextprotocol/server-github"]
 *
 * [mcp_servers.server-name.env]
 * GITHUB_TOKEN = "..."
 * ```
 *
 * Transport support:
 *   - stdio → command + args + env
 *   - http (streamable-http) → url + bearer_token_env_var
 *   - SSE is NOT supported by Codex → skipped with a warning
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import * as TOML from "smol-toml";
import type {
  McpHttpServerConfig,
  McpServerConfig,
  McpStdioServerConfig,
  ProviderBridge,
  SyncResult,
} from "../types.js";
import { isLocusManaged, toLocusName } from "./bridge.js";

// ---------------------------------------------------------------------------
// Codex config types
// ---------------------------------------------------------------------------

interface CodexStdioEntry {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

interface CodexHttpEntry {
  url: string;
  bearer_token_env_var?: string;
}

type CodexServerEntry = CodexStdioEntry | CodexHttpEntry;

interface CodexConfig {
  [key: string]: unknown;
  mcp_servers?: Record<string, CodexServerEntry>;
}

// ---------------------------------------------------------------------------
// CodexBridge
// ---------------------------------------------------------------------------

export class CodexBridge implements ProviderBridge {
  readonly provider = "codex";
  readonly configFileName: string;

  private readonly scope: "project" | "global";

  /**
   * @param scope - "project" writes to `.codex/config.toml` relative to projectRoot.
   *                "global" writes to `~/.codex/config.toml`.
   */
  constructor(scope: "project" | "global" = "project") {
    this.scope = scope;
    this.configFileName =
      scope === "project"
        ? ".codex/config.toml"
        : `${process.env.HOME ?? "~"}/.codex/config.toml`;
  }

  /** Read existing Codex config and return locus-managed server names. */
  async read(projectRoot: string): Promise<string[]> {
    const config = this.readExistingConfig(projectRoot);
    return this.getLocusServerNames(config);
  }

  /** Sync canonical servers to `.codex/config.toml`. */
  async sync(
    projectRoot: string,
    servers: Record<string, McpServerConfig>
  ): Promise<SyncResult> {
    const configPath = this.getConfigPath(projectRoot);
    const existing = this.readExistingConfig(projectRoot);
    const errors: string[] = [];

    // Snapshot existing state for change detection
    const previousState = TOML.stringify(existing);

    // Ensure mcp_servers section exists
    if (!existing.mcp_servers) {
      existing.mcp_servers = {};
    }

    // Remove all existing locus-managed servers
    const removedNames: string[] = [];
    for (const name of this.getLocusServerNames(existing)) {
      delete existing.mcp_servers[name];
      removedNames.push(name);
    }

    // Add/update enabled servers with compatible transports
    let serversWritten = 0;
    for (const [name, config] of Object.entries(servers)) {
      if (!config.enabled) continue;

      const codexEntry = this.toCodexFormat(name, config, errors);
      if (codexEntry) {
        const locusName = toLocusName(name);
        existing.mcp_servers[locusName] = codexEntry;
        serversWritten++;
      }
    }

    // Determine which locus- servers were actually removed
    const serversRemoved = removedNames.filter(
      (n) => !existing.mcp_servers?.[n]
    );

    // Write the merged config
    this.writeConfig(projectRoot, existing);

    const changed = TOML.stringify(existing) !== previousState;

    return {
      provider: this.provider,
      serversWritten,
      serversRemoved,
      configPath,
      changed,
      errors,
    };
  }

  /** Convert a canonical server config to Codex's format. Returns null if incompatible. */
  private toCodexFormat(
    name: string,
    server: McpServerConfig,
    errors: string[]
  ): CodexServerEntry | null {
    if (server.transport === "stdio") {
      return this.stdioToCodexFormat(server);
    }

    if (server.transport === "http") {
      return this.httpToCodexFormat(name, server, errors);
    }

    errors.push(
      `[codex] Skipped "${name}": unsupported transport "${(server as McpServerConfig).transport}"`
    );
    return null;
  }

  private stdioToCodexFormat(server: McpStdioServerConfig): CodexStdioEntry {
    const entry: CodexStdioEntry = {
      command: server.command,
      args: [...server.args],
    };
    if (server.env && Object.keys(server.env).length > 0) {
      entry.env = { ...server.env };
    }
    return entry;
  }

  private httpToCodexFormat(
    name: string,
    server: McpHttpServerConfig,
    errors: string[]
  ): CodexHttpEntry | null {
    // If metadata flags this as SSE-only, skip it
    if (server.metadata?.transport === "sse") {
      errors.push(
        `[codex] Skipped "${name}": SSE transport is not supported by Codex CLI`
      );
      return null;
    }

    const entry: CodexHttpEntry = {
      url: server.url,
    };

    // If env contains a bearer token, reference it via bearer_token_env_var
    if (server.env) {
      const tokenKey = Object.keys(server.env).find(
        (k) =>
          k.includes("TOKEN") || k.includes("API_KEY") || k.includes("BEARER")
      );
      if (tokenKey) {
        entry.bearer_token_env_var = tokenKey;
      }
    }

    return entry;
  }

  /** Parse existing `.codex/config.toml` or return empty config. */
  private readExistingConfig(projectRoot: string): CodexConfig {
    const configPath = this.getConfigPath(projectRoot);
    if (!existsSync(configPath)) {
      return {};
    }

    try {
      const raw = readFileSync(configPath, "utf-8");
      return TOML.parse(raw) as CodexConfig;
    } catch {
      // If TOML is corrupted, start fresh
      return {};
    }
  }

  /** Write Codex config to `.codex/config.toml`. */
  private writeConfig(projectRoot: string, config: CodexConfig): void {
    const configPath = this.getConfigPath(projectRoot);
    const dir = dirname(configPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(configPath, `${TOML.stringify(config)}\n`, "utf-8");
  }

  /** Return names of all locus-managed servers in the Codex config. */
  private getLocusServerNames(config: CodexConfig): string[] {
    if (!config.mcp_servers) return [];
    return Object.keys(config.mcp_servers).filter(isLocusManaged);
  }

  /** Resolve the absolute config path based on scope. */
  private getConfigPath(projectRoot: string): string {
    if (this.scope === "global") {
      const home = process.env.HOME ?? process.env.USERPROFILE ?? "~";
      return join(home, ".codex", "config.toml");
    }
    return join(projectRoot, ".codex", "config.toml");
  }
}
