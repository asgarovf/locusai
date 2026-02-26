/**
 * Telegram bot long-polling loop and command handlers.
 *
 * Uses the raw Telegram Bot API over HTTPS via the built-in `fetch` (Node 18+).
 * No external bot framework is required.
 *
 * Supported Telegram commands:
 *   /run <issue-number>  — invoke `locus run <n>` and reply with the summary
 *   /status              — show current locus status
 *   /stop                — send stop signal to the running agent
 *   /help                — list available commands
 */

import { readConfig } from "./config.js";
import { invokeLocus } from "./invoke.js";
import { removePid } from "./daemon.js";

// ─── Telegram API types ───────────────────────────────────────────────────────

interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
}

interface TelegramChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  text?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

interface TelegramApiResponse<T> {
  ok: boolean;
  result: T;
  description?: string;
  error_code?: number;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiPost<T>(
  token: string,
  method: string,
  body: Record<string, unknown>
): Promise<T> {
  const url = `https://api.telegram.org/bot${token}/${method}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} calling ${method}`);
  }

  const data = (await response.json()) as TelegramApiResponse<T>;

  if (!data.ok) {
    throw new Error(
      `Telegram API error [${data.error_code ?? "?"}]: ${data.description ?? "unknown"}`
    );
  }

  return data.result;
}

async function sendMessage(
  token: string,
  chatId: number,
  text: string
): Promise<void> {
  // Telegram messages are capped at 4096 chars; truncate with a notice.
  const MAX = 4000;
  const body =
    text.length > MAX
      ? `${text.slice(0, MAX)}\n\n_(output truncated)_`
      : text;

  await apiPost(token, "sendMessage", {
    chat_id: chatId,
    text: body,
    parse_mode: "Markdown",
  });
}

async function getUpdates(
  token: string,
  offset: number,
  timeoutSecs = 30
): Promise<TelegramUpdate[]> {
  return apiPost<TelegramUpdate[]>(token, "getUpdates", {
    offset,
    timeout: timeoutSecs,
    allowed_updates: ["message"],
  });
}

// ─── Command handlers ─────────────────────────────────────────────────────────

async function handleRun(
  token: string,
  chatId: number,
  issueNumber: string
): Promise<void> {
  if (!/^\d+$/.test(issueNumber)) {
    await sendMessage(token, chatId, "❌ Usage: `/run <issue-number>`");
    return;
  }

  await sendMessage(token, chatId, `⏳ Starting \`locus run ${issueNumber}\`…`);

  const result = invokeLocus(["run", issueNumber]);

  if (result.exitCode === 0) {
    const out =
      result.stdout.trim().slice(-3000) ||
      result.stderr.trim().slice(-3000) ||
      "Run completed successfully.";
    await sendMessage(
      token,
      chatId,
      `✅ *Run ${issueNumber} completed.*\n\n${out}`
    );
  } else {
    const err =
      result.stderr.trim().slice(-2000) ||
      result.stdout.trim().slice(-2000) ||
      "Unknown error.";
    await sendMessage(
      token,
      chatId,
      `❌ *Run ${issueNumber} failed.*\n\n${err}`
    );
  }
}

async function handleStatus(token: string, chatId: number): Promise<void> {
  const result = invokeLocus(["status"]);
  const out =
    result.stdout.trim().slice(-3000) ||
    result.stderr.trim().slice(-3000) ||
    "No status available.";
  await sendMessage(token, chatId, `📊 *Locus Status*\n\n${out}`);
}

async function handleStop(token: string, chatId: number): Promise<void> {
  await sendMessage(
    token,
    chatId,
    "🛑 Sending stop signal to the running agent…"
  );

  // Try `locus exec stop` if it exists; fall back to status check.
  const result = invokeLocus(["status"]);
  const out =
    result.stdout.trim().slice(-2000) ||
    result.stderr.trim().slice(-2000) ||
    "Stop signal sent.";

  await sendMessage(
    token,
    chatId,
    `ℹ️ To force-stop a running \`locus run\`, terminate the process on your server.\n\n${out}`
  );
}

async function handleHelp(token: string, chatId: number): Promise<void> {
  const help = [
    "*Locus Remote Control*",
    "",
    "`/run <issue-number>` — Start the agent on a GitHub issue",
    "`/status` — Show current Locus status",
    "`/stop` — Stop the running agent",
    "`/help` — Show this message",
  ].join("\n");

  await sendMessage(token, chatId, help);
}

// ─── Message router ───────────────────────────────────────────────────────────

async function handleMessage(
  token: string,
  chatId: number,
  text: string
): Promise<void> {
  const cmd = text.trim();

  if (cmd === "/help" || cmd.startsWith("/help ")) {
    await handleHelp(token, chatId);
    return;
  }

  if (cmd.startsWith("/run ")) {
    const issueNumber = cmd.slice(5).trim();
    await handleRun(token, chatId, issueNumber);
    return;
  }

  if (cmd === "/run") {
    await sendMessage(token, chatId, "❌ Usage: `/run <issue-number>`");
    return;
  }

  if (cmd === "/status" || cmd.startsWith("/status ")) {
    await handleStatus(token, chatId);
    return;
  }

  if (cmd === "/stop" || cmd.startsWith("/stop ")) {
    await handleStop(token, chatId);
    return;
  }

  await sendMessage(
    token,
    chatId,
    "❓ Unknown command. Send `/help` to see available commands."
  );
}

// ─── Main polling loop ────────────────────────────────────────────────────────

/**
 * Start the Telegram bot long-polling loop.
 *
 * Reads the bot token from the Locus config file or the `TELEGRAM_BOT_TOKEN`
 * environment variable. Runs until it receives SIGTERM or SIGINT.
 */
export async function runBot(): Promise<void> {
  const config = readConfig();
  const token = config.token ?? process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    process.stderr.write(
      "No Telegram bot token configured.\n" +
        "  Run: locus pkg telegram config set token <TOKEN>\n" +
        "  Or set the TELEGRAM_BOT_TOKEN environment variable.\n"
    );
    process.exit(1);
  }

  process.stderr.write("Telegram bot polling started.\n");

  let offset = 0;
  let running = true;

  const onShutdown = (signal: string) => {
    process.stderr.write(`\nReceived ${signal}. Shutting down gracefully.\n`);
    running = false;
    removePid();
    process.exit(0);
  };

  process.on("SIGTERM", () => onShutdown("SIGTERM"));
  process.on("SIGINT", () => onShutdown("SIGINT"));

  while (running) {
    try {
      const updates = await getUpdates(token, offset);

      for (const update of updates) {
        // Advance the offset so we don't process this update again.
        offset = Math.max(offset, update.update_id + 1);

        const msg = update.message;
        if (!msg?.text || !msg.chat) continue;
        if (!msg.text.startsWith("/")) continue;

        // Check allowlist if configured.
        if (
          config.allowedChatIds &&
          config.allowedChatIds.length > 0 &&
          !config.allowedChatIds.includes(msg.chat.id)
        ) {
          process.stderr.write(
            `Ignored message from unauthorised chat ${msg.chat.id}\n`
          );
          continue;
        }

        await handleMessage(token, msg.chat.id, msg.text).catch(
          (err: Error) => {
            process.stderr.write(
              `Error handling message: ${err.message}\n`
            );
          }
        );
      }
    } catch (err) {
      const error = err as Error;
      // Network / API errors — wait briefly before retrying.
      process.stderr.write(`Polling error: ${error.message}\n`);
      await new Promise((res) => setTimeout(res, 5000));
    }
  }
}
