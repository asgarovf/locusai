/**
 * McpTestClient — lightweight MCP client wrapper for testing server
 * connections and discovering available tools.
 *
 * Used by `locus mcp test`, `locus mcp add` (post-setup validation),
 * and health checks.
 *
 * Wraps `@modelcontextprotocol/sdk` Client with:
 *   - Transport auto-selection based on server config
 *   - Configurable connection timeout (default 10s)
 *   - Graceful cleanup of child processes on disconnect
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { McpServerConfig, McpTool } from "../types.js";

/** Default connection timeout in milliseconds. */
const DEFAULT_TIMEOUT_MS = 10_000;

/** Options for McpTestClient. */
export interface McpTestClientOptions {
  /** Connection timeout in milliseconds. Defaults to 10000. */
  timeoutMs?: number;
  /** Client name sent during MCP initialization. */
  clientName?: string;
  /** Client version sent during MCP initialization. */
  clientVersion?: string;
}

/**
 * Result returned by `listTools()`.
 */
export interface ListToolsResult {
  tools: McpTool[];
}

/**
 * Result returned by `callTool()`.
 */
export interface CallToolResult {
  content: Array<{ type: string; text?: string; [key: string]: unknown }>;
  isError?: boolean;
}

export class McpTestClient {
  private client: Client | null = null;
  private transport: Transport | null = null;
  private connected = false;
  private serverName = "";

  private readonly timeoutMs: number;
  private readonly clientName: string;
  private readonly clientVersion: string;

  constructor(options: McpTestClientOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.clientName = options.clientName ?? "locus-mcp-test";
    this.clientVersion = options.clientVersion ?? "1.0.0";
  }

  /**
   * Connect to an MCP server based on its config.
   *
   * Creates the appropriate transport (stdio, SSE, or streamable-http)
   * and establishes the MCP protocol connection within the timeout window.
   */
  async connect(config: McpServerConfig): Promise<void> {
    if (this.connected) {
      throw new Error("Already connected. Call disconnect() first.");
    }

    this.serverName = config.name;
    this.transport = this.createTransport(config);

    this.client = new Client(
      { name: this.clientName, version: this.clientVersion },
      { capabilities: {} }
    );

    await this.withTimeout(
      this.client.connect(this.transport),
      `Connection to "${config.name}" timed out after ${this.timeoutMs}ms`
    );

    this.connected = true;
  }

  /**
   * List tools exposed by the connected MCP server.
   *
   * Calls the MCP `tools/list` method and maps results to `McpTool[]`.
   */
  async listTools(): Promise<ListToolsResult> {
    const client = this.getConnectedClient();

    const response = await this.withTimeout(
      client.listTools(),
      `listTools on "${this.serverName}" timed out after ${this.timeoutMs}ms`
    );

    const tools: McpTool[] = (response.tools ?? []).map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: (t.inputSchema ?? {}) as Record<string, unknown>,
      serverName: this.serverName,
    }));

    return { tools };
  }

  /**
   * Call a tool on the connected MCP server.
   *
   * @param name - Tool name to invoke.
   * @param args - Arguments to pass to the tool.
   */
  async callTool(
    name: string,
    args: Record<string, unknown> = {}
  ): Promise<CallToolResult> {
    const client = this.getConnectedClient();

    const response = await this.withTimeout(
      client.callTool({ name, arguments: args }),
      `callTool "${name}" on "${this.serverName}" timed out after ${this.timeoutMs}ms`
    );

    return {
      content: (response.content ?? []) as CallToolResult["content"],
      isError: response.isError as boolean | undefined,
    };
  }

  /**
   * Disconnect from the MCP server and clean up resources.
   *
   * For stdio servers, this kills the child process to prevent orphans.
   */
  async disconnect(): Promise<void> {
    if (!this.connected && !this.client) return;

    try {
      if (this.client) {
        await this.client.close();
      }
    } catch {
      // Best-effort close — the process may already be gone
    } finally {
      this.client = null;
      this.transport = null;
      this.connected = false;
    }
  }

  /** Whether the client is currently connected. */
  isConnected(): boolean {
    return this.connected;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Create the appropriate transport based on server config. */
  private createTransport(config: McpServerConfig): Transport {
    if (config.transport === "stdio") {
      const env: Record<string, string> = {};
      for (const [k, v] of Object.entries(process.env)) {
        if (v !== undefined) env[k] = v;
      }
      if (config.env) Object.assign(env, config.env);

      return new StdioClientTransport({
        command: config.command,
        args: config.args,
        env,
      });
    }

    if (config.transport === "http") {
      // Use streamable-http by default; fall back to SSE if metadata says so
      const isSSE = config.metadata?.transport === "sse";

      if (isSSE) {
        return new SSEClientTransport(new URL(config.url));
      }

      return new StreamableHTTPClientTransport(new URL(config.url));
    }

    throw new Error(
      `Unsupported transport: "${(config as McpServerConfig).transport}"`
    );
  }

  /** Wrap a promise with a timeout. */
  private withTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(message));
      }, this.timeoutMs);

      promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  /** Throw if not connected and return the connected client. */
  private getConnectedClient(): Client {
    if (!this.connected || !this.client) {
      throw new Error("Not connected. Call connect() before using the client.");
    }
    return this.client;
  }
}
