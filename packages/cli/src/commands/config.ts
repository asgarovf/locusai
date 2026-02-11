import { createInterface } from "node:readline";
import { c } from "@locusai/sdk/node";
import {
  type LocusSettings,
  SettingsManager,
  type TelegramSettings,
} from "../settings-manager";

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

const TOP_LEVEL_KEYS = [
  "apiKey",
  "apiUrl",
  "provider",
  "model",
  "workspaceId",
  "agentCount",
] as const;

const TELEGRAM_KEYS = [
  "telegram.botToken",
  "telegram.chatId",
  "telegram.testMode",
] as const;

const ALL_KEYS = [...TOP_LEVEL_KEYS, ...TELEGRAM_KEYS] as const;

function maskSecret(value: string): string {
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function showConfigHelp(): void {
  console.log(`
  ${c.header(" CONFIG ")}
    ${c.primary("locus config")} ${c.dim("<subcommand> [options]")}

  ${c.header(" SUBCOMMANDS ")}
    ${c.success("setup")}     Interactive configuration (or pass flags below)
              ${c.dim("--api-key <KEY>   Locus API key (required)")}
              ${c.dim("--api-url <URL>   API base URL (optional)")}
              ${c.dim("--provider <P>    AI provider (optional)")}
              ${c.dim("--model <M>       AI model (optional)")}
              ${c.dim("--agents <N>      Number of agents (1-5, optional)")}
    ${c.success("show")}      Show current settings
    ${c.success("set")}       Set a config value
              ${c.dim("locus config set <key> <value>")}
              ${c.dim(`Keys: ${ALL_KEYS.join(", ")}`)}
    ${c.success("remove")}    Remove all settings

  ${c.header(" EXAMPLES ")}
    ${c.dim("$")} ${c.primary("locus config setup")}
    ${c.dim("$")} ${c.primary("locus config setup --api-key sk-xxx")}
    ${c.dim("$")} ${c.primary("locus config show")}
    ${c.dim("$")} ${c.primary("locus config set apiKey sk-new-key")}
    ${c.dim("$")} ${c.primary("locus config set provider codex")}
    ${c.dim("$")} ${c.primary("locus config set telegram.botToken 123:ABC")}
    ${c.dim("$")} ${c.primary("locus config remove")}
`);
}

async function setupCommand(
  args: string[],
  projectPath: string
): Promise<void> {
  let apiKey: string | undefined;
  let apiUrl: string | undefined;
  let provider: string | undefined;
  let model: string | undefined;
  let agentCountStr: string | undefined;

  // Parse CLI flags for non-interactive use
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--api-key" && args[i + 1]) {
      apiKey = args[++i]?.trim();
    } else if (args[i] === "--api-url" && args[i + 1]) {
      apiUrl = args[++i]?.trim();
    } else if (args[i] === "--provider" && args[i + 1]) {
      provider = args[++i]?.trim();
    } else if (args[i] === "--model" && args[i + 1]) {
      model = args[++i]?.trim();
    } else if (args[i] === "--agents" && args[i + 1]) {
      agentCountStr = args[++i]?.trim();
    }
  }

  // If no flags provided, run interactive mode
  if (!apiKey && !apiUrl && !provider && !model && !agentCountStr) {
    console.log(`\n  ${c.header(" LOCUS SETUP ")}\n`);
    console.log(
      `  ${c.dim("Configure your Locus settings. Press Enter to skip optional fields.")}\n`
    );

    while (!apiKey) {
      apiKey = await ask(`  ${c.primary("API Key")} ${c.dim("(required)")}: `);
      if (!apiKey) {
        console.log(
          `  ${c.error("✖")} API key is required. Get one from ${c.underline("Workspace Settings > API Keys")}`
        );
      }
    }

    provider = await ask(
      `  ${c.primary("Provider")} ${c.dim("(optional, e.g. claude, codex)")}: `
    );
    model = await ask(
      `  ${c.primary("Model")} ${c.dim("(optional, e.g. opus, sonnet)")}: `
    );
    agentCountStr = await ask(
      `  ${c.primary("Agent Count")} ${c.dim("(optional, 1-5, default: 1)")}: `
    );

    // Convert empty strings to undefined
    if (!provider) provider = undefined;
    if (!model) model = undefined;
    if (!agentCountStr) agentCountStr = undefined;
  }

  if (!apiKey) {
    console.error(
      `\n  ${c.error("✖")} ${c.bold("Missing --api-key flag.")}\n` +
        `  Get an API key from ${c.underline("Workspace Settings > API Keys")}\n`
    );
    process.exit(1);
  }

  // Parse and validate agent count
  let agentCount: number | undefined;
  if (agentCountStr) {
    const parsed = Number.parseInt(agentCountStr, 10);
    if (Number.isNaN(parsed) || parsed < 1 || parsed > 5) {
      console.error(
        `\n  ${c.error("✖")} ${c.bold("Agent count must be a number between 1 and 5.")}\n`
      );
      process.exit(1);
    }
    agentCount = parsed;
  }

  const manager = new SettingsManager(projectPath);
  const existing = manager.load();

  const settings: LocusSettings = {
    ...existing,
    apiKey,
  };

  if (apiUrl) settings.apiUrl = apiUrl;
  if (provider) settings.provider = provider;
  if (model) settings.model = model;
  if (agentCount !== undefined) settings.agentCount = agentCount;

  manager.save(settings);

  console.log(`
  ${c.success("✔")} ${c.bold("Settings configured successfully!")}

  ${c.bold("Saved to:")} ${c.dim(".locus/settings.json")}

  ${c.bold("Configuration:")}
    ${c.primary("API Key:")}   ${maskSecret(apiKey)}${apiUrl ? `\n    ${c.primary("API URL:")}   ${apiUrl}` : ""}${provider ? `\n    ${c.primary("Provider:")}  ${provider}` : ""}${model ? `\n    ${c.primary("Model:")}     ${model}` : ""}${agentCount !== undefined ? `\n    ${c.primary("Agents:")}    ${agentCount}` : ""}

  ${c.bold("Next steps:")}
    Run agents:  ${c.primary("locus run")}
    Setup Telegram: ${c.primary("locus telegram setup")}
`);
}

function showCommand(projectPath: string): void {
  const manager = new SettingsManager(projectPath);
  const settings = manager.load();

  if (Object.keys(settings).length === 0) {
    console.log(
      `\n  ${c.dim("No settings found.")}\n` +
        `  Run ${c.primary("locus config setup")} to configure.\n`
    );
    return;
  }

  console.log(`\n  ${c.header(" SETTINGS ")}`);
  console.log(`  ${c.dim("File: .locus/settings.json")}\n`);

  if (settings.apiKey) {
    console.log(
      `    ${c.primary("apiKey:")}       ${maskSecret(settings.apiKey)}`
    );
  }
  if (settings.apiUrl) {
    console.log(`    ${c.primary("apiUrl:")}       ${settings.apiUrl}`);
  }
  if (settings.provider) {
    console.log(`    ${c.primary("provider:")}     ${settings.provider}`);
  }
  if (settings.model) {
    console.log(`    ${c.primary("model:")}        ${settings.model}`);
  }
  if (settings.workspaceId) {
    console.log(`    ${c.primary("workspaceId:")}  ${settings.workspaceId}`);
  }
  if (settings.agentCount !== undefined) {
    console.log(`    ${c.primary("agentCount:")}   ${settings.agentCount}`);
  }

  if (settings.telegram) {
    const tg = settings.telegram;
    console.log(`\n    ${c.header(" TELEGRAM ")}`);
    if (tg.botToken) {
      console.log(
        `    ${c.primary("botToken:")}     ${maskSecret(tg.botToken)}`
      );
    }
    if (tg.chatId) {
      console.log(`    ${c.primary("chatId:")}       ${tg.chatId}`);
    }
    if (tg.testMode !== undefined) {
      console.log(`    ${c.primary("testMode:")}     ${tg.testMode}`);
    }
  }

  console.log("");
}

function setCommand(args: string[], projectPath: string): void {
  const key = args[0]?.trim();
  const value = args.slice(1).join(" ").trim();

  if (!key || !value) {
    console.error(
      `\n  ${c.error("✖")} ${c.bold("Usage:")} locus config set <key> <value>\n` +
        `  ${c.dim(`Available keys: ${ALL_KEYS.join(", ")}`)}\n`
    );
    process.exit(1);
  }

  if (!(ALL_KEYS as readonly string[]).includes(key)) {
    console.error(
      `\n  ${c.error("✖")} ${c.bold(`Unknown key: ${key}`)}\n` +
        `  ${c.dim(`Available keys: ${ALL_KEYS.join(", ")}`)}\n`
    );
    process.exit(1);
  }

  const manager = new SettingsManager(projectPath);
  const settings = manager.load();

  if (key.startsWith("telegram.")) {
    const telegramKey = key.replace("telegram.", "") as keyof TelegramSettings;

    if (!settings.telegram) {
      settings.telegram = {};
    }

    if (telegramKey === "chatId") {
      const num = Number(value);
      if (Number.isNaN(num)) {
        console.error(
          `\n  ${c.error("✖")} ${c.bold(`${key} must be a number.`)}\n`
        );
        process.exit(1);
      }
      (settings.telegram as Record<string, unknown>)[telegramKey] = num;
    } else if (telegramKey === "testMode") {
      (settings.telegram as Record<string, unknown>)[telegramKey] =
        value === "true" || value === "1";
    } else {
      (settings.telegram as Record<string, unknown>)[telegramKey] = value;
    }
  } else if (key === "agentCount") {
    const num = Number.parseInt(value, 10);
    if (Number.isNaN(num) || num < 1 || num > 5) {
      console.error(
        `\n  ${c.error("✖")} ${c.bold("agentCount must be a number between 1 and 5.")}\n`
      );
      process.exit(1);
    }
    (settings as Record<string, unknown>)[key] = num;
  } else {
    (settings as Record<string, unknown>)[key] = value;
  }

  manager.save(settings);

  const displayValue =
    key === "apiKey" || key === "telegram.botToken" ? maskSecret(value) : value;
  console.log(
    `\n  ${c.success("✔")} Set ${c.primary(key)} = ${displayValue}\n`
  );
}

function removeCommand(projectPath: string): void {
  const manager = new SettingsManager(projectPath);

  if (!manager.exists()) {
    console.log(`\n  ${c.dim("No settings found. Nothing to remove.")}\n`);
    return;
  }

  manager.remove();
  console.log(`\n  ${c.success("✔")} ${c.bold("Settings removed.")}\n`);
}

export async function configCommand(args: string[]): Promise<void> {
  const projectPath = process.cwd();
  const subcommand = args[0];
  const subArgs = args.slice(1);

  switch (subcommand) {
    case "setup":
      await setupCommand(subArgs, projectPath);
      break;
    case "show":
      showCommand(projectPath);
      break;
    case "set":
      setCommand(subArgs, projectPath);
      break;
    case "remove":
      removeCommand(projectPath);
      break;
    default:
      showConfigHelp();
  }
}
