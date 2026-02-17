# Learnings

This file captures important lessons, decisions, and corrections made during development.
It is read by AI agents before every task to avoid repeating mistakes and to follow established patterns.

<!-- Add learnings below this line. Format: - **[Category]**: Description -->
- **[Architecture]**: The VSCode extension invokes the CLI as `locus --json-stream --session-id <id> -- <prompt>`, where `--json-stream` is the first positional arg (argv[2]). The CLI's main() must detect this and route to `execCommand` since it's not a named subcommand. *The extension and CLI must agree on flag names (e.g., `--session-id` vs `--session`).*