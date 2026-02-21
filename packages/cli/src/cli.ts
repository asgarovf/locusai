#!/usr/bin/env node

import { c } from "@locusai/sdk/node";
import {
  artifactsCommand,
  configCommand,
  discussCommand,
  docsCommand,
  execCommand,
  indexCommand,
  initCommand,
  planCommand,
  reviewCommand,
  runCommand,
  showHelp,
  startCommand,
  telegramCommand,
  upgradeCommand,
  versionCommand,
} from "./commands";
import { printBanner } from "./utils";

/** Check if --json-stream flag is present in raw argv. */
const isJsonStream = process.argv.includes("--json-stream");

async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  // When --json-stream is the first argument (invoked by the VSCode extension
  // as `locus --json-stream --session-id <id> -- <prompt>`), route directly
  // to exec with all original args so parseArgs can handle the flags.
  if (command === "--json-stream") {
    await execCommand([command, ...args]);
    return;
  }

  // Skip banner for exec, start, or no-command-with-TTY (defaults to start),
  // and when in JSON stream mode
  const isDefaultStart = !command && process.stdin.isTTY;
  if (command !== "exec" && command !== "start" && !isDefaultStart && !isJsonStream) {
    printBanner();
  }

  switch (command) {
    case "start":
      await startCommand(args);
      break;
    case "run":
      await runCommand(args);
      break;
    case "index":
      await indexCommand(args);
      break;
    case "init":
      await initCommand();
      break;
    case "exec":
      await execCommand(args);
      break;
    case "artifacts":
      await artifactsCommand(args);
      break;
    case "discuss":
      await discussCommand(args);
      break;
    case "plan":
      await planCommand(args);
      break;
    case "review":
      await reviewCommand(args);
      break;
    case "config":
      await configCommand(args);
      break;
    case "docs":
      await docsCommand(args);
      break;
    case "telegram":
      await telegramCommand(args);
      break;
    case "version":
    case "--version":
    case "-v":
      versionCommand();
      break;
    case "upgrade":
      await upgradeCommand();
      break;
    default:
      // No command given — default to `locus start` when stdin is a TTY
      if (!command && process.stdin.isTTY) {
        await startCommand(args);
      } else {
        showHelp();
      }
  }
}

main().catch((err) => {
  if (isJsonStream) {
    // In JSON stream mode, fatal errors are handled inside exec command.
    // If we reach here, it means the error happened before the renderer
    // was created. Emit a minimal error to stderr and exit.
    process.stderr.write(
      `${JSON.stringify({ fatal: true, error: err.message })}\n`
    );
    process.exit(1);
  }
  console.error(`\n  ${c.error("✖ Fatal Error")} ${c.red(err.message)}`);
  process.exit(1);
});
