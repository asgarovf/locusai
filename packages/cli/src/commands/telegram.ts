import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { c } from "@locusai/sdk/node";
import { SettingsManager } from "../settings-manager";

// ============================================================================
// Helpers
// ============================================================================

function ask(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

const CONFIGURABLE_KEYS = ["botToken", "chatId", "testMode"] as const;

function maskToken(token: string): string {
  if (token.length <= 8) return "****";
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

// ============================================================================
// Help
// ============================================================================

function showTelegramHelp(): void {
  console.log(`
  ${c.header(" TELEGRAM ")}
    ${c.primary("locus telegram")} ${c.dim("<subcommand> [options]")}

  ${c.header(" SUBCOMMANDS ")}
    ${c.success("start")}     Start the Telegram bot
    ${c.success("setup")}     Interactive Telegram bot setup (or pass flags below)
    ${c.success("config")}    Show current Telegram configuration
    ${c.success("set")}       Set a config value
              ${c.dim("locus telegram set <key> <value>")}
              ${c.dim(`Keys: ${CONFIGURABLE_KEYS.join(", ")}`)}
    ${c.success("remove")}    Remove Telegram configuration

  ${c.header(" EXAMPLES ")}
    ${c.dim("$")} ${c.primary("locus telegram start")}
    ${c.dim("$")} ${c.primary('locus telegram setup --token "123:ABC" --chat-id 987654')}
    ${c.dim("$")} ${c.primary("locus telegram config")}
    ${c.dim("$")} ${c.primary("locus telegram remove")}

  ${c.header(" NOTE ")}
    API key, provider, model, and other shared settings are now managed via:
    ${c.primary("locus config setup --api-key <key>")}
    ${c.primary("locus config set <key> <value>")}
`);
}

// ============================================================================
// Subcommands
// ============================================================================

async function setup(args: string[], projectPath: string): Promise<void> {
  let token: string | undefined;
  let chatId: string | undefined;

  // Parse CLI flags for non-interactive use
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--token" && args[i + 1]) {
      token = args[++i]?.trim();
    } else if (args[i] === "--chat-id" && args[i + 1]) {
      chatId = args[++i]?.trim();
    }
  }

  // If no flags provided, run interactive mode
  if (!token && !chatId) {
    console.log(`\n  ${c.header(" TELEGRAM SETUP ")}\n`);
    console.log(`  ${c.dim("Configure your Telegram bot integration.")}\n`);

    while (!token) {
      token = await ask(
        `  ${c.primary("Bot Token")} ${c.dim("(required, from @BotFather)")}: `
      );
      if (!token) {
        console.log(
          `  ${c.error("✖")} Bot token is required. Get one from ${c.underline("https://t.me/BotFather")}`
        );
      }
    }

    while (!chatId) {
      chatId = await ask(
        `  ${c.primary("Chat ID")} ${c.dim("(required, numeric)")}: `
      );
      if (!chatId) {
        console.log(`  ${c.error("✖")} Chat ID is required.`);
      } else if (Number.isNaN(Number(chatId))) {
        console.log(`  ${c.error("✖")} Chat ID must be a number.`);
        chatId = undefined;
      }
    }
  }

  if (!token) {
    console.error(
      `\n  ${c.error("✖")} ${c.bold("Missing --token flag.")}\n` +
        `  Get a bot token from ${c.underline("https://t.me/BotFather")}\n`
    );
    process.exit(1);
  }

  if (!chatId) {
    console.error(
      `\n  ${c.error("✖")} ${c.bold("Missing --chat-id flag.")}\n` +
        `  Send a message to your bot, then check:\n` +
        `  ${c.underline("https://api.telegram.org/bot<TOKEN>/getUpdates")}\n`
    );
    process.exit(1);
  }

  const parsedChatId = Number(chatId);
  if (Number.isNaN(parsedChatId)) {
    console.error(
      `\n  ${c.error("✖")} ${c.bold("Invalid chat ID.")} Must be a number.\n`
    );
    process.exit(1);
  }

  const manager = new SettingsManager(projectPath);
  const settings = manager.load();

  settings.telegram = {
    ...settings.telegram,
    botToken: token,
    chatId: parsedChatId,
  };

  manager.save(settings);

  console.log(`
  ${c.success("✔")} ${c.bold("Telegram bot configured successfully!")}

  ${c.bold("Saved to:")} ${c.dim(".locus/settings.json")}

  ${c.bold("Configuration:")}
    ${c.primary("Token:")}    ${maskToken(token)}
    ${c.primary("Chat ID:")}  ${parsedChatId}

  ${c.bold("Next steps:")}
    Start as daemon:  ${c.primary("locus daemon start")}
    Or run manually:  ${c.primary("locus telegram start")}
`);
}

function showConfig(projectPath: string): void {
  const manager = new SettingsManager(projectPath);
  const settings = manager.load();
  const tg = settings.telegram;

  if (!tg || Object.keys(tg).length === 0) {
    console.log(
      `\n  ${c.dim("No Telegram configuration found.")}\n` +
        `  Run ${c.primary("locus telegram setup")} to configure.\n`
    );
    return;
  }

  console.log(`\n  ${c.header(" TELEGRAM CONFIG ")}`);
  console.log(`  ${c.dim("File: .locus/settings.json (telegram section)")}\n`);

  const entries: [string, string][] = [];

  if (tg.botToken) entries.push(["botToken", maskToken(tg.botToken)]);
  if (tg.chatId) entries.push(["chatId", String(tg.chatId)]);
  if (tg.testMode !== undefined)
    entries.push(["testMode", String(tg.testMode)]);

  // Also show shared settings that affect Telegram
  if (settings.apiKey)
    entries.push(["apiKey (shared)", maskToken(settings.apiKey)]);
  if (settings.apiUrl) entries.push(["apiUrl (shared)", settings.apiUrl]);
  if (settings.provider) entries.push(["provider (shared)", settings.provider]);
  if (settings.model) entries.push(["model (shared)", settings.model]);
  if (settings.workspaceId)
    entries.push(["workspaceId (shared)", settings.workspaceId]);

  for (const [key, value] of entries) {
    console.log(`    ${c.primary(`${key}:`)}  ${value}`);
  }

  console.log("");
}

function setValue(args: string[], projectPath: string): void {
  const key = args[0]?.trim();
  const value = args.slice(1).join(" ").trim();

  if (!key || !value) {
    console.error(
      `\n  ${c.error("✖")} ${c.bold("Usage:")} locus telegram set <key> <value>\n` +
        `  ${c.dim(`Available keys: ${CONFIGURABLE_KEYS.join(", ")}`)}\n`
    );
    process.exit(1);
  }

  if (!CONFIGURABLE_KEYS.includes(key as (typeof CONFIGURABLE_KEYS)[number])) {
    console.error(
      `\n  ${c.error("✖")} ${c.bold(`Unknown key: ${key}`)}\n` +
        `  ${c.dim(`Available keys: ${CONFIGURABLE_KEYS.join(", ")}`)}\n` +
        `  ${c.dim("For shared settings (apiKey, provider, model), use: locus config set <key> <value>")}\n`
    );
    process.exit(1);
  }

  const manager = new SettingsManager(projectPath);
  const settings = manager.load();

  if (!settings.telegram) {
    settings.telegram = {};
  }

  if (key === "chatId") {
    const num = Number(value);
    if (Number.isNaN(num)) {
      console.error(
        `\n  ${c.error("✖")} ${c.bold(`${key} must be a number.`)}\n`
      );
      process.exit(1);
    }
    (settings.telegram as Record<string, unknown>)[key] = num;
  } else if (key === "testMode") {
    (settings.telegram as Record<string, unknown>)[key] =
      value === "true" || value === "1";
  } else {
    (settings.telegram as Record<string, unknown>)[key] = value;
  }

  manager.save(settings);

  const displayValue = key === "botToken" ? maskToken(value) : value;
  console.log(
    `\n  ${c.success("✔")} Set ${c.primary(key)} = ${displayValue}\n`
  );
}

function removeConfig(projectPath: string): void {
  const manager = new SettingsManager(projectPath);
  const settings = manager.load();

  if (!settings.telegram) {
    console.log(
      `\n  ${c.dim("No Telegram configuration found. Nothing to remove.")}\n`
    );
    return;
  }

  delete settings.telegram;
  manager.save(settings);
  console.log(
    `\n  ${c.success("✔")} ${c.bold("Telegram configuration removed.")}\n`
  );
}

function startBot(projectPath: string): void {
  const manager = new SettingsManager(projectPath);
  const settings = manager.load();

  if (!settings.telegram?.botToken || !settings.telegram?.chatId) {
    console.error(
      `\n  ${c.error("✖")} ${c.bold("Telegram is not configured.")}\n` +
        `  Run ${c.primary("locus telegram setup")} first.\n`
    );
    process.exit(1);
  }

  // Determine how to launch the telegram bot
  const monorepoEntry = join(projectPath, "packages/telegram/src/index.ts");
  const isMonorepo = existsSync(monorepoEntry);

  const cmd = isMonorepo ? "bun" : "locus-telegram";
  const cmdArgs = isMonorepo ? ["run", monorepoEntry] : [];

  const child = spawn(cmd, cmdArgs, {
    cwd: projectPath,
    stdio: "inherit",
    env: { ...process.env },
  });

  child.on("error", (err) => {
    if ((err as NodeJS.ErrnoException).code === "ENOENT" && !isMonorepo) {
      console.error(
        `\n  ${c.error("✖")} ${c.bold("locus-telegram not found.")}\n` +
          `  Install it with: ${c.primary("npm install -g @locusai/telegram")}\n`
      );
    } else {
      console.error(
        `\n  ${c.error("✖")} Failed to start bot: ${err.message}\n`
      );
    }
    process.exit(1);
  });

  child.on("close", (code) => {
    process.exit(code ?? 0);
  });
}

// ============================================================================
// Entry point
// ============================================================================

export async function telegramCommand(args: string[]): Promise<void> {
  const projectPath = process.cwd();
  const [subcommand, ...subArgs] = args;

  switch (subcommand) {
    case "start":
    case "run": // backward compat
      startBot(projectPath);
      break;
    case "setup":
      await setup(subArgs, projectPath);
      break;
    case "config":
      showConfig(projectPath);
      break;
    case "set":
      setValue(subArgs, projectPath);
      break;
    case "remove":
      removeConfig(projectPath);
      break;
    default:
      showTelegramHelp();
  }
}
