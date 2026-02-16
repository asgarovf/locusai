import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  type HostEvent,
  HostEventType,
  ProtocolErrorCode,
} from "@locusai/shared";
import { CliBridge } from "../core/cli-bridge";
import type { ProcessExitResult } from "../core/process-runner";

/**
 * Write a temporary bash script that outputs NDJSON lines and returns
 * the path to the script. The script ignores all arguments (matching
 * how CliBridge passes --json-stream and other flags).
 */
function writeTempScript(body: string): string {
  const tmpDir = os.tmpdir();
  const scriptPath = path.join(
    tmpDir,
    `cli-bridge-test-${Date.now()}-${Math.random().toString(36).slice(2)}.sh`
  );
  fs.writeFileSync(scriptPath, `#!/bin/bash\n${body}\n`, { mode: 0o755 });
  return scriptPath;
}

/**
 * Build a script body that writes NDJSON lines to stdout.
 */
function ndjsonBody(jsonStrings: string[]): string {
  return jsonStrings
    .map((s) => `printf '%s\\n' '${s.replace(/'/g, "'\\''")}'`)
    .join("\n");
}

function makeCliEvent(
  type: string,
  sessionId: string,
  payload: Record<string, unknown>
): string {
  return JSON.stringify({
    protocol: 1,
    type,
    sessionId,
    timestamp: Date.now(),
    payload,
  });
}

const SID = "test-session-001";

describe("CliBridge", () => {
  let bridge: CliBridge;
  const tmpFiles: string[] = [];

  afterEach(() => {
    bridge?.removeAllListeners();
    if (bridge?.running) {
      bridge.kill();
    }
    for (const f of tmpFiles) {
      try {
        fs.unlinkSync(f);
      } catch {
        // ignore
      }
    }
    tmpFiles.length = 0;
  });

  function script(body: string): string {
    const p = writeTempScript(body);
    tmpFiles.push(p);
    return p;
  }

  function startBridge(
    scriptPath: string,
    overrides?: Partial<Parameters<CliBridge["start"]>[0]>
  ) {
    bridge.start({
      cliBinaryPath: scriptPath,
      cwd: "/tmp",
      sessionId: SID,
      prompt: "test prompt",
      ...overrides,
    });
  }

  describe("successful session", () => {
    it("emits normalized HostEvents from valid NDJSON stream", async () => {
      bridge = new CliBridge();
      const events: HostEvent[] = [];

      const body = ndjsonBody([
        makeCliEvent("start", SID, { command: "chat" }),
        makeCliEvent("text_delta", SID, { content: "Hello" }),
        makeCliEvent("done", SID, {
          exitCode: 0,
          duration: 1000,
          success: true,
        }),
      ]);

      const done = new Promise<ProcessExitResult>((resolve) => {
        bridge.on("event", (e) => events.push(e));
        bridge.on("exit", resolve);
      });

      startBridge(script(body));

      const result = await done;
      expect(result.exitCode).toBe(0);

      const textEvents = events.filter(
        (e) => e.type === HostEventType.TEXT_DELTA
      );
      expect(textEvents.length).toBe(1);
      expect(textEvents[0].payload).toEqual({
        sessionId: SID,
        content: "Hello",
      });

      const completedEvents = events.filter(
        (e) => e.type === HostEventType.SESSION_COMPLETED
      );
      expect(completedEvents.length).toBe(1);
    });

    it("emits multiple text_delta events in order", async () => {
      bridge = new CliBridge();
      const events: HostEvent[] = [];

      const body = ndjsonBody([
        makeCliEvent("start", SID, { command: "chat" }),
        makeCliEvent("text_delta", SID, { content: "A" }),
        makeCliEvent("text_delta", SID, { content: "B" }),
        makeCliEvent("text_delta", SID, { content: "C" }),
        makeCliEvent("done", SID, {
          exitCode: 0,
          duration: 500,
          success: true,
        }),
      ]);

      const done = new Promise<ProcessExitResult>((resolve) => {
        bridge.on("event", (e) => events.push(e));
        bridge.on("exit", resolve);
      });

      startBridge(script(body));
      await done;

      const textEvents = events.filter(
        (e) => e.type === HostEventType.TEXT_DELTA
      );
      expect(textEvents.length).toBe(3);
      expect(textEvents.map((e) => e.payload.content)).toEqual(["A", "B", "C"]);
    });
  });

  describe("malformed stream input", () => {
    it("emits error event for invalid JSON lines", async () => {
      bridge = new CliBridge();
      const events: HostEvent[] = [];

      const body = [
        "echo 'this is not json'",
        `printf '%s\\n' '${makeCliEvent("text_delta", SID, { content: "valid" }).replace(/'/g, "'\\''")}'`,
      ].join("\n");

      const done = new Promise<ProcessExitResult>((resolve) => {
        bridge.on("event", (e) => events.push(e));
        bridge.on("exit", resolve);
      });

      startBridge(script(body));
      await done;

      const errorEvents = events.filter(
        (e) =>
          e.type === HostEventType.ERROR &&
          e.payload.error.code === ProtocolErrorCode.MALFORMED_EVENT
      );
      expect(errorEvents.length).toBe(1);

      const textEvents = events.filter(
        (e) => e.type === HostEventType.TEXT_DELTA
      );
      expect(textEvents.length).toBe(1);
    });

    it("emits error event for valid JSON but invalid schema", async () => {
      bridge = new CliBridge();
      const events: HostEvent[] = [];

      const body = ndjsonBody([
        JSON.stringify({ foo: "bar", notACliEvent: true }),
      ]);

      const done = new Promise<ProcessExitResult>((resolve) => {
        bridge.on("event", (e) => events.push(e));
        bridge.on("exit", resolve);
      });

      startBridge(script(body));
      await done;

      const malformedErrors = events.filter(
        (e) =>
          e.type === HostEventType.ERROR &&
          e.payload.error.code === ProtocolErrorCode.MALFORMED_EVENT
      );
      expect(malformedErrors.length).toBe(1);
    });

    it("skips empty lines without error", async () => {
      bridge = new CliBridge();
      const events: HostEvent[] = [];

      const textLine = makeCliEvent("text_delta", SID, {
        content: "hello",
      });

      const body = [
        "echo ''",
        `printf '%s\\n' '${textLine.replace(/'/g, "'\\''")}'`,
        "echo ''",
      ].join("\n");

      const done = new Promise<ProcessExitResult>((resolve) => {
        bridge.on("event", (e) => events.push(e));
        bridge.on("exit", resolve);
      });

      startBridge(script(body));
      await done;

      const errorEvents = events.filter((e) => e.type === HostEventType.ERROR);
      // The only error could be PROCESS_CRASHED if no done event,
      // but we don't expect MALFORMED_EVENT from empty lines
      const malformedErrors = errorEvents.filter(
        (e) => e.payload.error.code === ProtocolErrorCode.MALFORMED_EVENT
      );
      expect(malformedErrors.length).toBe(0);

      const textEvents = events.filter(
        (e) => e.type === HostEventType.TEXT_DELTA
      );
      expect(textEvents.length).toBe(1);
    });
  });

  describe("process crash", () => {
    it("emits PROCESS_CRASHED error on non-zero exit without done", async () => {
      bridge = new CliBridge();
      const events: HostEvent[] = [];

      const done = new Promise<ProcessExitResult>((resolve) => {
        bridge.on("event", (e) => events.push(e));
        bridge.on("exit", resolve);
      });

      startBridge(script("exit 1"));

      const result = await done;
      expect(result.exitCode).toBe(1);

      const crashErrors = events.filter(
        (e) =>
          e.type === HostEventType.ERROR &&
          e.payload.error.code === ProtocolErrorCode.PROCESS_CRASHED
      );
      expect(crashErrors.length).toBe(1);
      expect(crashErrors[0].payload.error.recoverable).toBe(false);
    });

    it("does not emit crash error if done event was received", async () => {
      bridge = new CliBridge();
      const events: HostEvent[] = [];

      const body = ndjsonBody([
        makeCliEvent("done", SID, {
          exitCode: 0,
          duration: 100,
          success: true,
        }),
      ]);

      const done = new Promise<ProcessExitResult>((resolve) => {
        bridge.on("event", (e) => events.push(e));
        bridge.on("exit", resolve);
      });

      startBridge(script(body));
      await done;

      const crashErrors = events.filter(
        (e) =>
          e.type === HostEventType.ERROR &&
          e.payload.error.code === ProtocolErrorCode.PROCESS_CRASHED
      );
      expect(crashErrors.length).toBe(0);
    });
  });

  describe("cancellation", () => {
    it("cancel() terminates process and emits crash error", async () => {
      bridge = new CliBridge();
      const events: HostEvent[] = [];

      const done = new Promise<ProcessExitResult>((resolve) => {
        bridge.on("event", (e) => events.push(e));
        bridge.on("exit", resolve);
      });

      startBridge(script("exec sleep 60"));

      await new Promise((r) => setTimeout(r, 100));
      expect(bridge.running).toBe(true);
      bridge.cancel();

      const result = await done;
      expect(result.cancelled).toBe(true);

      const crashErrors = events.filter(
        (e) =>
          e.type === HostEventType.ERROR &&
          e.payload.error.code === ProtocolErrorCode.PROCESS_CRASHED
      );
      expect(crashErrors.length).toBe(1);
    });
  });

  describe("timeout", () => {
    it("emits NETWORK_TIMEOUT error on timeout", async () => {
      bridge = new CliBridge();
      const events: HostEvent[] = [];

      const done = new Promise<ProcessExitResult>((resolve) => {
        bridge.on("event", (e) => events.push(e));
        bridge.on("exit", resolve);
      });

      startBridge(script("exec sleep 60"), { timeoutMs: 100 });

      const result = await done;
      expect(result.timedOut).toBe(true);

      const timeoutErrors = events.filter(
        (e) =>
          e.type === HostEventType.ERROR &&
          e.payload.error.code === ProtocolErrorCode.NETWORK_TIMEOUT
      );
      expect(timeoutErrors.length).toBe(1);
    });
  });

  describe("stderr", () => {
    it("emits stderr data", async () => {
      bridge = new CliBridge();
      const stderrChunks: string[] = [];

      const done = new Promise<ProcessExitResult>((resolve) => {
        bridge.on("stderr", (data) => stderrChunks.push(data));
        bridge.on("exit", resolve);
      });

      startBridge(script("echo warning >&2"));
      await done;

      expect(stderrChunks.join("").trim()).toBe("warning");
    });
  });

  describe("spawn errors", () => {
    it("emits CLI_NOT_FOUND event for non-existent binary", async () => {
      bridge = new CliBridge();

      const eventPromise = new Promise<HostEvent>((resolve) => {
        bridge.on("event", (evt: HostEvent) => {
          if (
            evt.type === HostEventType.ERROR &&
            evt.payload.error.code === ProtocolErrorCode.CLI_NOT_FOUND
          ) {
            resolve(evt);
          }
        });
      });

      bridge.start({
        cliBinaryPath: "/nonexistent/cli/binary",
        cwd: "/tmp",
        sessionId: SID,
        prompt: "test",
      });

      const evt = await eventPromise;
      expect(evt.payload.error.code).toBe(ProtocolErrorCode.CLI_NOT_FOUND);
      expect(evt.payload.error.message).toContain("/nonexistent/cli/binary");
      expect(evt.payload.error.message).toContain("locusai.cliBinaryPath");
    });

    it("throws if start() called twice", () => {
      bridge = new CliBridge();

      bridge.start({
        cliBinaryPath: "true",
        cwd: "/tmp",
        sessionId: SID,
        prompt: "test",
      });

      expect(() => {
        bridge.start({
          cliBinaryPath: "true",
          cwd: "/tmp",
          sessionId: SID,
          prompt: "test",
        });
      }).toThrow("start() called more than once");
    });
  });

  describe("properties", () => {
    it("running is false before start", () => {
      bridge = new CliBridge();
      expect(bridge.running).toBe(false);
    });

    it("pid is undefined before start", () => {
      bridge = new CliBridge();
      expect(bridge.pid).toBeUndefined();
    });
  });

  describe("cli-event emission", () => {
    it("emits raw cli-event for valid stream events", async () => {
      bridge = new CliBridge();
      const cliEvents: unknown[] = [];

      const body = ndjsonBody([
        makeCliEvent("text_delta", SID, { content: "raw" }),
      ]);

      const done = new Promise<ProcessExitResult>((resolve) => {
        bridge.on("cli-event", (e) => cliEvents.push(e));
        bridge.on("exit", resolve);
      });

      startBridge(script(body));
      await done;

      expect(cliEvents.length).toBe(1);
      expect((cliEvents[0] as { type: string }).type).toBe("text_delta");
    });
  });
});
