import type { Context } from "telegraf";

const HELP_TEXT = `<b>Locus Bot — Command Center</b>

<b>Planning:</b>
/plan &lt;directive&gt; — Start a planning meeting
/plans — List pending plans
/approve &lt;id&gt; — Approve a plan
/reject &lt;id&gt; &lt;feedback&gt; — Reject with feedback
/cancel &lt;id&gt; — Cancel a plan

<b>Tasks:</b>
/tasks — List active tasks
/rejecttask &lt;id&gt; &lt;feedback&gt; — Reject an IN_REVIEW task

<b>Sprints:</b>
/sprints — List all sprints
/completesprint &lt;id&gt; — Complete a sprint

<b>Execution:</b>
/run — Start agents on sprint tasks
/stop — Stop all running processes
/exec &lt;prompt&gt; — One-shot AI execution

<b>Git &amp; Dev:</b>
/git &lt;command&gt; — Run whitelisted git/gh commands
/dev &lt;command&gt; — Run lint, typecheck, build, test

<b>Worktrees:</b>
/worktrees — List agent worktrees
/worktree &lt;number&gt; — View worktree details
/rmworktree &lt;number|all&gt; — Remove a worktree

<b>Status:</b>
/status — Show running processes
/agents — List agent worktrees

<b>System:</b>
/help — Show this message`;

export async function startCommand(ctx: Context): Promise<void> {
  console.log("[start] User started bot");
  await ctx.reply(
    "👋 <b>Welcome to Locus Bot!</b>\n\nI'm your remote control for Locus AI agents. Use /help to see available commands.",
    { parse_mode: "HTML" }
  );
}

export async function helpCommand(ctx: Context): Promise<void> {
  console.log("[help] User requested help");
  await ctx.reply(HELP_TEXT, { parse_mode: "HTML" });
}
