import * as vscode from "vscode";
import { LocusChatViewProvider } from "../webview";

/**
 * `Locus: Open Chat` — Focus the Locus chat webview panel.
 * No auth check required since this just opens the UI.
 */
export function registerOpenChatCommand(
  context: vscode.ExtensionContext
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("locusai.openChat", () => {
      vscode.commands.executeCommand(
        `${LocusChatViewProvider.viewType}.focus`
      );
    })
  );
}
