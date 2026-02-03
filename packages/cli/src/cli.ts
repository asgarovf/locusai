#!/usr/bin/env node

import { c } from "@locusai/sdk/node";
import {
  execCommand,
  indexCommand,
  initCommand,
  reviewCommand,
  runCommand,
  showHelp,
} from "./commands";
import { printBanner } from "./utils";

async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  // Skip banner for exec command to prevent output conflicts
  if (command !== "exec") {
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
    case "review":
      await reviewCommand(args);
      break;
    default:
      showHelp();
  }
}

main().catch((err) => {
  console.error(`\n  ${c.error("✖ Fatal Error")} ${c.red(err.message)}`);
  process.exit(1);
});
