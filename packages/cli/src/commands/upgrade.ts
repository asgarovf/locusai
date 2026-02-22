import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { c } from "@locusai/sdk/node";

const PACKAGES = ["@locusai/cli", "@locusai/telegram"] as const;
const SYSTEMD_UNIT_PATH = "/etc/systemd/system/locus.service";
const SYSTEMD_TELEGRAM_UNIT_PATH = "/etc/systemd/system/locus-telegram.service";

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

  // Restart systemd services if they exist
  if (process.platform === "linux") {
    for (const unit of [SYSTEMD_UNIT_PATH, SYSTEMD_TELEGRAM_UNIT_PATH]) {
      if (!existsSync(unit)) continue;
      const split = unit.split("/").pop();

      if (!split) {
        throw "PATH NOTH FOUND";
      }

      const name = split.replace(".service", "");
      try {
        console.log(`  ${c.info("▶")} Restarting ${name} service...`);
        execSync(`systemctl restart ${name}`, {
          stdio: ["pipe", "pipe", "pipe"],
        });
        console.log(`  ${c.success("✔")} ${name} service restarted\n`);
      } catch {
        console.log(
          `  ${c.dim("⚠")} Could not restart ${name} service (may need sudo)\n`
        );
      }
    }
  }

  console.log("");
}
