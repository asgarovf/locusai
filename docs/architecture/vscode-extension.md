# VSCode Extension Architecture — Locus v1

**Version:** 0.11.3
**Status:** DRAFT — pending sprint approval
**Date:** 2026-02-14

---

## 1. Design Principles

1. **CLI-first, extension-as-orchestrator.** The extension does not reimplement AI execution. It spawns `@locusai/cli` in structured-stream mode and translates events into webview state.
2. **Non-terminal UX contract.** Primary user workflows (start session, stream output, resume, stop) must never open the VSCode integrated terminal. See [Non-Terminal UX Contract](#10-non-terminal-ux-contract).
3. **Monorepo reuse.** Shared types, SDK session logic, and CLI execution remain in their existing packages. The extension imports — it does not fork.
4. **Webview is a stateless renderer.** The extension host holds authoritative state. The webview receives events and dispatches intents; it never calls APIs or spawns processes directly.
5. **Structured contracts over text parsing.** All host↔CLI communication uses validated NDJSON events against Zod schemas from `packages/shared`.

---

## 2. Module Boundaries

The extension lives at `packages/vscode-extension/` and is organized into three layers:

```
packages/vscode-extension/
├── src/
│   ├── extension.ts              # Activation, command registration, provider wiring
│   ├── core/                     # Layer 1 — Process & I/O
│   │   ├── cli-bridge.ts         # Spawn CLI in --json-stream mode, parse NDJSON
│   │   ├── process-runner.ts     # Child-process lifecycle, signal handling, timeout
│   │   └── events.ts             # Normalize CLI stream chunks → typed host events
│   ├── sessions/                 # Layer 2 — Session Orchestration
│   │   ├── session-manager.ts    # Create / list / resume / stop / cleanup
│   │   ├── session-store.ts      # Persist metadata to ExtensionContext.globalState
│   │   └── types.ts              # Session state enum, metadata shape
│   ├── commands/                 # VSCode command handlers
│   │   ├── open-chat.ts          # Locus: Open Chat
│   │   ├── run-exec.ts           # Locus: Run Exec Task
│   │   ├── explain-selection.ts  # Locus: Explain Selection
│   │   └── resume-session.ts     # Locus: Resume Last Session
│   ├── context/                  # Workspace context collectors
│   │   └── context-provider.ts   # Active file, selection, workspace root
│   ├── config/                   # Settings & configuration
│   │   └── settings.ts           # API URL, model, provider, preferences
│   ├── auth/                     # Authentication
│   │   └── auth-manager.ts       # CLI identity reuse, SecretStorage fallback
│   └── webview/                  # Layer 3 — Presentation
│       ├── app/                  # Webview React app (bundled separately)
│       │   ├── main.tsx          # Entry point
│       │   ├── store.ts          # Lightweight state store (events → UI state)
│       │   ├── components/       # Timeline, Composer, Cards, Header, Controls
│       │   └── bridge.ts         # postMessage typed wrapper (webview side)
│       └── host/
│           ├── webview-provider.ts   # WebviewViewProvider, HTML generation
│           └── webview-bridge.ts     # postMessage typed wrapper (host side)
├── package.json                  # Contribution points, activation events
├── tsconfig.json                 # Strict TS aligned with repo
└── vite.config.ts                # Webview asset bundling
```

### Layer Responsibilities

| Layer | Boundary | Allowed Dependencies |
|-------|----------|---------------------|
| **Core (Process & I/O)** | Spawns CLI, parses NDJSON, emits typed events. No VSCode UI APIs. | `@locusai/shared` (schemas), Node `child_process` |
| **Sessions (Orchestration)** | State machine, persistence, process registry. No UI. | Core layer, `@locusai/shared`, `vscode.ExtensionContext` |
| **Webview (Presentation)** | Renders timeline, dispatches intents. No process spawning. | `@locusai/shared` (types only), React, CSS |

**Cross-cutting:** `extension.ts` wires layers together. Commands call into Session Manager. Auth and Config are consumed by Core and Session layers.

---

## 3. End-to-End Flow: User Intent → CLI Execution → Streamed UI Update

```
┌─────────────────────────────────────────────────────────────────────┐
│                         VSCode Extension Host                       │
│                                                                     │
│  ┌──────────┐    intent     ┌────────────────┐    create/resume     │
│  │ Webview   │─────────────▶│ Command Router │──────────────────┐   │
│  │ (React)   │              └────────────────┘                  │   │
│  │           │                                                  ▼   │
│  │           │              ┌────────────────┐  spawn   ┌──────────┐│
│  │           │◀─────────────│ Session Manager│─────────▶│CLI Bridge││
│  │           │  host event  │                │          │          ││
│  │           │              │  state machine │◀─────────│  NDJSON  ││
│  └──────────┘              │  persistence   │ typed    │  parser  ││
│       ▲                    └────────────────┘ events   └──────────┘│
│       │                                                     │      │
│       │  postMessage                                        │      │
│       │  (typed, validated)                                 │ stdin │
│       │                                                     │/stdout│
└───────│─────────────────────────────────────────────────────│──────┘
        │                                                     │
        │                                                     ▼
        │                                              ┌──────────┐
        │                                              │ locus cli│
        │                                              │ --json-  │
        │                                              │  stream  │
        └──────────────────────────────────────────────└──────────┘
```

### Sequence: New Session

```
1. User types prompt in Composer → webview dispatches `{ type: "submit_prompt", payload: { text, context } }`
2. Webview bridge validates intent against shared schema, forwards via postMessage to host
3. Host webview-bridge receives, validates, routes to Session Manager
4. Session Manager:
   a. Creates session record (status: STARTING, id: uuid)
   b. Persists metadata to globalState
   c. Requests CLI Bridge to spawn process
5. CLI Bridge:
   a. Resolves CLI binary path (bundled or system)
   b. Spawns: `locus exec --json-stream --session <id> --model <model> "<prompt>"`
   c. Attaches stdout NDJSON parser, stderr error handler
6. CLI emits NDJSON events: session_started → thinking → text_delta* → tool_use → tool_result → ... → result → done
7. CLI Bridge normalizes each event → typed HostEvent → emits to Session Manager
8. Session Manager:
   a. Transitions state (STARTING → RUNNING → STREAMING)
   b. Appends event to timeline
   c. Persists timeline snapshot periodically
   d. Forwards event to Webview Bridge
9. Webview Bridge sends HostEvent via postMessage to webview
10. Webview store reduces event → UI re-renders incrementally
```

### Sequence: Resume After Reload

```
1. Extension activates → Session Manager loads persisted metadata from globalState
2. For each session with status RUNNING/STREAMING:
   a. Check if CLI process is still alive (PID in memory registry → gone after reload)
   b. Mark as INTERRUPTED if process is gone
3. User opens chat panel → Webview Provider creates/reveals webview
4. Webview requests session list → host sends persisted sessions with timelines
5. Webview renders last session timeline from persisted snapshot
6. User clicks "Resume" → dispatches resume_session intent
7. Session Manager transitions INTERRUPTED → RESUMING → RUNNING
8. CLI Bridge spawns new CLI process with --session <id> --continue flag
9. Flow continues from step 6 of New Session sequence
```

---

## 4. Session State Machine

```
                          ┌───────────┐
                          │   IDLE    │ (no active session)
                          └─────┬─────┘
                                │ create_session
                                ▼
                          ┌───────────┐
                     ┌────│ STARTING  │
                     │    └─────┬─────┘
                     │          │ cli_spawned
              error  │          ▼
                     │    ┌───────────┐
                     │    │  RUNNING   │◀──────────────────┐
                     │    └─────┬─────┘                    │
                     │          │ first_text_delta          │
                     │          ▼                           │
                     │    ┌───────────┐     resume          │
                     ├────│ STREAMING │                     │
                     │    └─────┬─────┘                ┌────┴──────┐
                     │          │ result_received       │ RESUMING  │
                     │          ▼                       └────┬──────┘
                     │    ┌───────────┐                     │
                     │    │ COMPLETED │                     │
                     │    └───────────┘                     │
                     │                                      │
                     │          user_stop                    │
                     ├──────────────────▶┌───────────┐      │
                     │                   │ CANCELED  │      │
                     │                   └───────────┘      │
                     │                                      │
                     │          process_lost (reload)        │
                     └──────────────────▶┌─────────────┐    │
                                         │ INTERRUPTED │────┘
                                         └─────────────┘
                     error (any state)
                     ────────────────────▶┌───────────┐
                                          │  FAILED   │
                                          └───────────┘
```

### Transition Rules

| From | Event | To | Side Effects |
|------|-------|----|-------------|
| IDLE | `create_session` | STARTING | Persist metadata, allocate session ID |
| STARTING | `cli_spawned` | RUNNING | Register PID in memory, emit session_started to webview |
| STARTING | `error` | FAILED | Persist error, emit failure event |
| RUNNING | `first_text_delta` | STREAMING | Begin timeline append, start periodic persistence |
| STREAMING | `result_received` | COMPLETED | Persist final timeline, emit completion |
| STREAMING | `error` | FAILED | Persist error context, emit failure event |
| RUNNING/STREAMING | `user_stop` | CANCELED | Send SIGTERM to CLI, persist partial timeline |
| RUNNING/STREAMING | `process_lost` | INTERRUPTED | Mark for resume, persist last known state |
| INTERRUPTED | `resume` | RESUMING | Load persisted timeline |
| RESUMING | `cli_spawned` | RUNNING | New PID registered, timeline continues |
| RESUMING | `error` | FAILED | Persist error |
| COMPLETED/CANCELED/FAILED | `create_session` | STARTING | New session; old one remains in history |

**Invariants:**
- Only one session may be RUNNING or STREAMING per workspace at a time.
- COMPLETED, CANCELED, and FAILED are terminal states — no transitions out except new session creation.
- Process handles (PID) are in-memory only; they are never persisted to globalState.
- Timeline snapshots are persisted on every state transition and periodically during STREAMING (debounced, ≤ 1 write/sec).

---

## 5. Package Reuse Decisions

### `packages/shared` — REUSE DIRECTLY

| What | How | Rationale |
|------|-----|-----------|
| Stream chunk types (`TextDeltaChunk`, `ToolUseChunk`, etc.) | Import types | Extension needs the same event vocabulary as CLI |
| Zod schemas for events | Import validators | Host validates both inbound (webview→host) and outbound (CLI→host) payloads |
| Enums (`ExecEventType`, `TaskStatus`) | Import constants | Single source of truth for event kinds and statuses |
| New: host↔webview protocol schemas | **Add to `packages/shared`** | Discriminated unions for `UIIntent` and `HostEvent` must be shared between host and webview |

**Decision:** Extend `packages/shared` with new VSCode protocol schemas. Do not create a separate types package.

### `packages/sdk` — REUSE SELECTIVELY

| What | Reuse? | Rationale |
|------|--------|-----------|
| `ExecSession` class | **No — wrap, don't embed** | ExecSession manages its own process lifecycle via AI runners. The extension manages processes differently (child_process + NDJSON). Instead, the extension's Session Manager provides equivalent session semantics while delegating execution to CLI Bridge. |
| `ExecEventEmitter` | **Yes — reference pattern** | The event emitter pattern is reused conceptually. Extension host implements its own emitter using the same event types. |
| `HistoryManager` | **No — use globalState** | SDK persists to `.locus/sessions/` as JSON files. Extension persists to `ExtensionContext.globalState` for VSCode-native lifecycle. Sessions started in the extension are not interchangeable with CLI sessions. |
| `ContextTracker` | **Defer to v2** | Multi-turn artifact/task tracking is valuable but out of scope for v1 chat. |
| Stream chunk types from `exec/types.ts` | **Yes** | These types should migrate to or be re-exported from `packages/shared` for cross-package use. |

**Decision:** The extension does not import `packages/sdk` at runtime. It communicates with SDK logic indirectly by spawning CLI (which uses SDK internally). Shared types come from `packages/shared`.

### `packages/cli` — REUSE AS SUBPROCESS

| What | How | Rationale |
|------|-----|-----------|
| `exec` command | Spawn as child process | CLI already handles AI provider selection, prompt building, tool execution, and context management. Extension reuses all of this by spawning CLI. |
| `--json-stream` mode | **New — must be implemented** | CLI currently outputs human-readable text. A new structured stream mode emits NDJSON events consumable by the extension without text parsing. |
| Auth/config resolution | Reuse via CLI | CLI already resolves API keys, config, and workspace context. Extension inherits this by spawning CLI in the workspace directory. |

**Decision:** CLI is the execution engine. Extension is the orchestration and presentation layer. The `--json-stream` flag is a prerequisite for extension development (Sprint Task 6).

### Dependency Graph

```
packages/vscode-extension
    ├── imports types/schemas from → packages/shared
    ├── spawns as subprocess       → packages/cli (which uses packages/sdk internally)
    └── does NOT import            → packages/sdk (no direct dependency)
```

---

## 6. Host ↔ Webview Protocol

### Webview → Host (UI Intents)

All messages from webview to host are validated against shared Zod schemas with a discriminated `type` field.

| Intent Type | Payload | Description |
|------------|---------|-------------|
| `submit_prompt` | `{ text: string, context?: ContextPayload }` | Start new exec session or continue current |
| `stop_session` | `{ sessionId: string }` | Cancel running session |
| `resume_session` | `{ sessionId: string }` | Resume interrupted session |
| `request_sessions` | `{}` | List available sessions |
| `request_session_detail` | `{ sessionId: string }` | Get full timeline for a session |
| `clear_session` | `{ sessionId: string }` | Delete session from history |

### Host → Webview (Host Events)

| Event Type | Payload | Description |
|-----------|---------|-------------|
| `session_state` | `{ sessionId, status, timeline }` | Full or delta session state update |
| `text_delta` | `{ sessionId, content }` | Incremental text from AI response |
| `tool_started` | `{ sessionId, tool, parameters }` | Tool invocation began |
| `tool_completed` | `{ sessionId, tool, result, duration }` | Tool finished |
| `thinking` | `{ sessionId, content }` | AI thinking/reasoning text |
| `error` | `{ sessionId?, code, message }` | Structured error |
| `session_list` | `{ sessions: SessionSummary[] }` | Response to request_sessions |
| `session_completed` | `{ sessionId, summary }` | Session reached terminal state |

All messages include `{ protocol: 1, type: string, payload: ... }` envelope with version field for forward compatibility.

---

## 7. Authentication Flow

```
1. Extension activates
2. Auth Manager checks for existing CLI identity:
   a. Look for Locus config at .locus/settings.json in workspace
   b. Look for global config at ~/.locus/settings.json
   c. If API key found → validate with health check → authenticated
3. If no valid identity:
   a. Show "Connect to Locus" prompt in chat panel (not a terminal)
   b. User enters API URL + API key in webview input fields
   c. Extension validates credentials via API health check
   d. Store in VSCode SecretStorage (encrypted, per-machine)
   e. Write config for CLI consumption
4. On subsequent activations: SecretStorage → inject into CLI env
```

**No terminal interaction required.** Auth is handled entirely through the webview UI and SecretStorage.

---

## 8. Context Injection

The extension collects workspace context and attaches it to session start:

| Context Source | Collection Method | When |
|---------------|-------------------|------|
| Workspace root | `vscode.workspace.workspaceFolders` | Session start |
| Active file path | `vscode.window.activeTextEditor.document.uri` | Session start |
| Selected text | `vscode.window.activeTextEditor.selection` | On "Explain Selection" command |
| Open file tabs | `vscode.window.tabGroups` | Session start (deferred to v2) |
| Terminal output | Not collected | Out of scope — non-terminal UX contract |

Context is serialized as a `ContextPayload` (shared schema) and passed to CLI via command arguments or stdin.

---

## 9. Error Handling Strategy

| Failure Mode | Detection | Recovery | User Experience |
|-------------|-----------|----------|-----------------|
| CLI not found | Process spawn fails | Prompt install/config | Error card in chat: "Locus CLI not found. Install with `npm i -g @locusai/cli`" |
| CLI crashes mid-stream | Process exit code ≠ 0, no `done` event | Transition → FAILED, persist partial timeline | Error card with partial output preserved, "Retry" button |
| Malformed NDJSON line | JSON.parse fails on line | Skip line, emit warning event, continue | Warning indicator; stream continues |
| Auth expired/invalid | CLI emits auth error event | Transition → FAILED, clear cached auth | Error card: "Authentication failed. Reconnect." with action button |
| Network timeout | CLI emits timeout error | Transition → FAILED | Error card: "Request timed out. Retry?" |
| Webview disposed during stream | webview.onDidDispose fires | Stream continues in host; persist timeline | On re-open, replay from persisted timeline |
| VSCode reload during stream | Extension deactivation | Process dies; state persisted as INTERRUPTED | On re-activation, show "Resume" option |
| Context window exceeded | CLI emits context error | Transition → FAILED | Error card: "Context limit reached. Start a new session." |

**Invariant:** Every failure path results in a structured error event emitted to the webview. No silent failures.

---

## 10. Non-Terminal UX Contract

> **Contract:** All primary user workflows in the Locus VSCode extension v1 MUST complete without opening, requiring, or depending on the VSCode integrated terminal. The terminal is not part of the extension's interaction surface.

### Scope

This contract applies to the following primary workflows:

| Workflow | Terminal Allowed? | Implementation |
|----------|:-----------------:|---------------|
| Start new exec session | No | Webview composer → CLI Bridge (child_process, hidden) |
| View streaming output | No | Webview timeline (React rendering of host events) |
| Stop/cancel session | No | Webview button → Session Manager → SIGTERM |
| Resume interrupted session | No | Webview button → Session Manager → CLI respawn |
| View session history | No | Webview list → persisted globalState |
| Authentication | No | Webview form → SecretStorage |
| Configuration | No | VSCode Settings UI (`contributes.configuration`) |
| Error display & retry | No | Webview error cards with action buttons |
| Context injection | No | Editor selection + workspace APIs (no terminal output) |

### Exceptions (Non-Primary)

The following are explicitly permitted to use the terminal, as they are secondary/debug workflows:

- **Advanced CLI usage:** Power users may open a terminal and run `locus exec` directly. The extension does not prevent this.
- **Debug logging:** A "Show CLI Output" command may open an Output Channel (not the integrated terminal) for diagnostic logs.

### Enforcement

- Sprint Task 12 (QA) includes validation that no primary workflow opens `vscode.window.terminals` or creates a `Terminal` instance.
- The extension must not register any `Terminal` or `TerminalProfile` contribution points for primary flows.
- All CLI interaction is through `child_process.spawn()` with stdio piped — never through `vscode.window.createTerminal()`.

### Cross-References

- This contract is referenced in [`docs/product/vscode-parity-matrix.md`](../product/vscode-parity-matrix.md) as a decision driver for parity scope.
- Sprint Task 10 (Branded Webview Chat UI) acceptance criteria includes: "Primary flows operate without opening integrated terminal."
- Sprint Task 12 (QA) acceptance criteria includes: "Validation evidence confirms primary workflows do not require integrated terminal."

---

## 11. Top Unknowns

| # | Unknown | Impact | Owner | Mitigation | Target Resolution |
|---|---------|--------|-------|------------|-------------------|
| 1 | **CLI `--json-stream` mode does not exist yet.** Extension depends on structured NDJSON output from CLI. | CRITICAL — blocks CLI Bridge implementation (Task 7) | Backend (Task 6) | Task 6 implements this. If delayed, mock NDJSON in tests. Extension development can proceed with mock events until Task 6 ships. | Before Task 7 starts |
| 2 | **Session resume semantics in CLI.** Does `locus exec --session <id> --continue` work? What state does CLI restore? | HIGH — affects resume flow accuracy | Backend (Task 6) | Define resume contract in CLI stream spec. If CLI cannot resume, extension re-sends full conversation history as context. | Task 6 |
| 3 | **Webview bundle size and CSP constraints.** React + component library may exceed VSCode Marketplace size limits or violate CSP. | MEDIUM — could delay release | Frontend (Task 4) | Task 4 establishes CSP-safe loading early. Use lightweight alternatives (Preact) if React bundle is too large. Measure during Task 4. | Task 4 |
| 4 | **Auth token format compatibility.** CLI reads from `.locus/settings.json`; extension stores in SecretStorage. Token format mismatch could break CLI spawning. | MEDIUM — affects auth flow | Backend (Task 11) | Auth Manager writes CLI-compatible config before spawning. Test cross-platform during Task 11. | Task 11 |
| 5 | **Concurrent session behavior.** v1 allows only one active session per workspace. What happens if user tries to start a second? | LOW — UX decision | PM | v1 enforces single active session. Second attempt shows "Session already running" with stop option. Revisit in v2. | Task 8 |
| 6 | **Stream backpressure.** High-volume tool output (large file reads, many grep results) may overwhelm webview rendering. | MEDIUM — affects UX quality | Frontend (Task 10) | Implement buffering in host bridge (batch events at 16ms intervals). Add virtualized timeline rendering. Stress test in Task 12. | Task 10 + Task 12 |

---

## 12. Glossary

| Term | Definition |
|------|-----------|
| **CLI Bridge** | Extension module that spawns the Locus CLI as a child process and parses its NDJSON output into typed events. |
| **Host Event** | A typed message sent from the extension host to the webview, representing a session state change or stream data. |
| **UI Intent** | A typed message sent from the webview to the extension host, representing a user action (submit, stop, resume). |
| **NDJSON** | Newline-Delimited JSON — each line is a self-contained JSON object. Used for CLI→extension streaming. |
| **Session Timeline** | Ordered list of events (text deltas, tool calls, errors) that constitute a session's output history. |
| **globalState** | VSCode's `ExtensionContext.globalState` — a key-value store persisted across extension activations, scoped to the machine. |
| **SecretStorage** | VSCode's encrypted credential storage API for sensitive values like API keys. |

---

*This document is a planning artifact. It contains no runtime code. Implementation begins with Sprint Task 3 (scaffold) and proceeds per the [sprint plan](../../.locus/plans/sprint-vscode-chat-v1.md).*
