import { execSync } from "node:child_process";
import { c } from "@locusai/sdk/node";
import { VERSION } from "../utils";

function getTelegramVersion(): string | null {
  try {
    const output = execSync("npm list -g @locusai/telegram --depth=0 --json", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const parsed = JSON.parse(output);
    return parsed.dependencies?.["@locusai/telegram"]?.version || null;
  } catch {
    // not installed globally
  }

  return null;
}

export function versionCommand(): void {
  const telegramVersion = getTelegramVersion();

  console.log(`\n  ${c.header(" VERSIONS ")}\n`);
  console.log(`    ${c.primary("@locusai/cli")}        ${VERSION}`);

  if (telegramVersion) {
    console.log(`    ${c.primary("@locusai/telegram")}   ${telegramVersion}`);
  } else {
    console.log(
      `    ${c.primary("@locusai/telegram")}   ${c.dim("not installed")}`
    );
  }

  console.log("");
}
