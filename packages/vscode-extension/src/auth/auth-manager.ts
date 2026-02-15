import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

// ============================================================================
// Constants
// ============================================================================

const SECRET_KEY = "locusai.apiKey";
const ENV_VAR = "LOCUS_API_KEY";
const CLI_SETTINGS_PATH = ".locus/settings.json";

// ============================================================================
// AuthManager
// ============================================================================

/**
 * Manages authentication for the Locus extension.
 *
 * Discovery order:
 *  1. Environment variable `LOCUS_API_KEY`
 *  2. VSCode `SecretStorage` (extension-managed)
 *  3. CLI settings file (`.locus/settings.json` in workspace root)
 *
 * Secrets written through the extension are stored exclusively in
 * `SecretStorage` — never in plaintext workspace files.
 */
export class AuthManager {
  constructor(private readonly secrets: vscode.SecretStorage) {}

  /**
   * Retrieve the API key using the discovery order.
   * Returns undefined if no key is found at any level.
   */
  async getToken(): Promise<string | undefined> {
    // 1. Environment variable
    const envToken = process.env[ENV_VAR];
    if (envToken) return envToken;

    // 2. VSCode SecretStorage
    const storedToken = await this.secrets.get(SECRET_KEY);
    if (storedToken) return storedToken;

    // 3. CLI settings file in workspace root
    const cliToken = this.readCliSettingsToken();
    if (cliToken) return cliToken;

    return undefined;
  }

  /**
   * Store an API key in VSCode SecretStorage.
   */
  async setToken(token: string): Promise<void> {
    await this.secrets.store(SECRET_KEY, token);
  }

  /**
   * Remove the stored API key from SecretStorage.
   */
  async clearToken(): Promise<void> {
    await this.secrets.delete(SECRET_KEY);
  }

  /**
   * Check that auth is available. If not, show an actionable info
   * message with a "Set API Key" button. Returns true if a token
   * was found, false otherwise (the caller should abort the operation).
   *
   * This method never throws — missing auth is surfaced as UI guidance.
   */
  async ensureAuth(): Promise<boolean> {
    const token = await this.getToken();
    if (token) return true;

    const action = await vscode.window.showWarningMessage(
      "Locus: No API key found. Set one to use Locus AI features.",
      "Set API Key",
      "Learn More"
    );

    if (action === "Set API Key") {
      const input = await vscode.window.showInputBox({
        title: "Locus API Key",
        prompt:
          "Enter your Locus API key. You can find it in your workspace settings.",
        password: true,
        ignoreFocusOut: true,
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return "API key cannot be empty";
          }
          return undefined;
        },
      });

      if (input) {
        await this.setToken(input.trim());
        return true;
      }
    } else if (action === "Learn More") {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "locusai"
      );
    }

    return false;
  }

  /**
   * Read the API key from the CLI settings file in the workspace root.
   * Returns undefined if the file doesn't exist or has no apiKey.
   */
  private readCliSettingsToken(): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) return undefined;

    const settingsPath = path.join(
      folders[0].uri.fsPath,
      CLI_SETTINGS_PATH
    );

    try {
      if (!fs.existsSync(settingsPath)) return undefined;
      const raw = fs.readFileSync(settingsPath, "utf-8");
      const parsed = JSON.parse(raw) as { apiKey?: string };
      return parsed.apiKey || undefined;
    } catch {
      return undefined;
    }
  }
}
