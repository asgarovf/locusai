import * as vscode from "vscode";
import {
  SessionStatus,
  UIIntentType,
  createUIIntent,
} from "@locusai/shared";
import type { AuthManager } from "../auth";
import { ensureValidSettings } from "../config";
import type { ChatController } from "../core/chat-controller";
import type { SessionManager } from "../sessions/session-manager";
import { LocusChatViewProvider } from "../webview";

/**
 * `Locus: Resume Last Session` — Find the most recent interrupted
 * session and resume it through the session pipeline.
 */
export function registerResumeLastSessionCommand(
  context: vscode.ExtensionContext,
  controller: ChatController,
  manager: SessionManager,
  authManager: AuthManager
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "locusai.resumeLastSession",
      async () => {
        // Pre-flight: validate settings
        const settingsOk = await ensureValidSettings();
        if (!settingsOk) return;

        // Pre-flight: ensure auth
        const authOk = await authManager.ensureAuth();
        if (!authOk) return;

        // Find the most recently updated interrupted session
        const sessions = manager.list();
        const interrupted = sessions
          .filter((s) => s.status === SessionStatus.INTERRUPTED)
          .sort((a, b) => b.updatedAt - a.updatedAt);

        if (interrupted.length === 0) {
          vscode.window.showInformationMessage(
            "Locus: No interrupted sessions to resume."
          );
          return;
        }

        const target = interrupted[0];

        // Focus the chat view
        await vscode.commands.executeCommand(
          `${LocusChatViewProvider.viewType}.focus`
        );

        const intent = createUIIntent(UIIntentType.RESUME_SESSION, {
          sessionId: target.sessionId,
        });

        controller.handleIntent(intent);
      }
    )
  );
}
