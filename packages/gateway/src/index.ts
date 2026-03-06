/**
 * @locusai/locus-gateway — Channel-agnostic message gateway for Locus.
 *
 * Provides the core abstractions for building platform adapters
 * (Telegram, Discord, WhatsApp, etc.) that connect to the Locus CLI.
 *
 * @example
 * ```ts
 * import {
 *   Gateway,
 *   CommandRouter,
 *   CommandExecutor,
 *   CommandTracker,
 * } from "@locusai/locus-gateway";
 * import type {
 *   PlatformAdapter,
 *   PlatformCapabilities,
 *   InboundMessage,
 *   OutboundMessage,
 * } from "@locusai/locus-gateway";
 * ```
 */

// Commands
export {
  COMMAND_REGISTRY,
  getCommandDefinition,
  STREAMING_COMMANDS,
} from "./commands.js";
export type { StreamCallbacks } from "./executor.js";
// Executor
export { CommandExecutor } from "./executor.js";
// Formatter
export { bestFormat, splitMessage, truncate } from "./formatter.js";
export type { GatewayEventHandler, GatewayOptions } from "./gateway.js";
// Gateway
export { Gateway } from "./gateway.js";
// Router
export { CommandRouter } from "./router.js";
// Tracker
export { CommandTracker } from "./tracker.js";

// Types
export type {
  Action,
  ActiveCommand,
  Attachment,
  CommandDefinition,
  CommandResult,
  ConflictResult,
  ExclusivityGroup,
  FreeText,
  GatewayEvent,
  InboundMessage,
  OutboundMessage,
  ParsedCommand,
  PlatformAdapter,
  PlatformCapabilities,
  RouteContext,
} from "./types.js";
