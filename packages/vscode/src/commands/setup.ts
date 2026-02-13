import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as vscode from "vscode";
import {
  getWorkspaceId,
  isLocusInitialized,
  saveWorkspaceId,
} from "../utils/config";
import { getWorkspacePath } from "../utils/workspace";
import {
  fetchWorkspaces,
  runLocusInit,
  saveApiKey,
  saveProvider,
} from "./setup-utils";

export { runLocusInit, saveApiKey, saveProvider } from "./setup-utils";

const LOCUS_DIR = ".locus";
const SETTINGS_FILE = "settings.json";

/**
 * Execute the full setup flow:
 * 1. Check workspace is open
 * 2. Run locus init if not initialized
 * 3. Prompt for API key if not configured
 * 4. Select workspace from API
 * 5. Select AI provider
 */
export async function executeSetup(): Promise<boolean> {
  const projectPath = getWorkspacePath();

  if (!projectPath) {
    vscode.window.showErrorMessage(
      "Locus: Please open a workspace folder first."
    );
    return false;
  }

  // Step 1: Initialize if needed
  if (!isLocusInitialized(projectPath)) {
    const initResult = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Locus: Initializing project...",
        cancellable: false,
      },
      async () => {
        return runLocusInit(projectPath);
      }
    );

    if (!initResult) {
      vscode.window.showErrorMessage(
        "Locus: Failed to initialize project. Ensure the `locus` CLI is installed and available in your PATH."
      );
      return false;
    }

    vscode.window.showInformationMessage(
      "Locus: Project initialized successfully."
    );
  }

  // Step 2: Check for API key
  const settingsPath = join(projectPath, LOCUS_DIR, SETTINGS_FILE);
  let hasKey = false;
  if (existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
      hasKey = !!settings.apiKey;
    } catch {
      hasKey = false;
    }
  }

  if (!hasKey) {
    const apiKey = await vscode.window.showInputBox({
      title: "Locus: API Key",
      prompt: "Enter your Locus API key (from https://app.locusai.dev)",
      placeHolder: "lk_...",
      password: true,
      ignoreFocusOut: true,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return "API key is required";
        }
        if (!value.startsWith("lk_")) {
          return "API key should start with 'lk_'";
        }
        return null;
      },
    });

    if (!apiKey) {
      vscode.window.showWarningMessage(
        "Locus: Setup incomplete — API key not configured. You can set it later with 'Locus: Setup Project'."
      );
      return false;
    }

    saveApiKey(projectPath, apiKey.trim());
    vscode.window.showInformationMessage("Locus: API key saved.");
  }

  // Step 3: Select workspace if not configured
  if (!getWorkspaceId(projectPath)) {
    const workspaces = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Locus: Fetching workspaces...",
        cancellable: false,
      },
      async () => {
        return fetchWorkspaces(projectPath);
      }
    );

    if (workspaces.length > 0) {
      const items = workspaces.map((ws) => ({
        label: ws.name,
        description: ws.id,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        title: "Locus: Select Workspace",
        placeHolder: "Choose the workspace for this project",
        ignoreFocusOut: true,
      });

      if (selected?.description) {
        saveWorkspaceId(projectPath, selected.description);
        vscode.window.showInformationMessage(
          `Locus: Workspace "${selected.label}" selected.`
        );
      }
    }
  }

  // Step 4: Select AI provider
  const providerItems = [
    {
      label: "Claude",
      description: "Anthropic Claude CLI",
      value: "claude",
    },
    {
      label: "Codex",
      description: "OpenAI Codex CLI",
      value: "codex",
    },
  ];

  const providerPick = await vscode.window.showQuickPick(providerItems, {
    title: "Locus: Select AI Provider",
    placeHolder: "Choose your preferred AI provider",
    ignoreFocusOut: true,
  });

  if (providerPick) {
    saveProvider(projectPath, providerPick.value);
    vscode.window.showInformationMessage(
      `Locus: Provider set to ${providerPick.label}. Setup complete!`
    );
  } else {
    vscode.window.showInformationMessage(
      "Locus: Setup complete! Using default provider (Claude)."
    );
  }

  return true;
}
