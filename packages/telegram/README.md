# locus-telegram

Remote-control your [Locus](https://github.com/locusai/locus) agent from Telegram.

Send Telegram messages like `/run 42` and your agent starts working on GitHub issue #42 — no need to be at your computer.

---

## Installation

```sh
locus install telegram
```

---

## Setup

### 1. Create a Telegram bot

1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the prompts
3. Copy the bot token (looks like `123456:ABC-DEF1234...`)

### 2. Save the token

```sh
locus pkg telegram config set token <YOUR_BOT_TOKEN>
```

The token is saved to `~/.locus/packages/locus-telegram/config.json`.

Alternatively, set the `TELEGRAM_BOT_TOKEN` environment variable.

### 3. Start the bot

```sh
locus pkg telegram start
```

You should see:

```
Telegram bot started. Send /help to your bot.
```

Open your bot in Telegram and send `/help` to confirm it is running.

---

## Commands

### CLI commands (via `locus pkg telegram`)

| Command | Description |
|---------|-------------|
| `start` | Start the Telegram bot daemon |
| `stop` | Stop the running daemon |
| `status` | Check whether the daemon is running |
| `config set token <TOKEN>` | Save the bot token |

### Telegram bot commands

| Command | Description |
|---------|-------------|
| `/run <issue-number>` | Start the Locus agent on a GitHub issue |
| `/status` | Show the current Locus status |
| `/stop` | Send a stop signal to the running agent |
| `/help` | List all available commands |

---

## Examples

```sh
# Install and configure
locus install telegram
locus pkg telegram config set token 123456:ABC-DEF...

# Start the bot
locus pkg telegram start

# Check it is running
locus pkg telegram status

# Stop the bot
locus pkg telegram stop
```

From Telegram:

```
/run 42        → starts locus run 42, replies with output summary
/status        → shows current locus status
/help          → lists commands
```

---

## Security

By default the bot accepts commands from **any** Telegram chat. To restrict access to specific chat IDs, edit `~/.locus/packages/locus-telegram/config.json`:

```json
{
  "token": "...",
  "allowedChatIds": [123456789]
}
```

Your chat ID can be found by messaging [@userinfobot](https://t.me/userinfobot).

---

## How it works

- `locus pkg telegram start` spawns a detached background process (daemon) and saves its PID to `~/.locus/packages/locus-telegram/daemon.pid`.
- The daemon runs a [Telegram long-polling](https://core.telegram.org/bots/api#getupdates) loop using the raw Telegram Bot API (no external dependencies).
- When a `/run <n>` message arrives, the daemon calls `locus run <n>` synchronously and replies with the output.
- `locus pkg telegram stop` reads the PID file and sends `SIGTERM` to the daemon.

---

## Development

```sh
# Build from TypeScript source
cd packages/telegram
bun run build

# Type check
bun run typecheck
```

---

## Publishing

This package is a reference implementation for the Locus package system. To publish your own:

1. Ensure `package.json` has the `"locus"` field and `"keywords": ["locusai-package"]`
2. Build the package: `bun run build`
3. Publish: `npm publish --access public`

See [PACKAGE_GUIDE.md](../sdk/PACKAGE_GUIDE.md) for the full guide.
