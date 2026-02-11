---
description: Step-by-step guide to setting up the Locus Telegram bot.
---

# Telegram Setup Guide

## Prerequisites

* **Locus CLI** installed and configured — see [Installation](../getting-started/installation.md)
* **A Telegram account**
* **A Locus API key** — see [Workspace Setup](../getting-started/workspace-setup.md)

---

## Step 1: Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot`
3. Choose a name for your bot (e.g., "My Locus Bot")
4. Choose a username (must end in `bot`, e.g., `my_locus_bot`)
5. BotFather will give you a **bot token** — copy it

{% hint style="warning" %}
Keep your bot token secret. Anyone with the token can control your bot.
{% endhint %}

---

## Step 2: Get Your Chat ID

You need your numeric Telegram chat ID to restrict the bot to only respond to you.

1. Start a conversation with your new bot (send any message)
2. Open this URL in your browser (replace `YOUR_BOT_TOKEN`):
   ```
   https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
   ```
3. Find your `chat.id` in the JSON response

<details>

<summary>Example response</summary>

```json
{
  "result": [
    {
      "message": {
        "chat": {
          "id": 123456789,
          "type": "private"
        }
      }
    }
  ]
}
```

Your chat ID is `123456789`.

</details>

---

## Step 3: Install the Telegram Bot

```bash
npm install -g @locusai/telegram
```

Verify:

```bash
locus-telegram --help
```

---

## Step 4: Configure the Bot

{% tabs %}
{% tab title="Interactive" %}
```bash
locus telegram setup
```

Follow the prompts to enter your bot token and chat ID.
{% endtab %}

{% tab title="Non-Interactive" %}
```bash
locus telegram setup --token "YOUR_BOT_TOKEN" --chat-id YOUR_CHAT_ID
```
{% endtab %}

{% tab title="Individual Settings" %}
```bash
locus config set telegram.botToken "YOUR_BOT_TOKEN"
locus config set telegram.chatId "YOUR_CHAT_ID"
```
{% endtab %}
{% endtabs %}

Verify your configuration:

```bash
locus telegram config
```

---

## Step 5: Start the Bot

```bash
locus-telegram
```

{% hint style="success" %}
The bot is now running. Send `/help` in your Telegram chat to see all available commands.
{% endhint %}

---

## Running as a Background Service

For 24/7 operation, you'll want to run the bot as a system service. See the self-hosting guides:

* [Linux Setup](../self-hosting/linux-setup.md) — Runs as a systemd service
* [macOS Setup](../self-hosting/macos-setup.md) — Runs as a LaunchAgent

---

## Configuration Reference

All Telegram settings are stored in `.locus/settings.json`:

| Setting | Description | Required |
|---------|-------------|----------|
| `telegram.botToken` | Bot token from @BotFather | Yes |
| `telegram.chatId` | Your numeric Telegram chat ID | Yes |
| `telegram.testMode` | Enable test mode | No |

For CLI configuration details, see [`locus telegram`](../cli/telegram.md).

---

## Troubleshooting

<details>

<summary>Bot doesn't respond to commands</summary>

1. Check that the bot is running (`locus-telegram` process is active)
2. Verify your chat ID matches: `locus telegram config`
3. Make sure you're messaging the correct bot
4. Check that your API key is valid: `locus config show`

</details>

<details>

<summary>Commands fail with "API key required"</summary>

The bot reads configuration from `.locus/settings.json`. Make sure you've run `locus config setup` in your project directory and that the bot is started from the same directory.

</details>

<details>

<summary>"Unauthorized" errors</summary>

Your bot token may be invalid or expired. Generate a new one from @BotFather and update:

```bash
locus telegram set botToken "NEW_TOKEN"
```

</details>
