/**
 * Gateway — the central orchestrator that connects platform adapters
 * to the command execution pipeline.
 *
 * Adapters push inbound messages into the gateway. The gateway parses,
 * routes, executes, and sends responses back through the originating adapter.
 */

import { createLogger } from "@locusai/sdk";
import { CommandExecutor, type StreamCallbacks } from "./executor.js";
import { CommandRouter } from "./router.js";
import { CommandTracker } from "./tracker.js";
import type { GatewayEvent, InboundMessage, PlatformAdapter } from "./types.js";

const logger = createLogger("gateway");

export type GatewayEventHandler = (event: GatewayEvent) => void;

export interface GatewayOptions {
  /** Event handler for gateway events (optional). */
  onEvent?: GatewayEventHandler;
}

export class Gateway {
  private adapters = new Map<string, PlatformAdapter>();
  private router: CommandRouter;
  private executor: CommandExecutor;
  private tracker: CommandTracker;
  private onEvent?: GatewayEventHandler;

  constructor(options: GatewayOptions = {}) {
    this.router = new CommandRouter();
    this.tracker = new CommandTracker();
    this.executor = new CommandExecutor(this.tracker);
    this.onEvent = options.onEvent;
  }

  /** Register a platform adapter with the gateway. */
  register(adapter: PlatformAdapter): void {
    if (this.adapters.has(adapter.platform)) {
      throw new Error(
        `Adapter already registered for platform: ${adapter.platform}`
      );
    }
    this.adapters.set(adapter.platform, adapter);
    logger.info(`Registered adapter: ${adapter.platform}`);
  }

  /** Get a registered adapter by platform name. */
  getAdapter(platform: string): PlatformAdapter | undefined {
    return this.adapters.get(platform);
  }

  /** Get the command router. */
  getRouter(): CommandRouter {
    return this.router;
  }

  /** Get the command executor. */
  getExecutor(): CommandExecutor {
    return this.executor;
  }

  /** Get the command tracker. */
  getTracker(): CommandTracker {
    return this.tracker;
  }

  /**
   * Handle an inbound message from any platform.
   *
   * This is the main entry point — adapters call this when they
   * receive a message from their platform.
   */
  async handleMessage(message: InboundMessage): Promise<void> {
    this.emit({ type: "message_received", message });

    const adapter = this.adapters.get(message.platform);
    if (!adapter) {
      logger.warn(`No adapter registered for platform: ${message.platform}`);
      return;
    }

    const parsed = this.router.parse(message.text);

    if (parsed.type === "freetext") {
      // Route free-text as an exec command
      await this.executeCommand(
        adapter,
        message.sessionId,
        "exec",
        [parsed.text],
        message
      );
      return;
    }

    await this.executeCommand(
      adapter,
      message.sessionId,
      parsed.command,
      parsed.args,
      message
    );
  }

  /** Start all registered adapters. */
  async start(): Promise<void> {
    const platforms = Array.from(this.adapters.keys());
    logger.info(`Starting gateway with adapters: ${platforms.join(", ")}`);

    for (const [platform, adapter] of this.adapters) {
      try {
        await adapter.start();
        logger.info(`Started adapter: ${platform}`);
      } catch (error) {
        logger.error(`Failed to start adapter: ${platform}`, {
          error: String(error),
        });
        throw error;
      }
    }
  }

  /** Stop all adapters gracefully. */
  async stop(): Promise<void> {
    for (const [platform, adapter] of this.adapters) {
      try {
        await adapter.stop();
        logger.info(`Stopped adapter: ${platform}`);
      } catch (error) {
        logger.warn(`Error stopping adapter: ${platform}`, {
          error: String(error),
        });
      }
    }
  }

  /** Execute a command and send the response through the adapter. */
  private async executeCommand(
    adapter: PlatformAdapter,
    sessionId: string,
    command: string,
    args: string[],
    _originalMessage: InboundMessage
  ): Promise<void> {
    this.emit({
      type: "command_started",
      sessionId,
      command,
      args,
    });

    let streamCallbacks: StreamCallbacks | undefined;

    if (adapter.capabilities.supportsStreaming && adapter.edit) {
      const adapterRef = adapter;
      const sentMessageId = "";

      streamCallbacks = {
        async onStart(text: string): Promise<string> {
          // Platform adapters that support streaming will provide a messageId
          // via the send method's metadata. We store it for subsequent edits.
          await adapterRef.send(sessionId, {
            text,
            format: "plain",
          });
          // The adapter should set the message ID via metadata;
          // for now we use a placeholder — individual adapters handle this.
          return sentMessageId;
        },
        async onUpdate(messageId: string, text: string): Promise<void> {
          if (adapterRef.edit) {
            await adapterRef.edit(sessionId, messageId, {
              text,
              format: "plain",
            });
          }
        },
        async onComplete(
          messageId: string,
          text: string,
          _exitCode: number
        ): Promise<void> {
          if (adapterRef.edit) {
            await adapterRef.edit(sessionId, messageId, {
              text,
              format: "plain",
            });
          }
        },
      };
    }

    const result = await this.executor.executeLocusCommand(
      sessionId,
      command,
      args,
      streamCallbacks
    );

    this.emit({
      type: "command_completed",
      sessionId,
      command,
      exitCode: result.exitCode,
    });

    // For non-streaming commands, send the result directly
    if (!result.streaming) {
      await adapter.send(sessionId, {
        text: result.text,
        format: result.format,
        actions: result.actions,
      });
    }
  }

  /** Emit a gateway event. */
  private emit(event: GatewayEvent): void {
    if (this.onEvent) {
      try {
        this.onEvent(event);
      } catch (error) {
        logger.warn("Event handler error", { error: String(error) });
      }
    }
  }
}
