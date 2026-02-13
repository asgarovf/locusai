import * as vscode from "vscode";
import { executeSetup } from "./commands/setup";
import { ChatViewProvider } from "./providers/chat-provider";
import { TaskTreeProvider, type TaskTreeItem } from "./providers/task-provider";
import type { ApiTask } from "./services/api-client";
import { hasApiKey, isLocusInitialized } from "./utils/config";
import { getWorkspacePath } from "./utils/workspace";

let chatProvider: ChatViewProvider | undefined;
let taskProvider: TaskTreeProvider | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;

export function activate(context: vscode.ExtensionContext): void {
  // Register the chat sidebar webview provider
  chatProvider = new ChatViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ChatViewProvider.viewType,
      chatProvider
    )
  );

  // Register the task tree view provider
  taskProvider = new TaskTreeProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("locus.taskView", taskProvider)
  );

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarItem.command = "locus.setup";
  updateStatusBar();
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand("locus.setup", async () => {
      const result = await executeSetup();
      if (result) {
        updateStatusBar();
        taskProvider?.refresh();
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("locus.newSession", () => {
      chatProvider?.newSession();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("locus.resetContext", () => {
      chatProvider?.resetContext();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("locus.abort", () => {
      chatProvider?.abort();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("locus.refreshTasks", () => {
      taskProvider?.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("locus.viewTask", (task: ApiTask) => {
      showTaskDetail(task);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("locus.startTask", (item: TaskTreeItem) => {
      if ("task" in item) {
        chatProvider?.sendTaskPrompt((item as { task: ApiTask }).task);
        vscode.commands.executeCommand("locus.chatView.focus");
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("locus.selectProvider", async () => {
      const items = [
        {
          label: "Claude",
          description: "Anthropic Claude CLI",
          value: "claude",
        },
        {
          label: "Codex",
          description: "OpenAI Codex CLI",
          value: "codex",
        },
      ];

      const pick = await vscode.window.showQuickPick(items, {
        title: "Locus: Select AI Provider",
        placeHolder: "Choose your preferred AI provider",
      });

      if (pick) {
        const config = vscode.workspace.getConfiguration("locus");
        await config.update(
          "provider",
          pick.value,
          vscode.ConfigurationTarget.Workspace
        );
        vscode.window.showInformationMessage(
          `Locus: Provider set to ${pick.label}.`
        );
      }
    })
  );

  // Refresh tasks on activation if configured
  const projectPath = getWorkspacePath();
  if (
    projectPath &&
    isLocusInitialized(projectPath) &&
    hasApiKey(projectPath)
  ) {
    taskProvider.refresh();
  }
}

export function deactivate(): void {
  chatProvider = undefined;
  taskProvider = undefined;
  statusBarItem?.dispose();
  statusBarItem = undefined;
}

function updateStatusBar(): void {
  if (!statusBarItem) return;

  const projectPath = getWorkspacePath();
  if (!projectPath || !isLocusInitialized(projectPath)) {
    statusBarItem.text = "$(circle-outline) Locus: Not Initialized";
    statusBarItem.tooltip = "Click to set up Locus for this project";
    return;
  }

  if (!hasApiKey(projectPath)) {
    statusBarItem.text = "$(key) Locus: No API Key";
    statusBarItem.tooltip = "Click to configure your API key";
    return;
  }

  statusBarItem.text = "$(check) Locus AI";
  statusBarItem.tooltip = "Locus AI is configured and ready";
}

function showTaskDetail(task: ApiTask): void {
  const panel = vscode.window.createWebviewPanel(
    "locusTaskDetail",
    `Task: ${task.title}`,
    vscode.ViewColumn.One,
    { enableScripts: false }
  );

  const statusBadge = getStatusBadge(task.status);

  panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body {
      font-family: var(--vscode-font-family, sans-serif);
      color: var(--vscode-foreground, #ccc);
      background: var(--vscode-editor-background, #1e1e1e);
      padding: 20px;
      line-height: 1.6;
    }
    h1 { font-size: 18px; margin-bottom: 8px; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .badge-in_progress { background: #2563eb; color: #fff; }
    .badge-backlog { background: #6b7280; color: #fff; }
    .badge-in_review { background: #d97706; color: #fff; }
    .badge-blocked { background: #dc2626; color: #fff; }
    .badge-done { background: #16a34a; color: #fff; }
    .description {
      white-space: pre-wrap;
      background: var(--vscode-textCodeBlock-background, #2d2d2d);
      padding: 12px;
      border-radius: 4px;
    }
    .label {
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #888);
      margin-top: 16px;
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(task.title)}</h1>
  <span class="badge badge-${task.status.toLowerCase()}">${statusBadge}</span>
  ${task.priority ? `<span class="badge" style="margin-left:8px;">${escapeHtml(task.priority)}</span>` : ""}
  ${task.description ? `<div class="label">Description</div><div class="description">${escapeHtml(task.description)}</div>` : '<div class="description">No description provided.</div>'}
</body>
</html>`;
}

function getStatusBadge(status: string): string {
  const labels: Record<string, string> = {
    IN_PROGRESS: "In Progress",
    BACKLOG: "Backlog",
    IN_REVIEW: "In Review",
    BLOCKED: "Blocked",
    DONE: "Done",
  };
  return labels[status] || status;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
