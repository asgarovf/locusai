/**
 * McpConfigStore — CRUD manager for `.locus/mcp.json`.
 *
 * Single source of truth for all configured MCP servers.
 * Validates on every load, creates missing directories on save.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { McpConfigError, McpServerError } from "../errors.js";
import type { McpServerConfig } from "../types.js";
import type { McpServerConfigInput } from "./schema.js";
import { McpConfigSchema } from "./schema.js";

/** Parsed and validated config shape. */
export interface McpConfig {
  servers: Record<string, McpServerConfig>;
}

const CONFIG_RELATIVE_PATH = ".locus/mcp.json";
const EMPTY_CONFIG: McpConfig = { servers: {} };

export class McpConfigStore {
  private readonly configPath: string;

  constructor(projectRoot: string) {
    this.configPath = join(projectRoot, CONFIG_RELATIVE_PATH);
  }

  /** Read and validate `.locus/mcp.json`. Returns empty config if file doesn't exist. */
  load(): McpConfig {
    if (!existsSync(this.configPath)) {
      return { ...EMPTY_CONFIG, servers: {} };
    }

    let raw: string;
    try {
      raw = readFileSync(this.configPath, "utf-8");
    } catch (err) {
      throw new McpConfigError(
        `Failed to read config at ${this.configPath}: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new McpConfigError(
        `Corrupted JSON in ${this.configPath}. Fix the syntax or delete the file and run: locus pkg mcp init`
      );
    }

    const result = McpConfigSchema.safeParse(parsed);
    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
        .join("\n");
      throw new McpConfigError(
        `Invalid config in ${this.configPath}:\n${issues}`
      );
    }

    return result.data as McpConfig;
  }

  /** Write validated config to `.locus/mcp.json` with pretty-print. */
  save(config: McpConfig): void {
    const result = McpConfigSchema.safeParse(config);
    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
        .join("\n");
      throw new McpConfigError(`Cannot save invalid config:\n${issues}`);
    }

    const dir = dirname(this.configPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(
      this.configPath,
      `${JSON.stringify(result.data, null, 2)}\n`,
      "utf-8"
    );
  }

  /** Add a new server entry. Throws if name already exists. */
  addServer(name: string, serverConfig: McpServerConfigInput): void {
    const config = this.load();

    if (config.servers[name]) {
      throw new McpServerError(
        `Server "${name}" already exists. Use updateServer() to modify it.`,
        name
      );
    }

    config.servers[name] = this.validateServerConfig(name, serverConfig);
    this.save(config);
  }

  /** Remove a server by name. Returns true if it existed. */
  removeServer(name: string): boolean {
    const config = this.load();
    const existed = name in config.servers;

    if (existed) {
      delete config.servers[name];
      this.save(config);
    }

    return existed;
  }

  /** Partial update of a server config. Throws if server not found. */
  updateServer(name: string, updates: Partial<McpServerConfigInput>): void {
    const config = this.load();
    const existing = config.servers[name];

    if (!existing) {
      throw new McpServerError(`Server not found: "${name}"`, name);
    }

    const merged = { ...existing, ...updates };
    config.servers[name] = this.validateServerConfig(name, merged);
    this.save(config);
  }

  /** Get a single server config by name. Returns null if not found. */
  getServer(name: string): McpServerConfig | null {
    const config = this.load();
    return config.servers[name] ?? null;
  }

  /** Return all configured servers as an array of [name, config] entries. */
  listServers(): Array<{ name: string; config: McpServerConfig }> {
    const config = this.load();
    return Object.entries(config.servers).map(([name, cfg]) => ({
      name,
      config: cfg,
    }));
  }

  /** Set the `enabled` flag on a server. Throws if server not found. */
  toggleServer(name: string, enabled: boolean): void {
    this.updateServer(name, { enabled });
  }

  /** Absolute path to the config file. */
  getConfigPath(): string {
    return this.configPath;
  }

  /** Validate a single server config input against the Zod schema. */
  private validateServerConfig(
    name: string,
    input: McpServerConfigInput | Record<string, unknown>
  ): McpServerConfig {
    const wrapper = { servers: { [name]: input } };
    const result = McpConfigSchema.safeParse(wrapper);

    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
        .join("\n");
      throw new McpConfigError(
        `Invalid server config for "${name}":\n${issues}`
      );
    }

    return (result.data as McpConfig).servers[name];
  }
}
