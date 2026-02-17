import { c } from "@locusai/sdk/node";

export function showHelp(): void {
  console.log(`
  ${c.header(" USAGE ")}
    ${c.primary("locus")} ${c.dim("<command> [options]")}

  ${c.header(" COMMANDS ")}
    ${c.success("init")}      Initialize Locus in the current directory
    ${c.success("config")}    Manage settings (API key, provider, model)
              ${c.dim("setup         Interactive one-time setup")}
              ${c.dim("show          Show current settings")}
              ${c.dim("set <k> <v>   Update a setting")}
              ${c.dim("remove        Remove all settings")}
    ${c.success("index")}     Index the codebase for AI context
    ${c.success("run")}       Start agent to work on tasks sequentially
    ${c.success("discuss")}   Start an interactive AI discussion on a topic
              ${c.dim("--list         List all discussions")}
              ${c.dim("--show <id>    Show discussion details")}
              ${c.dim("--archive <id> Archive a discussion")}
              ${c.dim("--delete <id>  Delete a discussion")}
    ${c.success("plan")}      Run async planning meeting to create sprint plans
    ${c.success("docs")}      Manage workspace docs
              ${c.dim("sync          Sync docs from API to .locus/documents")}
    ${c.success("review")}    Review open Locus PRs on GitHub with AI
              ${c.dim("local         Review staged changes locally (no GitHub)")}
    ${c.success("telegram")}  Configure the Telegram bot
              ${c.dim("setup         Interactive bot token and chat ID setup")}
              ${c.dim("config        Show current configuration")}
              ${c.dim("set <k> <v>   Update a config value")}
              ${c.dim("remove        Remove Telegram configuration")}
    ${c.success("exec")}      Run a prompt with repository context
              ${c.dim("--interactive, -i  Start interactive REPL mode")}
              ${c.dim("--session, -s <id> Resume a previous session")}
              ${c.dim("sessions list      List recent sessions")}
              ${c.dim("sessions show <id> Show session messages")}
              ${c.dim("sessions delete <id> Delete a session")}
              ${c.dim("sessions clear     Clear all sessions")}
    ${c.success("version")}   Show installed package versions
    ${c.success("upgrade")}   Update CLI and Telegram to the latest version

  ${c.header(" OPTIONS ")}
    ${c.secondary("--help")}           Show this help message
    ${c.secondary("--provider")} <name>  AI provider: ${c.dim(
      "claude"
    )} or ${c.dim("codex")} (default: ${c.dim("claude")})
    ${c.secondary("--model")} <name>     AI model (claude: ${c.dim(
      "opus, sonnet, haiku"
    )} | codex: ${c.dim("gpt-5.3-codex, gpt-5-codex-mini")})
    ${c.secondary("--reasoning-effort")} <level>  Codex reasoning effort: ${c.dim(
      "low, medium, high"
    )} (default: model default)

  ${c.header(" GETTING STARTED ")}
    ${c.dim("$")} ${c.primary("locus init")}
    ${c.dim("$")} ${c.primary("locus config setup")}
    ${c.dim("$")} ${c.primary("locus run")}

  ${c.header(" EXAMPLES ")}
    ${c.dim("$")} ${c.primary("locus config show")}
    ${c.dim("$")} ${c.primary("locus run")}
    ${c.dim("$")} ${c.primary("locus docs sync")}
    ${c.dim("$")} ${c.primary("locus review")}
    ${c.dim("$")} ${c.primary("locus review local")}
    ${c.dim("$")} ${c.primary("locus telegram setup")}
    ${c.dim("$")} ${c.primary('locus discuss "how should we design the auth system?"')}
    ${c.dim("$")} ${c.primary("locus exec sessions list")}

  For more information, visit: ${c.underline("https://docs.locusai.dev")}
`);
}
