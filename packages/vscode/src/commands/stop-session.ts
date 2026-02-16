import { createUIIntent, UIIntentType } from "@locusai/shared";
import * as vscode from "vscode";
import type { ChatController } from "../core/chat-controller";

/**
 * `Locus: Stop Session` — Stop the currently active session.
 */
export function registerStopSessionCommand(
  context: vscode.ExtensionContext,
  controller: ChatController
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("locusai.stopSession", () => {
      const activeId = controller.getActiveSessionId();
      if (!activeId) {
        vscode.window.showInformationMessage(
          "Locus: No active session to stop."
        );
        return;
      }

      const intent = createUIIntent(UIIntentType.STOP_SESSION, {
        sessionId: activeId,
      });
      controller.handleIntent(intent);
    })
  );
}
