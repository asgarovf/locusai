import { describe, expect, it } from "bun:test";
import {
  createAssistantMessage,
  createErrorMessage,
  createMessageId,
  createSystemMessage,
  createToolMessage,
  createUserMessage,
  parseStreamLine,
} from "../session/message-handler";

describe("parseStreamLine", () => {
  it("returns null for empty lines", () => {
    expect(parseStreamLine("")).toBeNull();
    expect(parseStreamLine("   ")).toBeNull();
    expect(parseStreamLine("\n")).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parseStreamLine("not json")).toBeNull();
    expect(parseStreamLine("{broken")).toBeNull();
    expect(parseStreamLine("undefined")).toBeNull();
  });

  it("parses a result line into a done message", () => {
    const line = JSON.stringify({ type: "result", result: "Final output" });
    const msg = parseStreamLine(line);
    expect(msg).toEqual({ type: "done", content: "Final output" });
  });

  it("parses a result line with empty result", () => {
    const line = JSON.stringify({ type: "result" });
    const msg = parseStreamLine(line);
    expect(msg).toEqual({ type: "done", content: "" });
  });

  it("parses a text_delta stream event", () => {
    const line = JSON.stringify({
      type: "stream_event",
      event: {
        type: "content_block_delta",
        delta: { type: "text_delta", text: "Hello world" },
      },
    });
    const msg = parseStreamLine(line);
    expect(msg).toEqual({ type: "text_delta", content: "Hello world" });
  });

  it("parses text_delta with empty text", () => {
    const line = JSON.stringify({
      type: "stream_event",
      event: {
        type: "content_block_delta",
        delta: { type: "text_delta" },
      },
    });
    const msg = parseStreamLine(line);
    expect(msg).toEqual({ type: "text_delta", content: "" });
  });

  it("parses a tool_use start event", () => {
    const line = JSON.stringify({
      type: "stream_event",
      event: {
        type: "content_block_start",
        content_block: {
          type: "tool_use",
          name: "Read",
          id: "tool_123",
        },
      },
    });
    const msg = parseStreamLine(line);
    expect(msg).toEqual({
      type: "tool_start",
      tool: "Read",
      toolId: "tool_123",
    });
  });

  it("parses a thinking event", () => {
    const line = JSON.stringify({
      type: "stream_event",
      event: {
        type: "content_block_start",
        content_block: { type: "thinking" },
      },
    });
    const msg = parseStreamLine(line);
    expect(msg).toEqual({ type: "thinking" });
  });

  it("returns null for unrecognized stream event types", () => {
    const line = JSON.stringify({
      type: "stream_event",
      event: { type: "message_start" },
    });
    expect(parseStreamLine(line)).toBeNull();
  });

  it("returns null for input_json_delta events", () => {
    const line = JSON.stringify({
      type: "stream_event",
      event: {
        type: "content_block_delta",
        index: 1,
        delta: { type: "input_json_delta", partial_json: '{"foo":' },
      },
    });
    expect(parseStreamLine(line)).toBeNull();
  });

  it("returns null for unrecognized top-level types", () => {
    const line = JSON.stringify({ type: "unknown_type", data: "something" });
    expect(parseStreamLine(line)).toBeNull();
  });

  it("returns null for content_block_start without content_block", () => {
    const line = JSON.stringify({
      type: "stream_event",
      event: { type: "content_block_start" },
    });
    expect(parseStreamLine(line)).toBeNull();
  });

  it("returns null for tool_use without name", () => {
    const line = JSON.stringify({
      type: "stream_event",
      event: {
        type: "content_block_start",
        content_block: { type: "tool_use" },
      },
    });
    expect(parseStreamLine(line)).toBeNull();
  });
});

describe("createMessageId", () => {
  it("generates unique IDs", () => {
    const id1 = createMessageId();
    const id2 = createMessageId();
    expect(id1).not.toEqual(id2);
  });

  it("starts with msg_ prefix", () => {
    const id = createMessageId();
    expect(id.startsWith("msg_")).toBe(true);
  });
});

describe("message factory functions", () => {
  it("creates a user message with correct role and content", () => {
    const msg = createUserMessage("Hello");
    expect(msg.role).toBe("user");
    expect(msg.content).toBe("Hello");
    expect(msg.id).toBeDefined();
    expect(msg.timestamp).toBeGreaterThan(0);
  });

  it("creates an assistant message", () => {
    const msg = createAssistantMessage("Response text");
    expect(msg.role).toBe("assistant");
    expect(msg.content).toBe("Response text");
  });

  it("creates a tool message with status", () => {
    const msg = createToolMessage("Read", "running", "tool_1");
    expect(msg.role).toBe("tool");
    expect(msg.tool).toEqual({
      name: "Read",
      status: "running",
      toolId: "tool_1",
      error: undefined,
    });
  });

  it("creates a tool message with error", () => {
    const msg = createToolMessage(
      "Bash",
      "failed",
      "tool_2",
      "Permission denied"
    );
    expect(msg.tool?.status).toBe("failed");
    expect(msg.tool?.error).toBe("Permission denied");
  });

  it("creates an error message", () => {
    const msg = createErrorMessage("Something went wrong");
    expect(msg.role).toBe("error");
    expect(msg.content).toBe("Something went wrong");
  });

  it("creates a system message", () => {
    const msg = createSystemMessage("Session started");
    expect(msg.role).toBe("system");
    expect(msg.content).toBe("Session started");
  });
});
