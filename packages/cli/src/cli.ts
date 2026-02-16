#!/usr/bin/env node

import { c } from "@locusai/sdk/node";
import {
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

  // Skip banner for exec command or when in JSON stream mode
  if (command !== "exec" && !isJsonStream) {
    printBanner();
  }

  switch (command) {
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
      showHelp();
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
