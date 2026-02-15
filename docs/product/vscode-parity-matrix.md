# VSCode Extension — Feature Parity Matrix

**Version:** 0.11.3
**Date:** 2026-02-14
**Status:** DRAFT — pending sprint approval

---

## Purpose

This document benchmarks Claude Code and Kilo Code VSCode extensions across critical capability areas, then maps each capability to a v1 scope decision for the Locus VSCode extension. Decisions are informed by the [Non-Terminal UX Contract](../architecture/vscode-extension.md#10-non-terminal-ux-contract) and the CEO directive to "offer a similar experience" to these products.

---

## Scope Decisions Legend

| Label | Meaning |
|-------|---------|
| **v1 include** | Must ship in v1. Blocking for release. |
| **v1 defer** | Valuable but not required for v1. Scheduled for v2+. |
| **out of scope** | Not relevant to Locus's product model or architecture. |

---

## V1 Ship / No-Ship Threshold

The extension ships when ALL of the following are true:

1. **Every "v1 include" row is implemented and passes QA** — no exceptions.
2. **Non-terminal UX contract is enforced** — zero primary workflows open the integrated terminal. See [Non-Terminal UX Contract](../architecture/vscode-extension.md#10-non-terminal-ux-contract).
3. **Session lifecycle is reliable** — start, stream, stop, resume, and reload-recovery work without data loss.
4. **Error handling is deterministic** — every failure path shows a structured error in the webview; no silent failures, no unhandled promise rejections.
5. **`.vsix` packages and installs cleanly** — in a clean VSCode profile, on macOS and Linux.
6. **CI gates pass** — lint, typecheck, unit tests, packaging smoke check.

The extension does NOT ship if any "v1 include" item is incomplete, even if all "v1 defer" items are ready.

---

## 1. Chat Execution

| Capability | Claude Code | Kilo Code | Locus v1 Decision | Rationale |
|-----------|-------------|-----------|-------------------|-----------|
| **Webview chat panel** | React-based webview in sidebar/tab. User types prompt, AI responds with streamed text. | React+Vite webview. ChatView with composer, timeline, tool cards. | **v1 include** | Core UX. This is the primary interaction surface. |
| **Streaming text output** | CLI subprocess streams via stdin/stdout JSON protocol. Webview renders incrementally via postMessage. | Direct API calls from extension host. `presentAssistantMessage()` processes content blocks sequentially. | **v1 include** | Must show real-time output. Locus uses CLI subprocess + NDJSON streaming (architecture decision). |
| **Tool use display** | Tool calls shown inline with permission prompts. Supports Read, Write, Edit, Bash, Glob, Grep, WebFetch, etc. | Tool cards with approve/reject. `tool_use` blocks validated against mode permissions. | **v1 include** | Locus CLI uses the same tool types (Read, Write, Edit, Bash, Grep, Glob, WebFetch, Task). Display tool events as cards in timeline. |
| **Tool approval/permissions** | Three modes: default (ask each), plan mode (describe first), auto-accept. Configurable per-session. | Mode-based permissions. Each mode defines allowed tools and file restrictions. | **v1 defer** | v1 uses CLI's existing permission model (tools execute automatically in exec mode). Interactive approval requires bidirectional CLI protocol. Revisit in v2. |
| **Multi-model support** | Anthropic-only (Claude Sonnet/Opus). Bedrock/Vertex as proxy. | 40+ providers via `buildApiHandler()` factory. | **out of scope** | Locus supports Claude and Codex via SDK's AI runners. Provider selection is a CLI/SDK concern, not extension-specific. Extension exposes model/provider as a setting. |
| **Operational modes** | Plan mode vs default. Skills system for specialized behaviors. | 5 modes: Code, Architect, Debug, Ask, Orchestrator. Each with different tool sets and prompts. | **v1 defer** | v1 supports single exec mode (matches current `locus exec`). Mode switching adds complexity. Defer to v2. |
| **Subtask/recursive execution** | Subagents spawn with clean contexts via Task tool. | LIFO task stack (`clineStack`) with recursive subtask spawning. | **out of scope** | Locus handles task orchestration at the sprint/API level, not within a single chat session. |

**Sources:**
- Claude Code: [VS Code Docs](https://code.claude.com/docs/en/vs-code) (2026-02-14)
- Claude Code: [GitHub #22181 — webview crash analysis](https://github.com/anthropics/claude-code/issues/22181) (2025-12)
- Kilo Code: [Architecture Overview](https://kilo.ai/docs/contributing/architecture) (2026-02-14)
- Kilo Code: [DeepWiki — Extension Structure](https://deepwiki.com/Kilo-Org/kilocode/2.1-vs-code-extension-structure) (2026-02-14)
- Kilo Code: [Orchestrator Mode](https://kilo.ai/docs/basic-usage/orchestrator-mode) (2026-02-14)

---

## 2. Resume / Reconnect

| Capability | Claude Code | Kilo Code | Locus v1 Decision | Rationale |
|-----------|-------------|-----------|-------------------|-----------|
| **Session persistence** | Conversations stored locally. Persist across VSCode restarts. UUID-based session IDs. | Tasks persisted to `~/.kilocode/tasks/{taskId}/` as JSON. Dual message histories (API + UI). | **v1 include** | Sessions must survive VSCode reload. Persist to `ExtensionContext.globalState` with workspace-scoped keys. |
| **Resume after reload** | Sessions auto-restore. Dropdown shows conversation history by time period. | `HistoryView` shows past tasks. `--continue` flag for CLI resume. | **v1 include** | On activation, reconcile persisted metadata with process state. Show "Resume" for interrupted sessions. |
| **Timeline replay** | Full conversation history replayed on panel reopen. `hasPendingPermissions` and `hasUnseenCompletion` flags. | Session restoration via `SessionSyncService`. Downloads blob files. | **v1 include** | Webview re-open must replay session timeline from persisted snapshot without re-executing. |
| **Session history list** | Dropdown grouped by time: Today, Yesterday, Last 7 days. | `HistoryView` with search and filtering. | **v1 include** | Show recent sessions list in chat panel. Minimum: session ID, timestamp, first prompt preview. |
| **Cross-device session sync** | Remote sessions from claude.ai can be downloaded and resumed locally. One-way sync. | Cloud sync via `SessionManager` with queue-based `SessionSyncService` and signed URL uploads. | **v1 defer** | Locus API already stores task metadata. Session sync to cloud would require new API endpoints. Defer to v2 when API support exists. |
| **CLI↔extension session sharing** | Sessions started in extension can resume in CLI terminal and vice versa. Shared history store. | CLI uses separate `ExtensionService` with file-based persistence. Sessions are not directly interchangeable. | **v1 defer** | Different persistence formats (globalState vs `.locus/sessions/`). Unifying requires shared session format. Defer to v2. |

**Sources:**
- Claude Code: [VS Code Docs — conversations](https://code.claude.com/docs/en/vs-code) (2026-02-14)
- Claude Code: [GitHub #14760 — SessionEnd timing](https://github.com/anthropics/claude-code/issues/14760) (2025-10)
- Kilo Code: [DeepWiki — Multi-Interface Architecture](https://deepwiki.com/Kilo-Org/kilocode/3.2-multi-interface-architecture) (2026-02-14)

---

## 3. Command Flow

| Capability | Claude Code | Kilo Code | Locus v1 Decision | Rationale |
|-----------|-------------|-----------|-------------------|-----------|
| **Command palette commands** | Open, new conversation, model switch, rewind, usage. | `newTask`, `showHistory`, `openSettings`, `selectModel`. | **v1 include** | Minimum: `Locus: Open Chat`, `Locus: Run Exec Task`, `Locus: Explain Selection`, `Locus: Resume Last Session`. |
| **Slash commands in composer** | 30+ built-in: `/compact`, `/model`, `/rewind`, `/usage`, `/context`, `/plugins`, `/mcp`, `/ide`. | Mode-based commands. Tool invocations via `/` prefix. | **v1 defer** | v1 composer is prompt-only. Slash commands require routing logic and CLI protocol extension. Defer to v2. |
| **Context menu actions** | "Explain selection" via editor right-click context menu. | Similar context menu integration. | **v1 include** | "Locus: Explain Selection" in editor context menu. Routes through standard session pipeline. |
| **Skills/custom commands** | SKILL.md files with YAML frontmatter. Three scopes: personal, project, enterprise. Auto-invoke and manual invoke. | Modes system with per-mode tool/prompt configuration. Marketplace for community modes. | **v1 defer** | Skills require SKILL.md discovery, parsing, and integration with prompt construction. Defer to v2. |
| **Keyboard shortcuts** | Standard keybindings for open, new conversation, accept/reject. | Keybindings for task management. | **v1 include** | Register default keybindings for Open Chat (e.g., `Ctrl+Shift+L`) and Stop Session. |

**Sources:**
- Claude Code: [Slash Commands / Skills Docs](https://code.claude.com/docs/en/slash-commands) (2026-02-14)
- Kilo Code: [Tool Use Overview](https://kilo.ai/docs/features/tools/tool-use-overview) (2026-02-14)

---

## 4. Context Injection

| Capability | Claude Code | Kilo Code | Locus v1 Decision | Rationale |
|-----------|-------------|-----------|-------------------|-----------|
| **Active file context** | Automatic. Editor's active file visible to Claude. | System prompt includes current file context. | **v1 include** | Attach active file path to session start payload. CLI receives as context argument. |
| **Text selection context** | Auto-detected. Footer shows selected line count. Toggle on/off. `Option+K`/`Alt+K` to insert from selection. | `@file` mentions with line ranges. | **v1 include** | Capture `vscode.window.activeTextEditor.selection` and include in prompt context. Drives "Explain Selection" command. |
| **@-mention file/folder** | Type `@` for fuzzy-matched file picker. Supports `@file.ts#5-10` for line ranges. | `@file`, `@folder`, `@url`, `@problems` in `ChatTextArea`. Autocomplete menu. | **v1 defer** | @-mention UX requires fuzzy file picker component in webview and file content resolution in host. Valuable but complex. Defer to v2. |
| **Drag-and-drop files** | Hold `Shift` and drag files into prompt box. | Not documented. | **v1 defer** | Requires webview drag event handling and file content reading. Defer to v2. |
| **Workspace root** | Implicit — CLI runs in workspace directory. | Workspace folder detection. | **v1 include** | Pass `vscode.workspace.workspaceFolders[0]` as `--dir` argument to CLI. |
| **Terminal output context** | `@terminal:name` reference syntax for terminal output. | Not supported. | **out of scope** | Violates non-terminal UX contract. Extension does not interact with terminal content. |
| **Browser context** | `@browser` connects to Chrome via extension. | Not supported natively. | **out of scope** | Not relevant to Locus's exec-focused workflow. |
| **Semantic code search** | Not built-in. Uses Grep/Glob tools during execution. | Embeddings-based semantic search (LanceDB/Qdrant) via `CodeIndexManager`. | **v1 defer** | Locus has `locus index-codebase` for semantic indexing. Surfacing in extension requires index API. Defer to v2. |
| **CLAUDE.md / memory files** | CLAUDE.md injected at start of every conversation. Three scopes: user, project, enterprise. | System prompt includes mode config and custom instructions. | **v1 defer** | Locus has `.locus/documents/` knowledge base. Auto-injecting project docs into prompts requires KB discovery logic. Defer to v2. |

**Sources:**
- Claude Code: [VS Code Docs — context](https://code.claude.com/docs/en/vs-code) (2026-02-14)
- Claude Code: [Context Buffer Management](https://claudefa.st/blog/guide/mechanics/context-buffer-management) (2025-11)
- Kilo Code: [Architecture — Context Management](https://deepwiki.com/Kilo-Org/kilocode/3.8-context-management-and-condensation) (2026-02-14)

---

## 5. Onboarding & Authentication

| Capability | Claude Code | Kilo Code | Locus v1 Decision | Rationale |
|-----------|-------------|-----------|-------------------|-----------|
| **First-launch experience** | "Learn Claude Code" checklist with clickable items. Guided walkthrough via Command Palette. | Checks `firstInstallCompleted` flag. Opens sidebar, shows 5-step walkthrough, enables Ghost autocomplete. | **v1 include** | Show welcome state in chat panel on first open. Minimum: brief intro text, "Connect" action if unauthenticated, prompt to type first message. No complex walkthrough for v1. |
| **OAuth authentication** | Browser-based Anthropic OAuth flow. Known issues in remote dev environments. | Google OAuth via `DeviceAuthService`. `AuthView` renders auth flow. | **out of scope** | Locus uses API key auth, not OAuth. Extension reuses CLI's API key from `.locus/settings.json` or prompts for manual entry in webview. |
| **API key entry** | Not primary flow (OAuth is default). Supported via settings for third-party providers. | BYOK flow for 30+ providers. Keys stored in `SecretStorage`. | **v1 include** | Primary auth flow. User enters API URL + API key in webview. Stored in VSCode `SecretStorage`. Written to CLI-compatible config for subprocess. |
| **Auth state indicator** | Implicit — panel shows prompt if authenticated, error if not. | Profile indicator showing connected provider. | **v1 include** | Chat panel header shows connection status: connected (green), disconnected (red), or no config (neutral). |
| **Secret storage** | OAuth tokens managed by Anthropic. API keys in `~/.claude/settings.json`. | `vscode.SecretStorage` for API keys. `globalState` for non-sensitive config. | **v1 include** | API keys in `SecretStorage`. API URL and preferences in `contributes.configuration` (VSCode Settings). |
| **CLI identity reuse** | Extension bundles CLI; shares auth. | Separate persistence; no shared auth. | **v1 include** | On activation, check `.locus/settings.json` for existing API key. If found, skip manual entry. User can override in extension settings. |
| **Multi-provider profiles** | Single provider (Anthropic) with model switching. | `ProviderSettingsManager` with CRUD for multiple profiles. Cloud sync. | **v1 defer** | v1 supports one API endpoint config. Multi-profile adds UX complexity. Defer to v2. |

**Sources:**
- Claude Code: [VS Code Docs — authentication](https://code.claude.com/docs/en/vs-code) (2026-02-14)
- Claude Code: [GitHub #12040 — OAuth not supported](https://github.com/anthropics/claude-code/issues/12040) (2025-08)
- Kilo Code: [Setup & Authentication](https://kilo.ai/docs/getting-started/setup-authentication) (2026-02-14)
- Kilo Code: [BYOK Docs](https://kilo.ai/docs/getting-started/byok) (2026-02-14)

---

## 6. Error Handling & Recovery

| Capability | Claude Code | Kilo Code | Locus v1 Decision | Rationale |
|-----------|-------------|-----------|-------------------|-----------|
| **Checkpoint/rewind system** | File-state checkpoints independent of git. Tracks Write/Edit/NotebookEdit. 5 rewind options via `/rewind` or `Esc+Esc`. | Shadow git repository. Captures file changes. "Restore Files Only" or "Restore Files & Task". | **v1 defer** | Checkpoint/rewind requires file-state tracking infrastructure. Locus exec sessions are typically short. Defer to v2. |
| **Process crash recovery** | Extension enters unresponsive state on CLI exit code 1. Race conditions reported. Recovery requires restart. | Retry mechanisms, fallback options, state restoration. | **v1 include** | CLI Bridge must detect process exit, transition to FAILED/INTERRUPTED, emit structured error. No unresponsive states. "Retry" button in webview. |
| **Context window management** | Auto-compaction at ~83.5% of 200K window. `/compact` command. "Summarize from here." | Auto-condensation with retry/fallback. Can fail gracefully. | **v1 defer** | Context management is handled by the AI provider via CLI/SDK. Extension doesn't manage context windows directly. If CLI emits context error, show in webview. |
| **Structured error display** | Errors shown inline in chat. Limited structured format. | Error events with retry mechanisms. | **v1 include** | Every failure path emits `{ type: "error", code, message }` to webview. Error cards render with message, cause, and available actions (Retry, New Session). |
| **Partial output preservation** | Rewind preserves partial conversation. | Checkpoint preserves partial task state. | **v1 include** | On failure/cancel, persist partial timeline. User sees everything up to the failure point. |
| **Webview disposal recovery** | Not explicitly documented. Likely re-creates webview. | Webview is stateless; host holds state. Re-creation replays from host. | **v1 include** | Host persists timeline. Webview disposal doesn't lose state. Re-open replays from persisted snapshot. Critical for sidebar panel lifecycle. |
| **Graceful degradation** | CLI unavailable → extension non-functional. | Fallback models, retry with different providers. | **v1 include** | CLI unavailable → show actionable error: "Locus CLI not found" with install instructions. Never crash the extension. |

**Sources:**
- Claude Code: [Checkpointing Docs](https://code.claude.com/docs/en/checkpointing) (2026-02-14)
- Claude Code: [GitHub #22181 — crash analysis](https://github.com/anthropics/claude-code/issues/22181) (2025-12)
- Kilo Code: [Checkpoints Docs](https://kilo.ai/docs/features/checkpoints) (2026-02-14)
- Kilo Code: [GitHub #3190 — restore error](https://github.com/Kilo-Org/kilocode/issues/3190) (2025-12)

---

## Summary: V1 Scope at a Glance

### V1 Include (Must Ship)

| # | Capability | Sprint Task |
|---|-----------|-------------|
| 1 | Webview chat panel with composer and timeline | Task 10 |
| 2 | Streaming text output via CLI→NDJSON→webview | Tasks 6, 7, 9 |
| 3 | Tool use display (cards in timeline) | Task 10 |
| 4 | Session persistence across reload | Task 8 |
| 5 | Resume interrupted sessions | Tasks 8, 9 |
| 6 | Timeline replay on webview re-open | Task 9 |
| 7 | Session history list | Task 8 |
| 8 | Command palette commands (Open, Exec, Explain, Resume) | Task 11 |
| 9 | Context menu "Explain Selection" | Task 11 |
| 10 | Keyboard shortcuts | Task 11 |
| 11 | Active file and selection context | Task 11 |
| 12 | Workspace root context | Task 11 |
| 13 | First-launch welcome state | Task 11 |
| 14 | API key entry in webview | Task 11 |
| 15 | Auth state indicator | Task 10 |
| 16 | SecretStorage for credentials | Task 11 |
| 17 | CLI identity reuse | Task 11 |
| 18 | Process crash recovery (FAILED state + retry) | Tasks 7, 9 |
| 19 | Structured error display | Tasks 9, 10 |
| 20 | Partial output preservation | Task 8 |
| 21 | Webview disposal recovery | Task 9 |
| 22 | Graceful CLI-not-found handling | Task 7 |

### V1 Defer (Scheduled for V2+)

| # | Capability | Reason for Deferral |
|---|-----------|-------------------|
| 1 | Tool approval/interactive permissions | Requires bidirectional CLI protocol extension |
| 2 | Operational modes (Architect, Debug, Ask) | Single exec mode sufficient for v1 |
| 3 | Cross-device session sync | Requires new API endpoints |
| 4 | CLI↔extension session sharing | Different persistence formats |
| 5 | Slash commands in composer | Requires routing logic and CLI protocol |
| 6 | Skills/custom commands | Requires SKILL.md discovery and parsing |
| 7 | @-mention file/folder picker | Complex webview component |
| 8 | Drag-and-drop file context | Webview drag event handling |
| 9 | Semantic code search integration | Requires index API surface |
| 10 | Knowledge base auto-injection | Requires KB discovery logic |
| 11 | Multi-provider profiles | UX complexity |
| 12 | Checkpoint/rewind system | File-state tracking infrastructure |
| 13 | Context window management | Handled by CLI/SDK internally |

### Out of Scope

| # | Capability | Reason |
|---|-----------|--------|
| 1 | Multi-model provider marketplace | Locus uses SDK AI runners; not extension concern |
| 2 | Subtask/recursive execution | Locus orchestrates at sprint level |
| 3 | Terminal output context (`@terminal`) | Violates non-terminal UX contract |
| 4 | Browser context (`@browser`) | Not relevant to exec workflow |
| 5 | OAuth authentication flow | Locus uses API key auth |

---

## Non-Terminal UX Contract Reference

All v1 scope decisions are evaluated against the [Non-Terminal UX Contract](../architecture/vscode-extension.md#10-non-terminal-ux-contract) defined in the architecture document. Capabilities that would require terminal interaction (e.g., `@terminal` context, interactive CLI prompts) are either marked "out of scope" or deferred until a non-terminal implementation path exists.

The ship threshold explicitly requires: **"Zero primary workflows open the integrated terminal."**

---

## Downstream Implementation Mapping

Each "v1 include" decision maps to a specific sprint task. The mapping ensures no capability is included without an implementation owner:

```
v1 include capabilities → Sprint Tasks
├── Chat execution (1-3)        → Tasks 6 (CLI stream), 7 (CLI bridge), 9 (protocol), 10 (UI)
├── Resume/reconnect (4-7)      → Tasks 8 (session manager), 9 (protocol wiring)
├── Commands (8-10)             → Task 11 (commands/context/auth)
├── Context injection (11-12)   → Task 11 (context providers)
├── Onboarding/auth (13-17)     → Task 11 (auth guardrails)
├── Error handling (18-22)      → Tasks 7 (bridge), 8 (persistence), 9 (protocol), 10 (UI)
└── Quality gates               → Task 12 (QA, CI, release)
```

Any "v1 include" item that cannot be completed within its assigned task blocks the release.

---

*This document is a planning artifact. It contains no runtime code. Benchmarks were conducted on 2026-02-14 against publicly available documentation and GitHub issues.*
