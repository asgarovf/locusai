# @locusai/telegram

Telegram bot for [Locus](https://locusai.dev) - remote control your AI agents from Telegram.

## Setup

### 1. Create a Telegram Bot

1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the prompts
3. Copy the bot token you receive

### 2. Get Your Chat ID

1. Message your new bot in Telegram
2. Visit `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
3. Find your `chat.id` in the response

### 3. Configure

You can configure the bot via environment variables or the Locus settings file.

**Environment variables** (`.env` file in the package directory):

```bash
LOCUS_TELEGRAM_TOKEN="your-bot-token"
LOCUS_TELEGRAM_CHAT_ID="your-chat-id"
LOCUS_API_KEY="your-locus-api-key"
LOCUS_PROJECT_PATH="/path/to/your/project"
```

**Settings file** (`.locus/settings.json` in your project):

```json
{
  "apiKey": "your-locus-api-key",
  "telegram": {
    "botToken": "your-bot-token",
    "chatId": 123456789,
    "testMode": false
  }
}
```

### 4. Start the Bot

```bash
# From the package directory
bun run start

# Or in development mode (auto-reload)
bun run dev
```

## Commands

### Planning

| Command | Description |
|---------|-------------|
| `/plan <directive>` | Start a planning meeting |
| `/plans` | List pending plans |
| `/approve <id>` | Approve a plan |
| `/reject <id> <feedback>` | Reject a plan with feedback |
| `/cancel <id>` | Cancel a plan |

### Tasks

| Command | Description |
|---------|-------------|
| `/tasks` | List active tasks |
| `/rejecttask <id> <feedback>` | Reject an IN_REVIEW task |

### Execution

| Command | Description |
|---------|-------------|
| `/run` | Start agent on sprint tasks |
| `/stop` | Stop all running processes |
| `/exec <prompt>` | One-shot AI execution |

### Status

| Command | Description |
|---------|-------------|
| `/status` | Show running processes |

### System

| Command | Description |
|---------|-------------|
| `/start` | Welcome message |
| `/help` | Show available commands |

## Configuration Options

| Option | Env Variable | Settings Key | Description |
|--------|-------------|--------------|-------------|
| Bot Token | `LOCUS_TELEGRAM_TOKEN` | `telegram.botToken` | Telegram bot token from BotFather |
| Chat ID | `LOCUS_TELEGRAM_CHAT_ID` | `telegram.chatId` | Authorized Telegram chat ID |
| Project Path | `LOCUS_PROJECT_PATH` | — | Path to the Locus project directory |
| API Key | `LOCUS_API_KEY` | `apiKey` | Locus API key |
| API Base URL | — | `apiUrl` | Custom API URL |
| Provider | — | `provider` | AI provider (`claude` or `codex`) |
| Model | — | `model` | AI model override |
| Test Mode | `LOCUS_TEST_MODE` | `telegram.testMode` | Use local CLI source instead of published binary |

## Security

The bot only responds to the configured chat ID. All messages from other chats are silently ignored.

## Development

```bash
# Start with auto-reload
bun run dev

# Build
bun run build

# Lint
bun run lint

# Type check
bun run typecheck
```

## License

MIT
