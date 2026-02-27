import { describe, expect, test } from "bun:test";
import { __testUtils, InputHandler } from "../src/repl/input-handler.js";

/**
 * Tests for the InputHandler (readline-based).
 * Tests public API methods — actual readline behavior
 * requires stdin simulation and is covered by integration tests.
 */

describe("InputHandler — lock/unlock", () => {
  test("starts unlocked", () => {
    const handler = new InputHandler({ prompt: "> " });
    expect(handler.isLocked()).toBe(false);
  });

  test("lock and unlock work correctly", () => {
    const handler = new InputHandler({ prompt: "> " });
    handler.lock();
    expect(handler.isLocked()).toBe(true);
    handler.unlock();
    expect(handler.isLocked()).toBe(false);
  });

  test("double lock is idempotent", () => {
    const handler = new InputHandler({ prompt: "> " });
    handler.lock();
    handler.lock();
    expect(handler.isLocked()).toBe(true);
    handler.unlock();
    expect(handler.isLocked()).toBe(false);
  });
});

describe("InputHandler — setPrompt", () => {
  test("setPrompt changes the prompt", () => {
    const handler = new InputHandler({ prompt: "> " });
    // No assertion on internal state — just ensure it doesn't throw
    handler.setPrompt("new> ");
  });
});

describe("InputHandler — constructor options", () => {
  test("accepts prompt only", () => {
    const handler = new InputHandler({ prompt: "> " });
    expect(handler).toBeDefined();
  });

  test("accepts all options", () => {
    const handler = new InputHandler({
      prompt: "> ",
      getHistory: () => ["cmd1", "cmd2"],
      onTab: (text) => (text.startsWith("/h") ? "/help" : null),
    });
    expect(handler).toBeDefined();
  });
});

describe("InputHandler — multiline cursor rendering", () => {
  test("keeps cursor on the targeted logical line instead of forcing it to the last line", () => {
    const prompt = "locus > ";
    const buffer = [
      "asfasfasf/var/folders/k1/59hmx9k558v4nj9sjv5j5h640000gn/T/TemporaryItems/NSIRD_screencaptureui_uq53I3/Screenshot\\ 2026-02-24\\ at\\ 04.16.40.png",
      "Testasfasf",
      "",
      "",
      "asfaksfkoasfkoasokf",
    ].join("\n");

    const lineStarts = __testUtils.getLineStarts(buffer);
    const firstLineStart = lineStarts[0] ?? 0;
    const previousEmptyLineStart = lineStarts[3] ?? 0;
    const lastLineStart = lineStarts[4] ?? 0;

    const firstState = __testUtils.buildRenderState(
      prompt,
      buffer,
      firstLineStart,
      80
    );
    const previousEmptyState = __testUtils.buildRenderState(
      prompt,
      buffer,
      previousEmptyLineStart,
      80
    );
    const lastState = __testUtils.buildRenderState(
      prompt,
      buffer,
      lastLineStart,
      80
    );

    expect(firstState.cursorRow).toBe(0);
    expect(previousEmptyState.cursorRow).toBe(lastState.cursorRow - 1);
  });
});
