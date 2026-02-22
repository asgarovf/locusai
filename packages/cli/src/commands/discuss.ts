import { parseArgs } from "node:util";
import {
  c,
  createAiRunner,
  DEFAULT_MODEL,
  DiscussionFacilitator,
  type DiscussionInsight,
  DiscussionManager,
} from "@locusai/sdk/node";
import { ProgressRenderer } from "../display/progress-renderer";
import {
  buildImageContext,
  detectImages,
  imageDisplayName,
  stripImagePaths,
} from "../repl/image-detect";
import { InputHandler } from "../repl/input-handler";
import { SettingsManager } from "../settings-manager";
import { requireInitialization, resolveProvider } from "../utils";

export async function discussCommand(args: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    options: {
      list: { type: "boolean" },
      show: { type: "string" },
      archive: { type: "string" },
      delete: { type: "string" },
      model: { type: "string" },
      provider: { type: "string" },
      "reasoning-effort": { type: "string" },
      dir: { type: "string" },
    },
    strict: false,
    allowPositionals: true,
  });

  const projectPath = (values.dir as string) || process.cwd();
  requireInitialization(projectPath, "discuss");

  const discussionManager = new DiscussionManager(projectPath);

  // ── List discussions ──────────────────────────────────────
  if (values.list) {
    return listDiscussions(discussionManager);
  }

  // ── Show discussion ───────────────────────────────────────
  if (values.show) {
    return showDiscussion(discussionManager, values.show as string);
  }

  // ── Archive discussion ────────────────────────────────────
  if (values.archive) {
    return archiveDiscussion(discussionManager, values.archive as string);
  }

  // ── Delete discussion ─────────────────────────────────────
  if (values.delete) {
    return deleteDiscussion(discussionManager, values.delete as string);
  }

  // ── Start interactive discussion ──────────────────────────
  const topic = positionals.join(" ").trim();
  if (!topic) {
    showDiscussHelp();
    return;
  }

  const settings = new SettingsManager(projectPath).load();

  const provider = resolveProvider(
    (values.provider as string) || settings.provider
  );
  const model =
    (values.model as string | undefined) ||
    settings.model ||
    DEFAULT_MODEL[provider];

  const reasoningEffort = values["reasoning-effort"] as string | undefined;

  const aiRunner = createAiRunner(provider, {
    projectPath,
    model,
    reasoningEffort,
  });

  const log = (
    message: string,
    level?: "info" | "success" | "warn" | "error"
  ) => {
    const icon =
      level === "success"
        ? c.success("✔")
        : level === "error"
          ? c.error("✖")
          : level === "warn"
            ? c.warning("!")
            : c.info("●");
    console.log(`  ${icon} ${message}`);
  };

  const facilitator = new DiscussionFacilitator({
    projectPath,
    aiRunner,
    discussionManager,
    log,
    provider,
    model,
  });

  // ── Print banner ──────────────────────────────────────────
  console.log(
    `\n  ${c.header(" DISCUSSION ")} ${c.bold("Starting interactive discussion...")}\n`
  );
  console.log(`  ${c.dim("Topic:")} ${c.bold(topic)}`);
  console.log(`  ${c.dim("Model:")} ${c.dim(`${model} (${provider})`)}\n`);

  // ── Start discussion (AI opening) ─────────────────────────
  const renderer = new ProgressRenderer({ animated: true });

  let discussionId: string;
  try {
    renderer.showThinkingStarted();
    const result = await facilitator.startDiscussion(topic);
    renderer.showThinkingStopped();

    discussionId = result.discussion.id;

    // Display the AI opening message
    process.stdout.write("\n");
    process.stdout.write(result.message);
    process.stdout.write("\n\n");

    renderer.finalize();
  } catch (error) {
    renderer.finalize();
    console.error(
      `\n  ${c.error("✖")} ${c.red("Failed to start discussion:")} ${
        error instanceof Error ? error.message : String(error)
      }\n`
    );
    process.exit(1);
  }

  console.log(`  ${c.dim("Type your response, or 'help' for commands.")}`);
  console.log(
    `  ${c.dim("Enter to send, Shift+Enter for newline. Use 'exit' or Ctrl+D to quit.")}\n`
  );

  // ── REPL loop ─────────────────────────────────────────────
  let isProcessing = false;
  let interrupted = false;

  const shutdown = () => {
    if (isProcessing) {
      aiRunner.abort();
    }
    console.log(
      `\n  ${c.dim("Discussion saved.")} ${c.dim("ID:")} ${c.cyan(discussionId)}`
    );
    console.log(c.dim("\n  Goodbye!\n"));
    inputHandler.stop();
    process.exit(0);
  };

  const handleSubmit = async (input: string) => {
    interrupted = false;
    const trimmed = input.trim();

    if (trimmed === "") {
      inputHandler.showPrompt();
      return;
    }

    // ── REPL special commands (only single-line) ──────────
    if (!trimmed.includes("\n")) {
      const lowerInput = trimmed.toLowerCase();

      if (lowerInput === "help") {
        showReplHelp();
        inputHandler.showPrompt();
        return;
      }

      if (lowerInput === "exit" || lowerInput === "quit") {
        shutdown();
        return;
      }

      if (lowerInput === "insights") {
        showCurrentInsights(discussionManager, discussionId);
        inputHandler.showPrompt();
        return;
      }

      if (lowerInput === "summary") {
        isProcessing = true;
        const summaryRenderer = new ProgressRenderer({ animated: true });

        try {
          summaryRenderer.showThinkingStarted();
          const summary = await facilitator.summarizeDiscussion(discussionId);
          summaryRenderer.showThinkingStopped();

          process.stdout.write("\n");
          process.stdout.write(summary);
          process.stdout.write("\n");

          summaryRenderer.finalize();

          // Show completion message
          const discussion = discussionManager.load(discussionId);
          if (discussion) {
            console.log(
              `\n  ${c.success("✔")} ${c.success("Discussion completed!")}\n`
            );
            console.log(
              `  ${c.dim("Messages:")} ${discussion.messages.length}  ${c.dim("Insights:")} ${discussion.insights.length}\n`
            );
          }

          console.log(
            `  ${c.dim("To review:")} ${c.cyan(`locus discuss --show ${discussionId}`)}`
          );
          console.log(
            `  ${c.dim("To list all:")} ${c.cyan("locus discuss --list")}\n`
          );
        } catch (error) {
          summaryRenderer.finalize();
          console.error(
            `\n  ${c.error("✖")} ${c.red("Failed to summarize:")} ${
              error instanceof Error ? error.message : String(error)
            }\n`
          );
        }

        inputHandler.stop();
        process.exit(0);
        return;
      }
    }

    // ── Continue discussion with user input ───────────────

    // Detect image file paths (e.g. pasted macOS screenshots)
    const images = detectImages(trimmed);
    if (images.length > 0) {
      for (const img of images) {
        const status = img.exists
          ? c.success("attached")
          : c.warning("not found");
        process.stdout.write(
          `  ${c.cyan(`[Image: ${imageDisplayName(img.path)}]`)} ${status}\r\n`
        );
      }
    }

    // Strip image paths from the input and append Read instructions
    const cleanedInput = stripImagePaths(trimmed, images);
    const effectiveInput = cleanedInput + buildImageContext(images);

    isProcessing = true;
    const chunkRenderer = new ProgressRenderer({ animated: true });

    try {
      chunkRenderer.showThinkingStarted();

      const stream = facilitator.continueDiscussionStream(
        discussionId,
        effectiveInput
      );

      let result: { response: string; insights: DiscussionInsight[] } = {
        response: "",
        insights: [],
      };

      let iterResult = await stream.next();
      while (!iterResult.done) {
        chunkRenderer.renderChunk(iterResult.value);
        iterResult = await stream.next();
      }

      // The return value from the generator
      result = iterResult.value;

      chunkRenderer.finalize();

      // Display extracted insights inline
      if (result.insights.length > 0) {
        console.log("");
        for (const insight of result.insights) {
          const tag = formatInsightTag(insight.type);
          console.log(`  ${tag} ${c.bold(insight.title)}`);
          console.log(`  ${c.dim(insight.content)}\n`);
        }
      }
    } catch (error) {
      chunkRenderer.finalize();
      console.error(
        `\n  ${c.error("✖")} ${c.red(
          error instanceof Error ? error.message : String(error)
        )}\n`
      );
    }

    isProcessing = false;
    // Don't show prompt if already shown by interrupt handler
    if (!interrupted) {
      inputHandler.showPrompt();
    }
  };

  const inputHandler = new InputHandler({
    prompt: c.cyan("> "),
    continuationPrompt: c.dim("\u2026 "),
    onSubmit: (input) => {
      handleSubmit(input).catch((err) => {
        console.error(
          `\n  ${c.error("✖")} ${c.red(
            err instanceof Error ? err.message : String(err)
          )}\n`
        );
        inputHandler.showPrompt();
      });
    },
    onInterrupt: () => {
      if (isProcessing) {
        interrupted = true;
        aiRunner.abort();
        isProcessing = false;
        console.log(c.dim("\n[Interrupted]"));
        inputHandler.showPrompt();
      } else {
        shutdown();
      }
    },
    onClose: () => shutdown(),
  });

  inputHandler.start();
  inputHandler.showPrompt();
}

// ── Sub-commands ──────────────────────────────────────────────

function listDiscussions(discussionManager: DiscussionManager): void {
  const discussions = discussionManager.list();

  if (discussions.length === 0) {
    console.log(`\n  ${c.dim("No discussions found.")}\n`);
    console.log(
      `  ${c.dim("Start one with:")} ${c.cyan('locus discuss "your topic"')}\n`
    );
    return;
  }

  console.log(
    `\n  ${c.header(" DISCUSSIONS ")} ${c.dim(`(${discussions.length})`)}\n`
  );

  for (const disc of discussions) {
    const statusIcon =
      disc.status === "active"
        ? c.warning("◯")
        : disc.status === "completed"
          ? c.success("✔")
          : c.dim("⊘");

    console.log(
      `  ${statusIcon} ${c.bold(disc.title)} ${c.dim(
        `[${disc.status}]`
      )} ${c.dim(`— ${disc.messages.length} messages, ${disc.insights.length} insights`)}`
    );
    console.log(`    ${c.dim("ID:")} ${disc.id}`);
    console.log(`    ${c.dim("Created:")} ${disc.createdAt}`);
    console.log("");
  }
}

function showDiscussion(
  discussionManager: DiscussionManager,
  id: string
): void {
  const md = discussionManager.getMarkdown(id);
  if (!md) {
    console.error(
      `\n  ${c.error("✖")} ${c.red(`Discussion not found: ${id}`)}\n`
    );
    process.exit(1);
  }
  console.log(`\n${md}\n`);
}

function archiveDiscussion(
  discussionManager: DiscussionManager,
  id: string
): void {
  try {
    discussionManager.archive(id);
    console.log(`\n  ${c.success("✔")} ${c.dim("Discussion archived.")}\n`);
  } catch (error) {
    console.error(
      `\n  ${c.error("✖")} ${c.red(
        error instanceof Error ? error.message : String(error)
      )}\n`
    );
    process.exit(1);
  }
}

function deleteDiscussion(
  discussionManager: DiscussionManager,
  id: string
): void {
  try {
    discussionManager.delete(id);
    console.log(`\n  ${c.success("✔")} ${c.dim("Discussion deleted.")}\n`);
  } catch (error) {
    console.error(
      `\n  ${c.error("✖")} ${c.red(
        error instanceof Error ? error.message : String(error)
      )}\n`
    );
    process.exit(1);
  }
}

// ── Helpers ──────────────────────────────────────────────────

function showCurrentInsights(
  discussionManager: DiscussionManager,
  discussionId: string
): void {
  const discussion = discussionManager.load(discussionId);
  if (!discussion || discussion.insights.length === 0) {
    console.log(`\n  ${c.dim("No insights extracted yet.")}\n`);
    return;
  }

  console.log(
    `\n  ${c.header(" INSIGHTS ")} ${c.dim(`(${discussion.insights.length})`)}\n`
  );

  for (const insight of discussion.insights) {
    const tag = formatInsightTag(insight.type);
    console.log(`  ${tag} ${c.bold(insight.title)}`);
    console.log(`  ${c.dim(insight.content)}`);
    if (insight.tags.length > 0) {
      console.log(`  ${c.dim(`Tags: ${insight.tags.join(", ")}`)}`);
    }
    console.log("");
  }
}

function formatInsightTag(type: DiscussionInsight["type"]): string {
  switch (type) {
    case "decision":
      return c.green("[DECISION]");
    case "requirement":
      return c.blue("[REQUIREMENT]");
    case "idea":
      return c.yellow("[IDEA]");
    case "concern":
      return c.red("[CONCERN]");
    case "learning":
      return c.cyan("[LEARNING]");
  }
}

function showReplHelp(): void {
  console.log(`
  ${c.header(" DISCUSSION COMMANDS ")}

    ${c.cyan("summary")}     Generate a final summary and end the discussion
    ${c.cyan("insights")}    Show all insights extracted so far
    ${c.cyan("exit")}        Save and exit without generating a summary
    ${c.cyan("help")}        Show this help message

  ${c.header(" KEY BINDINGS ")}

    ${c.cyan("Enter")}              Send message
    ${c.cyan("Shift+Enter")}        Insert newline (also: Alt+Enter, Ctrl+J)
    ${c.cyan("Ctrl+C")}             Interrupt / clear input / exit
    ${c.cyan("Ctrl+U")}             Clear current input
    ${c.cyan("Ctrl+W")}             Delete last word

  ${c.dim("Type anything else to continue the discussion.")}
`);
}

function showDiscussHelp(): void {
  console.log(`
  ${c.header(" LOCUS DISCUSS ")} ${c.dim("— Interactive AI Discussion")}

  ${c.bold("Usage:")}
    ${c.cyan('locus discuss "topic"')}              Start a discussion on a topic
    ${c.cyan("locus discuss --list")}                List all discussions
    ${c.cyan("locus discuss --show <id>")}           Show discussion details
    ${c.cyan("locus discuss --archive <id>")}        Archive a discussion
    ${c.cyan("locus discuss --delete <id>")}         Delete a discussion

  ${c.bold("Options:")}
    ${c.dim("--model <model>")}    AI model (claude: opus, sonnet, haiku | codex: gpt-5.3-codex, gpt-5-codex-mini)
    ${c.dim("--provider <p>")}     AI provider (claude, codex)
    ${c.dim("--reasoning-effort <level>")}  Reasoning effort (low, medium, high)
    ${c.dim("--dir <path>")}       Project directory

  ${c.bold("REPL Commands:")}
    ${c.dim("summary")}     Generate final summary and end the discussion
    ${c.dim("insights")}    Show all insights extracted so far
    ${c.dim("exit")}        Save and exit without generating a summary
    ${c.dim("help")}        Show available commands

  ${c.bold("Examples:")}
    ${c.dim("# Start a discussion about architecture")}
    ${c.cyan('locus discuss "how should we structure the auth system?"')}

    ${c.dim("# Review a past discussion")}
    ${c.cyan("locus discuss --show disc-1234567890")}

    ${c.dim("# List all discussions")}
    ${c.cyan("locus discuss --list")}
`);
}
