/**
 * Main REPL orchestrator.
 * Manages the session loop, turn lifecycle, AI stream consumption,
 * tool display, and error handling with retry.
 */

import { execSync } from "node:child_process";
import {
  buildPersistentSandboxName,
  SandboxedClaudeRunner,
} from "../ai/claude-sandbox.js";
import { runAI } from "../ai/run-ai.js";
import { createUserManagedSandboxRunner } from "../ai/runner.js";
import { inferProviderFromModel } from "../core/ai-models.js";
import { buildReplPrompt } from "../core/prompt-builder.js";
import { bold, cyan, dim, green, red } from "../display/terminal.js";
import type { AgentRunner, LocusConfig, Session } from "../types.js";
import { getAllCommandNames, handleSlashCommand } from "./commands.js";
import {
  CombinedCompletion,
  FilePathCompletion,
  SlashCommandCompletion,
} from "./completions.js";
import {
  buildImageContext,
  collectReferencedAttachments,
  normalizeImagePlaceholders,
} from "./image-detect.js";
import { InputHandler } from "./input-handler.js";
import { InputHistory } from "./input-history.js";
import { persistReplModelSelection } from "./model-config.js";
import { SessionManager } from "./session-manager.js";

export interface ReplOptions {
  projectRoot: string;
  config: LocusConfig;
  /** Resume an existing session instead of creating new. */
  sessionId?: string;
  /** One-shot mode: execute a single prompt and exit. */
  prompt?: string;
}

export async function startRepl(options: ReplOptions): Promise<void> {
  const { projectRoot, config } = options;

  // Initialize session
  const sessionManager = new SessionManager(projectRoot);
  let session: Session;

  if (options.sessionId) {
    const loaded = sessionManager.load(options.sessionId);
    if (!loaded) {
      process.stderr.write(
        `${red("✗")} Session not found: ${bold(options.sessionId)}\n`
      );
      return;
    }
    session = loaded;
    process.stderr.write(
      `${green("✓")} Resumed session ${dim(session.id)} (${session.messages.length} messages)\n`
    );
  } else {
    let branch = "main";
    try {
      branch = execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: projectRoot,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
    } catch {
      // Ignore
    }

    const initialProvider =
      inferProviderFromModel(config.ai.model) || config.ai.provider;
    session = sessionManager.create({
      cwd: projectRoot,
      branch,
      provider: initialProvider,
      model: config.ai.model,
    });
  }

  // One-shot mode
  if (options.prompt) {
    await executeOneShotPrompt(
      options.prompt,
      session,
      sessionManager,
      options
    );
    return;
  }

  // Interactive REPL
  await runInteractiveRepl(session, sessionManager, options);
}

// ─── One-Shot Mode ──────────────────────────────────────────────────────────

async function executeOneShotPrompt(
  prompt: string,
  session: Session,
  sessionManager: SessionManager,
  options: ReplOptions
): Promise<void> {
  const { projectRoot, config } = options;

  const normalized = normalizeImagePlaceholders(prompt);
  const text = normalized.text;
  const images = collectReferencedAttachments(text, normalized.attachments);
  const imageContext = buildImageContext(images);

  // Build prompt (include conversation history for context)
  const fullPrompt = buildReplPrompt(
    text + imageContext,
    projectRoot,
    config,
    session.messages
  );

  // Add user message to session
  sessionManager.addMessage(session, {
    role: "user",
    content: text,
    timestamp: new Date().toISOString(),
  });

  // Execute
  const result = await executeAITurn(fullPrompt, session, options);

  // Add assistant message
  sessionManager.addMessage(session, {
    role: "assistant",
    content: result,
    timestamp: new Date().toISOString(),
  });
}

// ─── Interactive REPL ───────────────────────────────────────────────────────

async function runInteractiveRepl(
  session: Session,
  sessionManager: SessionManager,
  options: ReplOptions
): Promise<void> {
  const { projectRoot, config } = options;

  // ── Persistent sandbox: create once, reuse for all REPL turns ──────────
  let sandboxRunner: AgentRunner | null = null;
  if (config.sandbox.enabled && config.sandbox.name) {
    // User-managed sandbox (created by `locus sandbox`)
    const provider =
      inferProviderFromModel(config.ai.model) || config.ai.provider;
    sandboxRunner = createUserManagedSandboxRunner(
      provider,
      config.sandbox.name
    );
    process.stderr.write(
      `${dim("Using sandbox")} ${dim(config.sandbox.name)}\n`
    );
  } else if (config.sandbox.enabled) {
    // Auto-managed persistent sandbox (legacy)
    const sandboxName = buildPersistentSandboxName(projectRoot);
    sandboxRunner = new SandboxedClaudeRunner(sandboxName);
    process.stderr.write(
      `${dim("Sandbox mode: prompts will share sandbox")} ${dim(sandboxName)}\n`
    );
  }

  // Initialize input handler
  const history = new InputHistory(projectRoot);
  const completion = new CombinedCompletion([
    new SlashCommandCompletion(getAllCommandNames()),
    new FilePathCompletion(projectRoot),
  ]);

  const input = new InputHandler({
    prompt: `${cyan("locus")} ${dim(">")} `,
    getHistory: () => history.getEntries(),
    onTab: (text) => completion.complete(text),
  });

  // Print welcome
  printWelcome(session);

  let shouldExit = false;
  let currentProvider =
    inferProviderFromModel(config.ai.model) || config.ai.provider;
  let currentModel = config.ai.model;
  let verbose = true;

  // Slash command context
  const slashCtx = {
    projectRoot,
    session,
    onReset: () => {
      session.messages = [];
      session.metadata.totalTokens = 0;
      session.metadata.totalTools = 0;
      sessionManager.save(session);
    },
    onModelChange: (model: string) => {
      currentModel = model;
      session.metadata.model = model;
      const inferredProvider = inferProviderFromModel(model);
      if (inferredProvider) {
        const providerChanged = inferredProvider !== currentProvider;
        currentProvider = inferredProvider;
        session.metadata.provider = inferredProvider;

        // Recreate sandbox runner when provider changes
        if (providerChanged && config.sandbox.enabled && config.sandbox.name) {
          sandboxRunner = createUserManagedSandboxRunner(
            inferredProvider,
            config.sandbox.name
          );
          process.stderr.write(
            `${dim("Switched sandbox agent to")} ${dim(inferredProvider)}\n`
          );
        }
      }
      persistReplModelSelection(projectRoot, config, model);
      sessionManager.save(session);
    },
    onSave: () => {
      sessionManager.save(session);
    },
    onExit: () => {
      shouldExit = true;
    },
    getHistory: () => history.getEntries(),
    onVerboseToggle: () => {
      verbose = !verbose;
    },
    getVerbose: () => verbose,
  };

  // Main loop
  while (!shouldExit) {
    const result = await input.readline();

    switch (result.type) {
      case "submit": {
        const text = result.text.trim();
        if (!text) continue;

        // Check for slash command
        if (handleSlashCommand(text, slashCtx)) {
          if (shouldExit) break;
          continue;
        }

        // Add to input history
        history.add(text);

        const imageContext = buildImageContext(result.images);

        // Build prompt (include conversation history for context)
        const fullPrompt = buildReplPrompt(
          text + imageContext,
          projectRoot,
          { ...config, ai: { provider: currentProvider, model: currentModel } },
          session.messages
        );

        // Add user message
        sessionManager.addMessage(session, {
          role: "user",
          content: text,
          timestamp: new Date().toISOString(),
        });

        // Execute AI turn
        input.lock();
        try {
          const response = await executeAITurn(
            fullPrompt,
            session,
            {
              ...options,
              config: {
                ...config,
                ai: { provider: currentProvider, model: currentModel },
              },
            },
            verbose,
            sandboxRunner ?? undefined
          );

          // Add assistant message
          sessionManager.addMessage(session, {
            role: "assistant",
            content: response,
            timestamp: new Date().toISOString(),
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          process.stderr.write(`\n${red("✗")} ${msg}\n`);
        }
        input.unlock();
        break;
      }

      case "interrupt":
        shouldExit = true;
        break;

      case "exit":
        shouldExit = true;
        break;

      case "tab":
        // Handled by input handler
        break;
    }
  }

  // ── Destroy persistent sandbox on REPL exit ───────────────────────────
  // User-managed sandboxes are never destroyed here (lifecycle controlled by `locus sandbox rm`)
  if (sandboxRunner && "destroy" in sandboxRunner) {
    const runner = sandboxRunner as SandboxedClaudeRunner;
    runner.destroy();
  }

  const shouldPersistOnExit =
    session.messages.length > 0 || sessionManager.isPersisted(session);

  if (shouldPersistOnExit) {
    sessionManager.save(session);
    process.stderr.write(`${dim("Session saved:")} ${session.id}\r\n`);
  } else {
    process.stderr.write(`${dim("Session discarded (no messages sent).")}\r\n`);
  }

  // Restore terminal state and exit cleanly
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  process.stdin.pause();
  process.exit(0);
}

// ─── AI Turn Execution ──────────────────────────────────────────────────────

async function executeAITurn(
  prompt: string,
  session: Session,
  options: ReplOptions,
  verbose = false,
  runner?: AgentRunner
): Promise<string> {
  const { config, projectRoot } = options;

  const aiResult = await runAI({
    prompt,
    provider: config.ai.provider,
    model: config.ai.model,
    cwd: projectRoot,
    verbose,
    sandboxed: config.sandbox.enabled,
    sandboxName: config.sandbox.name,
    runner,
  });

  if (aiResult.interrupted) {
    if (aiResult.output) {
      process.stderr.write(
        `${dim("(partial output preserved in session)")}\r\n`
      );
    }
  } else if (!aiResult.success) {
    if (aiResult.error && aiResult.error !== "Interrupted by user") {
      process.stderr.write(`\n${red("✗")} ${aiResult.error}\n`);
    }
  }

  // Update session stats
  session.metadata.totalTokens += aiResult.output.length; // Rough estimate

  return aiResult.output;
}

// ─── Welcome Message ────────────────────────────────────────────────────────

function printWelcome(session: Session): void {
  process.stderr.write("\n");
  process.stderr.write(
    `${bold("Locus")} ${dim("REPL")} — session ${dim(session.id)}\n`
  );
  process.stderr.write(
    `${dim(`Provider: ${session.metadata.provider} / ${session.metadata.model}`)}\n`
  );
  process.stderr.write(
    `${dim("Type /help for commands, Shift+Enter for newline, Ctrl+C twice to exit")}\n`
  );
  process.stderr.write("\n");
}
