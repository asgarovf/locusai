---
description: Machine-readable NDJSON stream output for programmatic CLI consumption.
---

# JSON Stream Mode

The `--json-stream` flag enables machine-readable output for programmatic consumption (e.g., by the VSCode extension). When enabled, the CLI emits **newline-delimited JSON** (NDJSON) to stdout — one event per line — instead of human-readable terminal output.

```bash
locus exec --json-stream "explain the auth flow"
```

---

## Event Format

Every line is a JSON object conforming to the `CliStreamEvent` schema from `@locusai/shared`. All events share a common envelope:

```json
{
  "protocol": 1,
  "type": "<event_type>",
  "sessionId": "<uuid>",
  "timestamp": 1707700000000,
  "payload": { ... }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `protocol` | `number` | Protocol version (currently `1`). Increment on breaking changes. |
| `type` | `string` | Event type discriminator. |
| `sessionId` | `string` | Correlation ID for the execution session. |
| `timestamp` | `number` | Unix epoch milliseconds when the event was created. |
| `payload` | `object` | Type-specific payload (see below). |

---

## Event Types

### `start`

Emitted once at the beginning of execution. Always the first event.

```json
{
  "type": "start",
  "payload": {
    "command": "exec",
    "model": "claude-sonnet-4-5-20250929",
    "provider": "anthropic",
    "cwd": "/home/user/project"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `command` | `string` | CLI command being executed. |
| `model` | `string?` | AI model name. |
| `provider` | `string?` | AI provider name. |
| `cwd` | `string?` | Working directory. |

### `text_delta`

Incremental AI response text. Concatenate all `content` values to reconstruct the full response.

```json
{
  "type": "text_delta",
  "payload": {
    "content": "The authentication flow works by..."
  }
}
```

### `thinking`

AI is reasoning/thinking. May include reasoning content.

```json
{
  "type": "thinking",
  "payload": {
    "content": "Let me analyze the auth middleware..."
  }
}
```

### `tool_started`

A tool invocation has started.

```json
{
  "type": "tool_started",
  "payload": {
    "tool": "Read",
    "toolId": "toolu_abc123",
    "parameters": {
      "file_path": "/src/auth/middleware.ts"
    }
  }
}
```

### `tool_completed`

A tool invocation has finished (success or failure).

```json
{
  "type": "tool_completed",
  "payload": {
    "tool": "Read",
    "toolId": "toolu_abc123",
    "success": true,
    "duration": 42
  }
}
```

For failures:

```json
{
  "type": "tool_completed",
  "payload": {
    "tool": "Read",
    "toolId": "toolu_abc123",
    "success": false,
    "error": "File not found"
  }
}
```

### `status`

Session status change. Informational — no action required from consumers.

```json
{
  "type": "status",
  "payload": {
    "status": "streaming",
    "message": "Streaming AI response"
  }
}
```

### `error`

Structured error using the shared `ProtocolError` schema. May appear zero or more times. On fatal errors, always followed by a `done` event.

```json
{
  "type": "error",
  "payload": {
    "error": {
      "code": "NETWORK_TIMEOUT",
      "message": "Request timed out after 30s",
      "recoverable": false
    }
  }
}
```

Error codes: `CLI_NOT_FOUND`, `AUTH_EXPIRED`, `NETWORK_TIMEOUT`, `CONTEXT_LIMIT`, `MALFORMED_EVENT`, `PROCESS_CRASHED`, `SESSION_NOT_FOUND`, `UNKNOWN`.

### `done`

Terminal event — always the last event emitted. Exactly one `done` event per execution.

```json
{
  "type": "done",
  "payload": {
    "exitCode": 0,
    "duration": 12345,
    "toolsUsed": ["Read", "Grep", "Edit"],
    "success": true
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `exitCode` | `number` | Process exit code (`0` = success). |
| `duration` | `number` | Total execution time in milliseconds. |
| `toolsUsed` | `string[]?` | List of distinct tools used. |
| `tokensUsed` | `number?` | Token count (when available). |
| `success` | `boolean` | Whether execution completed successfully. |

---

## Event Ordering

Events are guaranteed to follow this ordering:

```
start → (text_delta | thinking | tool_started | tool_completed | status | error)* → done
```

1. **`start`** is always the first event.
2. **`done`** is always the last event.
3. **`tool_started`** for a given `toolId` always precedes its corresponding `tool_completed`.
4. **`error`** events for fatal errors are always immediately followed by `done`.
5. All other events may interleave freely between `start` and `done`.

---

## Deterministic Terminal Behavior

The CLI guarantees that **every execution path** emits a terminal `done` event:

- **Success**: Stream completes normally → `done` with `exitCode: 0`.
- **Stream error**: AI returns error chunk → `error` + `done` with `exitCode: 1`.
- **Exception**: Unhandled error → `error` + `done` with `exitCode: 1`.
- **Signal** (SIGINT/SIGTERM): Process interrupted → `error` + `done` with `exitCode: 1`.

Consumers can rely on `done` as a sentinel to know the stream has ended.

---

## Schema Validation

All emitted events are validated at runtime against Zod schemas from `@locusai/shared`:

```typescript
import {
  CliStreamEventSchema,
  parseCliStreamEvent,
} from "@locusai/shared";

// Parse a line from the CLI's stdout
const event = parseCliStreamEvent(JSON.parse(line));
if (event.success) {
  // event.data is a fully typed CliStreamEvent
  switch (event.data.type) {
    case "text_delta":
      // event.data.payload.content is string
      break;
    case "done":
      // event.data.payload.exitCode is number
      break;
  }
}
```

---

## Compatibility

- Protocol version is included in every event (`protocol: 1`).
- Breaking schema changes will increment the protocol version.
- Consumers should check `protocol` and handle unknown event types gracefully.
- The `--json-stream` flag has no effect on stderr — diagnostic messages may still appear there.
- Default CLI behavior (without `--json-stream`) remains unchanged.

---

## Examples

```bash
# Pipe to jq for pretty printing
locus exec --json-stream "list all API routes" | jq .

# Filter for text content only
locus exec --json-stream "explain auth" | jq -r 'select(.type == "text_delta") | .payload.content'

# Monitor tool usage
locus exec --json-stream "refactor auth" | jq 'select(.type == "tool_started" or .type == "tool_completed")'

# Wait for completion
locus exec --json-stream "fix bug" | jq 'select(.type == "done")'
```
