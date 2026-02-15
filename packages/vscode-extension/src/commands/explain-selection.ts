import { createUIIntent, UIIntentType } from "@locusai/shared";
import * as vscode from "vscode";
import type { AuthManager } from "../auth";
import { ensureValidSettings } from "../config";
import { collectContext, getSelectionContext } from "../context";
import type { ChatController } from "../core/chat-controller";
import { LocusChatViewProvider } from "../webview";

/**
 * `Locus: Explain Selection` — Take the active editor selection,
 * prepend an "Explain this code:" prompt, and submit through the
 * session pipeline with full context.
 */
export function registerExplainSelectionCommand(
  context: vscode.ExtensionContext,
  controller: ChatController,
  authManager: AuthManager
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("locusai.explainSelection", async () => {
      // Check that there's a selection to explain
      const selection = getSelectionContext();
      if (!selection) {
        vscode.window.showInformationMessage(
          "Locus: Select some code first, then run this command."
        );
        return;
      }

      // Pre-flight: validate settings
      const settingsOk = await ensureValidSettings();
      if (!settingsOk) return;

      // Pre-flight: ensure auth
      const authOk = await authManager.ensureAuth();
      if (!authOk) return;

      // Focus the chat view so the user can see the result
      await vscode.commands.executeCommand(
        `${LocusChatViewProvider.viewType}.focus`
      );

      const editorContext = collectContext();
      const prompt = `Explain this code:\n\n\`\`\`${selection.languageId || ""}\n${selection.text}\n\`\`\``;

      const intent = createUIIntent(UIIntentType.SUBMIT_PROMPT, {
        text: prompt,
        context: editorContext,
      });

      controller.handleIntent(intent);
    })
  );
}
