import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext): void {
  const helloWorld = vscode.commands.registerCommand(
    "locusai.helloWorld",
    () => {
      vscode.window.showInformationMessage("Hello from Locus AI!");
    }
  );

  context.subscriptions.push(helloWorld);
}

export function deactivate(): void {
  // Cleanup handled via context.subscriptions
}
