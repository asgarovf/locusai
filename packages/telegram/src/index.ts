/**
 * locus-telegram — Remote-control your Locus agent from Telegram.
 *
 * CLI entry point. Dispatches to sub-commands based on process.argv[2].
 *
 * Usage:
 *   locus-telegram start                     # start the bot daemon
 *   locus-telegram stop                      # stop the daemon
 *   locus-telegram status                    # check daemon status
 *   locus-telegram config set token <TOKEN>  # save bot token
 *   locus-telegram --daemon                  # internal: run the polling loop
 */

const command = process.argv[2];

async function main(): Promise<void> {
  switch (command) {
    // ── start ────────────────────────────────────────────────────────────────
    case "start": {
      const { startDaemon } = await import("./daemon.js");
      startDaemon();
      break;
    }

    // ── stop ─────────────────────────────────────────────────────────────────
    case "stop": {
      const { stopDaemon } = await import("./daemon.js");
      stopDaemon();
      break;
    }

    // ── status ───────────────────────────────────────────────────────────────
    case "status": {
      const { printStatus } = await import("./daemon.js");
      printStatus();
      break;
    }

    // ── config ───────────────────────────────────────────────────────────────
    case "config": {
      const subCmd = process.argv[3]; // e.g. "set"
      const key = process.argv[4];    // e.g. "token"
      const value = process.argv[5];  // e.g. "<TOKEN>"

      if (subCmd === "set" && key === "token") {
        if (!value) {
          process.stderr.write(
            "Usage: locus-telegram config set token <TOKEN>\n"
          );
          process.exit(1);
          break;
        }
        const { setToken } = await import("./config.js");
        setToken(value);
        process.stdout.write("Token saved successfully.\n");
      } else {
        process.stderr.write(
          "Usage: locus-telegram config set token <TOKEN>\n"
        );
        process.exit(1);
      }
      break;
    }

    // ── --daemon (internal) ───────────────────────────────────────────────────
    // This flag is used when the daemon spawns itself as a detached child.
    case "--daemon": {
      const { runBot } = await import("./bot.js");
      await runBot();
      break;
    }

    // ── help / default ────────────────────────────────────────────────────────
    default: {
      const isHelp =
        command === "--help" || command === "-h" || command === "help";

      if (!isHelp && command !== undefined) {
        process.stderr.write(`Unknown command: ${command}\n\n`);
      }

      process.stdout.write(
        [
          "locus-telegram — Remote-control your Locus agent from Telegram",
          "",
          "Commands:",
          "  start                     Start the Telegram bot daemon",
          "  stop                      Stop the daemon",
          "  status                    Check daemon status",
          "  config set token <TOKEN>  Save the Telegram bot token",
          "",
          "Options:",
          "  --help, -h                Show this help message",
          "",
          "Environment:",
          "  TELEGRAM_BOT_TOKEN        Bot token (alternative to config set token)",
          "",
          "Token setup:",
          "  1. Create a bot with @BotFather on Telegram",
          "  2. Copy the bot token",
          "  3. Run: locus pkg telegram config set token <TOKEN>",
          "  4. Run: locus pkg telegram start",
          "",
        ].join("\n")
      );

      if (!isHelp && command !== undefined) {
        process.exit(1);
      }
      break;
    }
  }
}

main().catch((err: Error) => {
  process.stderr.write(`locus-telegram error: ${err.message}\n`);
  process.exit(1);
});
