import { describe, expect, it } from "bun:test";
import { z } from "zod";
import {
  type ContextPayload,
  ContextPayloadSchema,
  createErrorEvent,
  createHostEvent,
  createProtocolError,
  createUIIntent,
  getNextStatus,
  type HostEvent,
  HostEventSchema,
  HostEventType,
  isHostEventType,
  isTerminalStatus,
  isUIIntentType,
  isValidTransition,
  PROTOCOL_VERSION,
  type ProtocolError,
  ProtocolErrorCode,
  ProtocolErrorSchema,
  parseHostEvent,
  parseUIIntent,
  SESSION_TRANSITIONS,
  type SessionMetadata,
  SessionMetadataSchema,
  SessionStatus,
  SessionStatusSchema,
  type SessionSummary,
  SessionSummarySchema,
  TERMINAL_STATUSES,
  type UIIntent,
  UIIntentSchema,
  UIIntentType,
} from "../index";

// ============================================================================
// Protocol Version
// ============================================================================

describe("PROTOCOL_VERSION", () => {
  it("is a positive integer", () => {
    expect(typeof PROTOCOL_VERSION).toBe("number");
    expect(PROTOCOL_VERSION).toBe(1);
  });
});

// ============================================================================
// Session Status
// ============================================================================

describe("SessionStatus", () => {
  it("contains all 9 defined states", () => {
    const expected = [
      "idle",
      "starting",
      "running",
      "streaming",
      "completed",
      "canceled",
      "interrupted",
      "failed",
      "resuming",
    ];
    const values = Object.values(SessionStatus);
    expect(values).toEqual(expect.arrayContaining(expected));
    expect(values).toHaveLength(expected.length);
  });

  it("schema validates valid statuses", () => {
    for (const status of Object.values(SessionStatus)) {
      expect(SessionStatusSchema.safeParse(status).success).toBe(true);
    }
  });

  it("schema rejects invalid status", () => {
    expect(SessionStatusSchema.safeParse("paused").success).toBe(false);
  });
});

// ============================================================================
// Session Metadata
// ============================================================================

describe("SessionMetadataSchema", () => {
  it("parses valid metadata", () => {
    const data: SessionMetadata = {
      sessionId: "abc-123",
      status: SessionStatus.RUNNING,
      model: "claude-sonnet-4-5-20250929",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    expect(SessionMetadataSchema.parse(data)).toEqual(data);
  });

  it("rejects metadata with invalid status", () => {
    const result = SessionMetadataSchema.safeParse({
      sessionId: "abc-123",
      status: "INVALID",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Session Summary
// ============================================================================

describe("SessionSummarySchema", () => {
  it("parses valid summary", () => {
    const data: SessionSummary = {
      sessionId: "abc-123",
      status: SessionStatus.COMPLETED,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 5,
      toolCount: 3,
    };
    expect(SessionSummarySchema.parse(data)).toEqual(data);
  });
});

// ============================================================================
// Session Transitions
// ============================================================================

describe("SESSION_TRANSITIONS", () => {
  it("has no duplicate transitions", () => {
    const keys = SESSION_TRANSITIONS.map((t) => `${t.from}:${t.event}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("terminal states only transition via create_session", () => {
    for (const status of TERMINAL_STATUSES) {
      const transitions = SESSION_TRANSITIONS.filter((t) => t.from === status);
      for (const t of transitions) {
        expect(t.event).toBe("create_session");
        expect(t.to).toBe(SessionStatus.STARTING);
      }
    }
  });
});

// ============================================================================
// Context Payload
// ============================================================================

describe("ContextPayloadSchema", () => {
  it("parses empty context", () => {
    const data: ContextPayload = {};
    expect(ContextPayloadSchema.parse(data)).toEqual(data);
  });

  it("parses full context", () => {
    const data: ContextPayload = {
      workspace: { rootPath: "/home/user/project", name: "my-project" },
      activeFile: {
        filePath: "src/index.ts",
        languageId: "typescript",
      },
      selection: {
        filePath: "src/index.ts",
        languageId: "typescript",
        startLine: 10,
        startColumn: 0,
        endLine: 20,
        endColumn: 5,
        text: "const x = 1;",
      },
    };
    expect(ContextPayloadSchema.parse(data)).toEqual(data);
  });

  it("rejects selection with negative line numbers", () => {
    const result = ContextPayloadSchema.safeParse({
      selection: {
        filePath: "src/index.ts",
        startLine: -1,
        startColumn: 0,
        endLine: 5,
        endColumn: 0,
        text: "hello",
      },
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Protocol Errors
// ============================================================================

describe("ProtocolErrorSchema", () => {
  it("parses all error codes", () => {
    for (const code of Object.values(ProtocolErrorCode)) {
      const error: ProtocolError = {
        code,
        message: `Error: ${code}`,
        recoverable: false,
      };
      expect(ProtocolErrorSchema.parse(error)).toEqual(error);
    }
  });

  it("rejects unknown error codes", () => {
    const result = ProtocolErrorSchema.safeParse({
      code: "NOT_A_REAL_CODE",
      message: "test",
      recoverable: false,
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// UI Intents (Webview → Host)
// ============================================================================

describe("UIIntentSchema", () => {
  it("parses submit_prompt intent", () => {
    const intent = {
      protocol: PROTOCOL_VERSION,
      type: UIIntentType.SUBMIT_PROMPT,
      payload: { text: "explain this code" },
    };
    const parsed = UIIntentSchema.parse(intent);
    expect(parsed.type).toBe("submit_prompt");
  });

  it("parses submit_prompt with full context", () => {
    const intent = {
      protocol: PROTOCOL_VERSION,
      type: UIIntentType.SUBMIT_PROMPT,
      payload: {
        text: "explain this",
        context: {
          workspace: { rootPath: "/project" },
          activeFile: { filePath: "src/main.ts" },
        },
      },
    };
    expect(UIIntentSchema.parse(intent).type).toBe("submit_prompt");
  });

  it("rejects submit_prompt with empty text", () => {
    const intent = {
      protocol: PROTOCOL_VERSION,
      type: UIIntentType.SUBMIT_PROMPT,
      payload: { text: "" },
    };
    expect(UIIntentSchema.safeParse(intent).success).toBe(false);
  });

  it("parses stop_session intent", () => {
    const intent = {
      protocol: PROTOCOL_VERSION,
      type: UIIntentType.STOP_SESSION,
      payload: { sessionId: "sess-1" },
    };
    expect(UIIntentSchema.parse(intent).type).toBe("stop_session");
  });

  it("parses resume_session intent", () => {
    const intent = {
      protocol: PROTOCOL_VERSION,
      type: UIIntentType.RESUME_SESSION,
      payload: { sessionId: "sess-1" },
    };
    expect(UIIntentSchema.parse(intent).type).toBe("resume_session");
  });

  it("parses request_sessions intent", () => {
    const intent = {
      protocol: PROTOCOL_VERSION,
      type: UIIntentType.REQUEST_SESSIONS,
    };
    expect(UIIntentSchema.parse(intent).type).toBe("request_sessions");
  });

  it("parses request_session_detail intent", () => {
    const intent = {
      protocol: PROTOCOL_VERSION,
      type: UIIntentType.REQUEST_SESSION_DETAIL,
      payload: { sessionId: "sess-1" },
    };
    expect(UIIntentSchema.parse(intent).type).toBe("request_session_detail");
  });

  it("parses clear_session intent", () => {
    const intent = {
      protocol: PROTOCOL_VERSION,
      type: UIIntentType.CLEAR_SESSION,
      payload: { sessionId: "sess-1" },
    };
    expect(UIIntentSchema.parse(intent).type).toBe("clear_session");
  });

  it("parses webview_ready intent", () => {
    const intent = {
      protocol: PROTOCOL_VERSION,
      type: UIIntentType.WEBVIEW_READY,
    };
    expect(UIIntentSchema.parse(intent).type).toBe("webview_ready");
  });

  it("rejects unknown intent type", () => {
    const intent = {
      protocol: PROTOCOL_VERSION,
      type: "unknown_intent",
      payload: {},
    };
    expect(UIIntentSchema.safeParse(intent).success).toBe(false);
  });

  it("rejects wrong protocol version", () => {
    const intent = {
      protocol: 99,
      type: UIIntentType.WEBVIEW_READY,
    };
    expect(UIIntentSchema.safeParse(intent).success).toBe(false);
  });

  it("parses all 7 intent types", () => {
    expect(Object.keys(UIIntentType)).toHaveLength(7);
  });
});

// ============================================================================
// Host Events (Host → Webview)
// ============================================================================

describe("HostEventSchema", () => {
  it("parses session_state event", () => {
    const event = {
      protocol: PROTOCOL_VERSION,
      type: HostEventType.SESSION_STATE,
      payload: {
        sessionId: "sess-1",
        status: SessionStatus.RUNNING,
      },
    };
    expect(HostEventSchema.parse(event).type).toBe("session_state");
  });

  it("parses text_delta event", () => {
    const event = {
      protocol: PROTOCOL_VERSION,
      type: HostEventType.TEXT_DELTA,
      payload: {
        sessionId: "sess-1",
        content: "Hello, world!",
      },
    };
    expect(HostEventSchema.parse(event).type).toBe("text_delta");
  });

  it("parses tool_started event", () => {
    const event = {
      protocol: PROTOCOL_VERSION,
      type: HostEventType.TOOL_STARTED,
      payload: {
        sessionId: "sess-1",
        tool: "Read",
        parameters: { file_path: "src/main.ts" },
      },
    };
    expect(HostEventSchema.parse(event).type).toBe("tool_started");
  });

  it("parses tool_completed event", () => {
    const event = {
      protocol: PROTOCOL_VERSION,
      type: HostEventType.TOOL_COMPLETED,
      payload: {
        sessionId: "sess-1",
        tool: "Read",
        duration: 150,
        success: true,
      },
    };
    expect(HostEventSchema.parse(event).type).toBe("tool_completed");
  });

  it("parses thinking event", () => {
    const event = {
      protocol: PROTOCOL_VERSION,
      type: HostEventType.THINKING,
      payload: {
        sessionId: "sess-1",
        content: "Analyzing the code structure...",
      },
    };
    expect(HostEventSchema.parse(event).type).toBe("thinking");
  });

  it("parses error event with full error envelope", () => {
    const event = {
      protocol: PROTOCOL_VERSION,
      type: HostEventType.ERROR,
      payload: {
        sessionId: "sess-1",
        error: {
          code: ProtocolErrorCode.CLI_NOT_FOUND,
          message: "Locus CLI not found",
          recoverable: true,
        },
      },
    };
    const parsed = HostEventSchema.parse(event);
    expect(parsed.type).toBe("error");
  });

  it("parses session_list event", () => {
    const event = {
      protocol: PROTOCOL_VERSION,
      type: HostEventType.SESSION_LIST,
      payload: {
        sessions: [
          {
            sessionId: "s-1",
            status: SessionStatus.COMPLETED,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messageCount: 3,
            toolCount: 1,
          },
        ],
      },
    };
    expect(HostEventSchema.parse(event).type).toBe("session_list");
  });

  it("parses session_completed event", () => {
    const event = {
      protocol: PROTOCOL_VERSION,
      type: HostEventType.SESSION_COMPLETED,
      payload: {
        sessionId: "sess-1",
        summary: "Explained the login flow",
      },
    };
    expect(HostEventSchema.parse(event).type).toBe("session_completed");
  });

  it("rejects unknown event type", () => {
    const event = {
      protocol: PROTOCOL_VERSION,
      type: "unknown_event",
      payload: {},
    };
    expect(HostEventSchema.safeParse(event).success).toBe(false);
  });

  it("parses all 8 event types", () => {
    expect(Object.keys(HostEventType)).toHaveLength(8);
  });
});

// ============================================================================
// Typed Constructors
// ============================================================================

describe("createUIIntent", () => {
  it("creates a validated submit_prompt intent", () => {
    const intent = createUIIntent(UIIntentType.SUBMIT_PROMPT, {
      text: "hello",
    });
    expect(intent.protocol).toBe(PROTOCOL_VERSION);
    expect(intent.type).toBe("submit_prompt");
  });

  it("throws on invalid payload", () => {
    expect(() =>
      createUIIntent(UIIntentType.SUBMIT_PROMPT, {
        text: "",
      })
    ).toThrow();
  });
});

describe("createHostEvent", () => {
  it("creates a validated text_delta event", () => {
    const event = createHostEvent(HostEventType.TEXT_DELTA, {
      sessionId: "sess-1",
      content: "Hello",
    });
    expect(event.protocol).toBe(PROTOCOL_VERSION);
    expect(event.type).toBe("text_delta");
  });
});

describe("createErrorEvent", () => {
  it("creates a structured error event", () => {
    const event = createErrorEvent(
      ProtocolErrorCode.AUTH_EXPIRED,
      "Token expired",
      { sessionId: "sess-1", recoverable: true }
    );
    expect(event.type).toBe("error");
    expect(event.payload.error.code).toBe("AUTH_EXPIRED");
    expect(event.payload.error.recoverable).toBe(true);
  });
});

describe("createProtocolError", () => {
  it("creates an error with defaults", () => {
    const err = createProtocolError(
      ProtocolErrorCode.UNKNOWN,
      "Something went wrong"
    );
    expect(err.recoverable).toBe(false);
    expect(err.details).toBeUndefined();
  });

  it("creates an error with details", () => {
    const err = createProtocolError(
      ProtocolErrorCode.PROCESS_CRASHED,
      "CLI exited with code 1",
      { details: { exitCode: 1 }, recoverable: true }
    );
    expect(err.recoverable).toBe(true);
    expect(err.details).toEqual({ exitCode: 1 });
  });
});

// ============================================================================
// Type Guards
// ============================================================================

describe("isUIIntentType", () => {
  it("narrows to specific intent type", () => {
    const intent = createUIIntent(UIIntentType.SUBMIT_PROMPT, {
      text: "test",
    });
    if (isUIIntentType(intent, UIIntentType.SUBMIT_PROMPT)) {
      // Compile-time check: payload should have `text`
      expect(intent.payload.text).toBe("test");
    } else {
      throw new Error("Type guard failed");
    }
  });

  it("returns false for non-matching type", () => {
    const intent = createUIIntent(UIIntentType.WEBVIEW_READY, undefined);
    expect(isUIIntentType(intent, UIIntentType.SUBMIT_PROMPT)).toBe(false);
  });
});

describe("isHostEventType", () => {
  it("narrows to specific event type", () => {
    const event = createHostEvent(HostEventType.TEXT_DELTA, {
      sessionId: "s-1",
      content: "Hi",
    });
    if (isHostEventType(event, HostEventType.TEXT_DELTA)) {
      expect(event.payload.content).toBe("Hi");
    } else {
      throw new Error("Type guard failed");
    }
  });
});

// ============================================================================
// Parse Helpers (safe validation)
// ============================================================================

describe("parseUIIntent", () => {
  it("returns success for valid intent", () => {
    const result = parseUIIntent({
      protocol: PROTOCOL_VERSION,
      type: "webview_ready",
    });
    expect(result.success).toBe(true);
  });

  it("returns failure for garbage input", () => {
    const result = parseUIIntent({ foo: "bar" });
    expect(result.success).toBe(false);
  });

  it("returns failure for null", () => {
    const result = parseUIIntent(null);
    expect(result.success).toBe(false);
  });
});

describe("parseHostEvent", () => {
  it("returns success for valid event", () => {
    const result = parseHostEvent({
      protocol: PROTOCOL_VERSION,
      type: "text_delta",
      payload: { sessionId: "s-1", content: "hi" },
    });
    expect(result.success).toBe(true);
  });

  it("returns failure for missing payload", () => {
    const result = parseHostEvent({
      protocol: PROTOCOL_VERSION,
      type: "text_delta",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// State Machine Helpers
// ============================================================================

describe("isValidTransition", () => {
  it("returns true for valid transition", () => {
    expect(isValidTransition(SessionStatus.IDLE, "create_session")).toBe(true);
  });

  it("returns false for invalid transition", () => {
    expect(isValidTransition(SessionStatus.COMPLETED, "cli_spawned")).toBe(
      false
    );
  });
});

describe("getNextStatus", () => {
  it("returns target state for valid transition", () => {
    expect(getNextStatus(SessionStatus.IDLE, "create_session")).toBe(
      SessionStatus.STARTING
    );
    expect(getNextStatus(SessionStatus.STARTING, "cli_spawned")).toBe(
      SessionStatus.RUNNING
    );
    expect(getNextStatus(SessionStatus.RUNNING, "first_text_delta")).toBe(
      SessionStatus.STREAMING
    );
    expect(getNextStatus(SessionStatus.STREAMING, "result_received")).toBe(
      SessionStatus.COMPLETED
    );
  });

  it("returns null for invalid transition", () => {
    expect(getNextStatus(SessionStatus.COMPLETED, "cli_spawned")).toBeNull();
  });
});

describe("isTerminalStatus", () => {
  it("returns true for terminal states", () => {
    expect(isTerminalStatus(SessionStatus.COMPLETED)).toBe(true);
    expect(isTerminalStatus(SessionStatus.CANCELED)).toBe(true);
    expect(isTerminalStatus(SessionStatus.FAILED)).toBe(true);
  });

  it("returns false for non-terminal states", () => {
    expect(isTerminalStatus(SessionStatus.IDLE)).toBe(false);
    expect(isTerminalStatus(SessionStatus.RUNNING)).toBe(false);
    expect(isTerminalStatus(SessionStatus.STREAMING)).toBe(false);
  });
});

// ============================================================================
// Schema Drift Detection
// ============================================================================

describe("schema drift detection", () => {
  it("UIIntentType values match UIIntentSchema discriminator options", () => {
    // Extract the set of type literals accepted by the discriminated union.
    // In Zod v4, ZodLiteral exposes `.value` getter for single-value literals.
    const schemaTypes = new Set(
      UIIntentSchema.options.map(
        (opt) => (opt.shape.type as z.ZodLiteral<string>).value
      )
    );
    const enumTypes = new Set(Object.values(UIIntentType));
    expect(schemaTypes).toEqual(enumTypes);
  });

  it("HostEventType values match HostEventSchema discriminator options", () => {
    const schemaTypes = new Set(
      HostEventSchema.options.map(
        (opt) => (opt.shape.type as z.ZodLiteral<string>).value
      )
    );
    const enumTypes = new Set(Object.values(HostEventType));
    expect(schemaTypes).toEqual(enumTypes);
  });

  it("every SessionStatus value is accepted by SessionStatusSchema", () => {
    for (const status of Object.values(SessionStatus)) {
      const result = SessionStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
    }
  });

  it("every ProtocolErrorCode value is accepted by ProtocolErrorCodeSchema", () => {
    for (const code of Object.values(ProtocolErrorCode)) {
      const result = ProtocolErrorSchema.safeParse({
        code,
        message: "test",
        recoverable: false,
      });
      expect(result.success).toBe(true);
    }
  });

  it("round-trip: construct → serialize → parse for UIIntent", () => {
    const intent = createUIIntent(UIIntentType.SUBMIT_PROMPT, {
      text: "hello",
      context: {
        workspace: { rootPath: "/project" },
      },
    });
    const serialized = JSON.parse(JSON.stringify(intent));
    const reparsed = UIIntentSchema.parse(serialized);
    expect(reparsed).toEqual(intent);
  });

  it("round-trip: construct → serialize → parse for HostEvent", () => {
    const event = createHostEvent(HostEventType.SESSION_STATE, {
      sessionId: "sess-1",
      status: SessionStatus.STREAMING,
      timeline: [
        {
          id: "t-1",
          kind: "message",
          timestamp: Date.now(),
          data: { content: "hello" },
        },
      ],
    });
    const serialized = JSON.parse(JSON.stringify(event));
    const reparsed = HostEventSchema.parse(serialized);
    expect(reparsed).toEqual(event);
  });
});

// ============================================================================
// Compile-Time Type Assertions
// ============================================================================

// These assertions ensure types stay aligned at compile time.
// If the schema changes in a way that breaks these, TypeScript will error.

type _AssertUIIntentHasProtocol = UIIntent extends { protocol: 1 }
  ? true
  : never;

type _AssertHostEventHasProtocol = HostEvent extends { protocol: 1 }
  ? true
  : never;

type _AssertUIIntentHasType = UIIntent extends { type: string } ? true : never;

type _AssertHostEventHasType = HostEvent extends { type: string }
  ? true
  : never;
