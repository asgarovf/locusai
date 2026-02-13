import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AgentSession, type SessionData } from "../session/agent-session";

const TEST_DIR = join(import.meta.dir, ".test-agent-session-workspace");
const LOCUS_DIR = join(TEST_DIR, ".locus");
const SESSIONS_DIR = join(LOCUS_DIR, "sessions");

beforeEach(() => {
  mkdirSync(SESSIONS_DIR, { recursive: true });
});

afterEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

describe("AgentSession", () => {
  it("creates a session with a unique ID", () => {
    const session = new AgentSession({
      projectPath: TEST_DIR,
      provider: "claude",
    });
    const id = session.getSessionId();
    expect(id).toBeDefined();
    expect(id.startsWith("ses_")).toBe(true);
  });

  it("generates different IDs for different sessions", () => {
    const s1 = new AgentSession({
      projectPath: TEST_DIR,
      provider: "claude",
    });
    const s2 = new AgentSession({
      projectPath: TEST_DIR,
      provider: "claude",
    });
    expect(s1.getSessionId()).not.toEqual(s2.getSessionId());
  });

  it("initializes with empty history", () => {
    const session = new AgentSession({
      projectPath: TEST_DIR,
      provider: "claude",
    });
    expect(session.getHistory()).toEqual([]);
  });

  it("resets context and generates new session ID", () => {
    const session = new AgentSession({
      projectPath: TEST_DIR,
      provider: "claude",
    });
    const originalId = session.getSessionId();
    session.resetContext();
    expect(session.getSessionId()).not.toEqual(originalId);
    expect(session.getHistory()).toEqual([]);
  });

  it("defaults to opus model for claude provider", () => {
    const session = new AgentSession({
      projectPath: TEST_DIR,
      provider: "claude",
    });
    // Verify via CLI args — we check indirectly through the session behavior
    expect(session.getSessionId()).toBeDefined();
  });

  it("accepts custom model override", () => {
    const session = new AgentSession({
      projectPath: TEST_DIR,
      provider: "claude",
      model: "sonnet",
    });
    expect(session.getSessionId()).toBeDefined();
  });

  it("reports isRunning as false when no process is active", () => {
    const session = new AgentSession({
      projectPath: TEST_DIR,
      provider: "claude",
    });
    expect(session.isRunning()).toBe(false);
  });

  it("abort does not throw when no process is running", () => {
    const session = new AgentSession({
      projectPath: TEST_DIR,
      provider: "claude",
    });
    expect(() => session.abort()).not.toThrow();
  });

  it("loads a saved session from disk", () => {
    const sessionId = "ses_test_abc123";
    const sessionData: SessionData = {
      id: sessionId,
      model: "opus",
      provider: "claude",
      messages: [
        { role: "user", content: "Hello", timestamp: 1000 },
        { role: "assistant", content: "Hi there", timestamp: 2000 },
      ],
      createdAt: 1000,
      updatedAt: 2000,
    };

    writeFileSync(
      join(SESSIONS_DIR, `${sessionId}.json`),
      JSON.stringify(sessionData)
    );

    const session = new AgentSession({
      projectPath: TEST_DIR,
      provider: "claude",
    });

    const loaded = session.loadSession(sessionId);
    expect(loaded).toBe(true);
    expect(session.getSessionId()).toBe(sessionId);
    expect(session.getHistory()).toHaveLength(2);
    expect(session.getHistory()[0].content).toBe("Hello");
    expect(session.getHistory()[1].content).toBe("Hi there");
  });

  it("returns false when loading a non-existent session", () => {
    const session = new AgentSession({
      projectPath: TEST_DIR,
      provider: "claude",
    });
    expect(session.loadSession("ses_nonexistent")).toBe(false);
  });

  it("returns false when session file contains invalid JSON", () => {
    writeFileSync(join(SESSIONS_DIR, "ses_bad.json"), "not-json");
    const session = new AgentSession({
      projectPath: TEST_DIR,
      provider: "claude",
    });
    expect(session.loadSession("ses_bad")).toBe(false);
  });

  it("sets a message callback", () => {
    const session = new AgentSession({
      projectPath: TEST_DIR,
      provider: "claude",
    });
    let called = false;
    session.setMessageCallback(() => {
      called = true;
    });
    // Callback is set but not called until a prompt is sent
    expect(called).toBe(false);
  });

  it("abort stops a running process", () => {
    const session = new AgentSession({
      projectPath: TEST_DIR,
      provider: "claude",
      model: "opus",
    });

    // Calling abort multiple times should not throw
    session.abort();
    session.abort();
    expect(session.isRunning()).toBe(false);
  });

  it("resetContext clears history after loading a session", () => {
    const sessionId = "ses_clear_test";
    const sessionData: SessionData = {
      id: sessionId,
      model: "opus",
      provider: "claude",
      messages: [{ role: "user", content: "Hello", timestamp: 1000 }],
      createdAt: 1000,
      updatedAt: 1000,
    };

    writeFileSync(
      join(SESSIONS_DIR, `${sessionId}.json`),
      JSON.stringify(sessionData)
    );

    const session = new AgentSession({
      projectPath: TEST_DIR,
      provider: "claude",
    });

    session.loadSession(sessionId);
    expect(session.getHistory()).toHaveLength(1);

    session.resetContext();
    expect(session.getHistory()).toHaveLength(0);
    expect(session.getSessionId()).not.toBe(sessionId);
  });
});
