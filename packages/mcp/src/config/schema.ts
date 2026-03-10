/**
 * Zod validation schemas for `.locus/mcp.json`.
 *
 * The config file schema:
 * {
 *   "servers": {
 *     "<name>": { transport: "stdio" | "http", ... }
 *   }
 * }
 *
 * Servers use a discriminated union on the `transport` field.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Server config schemas
// ---------------------------------------------------------------------------

/** Schema for environment variables — string→string record. */
const EnvSchema = z.record(z.string()).optional();

/** Schema for free-form metadata. */
const MetadataSchema = z.record(z.unknown()).optional();

/** Schema for an MCP server using the stdio transport. */
export const McpStdioServerSchema = z.object({
  transport: z.literal("stdio"),
  name: z.string().min(1, "Server name is required"),
  enabled: z.boolean().default(true),
  command: z.string().min(1, "Command is required for stdio servers"),
  args: z.array(z.string()).default([]),
  env: EnvSchema,
  metadata: MetadataSchema,
});

/** Schema for an MCP server using the HTTP transport. */
export const McpHttpServerSchema = z.object({
  transport: z.literal("http"),
  name: z.string().min(1, "Server name is required"),
  enabled: z.boolean().default(true),
  url: z.string().url("A valid URL is required for HTTP servers"),
  headers: z.record(z.string()).optional(),
  env: EnvSchema,
  metadata: MetadataSchema,
});

/** Discriminated union of all supported server transports. */
export const McpServerConfigSchema = z.discriminatedUnion("transport", [
  McpStdioServerSchema,
  McpHttpServerSchema,
]);

// ---------------------------------------------------------------------------
// Top-level config schema
// ---------------------------------------------------------------------------

/** Schema for the full `.locus/mcp.json` file. */
export const McpConfigSchema = z.object({
  servers: z.record(McpServerConfigSchema).default({}),
});

// ---------------------------------------------------------------------------
// Inferred types (for convenience — canonical types live in types.ts)
// ---------------------------------------------------------------------------

export type McpStdioServerInput = z.input<typeof McpStdioServerSchema>;
export type McpHttpServerInput = z.input<typeof McpHttpServerSchema>;
export type McpServerConfigInput = z.input<typeof McpServerConfigSchema>;
export type McpConfigInput = z.input<typeof McpConfigSchema>;
