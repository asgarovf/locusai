import {
  c,
  createAiRunner,
  DiscussionFacilitator,
  DiscussionManager,
} from "@locusai/sdk/node";
import { ProgressRenderer } from "../../display/progress-renderer";
import type { REPLSession, SlashCommand } from "../slash-commands";

export const discussCommand: SlashCommand = {
  name: "discuss",
  aliases: ["d"],
  description: "Start or manage AI discussions",
  usage: "/discuss <topic> | --list | --show <id> | --end",
  category: "ai",
  execute: async (session: REPLSession, args?: string) => {
    const trimmed = (args ?? "").trim();

    // /discuss --list
    if (trimmed === "--list") {
      return listDiscussions(session);
    }

    // /discuss --show <id>
    if (trimmed.startsWith("--show")) {
      const id = trimmed.replace("--show", "").trim();
      if (!id) {
        console.log(
          `\n  ${c.error("Usage:")} ${c.cyan("/discuss --show <id>")}\n`
        );
        return;
      }
      return showDiscussion(session, id);
    }

    // /discuss --end
    if (trimmed === "--end") {
      return endDiscussion(session);
    }

    // /discuss (no args) — show help or resume info
    if (!trimmed) {
      const state = session.getDiscussionState?.();
      if (state) {
        const dm = state.discussionManager;
        const disc = dm.load(state.discussionId);
        if (disc) {
          console.log(
            `\n  ${c.dim("Active discussion:")} ${c.bold(disc.title)}`
          );
          console.log(
            `  ${c.dim("Messages:")} ${disc.messages.length}  ${c.dim("Insights:")} ${disc.insights.length}`
          );
          console.log(
            `\n  ${c.dim("Type your response to continue, or")} ${c.cyan("/discuss --end")} ${c.dim("to finish.")}\n`
          );
          return;
        }
      }
      showDiscussHelp();
      return;
    }

    // /discuss <topic> — start a new discussion
    if (session.getMode?.() === "discussion") {
      console.log(
        `\n  ${c.warning("A discussion is already active.")} ${c.dim("Use")} ${c.cyan("/discuss --end")} ${c.dim("to finish it first.")}\n`
      );
      return;
    }

    if (!session.enterDiscussionMode) {
      console.log(
        `\n  ${c.error("Discussion mode is not supported in this session type.")}\n`
      );
      return;
    }

    await startDiscussion(session, trimmed);
  },
};

async function startDiscussion(
  session: REPLSession,
  topic: string
): Promise<void> {
  const projectPath = session.getProjectPath();
  const provider = session.getProvider();
  const model = session.getModel();

  const discussionManager = new DiscussionManager(projectPath);
  const aiRunner = createAiRunner(provider, { projectPath, model });

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

  console.log(
    `\n  ${c.header(" DISCUSSION ")} ${c.bold("Starting discussion...")}\n`
  );
  console.log(`  ${c.dim("Topic:")} ${c.bold(topic)}`);
  console.log(`  ${c.dim("Model:")} ${c.dim(`${model} (${provider})`)}\n`);

  const renderer = new ProgressRenderer({ animated: true });

  try {
    renderer.showThinkingStarted();
    const result = await facilitator.startDiscussion(topic);
    renderer.showThinkingStopped();

    const discussionId = result.discussion.id;

    process.stdout.write("\n");
    process.stdout.write(result.message);
    process.stdout.write("\n\n");

    renderer.finalize();

    // Enter discussion mode
    session.enterDiscussionMode?.({
      facilitator,
      discussionId,
      discussionManager,
    });

    console.log(`  ${c.dim("Type your response to continue the discussion.")}`);
    console.log(
      `  ${c.dim("Use")} ${c.cyan("/discuss --end")} ${c.dim("to summarize and finish.")}\n`
    );
  } catch (error) {
    renderer.finalize();
    console.error(
      `\n  ${c.error("✖")} ${c.red("Failed to start discussion:")} ${
        error instanceof Error ? error.message : String(error)
      }\n`
    );
  }
}

async function endDiscussion(session: REPLSession): Promise<void> {
  const state = session.getDiscussionState?.();
  if (!state) {
    console.log(`\n  ${c.dim("No active discussion to end.")}\n`);
    return;
  }

  const { facilitator, discussionId, discussionManager } = state;
  const renderer = new ProgressRenderer({ animated: true });

  try {
    renderer.showThinkingStarted();
    const summary = await facilitator.summarizeDiscussion(discussionId);
    renderer.showThinkingStopped();

    process.stdout.write("\n");
    process.stdout.write(summary);
    process.stdout.write("\n");

    renderer.finalize();

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
      `  ${c.dim("To review:")} ${c.cyan(`/discuss --show ${discussionId}`)}`
    );
    console.log(`  ${c.dim("To list all:")} ${c.cyan("/discuss --list")}\n`);

    session.exitDiscussionMode?.();
  } catch (error) {
    renderer.finalize();
    console.error(
      `\n  ${c.error("✖")} ${c.red("Failed to summarize:")} ${
        error instanceof Error ? error.message : String(error)
      }\n`
    );
  }
}

function listDiscussions(session: REPLSession): void {
  const projectPath = session.getProjectPath();
  const discussionManager = new DiscussionManager(projectPath);
  const discussions = discussionManager.list();

  if (discussions.length === 0) {
    console.log(`\n  ${c.dim("No discussions found.")}`);
    console.log(
      `  ${c.dim("Start one with:")} ${c.cyan('/discuss "your topic"')}\n`
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

function showDiscussion(session: REPLSession, id: string): void {
  const projectPath = session.getProjectPath();
  const discussionManager = new DiscussionManager(projectPath);
  const md = discussionManager.getMarkdown(id);

  if (!md) {
    console.error(
      `\n  ${c.error("✖")} ${c.red(`Discussion not found: ${id}`)}\n`
    );
    return;
  }

  console.log(`\n${md}\n`);
}

function showDiscussHelp(): void {
  console.log(`
  ${c.header(" DISCUSS ")} ${c.dim("— Inline AI Discussion")}

    ${c.cyan("/discuss <topic>")}       Start a new discussion
    ${c.cyan("/discuss --list")}        List all discussions
    ${c.cyan("/discuss --show <id>")}   Show a discussion's content
    ${c.cyan("/discuss --end")}         Summarize and end the active discussion

  ${c.dim("During a discussion, type normally to continue the conversation.")}
  ${c.dim("Slash commands still work as usual.")}
`);
}
