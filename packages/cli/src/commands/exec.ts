/**
 * `locus exec` — Interactive REPL, one-shot execution, and session management.
 *
 * Usage:
 *   locus exec                        # Interactive REPL
 *   locus exec "Add error handling"   # One-shot prompt
 *   locus exec -s <session-id>        # Resume session
 *   locus exec sessions list          # List sessions
 *   locus exec sessions show <id>     # Show session details
 *   locus exec sessions delete <id>   # Delete session
 *   locus exec --json-stream          # NDJSON mode for VSCode extension
 */

import {
  createRunnerAsync,
  createUserManagedSandboxRunner,
} from "../ai/runner.js";
import { loadConfig } from "../core/config.js";
import { getLogger } from "../core/logger.js";
import { buildReplPrompt } from "../core/prompt-builder.js";
import { getProviderSandboxName } from "../core/sandbox.js";
import { JsonStream } from "../display/json-stream.js";
import { bold, cyan, dim, green, red } from "../display/terminal.js";
import { startRepl } from "../repl/repl.js";
import { SessionManager } from "../repl/session-manager.js";

export async function execCommand(
  projectRoot: string,
  args: string[],
  flags: {
    sessionId?: string;
    jsonStream?: boolean;
  } = {}
): Promise<void> {
  const config = loadConfig(projectRoot);
  const _log = getLogger();

  // Session management subcommands
  if (args[0] === "sessions") {
    return handleSessionSubcommand(projectRoot, args.slice(1));
  }

  // JSON stream mode (for VSCode extension)
  if (flags.jsonStream) {
    return handleJsonStream(projectRoot, config, args, flags.sessionId);
  }

  // Determine mode
  const prompt = args.join(" ").trim();

  if (prompt) {
    // One-shot mode
    await startRepl({
      projectRoot,
      config,
      prompt,
      sessionId: flags.sessionId,
    });
  } else {
    // Interactive REPL
    await startRepl({
      projectRoot,
      config,
      sessionId: flags.sessionId,
    });
  }
}

// ─── Session Management ─────────────────────────────────────────────────────

async function handleSessionSubcommand(
  projectRoot: string,
  args: string[]
): Promise<void> {
  const sessionManager = new SessionManager(projectRoot);
  const subcommand = args[0] ?? "list";

  switch (subcommand) {
    case "list": {
      const sessions = sessionManager.list();
      if (sessions.length === 0) {
        process.stderr.write(`${dim("No sessions found.")}\n`);
        return;
      }

      process.stderr.write(
        `\n${bold("Sessions")} ${dim(`(${sessions.length})`)}\n\n`
      );
      for (const s of sessions.slice(0, 20)) {
        const age = formatAge(s.updated);
        const shortId = s.id.length > 16 ? s.id.slice(0, 16) : s.id;
        process.stderr.write(
          `  ${cyan(shortId.padEnd(16))} ${dim(age.padEnd(12))} ${dim(`${s.messageCount} msgs`)} ${dim(`${s.provider}/${s.model}`)}\n`
        );
      }
      process.stderr.write("\n");
      break;
    }

    case "show": {
      const id = args[1];
      if (!id) {
        process.stderr.write(
          `${red("✗")} Usage: locus exec sessions show <id>\n`
        );
        return;
      }
      const session = sessionManager.load(id);
      if (!session) {
        process.stderr.write(`${red("✗")} Session not found: ${bold(id)}\n`);
        return;
      }

      process.stderr.write(`\n${bold("Session")} ${dim(session.id)}\n`);
      process.stderr.write(
        `  ${dim("Created:")}  ${new Date(session.created).toLocaleString()}\n`
      );
      process.stderr.write(
        `  ${dim("Updated:")}  ${new Date(session.updated).toLocaleString()}\n`
      );
      process.stderr.write(
        `  ${dim("Provider:")} ${session.metadata.provider} / ${session.metadata.model}\n`
      );
      process.stderr.write(
        `  ${dim("Messages:")} ${session.messages.length}\n`
      );
      process.stderr.write(
        `  ${dim("Tokens:")}   ${session.metadata.totalTokens}\n`
      );
      process.stderr.write(`\n${bold("Messages:")}\n\n`);

      for (const msg of session.messages.slice(-10)) {
        const role = msg.role === "user" ? cyan("You") : green("AI");
        const preview = msg.content.slice(0, 120).replace(/\n/g, " ");
        process.stderr.write(`  ${role}: ${dim(preview)}\n`);
      }
      process.stderr.write("\n");
      break;
    }

    case "delete": {
      const id = args[1];
      if (!id) {
        process.stderr.write(
          `${red("✗")} Usage: locus exec sessions delete <id>\n`
        );
        return;
      }
      if (sessionManager.delete(id)) {
        process.stderr.write(`${green("✓")} Deleted session ${id}\n`);
      } else {
        process.stderr.write(`${red("✗")} Session not found: ${id}\n`);
      }
      break;
    }

    default:
      process.stderr.write(
        `${red("✗")} Unknown sessions subcommand: ${bold(subcommand)}\n`
      );
      process.stderr.write(
        `  Available: ${cyan("list")}, ${cyan("show")}, ${cyan("delete")}\n`
      );
  }
}

// ─── JSON Stream Mode ───────────────────────────────────────────────────────

async function handleJsonStream(
  projectRoot: string,
  config: ReturnType<typeof loadConfig>,
  args: string[],
  sessionId?: string
): Promise<void> {
  const sid = sessionId ?? `stream-${Date.now()}`;
  const stream = new JsonStream(sid);
  const prompt = args.join(" ").trim();

  if (!prompt) {
    stream.emitError("No prompt provided", false);
    return;
  }

  stream.emitStart();
  stream.emitStatus("thinking");

  try {
    const fullPrompt = buildReplPrompt(prompt, projectRoot, config);
    const sandboxName = getProviderSandboxName(
      config.sandbox,
      config.ai.provider
    );
    const runner = config.sandbox.enabled
      ? sandboxName
        ? createUserManagedSandboxRunner(config.ai.provider, sandboxName)
        : null
      : await createRunnerAsync(config.ai.provider, false);

    if (!runner) {
      stream.emitError(
        `Sandbox for provider \"${config.ai.provider}\" is not configured. Run locus sandbox.`,
        false
      );
      return;
    }

    const available = await runner.isAvailable();
    if (!available) {
      stream.emitError(`${config.ai.provider} CLI not available`, false);
      return;
    }

    stream.emitStatus("working");

    const result = await runner.execute({
      prompt: fullPrompt,
      model: config.ai.model,
      cwd: projectRoot,
      onOutput: (chunk) => {
        stream.emitTextDelta(chunk);
      },
    });

    if (result.success) {
      stream.emitDone();
    } else {
      stream.emitError(result.error ?? "Execution failed", true);
    }
  } catch (e) {
    stream.emitError(e instanceof Error ? e.message : String(e), false);
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatAge(isoDate: string): string {
  const ms = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(ms / 60_000);
  const hours = Math.floor(ms / 3_600_000);
  const days = Math.floor(ms / 86_400_000);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}
