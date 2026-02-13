import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as vscode from "vscode";
import type { ApiTask } from "../services/api-client";
import { AgentSession } from "../session/agent-session";
import { isLocusInitialized, loadSettings } from "../utils/config";
import { getWorkspacePath } from "../utils/workspace";

/**
 * WebviewViewProvider for the Locus AI chat sidebar.
 * Manages the chat UI webview and bridges it to the AgentSession.
 */
export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "locus.chatView";

  private view: vscode.WebviewView | undefined;
  private session: AgentSession | undefined;
  private extensionUri: vscode.Uri;

  constructor(extensionUri: vscode.Uri) {
    this.extensionUri = extensionUri;
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, "dist", "webview"),
        vscode.Uri.joinPath(this.extensionUri, "src", "webview"),
      ],
    };

    webviewView.webview.html = this.getHtmlContent(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((message) => {
      this.handleWebviewMessage(message);
    });

    webviewView.onDidDispose(() => {
      this.session?.abort();
      this.view = undefined;
    });
  }

  /**
   * Reset the conversation context. Called from command palette.
   */
  resetContext(): void {
    this.session?.resetContext();
    this.view?.webview.postMessage({ type: "contextReset" });
  }

  /**
   * Start a new session. Called from command palette.
   */
  newSession(): void {
    this.session?.abort();
    this.session?.resetContext();
    const sessionId = this.session?.getSessionId();
    this.view?.webview.postMessage({
      type: "newSession",
      sessionId,
    });
  }

  /**
   * Abort the currently running agent process.
   */
  abort(): void {
    if (this.session?.isRunning()) {
      this.session.abort();
      this.postMessage({
        type: "error",
        error: "Agent execution aborted by user.",
      });
      this.postMessage({ type: "done" });
    }
  }

  /**
   * Send a task as a prompt to the agent.
   */
  sendTaskPrompt(task: ApiTask): void {
    const prompt = this.buildTaskPrompt(task);

    this.postMessage({
      type: "taskLoaded",
      task: {
        id: task.id,
        title: task.title,
        status: task.status,
      },
    });

    this.handlePrompt(prompt);
  }

  /**
   * Check if the agent is currently running.
   */
  isRunning(): boolean {
    return this.session?.isRunning() ?? false;
  }

  private handleWebviewMessage(message: { type: string; content?: string }) {
    switch (message.type) {
      case "ready":
        this.onWebviewReady();
        break;
      case "prompt":
        if (message.content) {
          this.handlePrompt(message.content);
        }
        break;
      case "abort":
        this.abort();
        break;
      case "resetContext":
        this.resetContext();
        break;
      case "newSession":
        this.newSession();
        break;
    }
  }

  private onWebviewReady(): void {
    this.ensureSession();

    if (this.session) {
      const history = this.session.getHistory();
      if (history.length > 0) {
        this.view?.webview.postMessage({
          type: "restoreHistory",
          messages: history,
        });
      }
    }
  }

  private async handlePrompt(prompt: string): Promise<void> {
    const projectPath = getWorkspacePath();
    if (!projectPath) {
      this.postMessage({
        type: "error",
        error: "No workspace folder open.",
      });
      this.postMessage({ type: "done" });
      return;
    }

    if (!isLocusInitialized(projectPath)) {
      this.postMessage({
        type: "error",
        error:
          "Project not initialized. Run 'Locus: Setup Project' from the command palette.",
      });
      this.postMessage({ type: "done" });
      return;
    }

    this.ensureSession();

    if (!this.session) {
      this.postMessage({
        type: "error",
        error: "Failed to create agent session.",
      });
      this.postMessage({ type: "done" });
      return;
    }

    try {
      await this.session.sendPrompt(prompt);
    } catch (err) {
      this.postMessage({
        type: "error",
        error: err instanceof Error ? err.message : String(err),
      });
      this.postMessage({ type: "done" });
    }
  }

  private ensureSession(): void {
    if (this.session) return;

    const projectPath = getWorkspacePath();
    if (!projectPath) return;

    const settings = loadSettings(projectPath);
    const config = vscode.workspace.getConfiguration("locus");
    const provider =
      (config.get<string>("provider") as "claude" | "codex") ||
      (settings.provider as "claude" | "codex") ||
      "claude";
    const model = config.get<string>("model") || settings.model || undefined;

    this.session = new AgentSession({
      projectPath,
      provider,
      model,
    });

    this.session.setMessageCallback((msg) => {
      this.postMessage(msg);
    });
  }

  private buildTaskPrompt(task: ApiTask): string {
    let prompt = `# Task: ${task.title}\n\n`;
    if (task.description) {
      prompt += `## Description\n${task.description}\n\n`;
    }
    prompt +=
      "## Instructions\nPlease implement this task. Review the codebase context and make the necessary changes.\n";
    return prompt;
  }

  private postMessage(message: unknown): void {
    this.view?.webview.postMessage(message);
  }

  private getHtmlContent(webview: vscode.Webview): string {
    const nonce = getNonce();

    let stylesUri: vscode.Uri;
    let scriptUri: vscode.Uri;

    const distWebviewPath = vscode.Uri.joinPath(
      this.extensionUri,
      "dist",
      "webview"
    );
    const srcWebviewPath = vscode.Uri.joinPath(
      this.extensionUri,
      "src",
      "webview"
    );

    try {
      stylesUri = webview.asWebviewUri(
        vscode.Uri.joinPath(distWebviewPath, "styles.css")
      );
      scriptUri = webview.asWebviewUri(
        vscode.Uri.joinPath(distWebviewPath, "main.js")
      );
    } catch {
      stylesUri = webview.asWebviewUri(
        vscode.Uri.joinPath(srcWebviewPath, "styles.css")
      );
      scriptUri = webview.asWebviewUri(
        vscode.Uri.joinPath(srcWebviewPath, "main.js")
      );
    }

    let html: string;
    try {
      html = readFileSync(
        join(this.extensionUri.fsPath, "src", "webview", "index.html"),
        "utf-8"
      );
    } catch {
      html = this.getFallbackHtml();
    }

    html = html
      .replace(/\{\{cspSource\}\}/g, webview.cspSource)
      .replace(/\{\{nonce\}\}/g, nonce)
      .replace(/\{\{stylesUri\}\}/g, stylesUri.toString())
      .replace(/\{\{scriptUri\}\}/g, scriptUri.toString());

    return html;
  }

  private getFallbackHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src {{cspSource}} 'unsafe-inline'; script-src 'nonce-{{nonce}}';" />
  <link rel="stylesheet" href="{{stylesUri}}" />
</head>
<body>
  <div id="app">
    <div class="chat-header">
      <span class="chat-header-title">Locus AI</span>
      <div class="chat-header-actions">
        <button class="icon-button" id="new-session-button" title="New Session">+</button>
        <button class="icon-button" id="abort-button" title="Stop Agent" style="display:none;">&#9632;</button>
        <button class="icon-button" id="reset-button" title="Reset Context">&#8635;</button>
      </div>
    </div>
    <div class="messages-container" id="messages">
      <div class="welcome" id="welcome">
        <div class="welcome-icon">&#128172;</div>
        <div class="welcome-title">Locus AI Chat</div>
        <div class="welcome-desc">Ask questions about your codebase, request code changes, or get help with debugging.</div>
      </div>
    </div>
    <div class="input-container">
      <div class="input-wrapper">
        <textarea id="chat-input" class="chat-input" placeholder="Ask Locus anything..." rows="1"></textarea>
        <button id="send-button" class="send-button" title="Send (Enter)">&#9654;</button>
      </div>
    </div>
  </div>
  <script nonce="{{nonce}}" src="{{scriptUri}}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}
