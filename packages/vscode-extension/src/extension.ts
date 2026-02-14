import * as vscode from "vscode";
import { LocusChatViewProvider } from "./webview";

export function activate(context: vscode.ExtensionContext): void {
  const chatProvider = new LocusChatViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      LocusChatViewProvider.viewType,
      chatProvider
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("locusai.openChat", () => {
      vscode.commands.executeCommand(`${LocusChatViewProvider.viewType}.focus`);
    })
  );
}

export function deactivate(): void {
  // Cleanup handled via context.subscriptions
}
