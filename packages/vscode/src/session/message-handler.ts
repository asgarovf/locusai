/**
 * Parses the stream-json output from the Claude CLI into structured messages
 * for display in the VS Code webview.
 *
 * The Claude CLI (with --output-format stream-json --verbose) emits NDJSON
 * lines. Each line is either:
 *   - { type: "stream_event", event: { type, delta, content_block, ... } }
 *   - { type: "result", result: "..." }
 */

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool" | "error" | "system";
  content: string;
  timestamp: number;
  tool?: {
    name: string;
    status: "running" | "completed" | "failed";
    toolId?: string;
    error?: string;
  };
}

export interface WebviewMessage {
  type:
    | "text_delta"
    | "tool_start"
    | "tool_complete"
    | "tool_fail"
    | "thinking"
    | "done"
    | "error";
  content?: string;
  tool?: string;
  toolId?: string;
  error?: string;
}

interface ClaudeStreamItem {
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
 * Parse a single line of NDJSON output from the Claude CLI stream.
 * Returns a WebviewMessage or null if the line should be ignored.
 */
export function parseStreamLine(line: string): WebviewMessage | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  let item: ClaudeStreamItem;
  try {
    item = JSON.parse(trimmed);
  } catch {
    return null;
  }

  // Final result
  if (item.type === "result") {
    return { type: "done", content: item.result || "" };
  }

  // Stream events
  if (item.type === "stream_event" && item.event) {
    return handleStreamEvent(item.event);
  }

  return null;
}

function handleStreamEvent(
  event: NonNullable<ClaudeStreamItem["event"]>
): WebviewMessage | null {
  const { type, delta, content_block } = event;

  // Text delta
  if (type === "content_block_delta" && delta?.type === "text_delta") {
    return { type: "text_delta", content: delta.text || "" };
  }

  // Tool use start
  if (type === "content_block_start" && content_block) {
    if (content_block.type === "tool_use" && content_block.name) {
      return {
        type: "tool_start",
        tool: content_block.name,
        toolId: content_block.id,
      };
    }
    if (content_block.type === "thinking") {
      return { type: "thinking" };
    }
  }

  return null;
}

/**
 * Build a unique message ID.
 */
export function createMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create a user chat message.
 */
export function createUserMessage(content: string): ChatMessage {
  return {
    id: createMessageId(),
    role: "user",
    content,
    timestamp: Date.now(),
  };
}

/**
 * Create an assistant chat message.
 */
export function createAssistantMessage(content: string): ChatMessage {
  return {
    id: createMessageId(),
    role: "assistant",
    content,
    timestamp: Date.now(),
  };
}

/**
 * Create a tool status message.
 */
export function createToolMessage(
  toolName: string,
  status: "running" | "completed" | "failed",
  toolId?: string,
  error?: string
): ChatMessage {
  return {
    id: createMessageId(),
    role: "tool",
    content: "",
    timestamp: Date.now(),
    tool: { name: toolName, status, toolId, error },
  };
}

/**
 * Create an error message.
 */
export function createErrorMessage(error: string): ChatMessage {
  return {
    id: createMessageId(),
    role: "error",
    content: error,
    timestamp: Date.now(),
  };
}

/**
 * Create a system message.
 */
export function createSystemMessage(content: string): ChatMessage {
  return {
    id: createMessageId(),
    role: "system",
    content,
    timestamp: Date.now(),
  };
}
