import type { StreamChunk, ToolParams } from "../exec/types.js";
import { c } from "../utils/colors.js";
import type { LogFn } from "./factory.js";

export interface ClaudeStreamItem {
  type: string;
  result?: string;
  event?: {
    type: string;
    index?: number;
    delta?: {
      type: string;
      text?: string;
      partial_json?: string;
    };
    content_block?: {
      type: string;
      name?: string;
      id?: string;
    };
  };
}

/**
 * Tracks active tool executions including parameter accumulation.
 */
interface ActiveToolExecution {
  name: string;
  id?: string;
  index: number;
  parameterJson: string;
  startTime: number;
}

/**
 * Parses Claude CLI stream-json output into typed StreamChunks.
 * Handles both streaming mode (returns StreamChunk) and
 * non-streaming mode (returns result string).
 */
export class ClaudeStreamParser {
  private activeTools: Map<number, ActiveToolExecution> = new Map();

  /**
   * Parse a stream-json line into a StreamChunk (for streaming mode).
   */
  parseLineToChunk(line: string): StreamChunk | null {
    if (!line.trim()) return null;

    try {
      const item = JSON.parse(line) as ClaudeStreamItem;
      return this.processItemToChunk(item);
    } catch {
      return null;
    }
  }

  /**
   * Parse a stream-json line and extract the final result string (for non-streaming mode).
   */
  parseLine(line: string, log?: LogFn): string | null {
    if (!line.trim()) return null;

    try {
      const item = JSON.parse(line) as ClaudeStreamItem;
      return this.processItem(item, log);
    } catch {
      return null;
    }
  }

  private processItemToChunk(item: ClaudeStreamItem): StreamChunk | null {
    if (item.type === "result") {
      return { type: "result", content: item.result || "" };
    }

    if (item.type === "stream_event" && item.event) {
      return this.handleEventToChunk(item.event);
    }

    return null;
  }

  private handleEventToChunk(
    event: Required<ClaudeStreamItem>["event"]
  ): StreamChunk | null {
    const { type, delta, content_block, index } = event;

    // Handle text deltas
    if (type === "content_block_delta" && delta?.type === "text_delta") {
      return { type: "text_delta", content: delta.text || "" };
    }

    // Handle tool parameter deltas - accumulate JSON
    if (
      type === "content_block_delta" &&
      delta?.type === "input_json_delta" &&
      delta.partial_json !== undefined &&
      index !== undefined
    ) {
      const activeTool = this.activeTools.get(index);
      if (activeTool) {
        activeTool.parameterJson += delta.partial_json;
      }
      return null;
    }

    // Handle tool use start
    if (type === "content_block_start" && content_block) {
      if (content_block.type === "tool_use" && content_block.name) {
        // Track the tool execution with index
        if (index !== undefined) {
          this.activeTools.set(index, {
            name: content_block.name,
            id: content_block.id,
            index,
            parameterJson: "",
            startTime: Date.now(),
          });
        }
        // Return tool_use without parameters - will be updated on content_block_stop
        return {
          type: "tool_use",
          tool: content_block.name,
          id: content_block.id,
        };
      }
      if (content_block.type === "thinking") {
        return { type: "thinking" };
      }
    }

    // Handle content block stop - emit tool parameters chunk
    if (type === "content_block_stop" && index !== undefined) {
      const activeTool = this.activeTools.get(index);
      if (activeTool?.parameterJson) {
        try {
          const parameters = JSON.parse(activeTool.parameterJson) as ToolParams;
          // Return a tool_parameters chunk with the full parameters
          return {
            type: "tool_parameters" as const,
            tool: activeTool.name,
            id: activeTool.id,
            parameters,
          };
        } catch {
          // JSON parsing failed - params incomplete
        }
      }
      return null;
    }

    return null;
  }

  private processItem(item: ClaudeStreamItem, log?: LogFn): string | null {
    if (item.type === "result") {
      return item.result || "";
    }

    if (item.type === "stream_event" && item.event) {
      this.handleEvent(item.event, log);
    }

    return null;
  }

  private handleEvent(event: Required<ClaudeStreamItem>["event"], log?: LogFn) {
    const { type, content_block } = event;

    if (type === "content_block_start" && content_block) {
      if (content_block.type === "tool_use" && content_block.name) {
        log?.(
          `\n${c.primary("[Claude]")} ${c.bold(`Running ${content_block.name}...`)}\n`,
          "info"
        );
      }
    }
  }
}
