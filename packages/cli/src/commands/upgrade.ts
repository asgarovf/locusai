import { execSync } from "node:child_process";
import { c } from "@locusai/sdk/node";

const PACKAGES = ["@locusai/cli", "@locusai/telegram"] as const;

function getInstalledVersion(pkg: string): string | null {
  try {
    const output = execSync(`npm list -g ${pkg} --depth=0 --json`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const parsed = JSON.parse(output);
    return parsed.dependencies?.[pkg]?.version || null;
  } catch {
    return null;
  }
}

function getLatestVersion(pkg: string): string | null {
  try {
    return execSync(`npm view ${pkg} version`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

export async function upgradeCommand(): Promise<void> {
  console.log(`\n  ${c.header(" UPGRADE ")}\n`);

  try {
    console.log(`  ${c.dim("◌")} Cleaning npm cache...`);
    execSync("npm cache clean --force", {
      stdio: ["pipe", "pipe", "pipe"],
    });
    console.log(`  ${c.success("✔")} npm cache cleaned\n`);
  } catch {
    console.log(`  ${c.dim("⚠")} Could not clean npm cache, continuing...\n`);
  }

  for (const pkg of PACKAGES) {
    const current = getInstalledVersion(pkg);
    const latest = getLatestVersion(pkg);

    if (!latest) {
      console.log(
        `  ${c.error("✖")} ${c.bold(pkg)} — could not fetch latest version`
      );
      continue;
    }

    if (!current) {
      console.log(`  ${c.dim("⊘")} ${c.bold(pkg)} — not installed, skipping`);
      continue;
    }

    if (current === latest) {
      console.log(
        `  ${c.success("✔")} ${c.bold(pkg)} already at latest ${c.dim(`v${latest}`)}`
      );
      continue;
    }

    console.log(
      `  ${c.primary("↑")} ${c.bold(pkg)} ${c.dim(`v${current}`)} → ${c.primary(`v${latest}`)}`
    );

    try {
      execSync(`npm install -g ${pkg}@latest`, {
        stdio: "inherit",
      });
      console.log(
        `  ${c.success("✔")} ${c.bold(pkg)} updated to ${c.primary(`v${latest}`)}\n`
      );
    } catch {
      console.error(
        `  ${c.error("✖")} Failed to update ${c.bold(pkg)}. Try manually:\n` +
          `    ${c.primary(`npm install -g ${pkg}@latest`)}\n`
      );
    }
  }

  console.log("");
}
