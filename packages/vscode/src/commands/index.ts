import type * as vscode from "vscode";
import type { AuthManager } from "../auth";
import type { ChatController } from "../core/chat-controller";
import type { SessionManager } from "../sessions/session-manager";
import { registerExplainSelectionCommand } from "./explain-selection";
import { registerNewSessionCommand } from "./new-session";
import { registerOpenChatCommand } from "./open-chat";
import { registerResumeLastSessionCommand } from "./resume-last-session";
import { registerRunExecTaskCommand } from "./run-exec-task";
import { registerStopSessionCommand } from "./stop-session";

export { registerExplainSelectionCommand } from "./explain-selection";
export { registerNewSessionCommand } from "./new-session";
export { registerOpenChatCommand } from "./open-chat";
export { registerResumeLastSessionCommand } from "./resume-last-session";
export { registerRunExecTaskCommand } from "./run-exec-task";
export { registerStopSessionCommand } from "./stop-session";

/**
 * Register all Locus commands on the extension context.
 */
export function registerAllCommands(
  context: vscode.ExtensionContext,
  controller: ChatController,
  manager: SessionManager,
  authManager: AuthManager
): void {
  registerOpenChatCommand(context);
  registerRunExecTaskCommand(context, controller, authManager);
  registerExplainSelectionCommand(context, controller, authManager);
  registerResumeLastSessionCommand(context, controller, manager, authManager);
  registerNewSessionCommand(context, controller);
  registerStopSessionCommand(context, controller);
}
