import * as vscode from "vscode";
import type {
  ActiveFileContext,
  ContextPayload,
  SelectionContext,
  WorkspaceContext,
} from "@locusai/shared";

// ============================================================================
// Individual Collectors
// ============================================================================

/**
 * Build workspace context from the first open workspace folder.
 * Returns undefined if no workspace is open.
 */
export function getWorkspaceContext(): WorkspaceContext | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return undefined;

  const folder = folders[0];
  return {
    rootPath: folder.uri.fsPath,
    name: folder.name,
  };
}

/**
 * Build active file context from the currently focused text editor.
 * Returns undefined if no editor is active.
 */
export function getActiveFileContext(): ActiveFileContext | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return undefined;

  return {
    filePath: editor.document.uri.fsPath,
    languageId: editor.document.languageId,
  };
}

/**
 * Build selection context from the active text editor's selection.
 * Returns undefined if no editor is active or the selection is empty.
 */
export function getSelectionContext(): SelectionContext | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return undefined;

  const selection = editor.selection;
  if (selection.isEmpty) return undefined;

  const text = editor.document.getText(selection);
  if (!text) return undefined;

  return {
    filePath: editor.document.uri.fsPath,
    languageId: editor.document.languageId,
    startLine: selection.start.line,
    startColumn: selection.start.character,
    endLine: selection.end.line,
    endColumn: selection.end.character,
    text,
  };
}

// ============================================================================
// Composite Collector
// ============================================================================

/**
 * Collect all available context from the current editor state.
 * Returns a `ContextPayload` with whichever fields are available.
 * Returns undefined if no context is available at all.
 */
export function collectContext(): ContextPayload | undefined {
  const workspace = getWorkspaceContext();
  const activeFile = getActiveFileContext();
  const selection = getSelectionContext();

  if (!workspace && !activeFile && !selection) return undefined;

  return {
    workspace,
    activeFile,
    selection,
  };
}
