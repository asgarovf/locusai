import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SessionManager } from "../src/repl/session-manager.js";

let testDir = "";

function sessionPath(sessionId: string): string {
  return join(testDir, ".locus", "sessions", `${sessionId}.json`);
}

describe("session-manager", () => {
  beforeEach(() => {
    testDir = join(
      tmpdir(),
      `locus-test-session-${Date.now()}-${Math.random().toString(16).slice(2)}`
    );
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("creates sessions in memory until explicitly saved", () => {
    const manager = new SessionManager(testDir);
    const session = manager.create({
      cwd: testDir,
      branch: "main",
      provider: "claude",
      model: "claude-sonnet-4-5",
    });

    expect(manager.isPersisted(session)).toBe(false);
    expect(existsSync(sessionPath(session.id))).toBe(false);

    manager.save(session);

    expect(manager.isPersisted(session.id)).toBe(true);
    expect(existsSync(sessionPath(session.id))).toBe(true);
  });

  it("persists on first message", () => {
    const manager = new SessionManager(testDir);
    const session = manager.create({
      cwd: testDir,
      branch: "main",
      provider: "codex",
      model: "gpt-5.3-codex",
    });

    manager.addMessage(session, {
      role: "user",
      content: "hello",
      timestamp: new Date().toISOString(),
    });

    const path = sessionPath(session.id);
    expect(manager.isPersisted(session)).toBe(true);
    expect(existsSync(path)).toBe(true);

    const saved = JSON.parse(readFileSync(path, "utf-8")) as {
      messages: Array<{ content: string }>;
    };
    expect(saved.messages).toHaveLength(1);
    expect(saved.messages[0].content).toBe("hello");
  });
});
