import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * ChatViewProvider tests.
 *
 * Since the ChatViewProvider depends on the VS Code API (vscode.WebviewView,
 * vscode.Uri, etc.), full integration tests require the VS Code Extension Host.
 *
 * These tests verify structural correctness and that the provider module
 * can be parsed correctly.
 */
describe("ChatViewProvider", () => {
  it("has the correct view type constant", async () => {
    const { readFileSync } = await import("node:fs");

    const providerSource = readFileSync(
      join(import.meta.dir, "..", "providers", "chat-provider.ts"),
      "utf-8"
    );

    expect(providerSource).toContain(
      'public static readonly viewType = "locus.chatView"'
    );
  });

  it("supports abort functionality", async () => {
    const { readFileSync } = await import("node:fs");

    const providerSource = readFileSync(
      join(import.meta.dir, "..", "providers", "chat-provider.ts"),
      "utf-8"
    );

    expect(providerSource).toContain("abort()");
    expect(providerSource).toContain('case "abort"');
  });

  it("supports sending task prompts", async () => {
    const { readFileSync } = await import("node:fs");

    const providerSource = readFileSync(
      join(import.meta.dir, "..", "providers", "chat-provider.ts"),
      "utf-8"
    );

    expect(providerSource).toContain("sendTaskPrompt");
    expect(providerSource).toContain("buildTaskPrompt");
    expect(providerSource).toContain("taskLoaded");
  });

  it("exposes isRunning state", async () => {
    const { readFileSync } = await import("node:fs");

    const providerSource = readFileSync(
      join(import.meta.dir, "..", "providers", "chat-provider.ts"),
      "utf-8"
    );

    expect(providerSource).toContain("isRunning()");
  });

  it("webview HTML template exists and has required placeholders", async () => {
    const { readFileSync } = await import("node:fs");
    const htmlPath = join(import.meta.dir, "..", "webview", "index.html");
    expect(existsSync(htmlPath)).toBe(true);

    const html = readFileSync(htmlPath, "utf-8");

    expect(html).toContain("{{cspSource}}");
    expect(html).toContain("{{nonce}}");
    expect(html).toContain("{{stylesUri}}");
    expect(html).toContain("{{scriptUri}}");

    expect(html).toContain('id="messages"');
    expect(html).toContain('id="chat-input"');
    expect(html).toContain('id="send-button"');
    expect(html).toContain('id="reset-button"');
    expect(html).toContain('id="new-session-button"');
    expect(html).toContain('id="abort-button"');
    expect(html).toContain('id="welcome"');
  });

  it("webview CSS file exists and targets VS Code theme variables", async () => {
    const { readFileSync } = await import("node:fs");
    const cssPath = join(import.meta.dir, "..", "webview", "styles.css");
    expect(existsSync(cssPath)).toBe(true);

    const css = readFileSync(cssPath, "utf-8");

    expect(css).toContain("--vscode-sideBar-background");
    expect(css).toContain("--vscode-input-background");
    expect(css).toContain("--vscode-button-background");

    expect(css).toContain(".abort-btn");
    expect(css).toContain(".task-banner");
    expect(css).toContain(".md-h1");
    expect(css).toContain(".md-h2");
    expect(css).toContain(".md-h3");
    expect(css).toContain(".md-list-item");
    expect(css).toContain(".code-block");
    expect(css).toContain(".code-lang");
    expect(css).toContain(".inline-code");
  });

  it("webview JS file exists and uses VS Code API pattern", async () => {
    const { readFileSync } = await import("node:fs");
    const jsPath = join(import.meta.dir, "..", "webview", "main.js");
    expect(existsSync(jsPath)).toBe(true);

    const js = readFileSync(jsPath, "utf-8");

    expect(js).toContain("acquireVsCodeApi");

    expect(js).toContain("text_delta");
    expect(js).toContain("tool_start");
    expect(js).toContain("tool_complete");
    expect(js).toContain("thinking");
    expect(js).toContain("done");
    expect(js).toContain("error");
    expect(js).toContain("contextReset");
    expect(js).toContain("newSession");
    expect(js).toContain("restoreHistory");
    expect(js).toContain("taskLoaded");

    expect(js).toContain("abort-button");
    expect(js).toContain('type: "abort"');

    expect(js).toContain("renderMarkdown");

    expect(js).toContain('{ type: "ready" }');
  });
});
