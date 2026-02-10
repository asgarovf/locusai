import { parseArgs } from "node:util";
import {
  c,
  createAiRunner,
  DEFAULT_MODEL,
  PromptBuilder,
} from "@locusai/sdk/node";
import { ExecutionStatsTracker } from "../display/execution-stats";
import { ProgressRenderer } from "../display/progress-renderer";
import { SettingsManager } from "../settings-manager";
import { requireInitialization, resolveProvider } from "../utils";
import { SessionCommands, showSessionsHelp } from "./exec-sessions";

export async function execCommand(args: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    options: {
      model: { type: "string" },
      provider: { type: "string" },
      dir: { type: "string" },
      "no-stream": { type: "boolean" },
      "no-status": { type: "boolean" },
      interactive: { type: "boolean", short: "i" },
      session: { type: "string", short: "s" },
    },
    strict: false,
  });

  const projectPath = (values.dir as string) || process.cwd();
  requireInitialization(projectPath, "exec");

  // Handle sessions subcommand
  if (positionals[0] === "sessions") {
    const sessionAction = positionals[1];
    const sessionArg = positionals[2];
    const cmds = new SessionCommands(projectPath);

    switch (sessionAction) {
      case "list":
        await cmds.list();
        return;
      case "show":
        await cmds.show(sessionArg);
        return;
      case "delete":
        await cmds.delete(sessionArg);
        return;
      case "clear":
        await cmds.clear();
        return;
      default:
        showSessionsHelp();
        return;
    }
  }

  const execSettings = new SettingsManager(projectPath).load();

  const provider = resolveProvider(
    (values.provider as string) || execSettings.provider
  );
  const model =
    (values.model as string | undefined) ||
    execSettings.model ||
    DEFAULT_MODEL[provider];
  const isInteractive = values.interactive as boolean;
  const sessionId = values.session as string | undefined;

  // Interactive mode: start REPL session
  if (isInteractive) {
    const { InteractiveSession } = await import("../repl/interactive-session");
    const session = new InteractiveSession({
      projectPath,
      provider,
      model,
      sessionId,
    });
    await session.start();
    return;
  }

  // Single execution mode
  const promptInput = positionals.join(" ");
  if (!promptInput) {
    console.error(
      c.error(
        'Error: Prompt is required. Usage: locus exec "your prompt" or locus exec --interactive'
      )
    );
    process.exit(1);
  }

  const useStreaming = !values["no-stream"];

  const aiRunner = createAiRunner(provider, {
    projectPath,
    model,
  });

  const builder = new PromptBuilder(projectPath);
  const fullPrompt = await builder.buildGenericPrompt(promptInput);

  // Add newlines to prevent overlap with banner
  console.log("");
  console.log(
    `${c.primary("🚀")} ${c.bold("Executing prompt with repository context...")}`
  );
  console.log("");

  try {
    if (useStreaming) {
      // Stream output in real-time with continuous logging (no in-place updates)
      const renderer = new ProgressRenderer();
      const statsTracker = new ExecutionStatsTracker();
      const stream = aiRunner.runStream(fullPrompt);

      // Show initial thinking indicator
      renderer.showThinkingStarted();

      for await (const chunk of stream) {
        switch (chunk.type) {
          case "text_delta":
            renderer.renderTextDelta(chunk.content);
            break;

          case "tool_use":
            statsTracker.toolStarted(chunk.tool, chunk.id);
            renderer.showToolStarted(chunk.tool, chunk.id);
            break;

          case "thinking":
            renderer.showThinkingStarted();
            break;

          case "tool_result":
            if (chunk.success) {
              statsTracker.toolCompleted(chunk.tool, chunk.id);
              renderer.showToolCompleted(chunk.tool, undefined, chunk.id);
            } else {
              statsTracker.toolFailed(
                chunk.tool,
                chunk.error ?? "Unknown error",
                chunk.id
              );
              renderer.showToolFailed(
                chunk.tool,
                chunk.error ?? "Unknown error",
                chunk.id
              );
            }
            break;

          case "result":
            // Final result - usually already shown via text_delta
            break;

          case "error": {
            statsTracker.setError(chunk.error);
            renderer.renderError(chunk.error);
            renderer.finalize();
            const errorStats = statsTracker.finalize();
            renderer.showSummary(errorStats);
            console.error(
              `\n  ${c.error("✖")} ${c.error("Execution failed!")}\n`
            );
            process.exit(1);
          }
        }
      }

      renderer.finalize();
      const stats = statsTracker.finalize();
      renderer.showSummary(stats);
    } else {
      // Non-streaming mode (original behavior)
      const result = await aiRunner.run(fullPrompt);
      console.log(result);
    }

    console.log(`\n  ${c.success("✔")} ${c.success("Execution finished!")}\n`);
  } catch (error) {
    console.error(
      `\n  ${c.error("✖")} ${c.error("Execution failed:")} ${c.red(error instanceof Error ? error.message : String(error))}\n`
    );
    process.exit(1);
  }
}
