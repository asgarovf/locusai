/**
 * Core type definitions for the Locus Gateway.
 *
 * These interfaces define the contract between the gateway core
 * and platform-specific adapters (Telegram, Discord, WhatsApp, etc.).
 */

import type { ChildProcess } from "node:child_process";

// ─── Platform Adapter ──────────────────────────────────────────────────────

/** Every platform implements this interface to bridge messages into the gateway. */
export interface PlatformAdapter {
  /** Platform identifier (e.g., "telegram", "discord", "whatsapp"). */
  readonly platform: string;

  /** Start listening for messages. */
  start(): Promise<void>;

  /** Stop the adapter gracefully. */
  stop(): Promise<void>;

  /** Send a message to a session. */
  send(sessionId: string, message: OutboundMessage): Promise<void>;

  /**
   * Edit a previously sent message (if supported).
   * Adapters that don't support editing should omit this method.
   */
  edit?(
    sessionId: string,
    messageId: string,
    message: OutboundMessage
  ): Promise<void>;

  /** Platform capabilities — informs the gateway how to format output. */
  capabilities: PlatformCapabilities;
}

/** Declares what a platform supports so the gateway can adapt its output. */
export interface PlatformCapabilities {
  /** Whether sent messages can be edited (streaming via edit). */
  supportsEditing: boolean;
  /** Whether inline action buttons are supported. */
  supportsInlineButtons: boolean;
  /** Whether Markdown formatting is supported. */
  supportsMarkdown: boolean;
  /** Whether HTML formatting is supported. */
  supportsHTML: boolean;
  /** Whether file uploads are supported. */
  supportsFileUpload: boolean;
  /** Maximum message length (chars) before splitting. */
  maxMessageLength: number;
  /** Whether the platform can "stream" output by editing messages in place. */
  supportsStreaming: boolean;
}

// ─── Messages ──────────────────────────────────────────────────────────────

/** A message arriving from a platform into the gateway. */
export interface InboundMessage {
  /** Platform identifier. */
  platform: string;
  /** Platform-specific chat/channel ID (string for cross-platform compat). */
  sessionId: string;
  /** Platform-specific user ID. */
  userId: string;
  /** Message text content. */
  text: string;
  /** Optional file attachments. */
  attachments?: Attachment[];
  /** ID of the message being replied to (if any). */
  replyTo?: string;
  /** Platform-specific extra data. */
  metadata?: Record<string, unknown>;
}

/** A message going from the gateway to a platform. */
export interface OutboundMessage {
  /** Message text content. */
  text: string;
  /** Desired format — the adapter will convert if the platform doesn't support it. */
  format: "plain" | "markdown" | "html";
  /** Platform-agnostic actions (buttons, links). */
  actions?: Action[];
  /** File attachments. */
  attachments?: Attachment[];
}

/** A platform-agnostic action (button or link). */
export interface Action {
  /** Unique identifier for callback routing. */
  id: string;
  /** Display text for the action. */
  label: string;
  /** Action type. */
  type: "button" | "link";
  /** URL for link-type actions. */
  url?: string;
}

/** A file attachment. */
export interface Attachment {
  /** Filename. */
  name: string;
  /** MIME type. */
  mimeType: string;
  /** File content as a Buffer, or a URL to download. */
  content: Buffer | string;
}

// ─── Command Router ────────────────────────────────────────────────────────

/** A parsed slash command. */
export interface ParsedCommand {
  type: "command";
  command: string;
  args: string[];
  raw: string;
}

/** Free-text input (not a command). */
export interface FreeText {
  type: "freetext";
  text: string;
}

/** Context passed to command handlers. */
export interface RouteContext {
  /** The platform the message came from. */
  platform: string;
  /** Session (chat/channel) ID. */
  sessionId: string;
  /** User ID. */
  userId: string;
  /** Platform capabilities. */
  capabilities: PlatformCapabilities;
  /** Send a reply back through the gateway. */
  reply(message: OutboundMessage): Promise<void>;
  /** Edit a previously sent message (if supported). Returns false if unsupported. */
  editReply?(messageId: string, message: OutboundMessage): Promise<boolean>;
  /** Platform-specific metadata from the inbound message. */
  metadata?: Record<string, unknown>;
}

/** Result from executing a command. */
export interface CommandResult {
  /** Output text. */
  text: string;
  /** Format of the output text. */
  format: "plain" | "markdown" | "html";
  /** Optional actions to include with the response. */
  actions?: Action[];
  /** Whether the output was streamed (for logging/telemetry). */
  streaming?: boolean;
}

// ─── Command Tracker ───────────────────────────────────────────────────────

/** A tracked active command. */
export interface ActiveCommand {
  /** Unique tracking ID. */
  id: string;
  /** Command name. */
  command: string;
  /** Command arguments. */
  args: string[];
  /** Associated subprocess (if any). */
  childProcess: ChildProcess | null;
  /** When the command started. */
  startedAt: Date;
}

/** Exclusivity group for concurrent command management. */
export type ExclusivityGroup = "workspace" | "git";

/** Returned when a command is blocked by an exclusive conflict. */
export interface ConflictResult {
  blocked: true;
  runningCommand: ActiveCommand;
  group: ExclusivityGroup;
}

// ─── Command Definitions ───────────────────────────────────────────────────

/** Maps command names to CLI arguments. */
export interface CommandDefinition {
  /** The locus CLI arguments for this command. */
  cliArgs: string[];
  /** Whether this command produces streaming output. */
  streaming: boolean;
  /** If set, the command requires arguments. Value is the help message. */
  requiresArgs?: string;
}

// ─── Gateway Events ────────────────────────────────────────────────────────

/** Events emitted by the gateway. */
export type GatewayEvent =
  | { type: "message_received"; message: InboundMessage }
  | {
      type: "command_started";
      sessionId: string;
      command: string;
      args: string[];
    }
  | {
      type: "command_completed";
      sessionId: string;
      command: string;
      exitCode: number;
    }
  | { type: "error"; error: Error; context?: string };
