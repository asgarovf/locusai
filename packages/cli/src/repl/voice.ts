/**
 * Voice input module for the REPL.
 *
 * Records audio via sox (`rec` command) and transcribes locally
 * with whisper.cpp. No API keys, no network, fully offline.
 *
 * Flow:
 *   1. /voice → start recording
 *   2. Enter → stop recording → transcribe
 *   3. Transcribed text pre-filled into input buffer
 */

import { type ChildProcess, execSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { cpus, homedir, platform, tmpdir } from "node:os";
import { join } from "node:path";
import { bold, cyan, dim, green, red, yellow } from "../display/terminal.js";

// ─── Types ──────────────────────────────────────────────────────────────────

export type VoiceState = "idle" | "recording" | "transcribing";

export interface VoiceResult {
  text: string;
}

// ─── Configuration ──────────────────────────────────────────────────────────

const WHISPER_MODEL = "base.en";
const WHISPER_MODELS_DIR = join(homedir(), ".locus", "whisper-models");
const LOCUS_BIN_DIR = join(homedir(), ".locus", "bin");

function getWhisperModelPath(): string {
  return join(WHISPER_MODELS_DIR, `ggml-${WHISPER_MODEL}.bin`);
}

// ─── Dependency Detection ───────────────────────────────────────────────────

function commandExists(cmd: string): boolean {
  try {
    const which = platform() === "win32" ? "where" : "which";
    execSync(`${which} ${cmd}`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function findWhisperBinary(): string | null {
  // Try common names for the whisper.cpp CLI binary.
  // Homebrew installs it as "whisper-cli" (primary) since whisper.cpp v1.7+.
  const candidates = ["whisper-cli", "whisper-cpp", "whisper", "main"];
  for (const name of candidates) {
    if (commandExists(name)) return name;
  }

  // Check ~/.locus/bin/ (self-built installs on Linux)
  for (const name of candidates) {
    const fullPath = join(LOCUS_BIN_DIR, name);
    if (existsSync(fullPath)) return fullPath;
  }

  // On macOS, check common Homebrew paths directly (PATH may be incomplete)
  if (platform() === "darwin") {
    const brewDirs = ["/opt/homebrew/bin", "/usr/local/bin"];
    for (const dir of brewDirs) {
      for (const name of candidates) {
        const fullPath = join(dir, name);
        if (existsSync(fullPath)) return fullPath;
      }
    }
  }

  return null;
}

function findSoxRecBinary(): string | null {
  if (commandExists("rec")) return "rec";
  if (commandExists("sox")) return "sox";

  // On macOS, check common Homebrew paths directly
  if (platform() === "darwin") {
    const brewDirs = ["/opt/homebrew/bin", "/usr/local/bin"];
    for (const dir of brewDirs) {
      const recPath = join(dir, "rec");
      if (existsSync(recPath)) return recPath;
      const soxPath = join(dir, "sox");
      if (existsSync(soxPath)) return soxPath;
    }
  }

  return null;
}

export interface DependencyStatus {
  sox: boolean;
  whisper: boolean;
  whisperBinary: string | null;
  soxBinary: string | null;
  modelDownloaded: boolean;
}

export function checkDependencies(): DependencyStatus {
  const soxBinary = findSoxRecBinary();
  const whisperBinary = findWhisperBinary();
  const modelDownloaded = existsSync(getWhisperModelPath());

  return {
    sox: soxBinary !== null,
    whisper: whisperBinary !== null,
    whisperBinary,
    soxBinary,
    modelDownloaded,
  };
}

export function printDependencyHelp(deps: DependencyStatus): void {
  const out = process.stderr;
  out.write(`\n${bold("Voice Input Setup")}\n\n`);

  if (!deps.sox) {
    out.write(`  ${red("✗")} ${bold("sox")} — audio recording\n`);
    if (platform() === "darwin") {
      out.write(`    Install: ${cyan("brew install sox")}\n`);
    } else {
      out.write(
        `    Install: ${cyan("sudo apt install sox")} or ${cyan("sudo dnf install sox")}\n`
      );
    }
  } else {
    out.write(
      `  ${green("✓")} ${bold("sox")} — audio recording ${dim(`(${deps.soxBinary})`)}\n`
    );
  }

  if (!deps.whisper) {
    out.write(`  ${red("✗")} ${bold("whisper.cpp")} — speech-to-text\n`);
    if (platform() === "darwin") {
      out.write(`    Install: ${cyan("brew install whisper-cpp")}\n`);
    } else {
      out.write(
        `    Install: Build from source — ${cyan("https://github.com/ggerganov/whisper.cpp")}\n`
      );
    }
  } else {
    out.write(
      `  ${green("✓")} ${bold("whisper.cpp")} — speech-to-text ${dim(`(${deps.whisperBinary})`)}\n`
    );
  }

  if (deps.whisper && !deps.modelDownloaded) {
    out.write(
      `  ${yellow("!")} Model ${bold(WHISPER_MODEL)} not downloaded yet — will download on first use (~150MB)\n`
    );
    out.write(`    Path: ${dim(getWhisperModelPath())}\n`);
  } else if (deps.whisper && deps.modelDownloaded) {
    out.write(`  ${green("✓")} Model ${bold(WHISPER_MODEL)} ${dim("ready")}\n`);
  }

  out.write("\n");

  if (!deps.sox || !deps.whisper) {
    out.write(
      `  ${dim("Install the missing dependencies above, then try again.")}\n\n`
    );
  }
}

// ─── Auto-Installation ──────────────────────────────────────────────────────

type PackageManager = "brew" | "apt" | "dnf" | "pacman";

function detectPackageManager(): PackageManager | null {
  if (platform() === "darwin") {
    return commandExists("brew") ? "brew" : null;
  }
  if (commandExists("apt-get")) return "apt";
  if (commandExists("dnf")) return "dnf";
  if (commandExists("pacman")) return "pacman";
  return null;
}

function installSox(pm: PackageManager): boolean {
  try {
    switch (pm) {
      case "brew":
        execSync("brew install sox", { stdio: "inherit", timeout: 300_000 });
        break;
      case "apt":
        execSync("sudo apt-get install -y sox", {
          stdio: "inherit",
          timeout: 300_000,
        });
        break;
      case "dnf":
        execSync("sudo dnf install -y sox", {
          stdio: "inherit",
          timeout: 300_000,
        });
        break;
      case "pacman":
        execSync("sudo pacman -S --noconfirm sox", {
          stdio: "inherit",
          timeout: 300_000,
        });
        break;
    }
    return true;
  } catch {
    return false;
  }
}

function installWhisperCpp(pm: PackageManager): boolean {
  if (pm === "brew") {
    try {
      execSync("brew install whisper-cpp", {
        stdio: "inherit",
        timeout: 300_000,
      });
      return true;
    } catch {
      return false;
    }
  }
  return buildWhisperFromSource(pm);
}

function ensureBuildDeps(pm: PackageManager): boolean {
  const hasCmake = commandExists("cmake");
  const hasCxx = commandExists("g++") || commandExists("c++");
  const hasGit = commandExists("git");

  if (hasCmake && hasCxx && hasGit) return true;

  process.stderr.write(`  ${dim("Installing build tools...")}\n`);

  try {
    switch (pm) {
      case "apt":
        execSync("sudo apt-get install -y cmake g++ make git", {
          stdio: "inherit",
          timeout: 300_000,
        });
        break;
      case "dnf":
        execSync("sudo dnf install -y cmake gcc-c++ make git", {
          stdio: "inherit",
          timeout: 300_000,
        });
        break;
      case "pacman":
        execSync("sudo pacman -S --noconfirm cmake gcc make git", {
          stdio: "inherit",
          timeout: 300_000,
        });
        break;
      default:
        return false;
    }
    return true;
  } catch {
    return false;
  }
}

function buildWhisperFromSource(pm: PackageManager): boolean {
  const out = process.stderr;
  const buildDir = join(tmpdir(), `locus-whisper-build-${process.pid}`);

  if (!ensureBuildDeps(pm)) {
    out.write(
      `  ${red("✗")} Could not install build tools (cmake, g++, git).\n`
    );
    return false;
  }

  try {
    mkdirSync(buildDir, { recursive: true });
    mkdirSync(LOCUS_BIN_DIR, { recursive: true });

    out.write(`  ${dim("Cloning whisper.cpp...")}\n`);
    execSync(
      `git clone --depth 1 https://github.com/ggerganov/whisper.cpp.git "${join(buildDir, "whisper.cpp")}"`,
      { stdio: ["pipe", "pipe", "pipe"], timeout: 120_000 }
    );

    const srcDir = join(buildDir, "whisper.cpp");
    const numCpus = cpus().length || 2;

    out.write(
      `  ${dim("Building whisper.cpp (this may take a few minutes)...")}\n`
    );
    execSync("cmake -B build -DCMAKE_BUILD_TYPE=Release", {
      cwd: srcDir,
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 120_000,
    });
    execSync(`cmake --build build --config Release -j${numCpus}`, {
      cwd: srcDir,
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 600_000,
    });

    // Find the built binary — name varies by whisper.cpp version
    const destPath = join(LOCUS_BIN_DIR, "whisper-cli");
    const binaryCandidates = [
      join(srcDir, "build", "bin", "whisper-cli"),
      join(srcDir, "build", "bin", "main"),
    ];

    for (const candidate of binaryCandidates) {
      if (existsSync(candidate)) {
        execSync(`cp "${candidate}" "${destPath}" && chmod +x "${destPath}"`, {
          stdio: "pipe",
        });
        return true;
      }
    }

    out.write(
      `  ${red("✗")} Build completed but whisper-cli binary not found.\n`
    );
    return false;
  } catch (e) {
    out.write(
      `  ${red("✗")} Build failed: ${e instanceof Error ? e.message : String(e)}\n`
    );
    return false;
  } finally {
    try {
      execSync(`rm -rf "${buildDir}"`, { stdio: "pipe" });
    } catch {
      // ignore cleanup errors
    }
  }
}

function autoInstallDependencies(deps: DependencyStatus): boolean {
  if (platform() === "win32") {
    process.stderr.write(
      `\n${red("✗")} Voice input is not supported on Windows.\n\n`
    );
    return false;
  }

  const pm = detectPackageManager();
  if (!pm) {
    process.stderr.write(`\n${red("✗")} No supported package manager found.\n`);
    if (platform() === "darwin") {
      process.stderr.write(
        `  Install Homebrew first: ${cyan("https://brew.sh")}\n`
      );
    }
    process.stderr.write("\n");
    return false;
  }

  const out = process.stderr;
  out.write(`\n${bold("Installing voice dependencies...")}\n\n`);

  if (!deps.sox) {
    out.write(
      `  ${dim("Installing")} ${bold("sox")} ${dim("(audio recording)...")}\n`
    );
    if (!installSox(pm)) {
      out.write(`  ${red("✗")} Failed to install sox.\n\n`);
      return false;
    }
    out.write(`  ${green("✓")} sox installed\n\n`);
  }

  if (!deps.whisper) {
    out.write(
      `  ${dim("Installing")} ${bold("whisper.cpp")} ${dim("(speech-to-text)...")}\n`
    );
    if (!installWhisperCpp(pm)) {
      out.write(`  ${red("✗")} Failed to install whisper.cpp.\n\n`);
      return false;
    }
    out.write(`  ${green("✓")} whisper.cpp installed\n\n`);
  }

  out.write(`${green("✓")} Voice dependencies ready.\n\n`);
  return true;
}

// ─── Model Download ─────────────────────────────────────────────────────────

function downloadModel(): boolean {
  const modelPath = getWhisperModelPath();
  if (existsSync(modelPath)) return true;

  mkdirSync(WHISPER_MODELS_DIR, { recursive: true });

  const url = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${WHISPER_MODEL === "base.en" ? "ggml-base.en.bin" : `ggml-${WHISPER_MODEL}.bin`}`;

  process.stderr.write(
    `${dim("Downloading whisper model")} ${bold(WHISPER_MODEL)} ${dim("(~150MB)...")}\n`
  );

  try {
    // Try curl first (most common), then wget
    if (commandExists("curl")) {
      execSync(`curl -L -o "${modelPath}" "${url}"`, {
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 300_000, // 5 min timeout
      });
    } else if (commandExists("wget")) {
      execSync(`wget -O "${modelPath}" "${url}"`, {
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 300_000,
      });
    } else {
      process.stderr.write(
        `${red("✗")} Neither curl nor wget found. Download the model manually:\n`
      );
      process.stderr.write(`    ${cyan(url)}\n`);
      process.stderr.write(`    Save to: ${dim(modelPath)}\n`);
      return false;
    }

    process.stderr.write(
      `${green("✓")} Model downloaded to ${dim(modelPath)}\n`
    );
    return true;
  } catch (e) {
    process.stderr.write(
      `${red("✗")} Failed to download model: ${e instanceof Error ? e.message : String(e)}\n`
    );
    // Clean up partial download
    try {
      unlinkSync(modelPath);
    } catch {
      // ignore
    }
    return false;
  }
}

// ─── Voice Controller ───────────────────────────────────────────────────────

export class VoiceController {
  private state: VoiceState = "idle";
  private recordProcess: ChildProcess | null = null;
  private tempFile: string;
  private deps: DependencyStatus;
  private onStateChange: (state: VoiceState) => void;

  constructor(options: {
    onStateChange: (state: VoiceState) => void;
  }) {
    this.onStateChange = options.onStateChange;
    this.tempFile = join(tmpdir(), `locus-voice-${process.pid}.wav`);
    this.deps = checkDependencies();
  }

  getState(): VoiceState {
    return this.state;
  }

  /**
   * Start voice recording. Returns false if dependencies are missing.
   */
  startRecording(): boolean {
    if (this.state !== "idle") return false;

    // Re-check dependencies (user may have installed since REPL started)
    this.deps = checkDependencies();
    if (!this.deps.sox || !this.deps.whisper) {
      if (!autoInstallDependencies(this.deps)) {
        return false;
      }
      // Re-check after installation
      this.deps = checkDependencies();
      if (!this.deps.sox || !this.deps.whisper) {
        printDependencyHelp(this.deps);
        return false;
      }
    }

    // Ensure model is available
    if (!this.deps.modelDownloaded) {
      if (!downloadModel()) {
        return false;
      }
      this.deps.modelDownloaded = true;
    }

    // Start recording with sox
    const args = this.buildRecordArgs();
    if (!args) return false;

    const binary = this.deps.soxBinary;

    if (!binary) {
      process.stderr.write(
        `${red("✗")} sox binary not found. Please install sox and try again.\n`
      );
      return false;
    }

    const spawnArgs = binary === "rec" ? args : ["-d", ...args]; // sox needs -d for default input

    this.recordProcess = spawn(binary, spawnArgs, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.recordProcess.on("error", (err) => {
      process.stderr.write(
        `\r\n${red("✗")} Recording failed: ${err.message}\r\n`
      );
      this.setState("idle");
    });

    this.setState("recording");
    return true;
  }

  private buildRecordArgs(): string[] | null {
    // Record 16kHz mono WAV (whisper.cpp requires 16kHz)
    return [
      "-r",
      "16000", // 16kHz sample rate
      "-c",
      "1", // mono
      "-b",
      "16", // 16-bit
      this.tempFile, // output file
    ];
  }

  /**
   * Stop recording and transcribe. Returns the transcribed text, or null
   * if nothing was recorded or no speech was detected.
   */
  async stopAndTranscribe(): Promise<string | null> {
    if (!this.recordProcess) {
      this.setState("idle");
      return null;
    }

    // Stop recording by sending SIGTERM
    this.recordProcess.kill("SIGTERM");
    this.recordProcess = null;

    // Reset to idle immediately so the prompt returns to normal
    this.setState("idle");

    // Brief wait for file to be finalized
    await sleep(200);

    if (!existsSync(this.tempFile)) {
      return null;
    }

    try {
      const text = await this.transcribe();
      return text || null;
    } catch (e) {
      process.stderr.write(
        `${red("✗")} Transcription failed: ${e instanceof Error ? e.message : String(e)}\n`
      );
      return null;
    } finally {
      // Clean up temp file
      try {
        unlinkSync(this.tempFile);
      } catch {
        // ignore
      }
    }
  }

  private transcribe(): Promise<string> {
    return new Promise((resolve, reject) => {
      const binary = this.deps.whisperBinary;

      if (!binary) {
        process.stderr.write(
          `${red("✗")} whisper.cpp binary not found. Please install whisper.cpp and try again.\n`
        );
        reject(
          new Error(
            "whisper.cpp binary not found. Please install whisper.cpp and try again."
          )
        );
        return;
      }

      const modelPath = getWhisperModelPath();

      const args = [
        "-m",
        modelPath,
        "-f",
        this.tempFile,
        "--no-timestamps",
        "--language",
        WHISPER_MODEL.endsWith(".en") ? "en" : "auto",
      ];

      const proc = spawn(binary, args, {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      proc.stdout?.on("data", (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr?.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on("error", (err) => {
        reject(new Error(`whisper.cpp failed to start: ${err.message}`));
      });

      proc.on("close", (code) => {
        if (code !== 0) {
          reject(
            new Error(`whisper.cpp exited with code ${code}: ${stderr.trim()}`)
          );
          return;
        }

        // Parse whisper output — strip timestamps and clean up
        const text = stdout
          .split("\n")
          .map((line) => line.replace(/^\[.*?\]\s*/, "").trim())
          .filter((line) => line.length > 0)
          .join(" ")
          .trim();

        resolve(text);
      });
    });
  }

  /**
   * Cancel any active recording without transcribing.
   */
  cancel(): void {
    if (this.recordProcess) {
      this.recordProcess.kill("SIGKILL");
      this.recordProcess = null;
    }

    try {
      unlinkSync(this.tempFile);
    } catch {
      // ignore
    }

    this.setState("idle");
  }

  private setState(state: VoiceState): void {
    this.state = state;
    this.onStateChange(state);
  }
}

// ─── Status Display ─────────────────────────────────────────────────────────

export function voiceStatusIndicator(state: VoiceState): string {
  switch (state) {
    case "recording":
      return `${red(bold("[REC]"))} `;
    case "transcribing":
      return ` ${yellow("[...]")} `;
    default:
      return "";
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
