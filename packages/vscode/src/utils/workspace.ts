import * as vscode from "vscode";

/**
 * Resolves the current workspace root path.
 * Returns the first workspace folder path, or undefined if no folder is open.
 */
export function getWorkspacePath(): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return undefined;
  }
  return folders[0].uri.fsPath;
}
