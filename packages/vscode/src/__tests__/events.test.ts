import {
  CliStreamEventType,
  createCliStreamEvent,
  HostEventType,
  PROTOCOL_VERSION,
  ProtocolErrorCode,
} from "@locusai/shared";
import {
  createMalformedEventError,
  createProcessCrashError,
  createTimeoutError,
  normalizeCliEvent,
} from "../core/events";

const SESSION_ID = "test-session-001";

describe("normalizeCliEvent", () => {
  it("maps text_delta to host TextDelta event", () => {
    const cli = createCliStreamEvent(
      CliStreamEventType.TEXT_DELTA,
      SESSION_ID,
      { content: "Hello world" }
    );
    const host = normalizeCliEvent(cli);

    expect(host).not.toBeNull();
    expect(host?.type).toBe(HostEventType.TEXT_DELTA);
    expect(host?.payload).toEqual({
      sessionId: SESSION_ID,
      content: "Hello world",
    });
  });

  it("maps thinking to host Thinking event", () => {
    const cli = createCliStreamEvent(CliStreamEventType.THINKING, SESSION_ID, {
      content: "Reasoning...",
    });
    const host = normalizeCliEvent(cli);

    expect(host).not.toBeNull();
    expect(host?.type).toBe(HostEventType.THINKING);
    expect(host?.payload).toEqual({
      sessionId: SESSION_ID,
      content: "Reasoning...",
    });
  });

  it("maps tool_started to host ToolStarted event", () => {
    const cli = createCliStreamEvent(
      CliStreamEventType.TOOL_STARTED,
      SESSION_ID,
      { tool: "read_file", toolId: "t1", parameters: { path: "/foo" } }
    );
    const host = normalizeCliEvent(cli);

    expect(host).not.toBeNull();
    expect(host?.type).toBe(HostEventType.TOOL_STARTED);
    expect(host?.payload).toEqual({
      sessionId: SESSION_ID,
      tool: "read_file",
      toolId: "t1",
      parameters: { path: "/foo" },
    });
  });

  it("maps tool_completed to host ToolCompleted event", () => {
    const cli = createCliStreamEvent(
      CliStreamEventType.TOOL_COMPLETED,
      SESSION_ID,
      { tool: "read_file", toolId: "t1", success: true, duration: 120 }
    );
    const host = normalizeCliEvent(cli);

    expect(host).not.toBeNull();
    expect(host?.type).toBe(HostEventType.TOOL_COMPLETED);
    expect(host?.payload).toEqual({
      sessionId: SESSION_ID,
      tool: "read_file",
      toolId: "t1",
      success: true,
      duration: 120,
    });
  });

  it("maps error to host Error event", () => {
    const cli = createCliStreamEvent(CliStreamEventType.ERROR, SESSION_ID, {
      error: {
        code: ProtocolErrorCode.CONTEXT_LIMIT,
        message: "Context limit exceeded",
        recoverable: false,
      },
    });
    const host = normalizeCliEvent(cli);

    expect(host).not.toBeNull();
    expect(host?.type).toBe(HostEventType.ERROR);
  });

  it("maps done to host SessionCompleted event", () => {
    const cli = createCliStreamEvent(CliStreamEventType.DONE, SESSION_ID, {
      exitCode: 0,
      duration: 5000,
      success: true,
    });
    const host = normalizeCliEvent(cli);

    expect(host).not.toBeNull();
    expect(host?.type).toBe(HostEventType.SESSION_COMPLETED);
    expect(host?.payload).toEqual({
      sessionId: SESSION_ID,
    });
  });

  it("returns null for start event", () => {
    const cli = createCliStreamEvent(CliStreamEventType.START, SESSION_ID, {
      command: "chat",
    });
    const host = normalizeCliEvent(cli);

    expect(host).toBeNull();
  });

  it("returns null for status event", () => {
    const cli = createCliStreamEvent(CliStreamEventType.STATUS, SESSION_ID, {
      status: "running",
    });
    const host = normalizeCliEvent(cli);

    expect(host).toBeNull();
  });
});

describe("createMalformedEventError", () => {
  it("creates an error event with MALFORMED_EVENT code", () => {
    const event = createMalformedEventError(
      SESSION_ID,
      '{"bad": "json"}',
      new Error("Missing type field")
    );

    expect(event.type).toBe(HostEventType.ERROR);
    expect(event.protocol).toBe(PROTOCOL_VERSION);
    expect(event.payload.error.code).toBe(ProtocolErrorCode.MALFORMED_EVENT);
    expect(event.payload.error.message).toBe(
      "Failed to parse CLI stream event"
    );
    expect(event.payload.error.recoverable).toBe(true);
  });

  it("truncates long raw lines in details", () => {
    const longLine = "x".repeat(1000);
    const event = createMalformedEventError(
      SESSION_ID,
      longLine,
      new Error("too long")
    );

    const details = event.payload.error.details as {
      raw: string;
      error: string;
    };
    expect(details.raw.length).toBe(500);
  });

  it("handles non-Error objects as parse errors", () => {
    const event = createMalformedEventError(SESSION_ID, "bad", "string error");

    const details = event.payload.error.details as {
      raw: string;
      error: string;
    };
    expect(details.error).toBe("string error");
  });
});

describe("createProcessCrashError", () => {
  it("creates error for exit code crash", () => {
    const event = createProcessCrashError(SESSION_ID, 1, null);

    expect(event.type).toBe(HostEventType.ERROR);
    expect(event.payload.error.code).toBe(ProtocolErrorCode.PROCESS_CRASHED);
    expect(event.payload.error.message).toBe("CLI process exited with code 1");
    expect(event.payload.error.recoverable).toBe(false);
  });

  it("creates error for signal kill", () => {
    const event = createProcessCrashError(SESSION_ID, null, "SIGKILL");

    expect(event.payload.error.message).toBe(
      "CLI process killed by signal SIGKILL"
    );
  });
});

describe("createTimeoutError", () => {
  it("creates error with NETWORK_TIMEOUT code", () => {
    const event = createTimeoutError(SESSION_ID, 30000);

    expect(event.type).toBe(HostEventType.ERROR);
    expect(event.payload.error.code).toBe(ProtocolErrorCode.NETWORK_TIMEOUT);
    expect(event.payload.error.message).toBe(
      "CLI session timed out after 30s. The process was automatically stopped."
    );
    expect(event.payload.error.recoverable).toBe(false);
  });
});
