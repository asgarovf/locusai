import type { Context } from "telegraf";

const HELP_TEXT = `<b>Locus Bot — Command Center</b>

📊 <b>Overview:</b>
/dashboard — Workspace overview &amp; agent status
/workspace — Workspace info &amp; stats
/activity [count] — Recent workspace activity

🤖 <b>Agents:</b>
/agents — List active AI agents
/run — Start agent on sprint tasks
/stop — Stop all running processes
/status — Show running processes

📋 <b>Planning:</b>
/plan &lt;directive&gt; — Start a planning meeting
/plans — List pending plans
/approve &lt;id&gt; — Approve a plan
/reject &lt;id&gt; &lt;feedback&gt; — Reject with feedback
/cancel &lt;id&gt; — Cancel a plan

✅ <b>Tasks:</b>
/tasks [status] — List tasks (default: active)
/task &lt;id&gt; — View task details
/backlog — List backlog tasks
/approvetask &lt;id&gt; — Approve an IN_REVIEW task
/rejecttask &lt;id&gt; &lt;feedback&gt; — Reject a task

🏃 <b>Sprints:</b>
/sprints — List all sprints
/completesprint &lt;id&gt; — Complete a sprint

🔧 <b>Dev &amp; Git:</b>
/exec &lt;prompt&gt; — One-shot AI execution
/review [pr-number] — AI review of PR or changes
/git &lt;command&gt; — Run whitelisted git/gh commands
/dev &lt;command&gt; — Run lint, typecheck, build, test

💬 <b>Discussions:</b>
/discuss &lt;topic&gt; — Start a product discussion
/discussions — List all discussions
/enddiscuss — End active discussion &amp; summarize

⚙️ <b>Config:</b>
/config — Show current settings
/config set &lt;key&gt; &lt;value&gt; — Update a setting
/config unset &lt;key&gt; — Remove a setting
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
