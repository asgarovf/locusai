import * as vscode from "vscode";
import {
  UIIntentType,
  createUIIntent,
} from "@locusai/shared";
import type { AuthManager } from "../auth";
import { ensureValidSettings } from "../config";
import { collectContext } from "../context";
import type { ChatController } from "../core/chat-controller";
import { LocusChatViewProvider } from "../webview";

/**
 * `Locus: Run Exec Task` — Prompt the user for a task description,
 * collect editor context, and submit through the session pipeline.
 */
export function registerRunExecTaskCommand(
  context: vscode.ExtensionContext,
  controller: ChatController,
  authManager: AuthManager
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("locusai.runExecTask", async () => {
      // Pre-flight: validate settings
      const settingsOk = await ensureValidSettings();
      if (!settingsOk) return;

      // Pre-flight: ensure auth
      const authOk = await authManager.ensureAuth();
      if (!authOk) return;

      const prompt = await vscode.window.showInputBox({
        title: "Run Exec Task",
        prompt: "Describe the task you want Locus to execute",
        placeHolder: "e.g., Refactor the auth module to use JWT tokens",
        ignoreFocusOut: true,
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return "Task description cannot be empty";
          }
          return undefined;
        },
      });

      if (!prompt) return;

      // Focus the chat view so the user can see the execution
      await vscode.commands.executeCommand(
        `${LocusChatViewProvider.viewType}.focus`
      );

      const editorContext = collectContext();

      const intent = createUIIntent(UIIntentType.SUBMIT_PROMPT, {
        text: prompt.trim(),
        context: editorContext,
      });

      controller.handleIntent(intent);
    })
  );
}
