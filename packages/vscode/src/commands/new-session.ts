import { createUIIntent, UIIntentType } from "@locusai/shared";
import * as vscode from "vscode";
import type { ChatController } from "../core/chat-controller";
import { LocusChatViewProvider } from "../webview";

/**
 * `Locus: New Session` — Stop any running session, then focus the
 * chat view so the user can start a fresh conversation.
 */
export function registerNewSessionCommand(
  context: vscode.ExtensionContext,
  controller: ChatController
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("locusai.newSession", async () => {
      const activeId = controller.getActiveSessionId();
      if (activeId) {
        // Stop first if running, then clear
        controller.handleIntent(
          createUIIntent(UIIntentType.STOP_SESSION, { sessionId: activeId })
        );
        controller.handleIntent(
          createUIIntent(UIIntentType.CLEAR_SESSION, { sessionId: activeId })
        );
      }

      await vscode.commands.executeCommand(
        `${LocusChatViewProvider.viewType}.focus`
      );
    })
  );
}
