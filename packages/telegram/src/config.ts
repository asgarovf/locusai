import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
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
  provider?: string;
  /** AI model override */
  model?: string;
  /** Number of agents to spawn with /run */
  agentCount?: number;
  /** When true, use `bun run packages/cli/src/cli.ts` instead of published `locus` binary */
  testMode?: boolean;
}

interface SettingsJson {
  apiKey?: string;
  apiUrl?: string;
  provider?: string;
  model?: string;
  workspaceId?: string;
  agentCount?: number;
  telegram?: {
    botToken?: string;
    chatId?: number;
    testMode?: boolean;
  };
}

const SETTINGS_FILE = "settings.json";
const CONFIG_DIR = ".locus";

function loadSettings(projectPath: string): SettingsJson | null {
  const settingsPath = join(projectPath, CONFIG_DIR, SETTINGS_FILE);

  if (!existsSync(settingsPath)) {
    return null;
  }

  const raw = readFileSync(settingsPath, "utf-8");
  return JSON.parse(raw) as SettingsJson;
}

export function resolveConfig(): TelegramConfig {
  const projectPath = process.env.LOCUS_PROJECT_PATH || process.cwd();

  // Load from settings.json
  const settings = loadSettings(projectPath);
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
    provider: process.env.LOCUS_PROVIDER || settings?.provider || undefined,
    model: process.env.LOCUS_MODEL || settings?.model || undefined,
    agentCount: settings?.agentCount ?? 1,
    testMode: isTestMode,
  };
}
