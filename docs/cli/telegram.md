---
description: Configure the Telegram bot integration from the CLI.
---

# telegram

Manage the Telegram bot configuration. This sets up the credentials that the Telegram bot uses to connect.

{% hint style="info" %}
This command configures the bot credentials. To learn about setting up and running the bot itself, see the [Telegram Setup Guide](../telegram/setup.md).
{% endhint %}

---

## Subcommands

### `telegram setup`

Interactive setup for the Telegram bot credentials:

```bash
locus telegram setup
```

Or non-interactively:

```bash
locus telegram setup --token "123456:ABC..." --chat-id 987654321
```

| Flag | Description |
|------|-------------|
| `--token <TOKEN>` | Bot token from [@BotFather](https://t.me/BotFather) |
| `--chat-id <ID>` | Numeric Telegram chat ID |

---

### `telegram config`

Display the current Telegram configuration (secrets masked):

```bash
locus telegram config
```

---

### `telegram set`

Update a specific Telegram setting:

```bash
locus telegram set <key> <value>
```

| Key | Description |
|-----|-------------|
| `botToken` | Telegram bot token |
| `chatId` | Telegram chat ID |
| `testMode` | Enable test mode (`true` / `false`) |

---

### `telegram remove`

Remove all Telegram configuration:

```bash
locus telegram remove
```

---

## Configuration Storage

Telegram settings are stored in `.locus/settings.json` under the `telegram` key:

```json
{
  "telegram": {
    "botToken": "123456:ABC...",
    "chatId": "987654321"
  }
}
```
