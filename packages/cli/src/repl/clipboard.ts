/**
 * System clipboard image reader.
 * Extracts image data from the OS clipboard and saves it to a temp file.
 * Used to support CMD+V pasting of screenshots in the REPL.
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const STABLE_DIR = join(tmpdir(), "locus-images");

/**
 * Attempt to read image data from the system clipboard.
 * Returns the path to the saved image file, or null if no image data found.
 */
export function readClipboardImage(): string | null {
  if (process.platform === "darwin") {
    return readMacOSClipboardImage();
  }
  if (process.platform === "linux") {
    return readLinuxClipboardImage();
  }
  return null;
}

function ensureStableDir(): void {
  if (!existsSync(STABLE_DIR)) {
    mkdirSync(STABLE_DIR, { recursive: true });
  }
}

function readMacOSClipboardImage(): string | null {
  try {
    ensureStableDir();
    const destPath = join(STABLE_DIR, `clipboard-${Date.now()}.png`);

    // AppleScript to read clipboard image data (PNG preferred, TIFF fallback)
    // and write it to a file. Returns "ok" on success, "no-image" if clipboard
    // does not contain image data.
    const script = [
      `set destPath to POSIX file "${destPath}"`,
      "try",
      `  set imgData to the clipboard as \u00ABclass PNGf\u00BB`,
      "on error",
      "  try",
      `    set imgData to the clipboard as \u00ABclass TIFF\u00BB`,
      "  on error",
      `    return "no-image"`,
      "  end try",
      "end try",
      "set fRef to open for access destPath with write permission",
      "write imgData to fRef",
      "close access fRef",
      `return "ok"`,
    ].join("\n");

    const result = execSync("osascript", {
      input: script,
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    if (result === "ok" && existsSync(destPath)) {
      return destPath;
    }
  } catch {
    // Clipboard read failed — no image data or osascript unavailable.
  }
  return null;
}

function readLinuxClipboardImage(): string | null {
  try {
    // Check if xclip is available and clipboard has image data.
    const targets = execSync(
      "xclip -selection clipboard -t TARGETS -o 2>/dev/null",
      { encoding: "utf-8", timeout: 3000 }
    );

    if (!targets.includes("image/png")) {
      return null;
    }

    ensureStableDir();
    const destPath = join(STABLE_DIR, `clipboard-${Date.now()}.png`);

    execSync(
      `xclip -selection clipboard -t image/png -o > "${destPath}" 2>/dev/null`,
      { timeout: 5000 }
    );

    if (existsSync(destPath)) {
      return destPath;
    }
  } catch {
    // xclip not available or clipboard read failed.
  }
  return null;
}
