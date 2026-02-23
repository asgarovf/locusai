import { SettingsManager } from "@locusai/commands";
import { Provider } from "@locusai/sdk/node";
import dotenv from "dotenv";

dotenv.config();

export interface TelegramConfig {
  /** Telegram bot token from @BotFather */
  botToken: string;
  /** Authorized Telegram chat ID (only this user can interact) */
  chatId: number;
  /** Path to the Locus project directory */
  projectPath: string;
  /** Locus API key for commands that require it */
  apiKey?: string;
  /** Locus API base URL */
  apiBase?: string;
  /** Workspace ID (optional, auto-resolved if not set) */
  workspaceId?: string;
  /** AI provider (claude | codex) */
  provider?: Provider;
  /** AI model override */
  model?: string;
  /** When true, use `bun run packages/cli/src/cli.ts` instead of published `locus` binary */
  testMode?: boolean;
}

export function resolveConfig(): TelegramConfig {
  const projectPath = process.env.LOCUS_PROJECT_PATH || process.cwd();

  // Load from settings.json via shared SettingsManager
  const settingsManager = new SettingsManager(projectPath);
  const settings = settingsManager.exists() ? settingsManager.load() : null;
  const tg = settings?.telegram;

  // Environment variables override file config
  const botToken = process.env.LOCUS_TELEGRAM_TOKEN || tg?.botToken || "";
  const chatId = Number(process.env.LOCUS_TELEGRAM_CHAT_ID || tg?.chatId || 0);
  const apiKey = process.env.LOCUS_API_KEY || settings?.apiKey || "";
  const apiBase =
    process.env.LOCUS_API_URL ||
    settings?.apiUrl ||
    "https://api.locusai.dev/api";

  if (!botToken) {
    console.error(
      "Error: Telegram bot token is required.\n" +
        'Run: locus telegram setup --token "<TOKEN>" --chat-id <ID>\n' +
        "Or set LOCUS_TELEGRAM_TOKEN environment variable"
    );
    process.exit(1);
  }

  if (!chatId) {
    console.error(
      "Error: Telegram chat ID is required.\n" +
        'Run: locus telegram setup --token "<TOKEN>" --chat-id <ID>\n' +
        "Or set LOCUS_TELEGRAM_CHAT_ID environment variable\n" +
        "Tip: Send a message to your bot and check https://api.telegram.org/bot<TOKEN>/getUpdates"
    );
    process.exit(1);
  }

  const isTestMode =
    process.env.LOCUS_TEST_MODE === "true" || tg?.testMode || false;

  return {
    botToken,
    chatId,
    projectPath,
    apiKey: apiKey || undefined,
    apiBase: isTestMode ? "http://localhost:8000/api" : apiBase,
    provider:
      (process.env.LOCUS_PROVIDER as Provider) ||
      (settings?.provider as Provider) ||
      undefined,
    model: process.env.LOCUS_MODEL || settings?.model || undefined,
    testMode: isTestMode,
  };
}
