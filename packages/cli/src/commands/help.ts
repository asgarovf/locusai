import { c } from "@locusai/sdk/node";

export function showHelp(): void {
  console.log(`
  ${c.header(" USAGE ")}
    ${c.primary("locus")} ${c.dim("<command> [options]")}

  ${c.header(" COMMANDS ")}
    ${c.success("init")}      Initialize Locus in the current directory
    ${c.success("index")}     Index the codebase for AI context
    ${c.success("run")}       Start an agent to work on tasks
    ${c.success("review")}    Review staged changes with AI
    ${c.success("exec")}      Run a prompt with repository context
              ${c.dim("--interactive, -i  Start interactive REPL mode")}
              ${c.dim("--session, -s <id> Resume a previous session")}
              ${c.dim("sessions list      List recent sessions")}
              ${c.dim("sessions show <id> Show session messages")}
              ${c.dim("sessions delete <id> Delete a session")}
              ${c.dim("sessions clear     Clear all sessions")}

  ${c.header(" OPTIONS ")}
    ${c.secondary("--help")}           Show this help message
    ${c.secondary("--provider")} <name>  AI provider: ${c.dim("claude")} or ${c.dim("codex")} (default: ${c.dim("claude")})

  ${c.header(" EXAMPLES ")}
    ${c.dim("$")} ${c.primary("locus init")}
    ${c.dim("$")} ${c.primary("locus index")}
    ${c.dim("$")} ${c.primary("locus run --api-key YOUR_KEY")}
    ${c.dim("$")} ${c.primary("locus review")}
    ${c.dim("$")} ${c.primary("locus exec sessions list")}

  For more information, visit: ${c.underline("https://locusai.dev/docs")}
`);
}
