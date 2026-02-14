import {
  type CliStreamEvent,
  CliStreamEventType,
  createErrorEvent,
  createHostEvent,
  type HostEvent,
  HostEventType,
  ProtocolErrorCode,
} from "@locusai/shared";

/**
 * Normalize a validated CLI stream event into a typed HostEvent.
 *
 * Maps CLI-side event types to host-side event types that can be
 * forwarded to the webview. Returns `null` for events that have
 * no direct host-event counterpart (e.g. `start`, `status`).
 */
export function normalizeCliEvent(event: CliStreamEvent): HostEvent | null {
  const sid = event.sessionId;

  switch (event.type) {
    case CliStreamEventType.TEXT_DELTA:
      return createHostEvent(HostEventType.TEXT_DELTA, {
        sessionId: sid,
        content: event.payload.content,
      });

    case CliStreamEventType.THINKING:
      return createHostEvent(HostEventType.THINKING, {
        sessionId: sid,
        content: event.payload.content,
      });

    case CliStreamEventType.TOOL_STARTED:
      return createHostEvent(HostEventType.TOOL_STARTED, {
        sessionId: sid,
        tool: event.payload.tool,
        toolId: event.payload.toolId,
        parameters: event.payload.parameters,
      });

    case CliStreamEventType.TOOL_COMPLETED:
      return createHostEvent(HostEventType.TOOL_COMPLETED, {
        sessionId: sid,
        tool: event.payload.tool,
        toolId: event.payload.toolId,
        success: event.payload.success,
        duration: event.payload.duration,
        error: event.payload.error,
      });

    case CliStreamEventType.ERROR:
      return createHostEvent(HostEventType.ERROR, {
        sessionId: sid,
        error: event.payload.error,
      });

    case CliStreamEventType.DONE:
      return createHostEvent(HostEventType.SESSION_COMPLETED, {
        sessionId: sid,
      });

    case CliStreamEventType.START:
    case CliStreamEventType.STATUS:
      return null;

    default:
      return null;
  }
}

/**
 * Create a structured error HostEvent for a malformed CLI stream line.
 */
export function createMalformedEventError(
  sessionId: string | undefined,
  rawLine: string,
  parseError: unknown
): HostEvent {
  return createErrorEvent(
    ProtocolErrorCode.MALFORMED_EVENT,
    "Failed to parse CLI stream event",
    {
      sessionId,
      details: {
        raw: rawLine.slice(0, 500),
        error:
          parseError instanceof Error ? parseError.message : String(parseError),
      },
      recoverable: true,
    }
  );
}

/**
 * Create a structured error HostEvent for a crashed CLI process.
 */
export function createProcessCrashError(
  sessionId: string | undefined,
  exitCode: number | null,
  signal: string | null
): HostEvent {
  const reason = signal
    ? `CLI process killed by signal ${signal}`
    : `CLI process exited with code ${exitCode}`;

  return createErrorEvent(ProtocolErrorCode.PROCESS_CRASHED, reason, {
    sessionId,
    details: { exitCode, signal },
    recoverable: false,
  });
}

/**
 * Create a structured error HostEvent for a timeout.
 */
export function createTimeoutError(
  sessionId: string | undefined,
  timeoutMs: number
): HostEvent {
  return createErrorEvent(
    ProtocolErrorCode.NETWORK_TIMEOUT,
    `CLI process timed out after ${timeoutMs}ms`,
    {
      sessionId,
      details: { timeoutMs },
      recoverable: false,
    }
  );
}
