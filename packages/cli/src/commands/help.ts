import { c } from "@locusai/sdk/node";

export function showHelp(): void {
  console.log(`
  ${c.header(" USAGE ")}
    ${c.primary("locus")} ${c.dim("[command] [options]")}

  ${c.header(" PRIMARY ")}
    ${c.success("locus start")}   Launch interactive REPL ${c.dim("(default when no command)")}
              ${c.dim("--session, -s <id> Resume a previous session")}
              ${c.dim("--provider <name>  AI provider")}
              ${c.dim("--model <name>     AI model")}

    The REPL provides slash commands for discussions, planning,
    code review, and more. Type ${c.success("/help")} inside the REPL for details.

  ${c.header(" ALSO AVAILABLE DIRECTLY ")}
    ${c.success("init")}        Initialize Locus in the current directory
    ${c.success("config")}      Manage settings ${c.dim("(setup | show | set <k> <v> | remove)")}
    ${c.success("run")}         Start agent to work on tasks sequentially
    ${c.success("discuss")}     Start an AI discussion on a topic
    ${c.success("plan")}        Run async planning meeting to create sprint plans
    ${c.success("review")}      Review PRs on GitHub with AI ${c.dim("(local for staged changes)")}
    ${c.success("artifacts")}   List and manage knowledge artifacts
    ${c.success("exec")}        Run a single prompt with repository context
    ${c.success("docs")}        Manage workspace docs ${c.dim("(sync)")}
    ${c.success("index")}       Index the codebase for AI context
    ${c.success("telegram")}    Configure the Telegram bot
    ${c.success("version")}     Show installed package versions
    ${c.success("upgrade")}     Update CLI and Telegram to the latest version

  ${c.header(" OPTIONS ")}
    ${c.secondary("--help")}              Show this help message
    ${c.secondary("--provider")} ${c.dim("<name>")}    AI provider: ${c.dim("claude")} or ${c.dim("codex")} (default: ${c.dim("claude")})
    ${c.secondary("--model")} ${c.dim("<name>")}       AI model (claude: ${c.dim("opus, sonnet, haiku")} | codex: ${c.dim("gpt-5.3-codex, gpt-5-codex-mini")})

  ${c.header(" GETTING STARTED ")}
    ${c.dim("$")} ${c.primary("locus init")}
    ${c.dim("$")} ${c.primary("locus config setup")}
    ${c.dim("$")} ${c.primary("locus start")}

  ${c.header(" EXAMPLES ")}
    ${c.dim("$")} ${c.primary("locus start")}
    ${c.dim("$")} ${c.primary("locus start -s abc123")}
    ${c.dim("$")} ${c.primary("locus run")}
    ${c.dim("$")} ${c.primary("locus review")}
    ${c.dim("$")} ${c.primary('locus discuss "how should we design the auth system?"')}
    ${c.dim("$")} ${c.primary("locus artifacts")}

  For more information, visit: ${c.underline("https://docs.locusai.dev")}
`);
}
