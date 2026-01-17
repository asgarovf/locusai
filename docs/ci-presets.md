# Locus CI Presets

CI Presets allow you to define standardized engineering workflows that AI agents can execute reliably. These are stored in your project's `.locus/ci-presets.json` file.

## ⚙️ How it works

When an AI agent uses the `ci.run` tool, it references one of the presets defined in your configuration. Locus then executes those commands in a secure environment and captures the logs and artifacts.

## 📂 Configuration

A typical `ci-presets.json` looks like this:

```json
{
  "quick": [
    "bun run lint",
    "bun run typecheck"
  ],
  "full": [
    "bun run lint",
    "bun run typecheck",
    "bun run build",
    "bun test"
  ]
}
```

### Preset Structure
- **Key**: The name of the preset (e.g., `quick`, `deploy`, `test`).
- **Value**: An array of strings representing the shell commands to be executed sequentially.

## 🤖 Using with AI Agents

AI agents integrated via the Locus MCP server can trigger these presets using the `ci_run` tool.

**Example Request from Agent:**
```json
{
  "tool": "ci_run",
  "arguments": {
    "preset": "quick"
  }
}
```

## 🔒 Security

Locus only allows the execution of commands defined within the `ci-presets.json` file. This prevents AI agents from running arbitrary or destructive shell commands on your host system while still giving them the power to verify their work.

Every CI run is logged in the Locus database with:
- Start and end timestamps
- Full STDOUT/STDERR output
- Exit code
- Triggering agent/user
