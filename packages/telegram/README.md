# locus-telegram

Remote-control your [Locus](https://github.com/locusai/locus) agent from Telegram. Full CLI command mapping, git operations, interactive keyboards, and built-in PM2 process management.

## Setup

### 1. Create a Telegram Bot

1. Open [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow the prompts
3. Copy the bot token

### 2. Get Your Chat ID

1. Send any message to your new bot
2. Visit `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
3. Find `"chat":{"id": <YOUR_CHAT_ID>}` in the response

### 3. Configure Locus

```sh
locus config packages.telegram.botToken "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
locus config packages.telegram.chatIds "12345678"
```

Multiple chat IDs can be comma-separated: `"12345678,87654321"`

### 4. Install & Start

```sh
locus install telegram
locus pkg telegram start
```

## Usage

### Service Management (PM2)

```sh
locus pkg telegram start      # Start bot in background via PM2
locus pkg telegram stop        # Stop the bot
locus pkg telegram restart     # Restart the bot
locus pkg telegram status      # Show process status
locus pkg telegram logs [n]    # Show last n lines of logs
locus pkg telegram bot         # Run in foreground (development)
```

### Telegram Commands

#### Locus CLI

| Command | Description |
|---------|-------------|
| `/run [issue#...]` | Execute issues |
| `/status` | Dashboard view |
| `/issues` | List issues |
| `/issue <#>` | Show issue details |
| `/sprint [sub]` | Sprint management |
| `/plan [args]` | AI planning |
| `/review <pr#>` | Code review |
| `/iterate <pr#>` | Re-execute with feedback |
| `/discuss [topic]` | AI discussion |
| `/exec [prompt]` | REPL / one-shot |
| `/logs` | View logs |
| `/config [path]` | View config |
| `/artifacts` | View artifacts |

#### Git Operations

| Command | Description |
|---------|-------------|
| `/gitstatus` | Git status |
| `/stage [files\|.]` | Stage files |
| `/commit <message>` | Commit changes |
| `/stash [pop\|list\|drop]` | Stash operations |
| `/branch [name]` | List/create branches |
| `/checkout <branch>` | Switch branch |
| `/diff` | Show diff |
| `/pr <title>` | Create pull request |

#### Service

| Command | Description |
|---------|-------------|
| `/service start\|stop\|restart\|status\|logs` | Manage bot process |

### Interactive Features

The bot automatically shows inline keyboard buttons after certain commands:

- **After `/plan`** — Approve, Reject, or Show Details
- **After `/run`** — View Logs, Run Again
- **After `/review`** — Approve, Request Changes, View Diff
- **After `/status`** — Run Sprint, View Issues, View Logs
- **After `/stash`** — Pop, List, Drop

Non-command text messages are automatically sent to `locus exec` as prompts.

## Security

Only chat IDs listed in `packages.telegram.chatIds` in the locus config can interact with the bot. All other messages are silently ignored.

## Development

```sh
cd packages/telegram
bun install
bun run build        # Compile TypeScript
bun run typecheck    # Type-check only

# Configure (if not already done)
locus config packages.telegram.botToken "..."
locus config packages.telegram.chatIds "..."

# Run in foreground for development
locus pkg telegram bot
```
