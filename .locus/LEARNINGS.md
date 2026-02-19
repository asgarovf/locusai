# Learnings

This file captures important lessons, decisions, and corrections made during development.
It is read by AI agents before every task to avoid repeating mistakes and to follow established patterns.

<!-- Add learnings below this line. Format: - **[Category]**: Description -->
- **[Architecture]**: The VSCode extension invokes the CLI as `locus --json-stream --session-id <id> -- <prompt>`, where `--json-stream` is the first positional arg (argv[2]). The CLI's main() must detect this and route to `execCommand` since it's not a named subcommand. *The extension and CLI must agree on flag names (e.g., `--session-id` vs `--session`).*
- **[Debugging]**: The `@swc/helpers` package is not properly linked by Bun's package manager in this repo. The `jest.config.js` overrides `externalHelpers: false` in the SWC transform options to work around this. Without this override, all tests fail with "Cannot find module '@swc/helpers/_/_ts_decorate'".
- **[Patterns]**: Test files in `apps/api` use the `.jest.ts` extension (not `.spec.ts` or `.test.ts`). Always import `reflect-metadata` and `../../test-setup` at the top of test files before other imports. Entity mocks for TypeORM are defined in `apps/api/src/test-setup.ts`.
- **[Architecture]**: The CLI binary is `locus`, not `locus-agent` (`locus-agent` is the default OS username on provisioned servers). To upgrade the CLI on instances, run `sudo locus upgrade` — not `curl | bash`. The `locus upgrade` command handles npm cache cleaning, version checking, and `npm install -g` for all `@locusai/*` packages.
- **[DevOps]**: The `locus-telegram` process is managed differently per OS: on Linux it's a systemd service (`/etc/systemd/system/locus-telegram.service`, managed via `systemctl`), on macOS it's a LaunchAgent (`~/Library/LaunchAgents/com.locus.telegram.plist`, managed via `launchctl load/unload`).
- **[Debugging]**: Telegraf's `bot.launch()` must use `{ dropPendingUpdates: true }` to prevent re-processing old commands after a restart. Without this, commands like `/upgrade` that trigger a service restart will loop because the bot picks up the same `/upgrade` update from Telegram's queue on restart.