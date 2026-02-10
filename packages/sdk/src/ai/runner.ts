import type { Provider } from "../core/config.js";
import type { ExecEventEmitter } from "../exec/event-emitter.js";
import type { StreamChunk } from "../exec/types.js";

export interface AiRunner {
  run(prompt: string): Promise<string>;
  runStream(prompt: string): AsyncGenerator<StreamChunk, void, unknown>;
  /**
   * Set an event emitter to receive execution events.
   */
  setEventEmitter?(emitter: ExecEventEmitter): void;
  /**
   * Abort the currently running CLI process, if any.
   * Used during graceful shutdown to prevent orphaned processes.
   */
  abort(): void;
}

export type AiProvider = Provider;
