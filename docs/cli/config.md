---
description: Manage Locus CLI settings — API key, provider, and model.
---

# config

Manage your Locus CLI configuration. Settings are stored in `.locus/settings.json`.

---

## Subcommands

### `config setup`

Interactive configuration wizard.

```bash
locus config setup
```

Or configure non-interactively with flags:

```bash
locus config setup --api-key "locus_..." --provider claude
```

| Flag | Description |
|------|-------------|
| `--api-key <KEY>` | Locus API key (required) |
| `--api-url <URL>` | API base URL (optional) |
| `--provider <P>` | AI provider: `claude` or `codex` |
| `--model <M>` | Specific AI model name |

---

### `config show`

Display current settings with secrets masked.

```bash
locus config show
```

Output example:

```
  API Key:    locus_...abc
  API URL:    https://api.locusai.dev/api
  Provider:   claude
  Model:      (default)
```

---

### `config set`

Update a specific setting.

```bash
locus config set <key> <value>
```

Valid keys:

| Key | Description |
|-----|-------------|
| `apiKey` | Locus API key |
| `apiUrl` | API base URL |
| `provider` | AI provider (`claude` or `codex`) |
| `model` | AI model name |
| `workspaceId` | Workspace ID (auto-resolved from API key) |
| `telegram.botToken` | Telegram bot token |
| `telegram.chatId` | Telegram chat ID |
| `telegram.testMode` | Enable test mode (`true` / `false`) |

**Examples:**

```bash
locus config set provider codex
locus config set model claude-sonnet-4-5-20250929
locus config set telegram.botToken "123456:ABC..."
```

---

### `config remove`

Delete all settings.

```bash
locus config remove
```

{% hint style="danger" %}
This permanently deletes your `.locus/settings.json` file. You'll need to run `locus config setup` again.
{% endhint %}
