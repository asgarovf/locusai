# @locusai/locus-gateway

[![npm version](https://img.shields.io/npm/v/@locusai/locus-gateway?color=blue)](https://www.npmjs.com/package/@locusai/locus-gateway)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/asgarovf/locusai/blob/master/LICENSE)

Channel-agnostic message gateway for [Locus](https://github.com/asgarovf/locusai) platform adapters. Routes inbound messages from any platform (Telegram, Discord, WhatsApp, etc.) through a unified command pipeline — parsing, tracking, executing, and formatting output per platform capabilities.

## Installation

```bash
npm install @locusai/locus-gateway
```

## Quick Start

```ts
import { Gateway } from "@locusai/locus-gateway";

// Create the gateway
const gateway = new Gateway({
  onEvent: (event) => console.log(`[${event.type}]`, event),
});

// Register a platform adapter
gateway.register(myAdapter);

// Start all adapters
await gateway.start();

// Handle an inbound message (adapters call this internally)
await gateway.handleMessage({
  platform: "telegram",
  sessionId: "chat-123",
  userId: "user-456",
  text: "/run 42",
});
```

## Architecture

Messages flow through a five-stage pipeline:

```
Adapter → Gateway → Router → Tracker → Executor → Adapter
```

1. **Adapter** receives a platform message and passes it to the gateway
2. **Router** (`CommandRouter`) parses text into a structured `ParsedCommand` or `FreeText`
3. **Tracker** (`CommandTracker`) checks concurrency — blocks commands that conflict with running ones in the same exclusivity group
4. **Executor** (`CommandExecutor`) spawns the Locus CLI via `invokeLocusStream()`, supports streaming and buffered output modes
5. **Gateway** sends the formatted result back through the originating adapter

Free-text messages (non-commands) are automatically routed to `locus exec` as prompts.

## API Reference

### `Gateway`

Central orchestrator connecting platform adapters to the command pipeline.

```ts
import { Gateway } from "@locusai/locus-gateway";

const gateway = new Gateway(options?: GatewayOptions);
```

**`GatewayOptions`**

| Property | Type | Description |
|----------|------|-------------|
| `onEvent` | `(event: GatewayEvent) => void` | Optional handler for gateway lifecycle events |

**Methods**

| Method | Description |
|--------|-------------|
| `register(adapter)` | Register a `PlatformAdapter` (throws if platform already registered) |
| `getAdapter(platform)` | Get a registered adapter by platform name |
| `handleMessage(message)` | Main entry point — parse, route, and execute an `InboundMessage` |
| `start()` | Start all registered adapters |
| `stop()` | Stop all adapters gracefully |
| `getRouter()` | Access the `CommandRouter` instance |
| `getExecutor()` | Access the `CommandExecutor` instance |
| `getTracker()` | Access the `CommandTracker` instance |

### `CommandRouter`

Parses inbound text into structured commands or free-text.

```ts
import { CommandRouter } from "@locusai/locus-gateway";

const router = new CommandRouter(prefix?: string); // default: "/"
const parsed = router.parse("/run 42 43");
// → { type: "command", command: "run", args: ["42", "43"], raw: "/run 42 43" }
```

Returns `ParsedCommand` for slash commands, `FreeText` for everything else. Handles `@botname` suffixes (e.g., `/run@MyBot` → command `"run"`).

### `CommandExecutor`

Executes Locus CLI commands via subprocess, with streaming or buffered output.

```ts
import { CommandExecutor, CommandTracker } from "@locusai/locus-gateway";

const tracker = new CommandTracker();
const executor = new CommandExecutor(tracker);

// Buffered execution
const result = await executor.executeLocusCommand(sessionId, "status", []);

// Streaming execution with callbacks
const result = await executor.executeLocusCommand(sessionId, "run", ["42"], {
  onStart: async (text) => { /* send initial message, return messageId */ },
  onUpdate: async (messageId, text) => { /* edit message with progress */ },
  onComplete: async (messageId, text, exitCode) => { /* final update */ },
});
```

**`StreamCallbacks`**

| Callback | Description |
|----------|-------------|
| `onStart(text)` | Called when execution begins. Return a message ID for subsequent edits |
| `onUpdate(messageId, text)` | Called periodically with updated output (every ~2s) |
| `onComplete(messageId, text, exitCode)` | Called when execution finishes |

### `CommandTracker`

Tracks active commands per session and enforces exclusivity groups.

```ts
import { CommandTracker } from "@locusai/locus-gateway";

const tracker = new CommandTracker();

// Check for conflicts before executing
const conflict = tracker.checkExclusiveConflict(sessionId, "run");
if (conflict) {
  console.log(`Blocked by: ${conflict.runningCommand.command}`);
}

// Track a running command
const id = tracker.track(sessionId, "run", ["42"], childProcess);

// List active commands
const active = tracker.getActive(sessionId);

// Kill a specific command or all commands in a session
tracker.kill(sessionId, id);
tracker.killAll(sessionId);

// Untrack when done
tracker.untrack(sessionId, id);
```

**Exclusivity Groups**

| Group | Commands | Behavior |
|-------|----------|----------|
| `workspace` | `run`, `plan`, `iterate`, `exec` | Only one per session |
| `git` | `stage`, `commit`, `checkout`, `stash`, `pr` | Only one per session |

Commands outside these groups can run concurrently.

### Formatting Utilities

```ts
import { bestFormat, splitMessage, truncate } from "@locusai/locus-gateway";

// Pick the richest format a platform supports (HTML > Markdown > plain)
const format = bestFormat(adapter.capabilities);

// Split long text respecting platform message limits
const chunks = splitMessage(longText, 4096);

// Truncate text with an indicator
const short = truncate(longText, 200);
```

### Command Registry

```ts
import {
  COMMAND_REGISTRY,
  STREAMING_COMMANDS,
  getCommandDefinition,
} from "@locusai/locus-gateway";

// Look up a command definition
const def = getCommandDefinition("run");
// → { cliArgs: ["run"], streaming: true }

// Check if a command streams
STREAMING_COMMANDS.has("run"); // true
```

## Platform Adapter Interface

To build a custom adapter, implement the `PlatformAdapter` interface:

```ts
import type {
  PlatformAdapter,
  PlatformCapabilities,
  OutboundMessage,
} from "@locusai/locus-gateway";

class MyAdapter implements PlatformAdapter {
  readonly platform = "my-platform";

  capabilities: PlatformCapabilities = {
    supportsEditing: true,       // Can edit previously sent messages
    supportsInlineButtons: true,  // Supports inline action buttons
    supportsMarkdown: true,       // Supports Markdown formatting
    supportsHTML: false,          // Supports HTML formatting
    supportsFileUpload: false,    // Supports file attachments
    maxMessageLength: 4096,       // Max characters before message splitting
    supportsStreaming: true,      // Enable streaming via message edits
  };

  async start(): Promise<void> {
    // Initialize platform connection (e.g., connect to API, start polling)
  }

  async stop(): Promise<void> {
    // Clean up resources, disconnect
  }

  async send(sessionId: string, message: OutboundMessage): Promise<void> {
    // Send a message to the platform
  }

  // Optional — required if supportsEditing is true
  async edit?(sessionId: string, messageId: string, message: OutboundMessage): Promise<void> {
    // Edit a previously sent message
  }
}
```

**`PlatformCapabilities`**

| Property | Type | Description |
|----------|------|-------------|
| `supportsEditing` | `boolean` | Can edit sent messages (enables streaming via edits) |
| `supportsInlineButtons` | `boolean` | Supports inline action buttons |
| `supportsMarkdown` | `boolean` | Supports Markdown formatting |
| `supportsHTML` | `boolean` | Supports HTML formatting |
| `supportsFileUpload` | `boolean` | Supports file uploads/attachments |
| `maxMessageLength` | `number` | Max characters per message before splitting |
| `supportsStreaming` | `boolean` | Enable real-time streaming output via message edits |

**`OutboundMessage`**

| Property | Type | Description |
|----------|------|-------------|
| `text` | `string` | Message content |
| `format` | `"plain" \| "markdown" \| "html"` | Text format |
| `actions?` | `Action[]` | Optional inline buttons/links |
| `attachments?` | `Attachment[]` | Optional file attachments |

## Gateway Events

Subscribe to lifecycle events via the `onEvent` option:

```ts
const gateway = new Gateway({
  onEvent: (event) => {
    switch (event.type) {
      case "message_received":  // Inbound message from a platform
      case "command_started":   // Command execution began
      case "command_completed": // Command finished (includes exitCode)
      case "error":             // Error with optional context string
    }
  },
});
```

## License

[MIT](https://github.com/asgarovf/locusai/blob/master/LICENSE)
