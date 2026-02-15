# VSCode Chat UI — Design Specification

**Version:** 0.11.3
**Status:** Implementation Contract
**Date:** 2026-02-14
**Boundary:** Webview presentation layer only. No extension runtime code. No global brand redesign.

---

## 1. Overview

This document defines the component inventory, interaction rules, state mappings, and accessibility requirements for the Locus VSCode extension chat webview. The webview is a **stateless renderer** — it receives host events via `postMessage` and dispatches UI intents back to the extension host. All state authority lives in the host.

The visual language reuses semantic intent from `apps/web` (dark dashboard) and `apps/www` (marketing site), adapted to VSCode's constrained webview environment.

---

## 2. Component Inventory

### 2.1 Layout Structure

```
┌─────────────────────────────────────────┐
│  Session Header                         │
├─────────────────────────────────────────┤
│                                         │
│  Timeline                               │
│  ┌─────────────────────────────────┐    │
│  │ User Message Card               │    │
│  │ Assistant Message Card          │    │
│  │   └─ Tool Card (collapsed)     │    │
│  │   └─ Tool Card (expanded)      │    │
│  │ Status Event Card               │    │
│  │ System Message Card             │    │
│  │ Error Card                      │    │
│  └─────────────────────────────────┘    │
│                                         │
├─────────────────────────────────────────┤
│  Status Rail                            │
├─────────────────────────────────────────┤
│  Composer                               │
└─────────────────────────────────────────┘
```

The layout is a single-column vertical stack. The timeline is the scrollable region; the session header, status rail, and composer are fixed.

### 2.2 Session Header

Displays session identity and lifecycle controls.

| Element | Description |
|---------|-------------|
| Session title | Model name + truncated session ID (e.g., "Claude · abc1234") |
| Session status badge | Visual indicator of current session state (see §3) |
| Stop button | Visible in `running` / `streaming` states. Dispatches `stop_session` intent |
| New session button | Visible in terminal states (`completed`, `failed`, `canceled`). Dispatches `submit_prompt` with fresh context |
| Session picker | Dropdown to switch between persisted sessions. Dispatches `request_session_detail` |

**Layout:** Horizontal flex row, vertically centered. Title left-aligned, controls right-aligned. Height: `spacing.headerHeight` (40px).

### 2.3 Timeline

A vertically-ordered list of timeline entries. Each entry maps to one or more host events. The timeline auto-scrolls to the latest entry during `streaming` state; scrolling is paused when the user scrolls up (stick-to-bottom pattern).

**Timeline entry types:**

| Entry Type | Source Events | Description |
|------------|---------------|-------------|
| User Message | `submit_prompt` (intent) | The user's prompt text |
| Assistant Message | `text_delta` (accumulated), `response_completed` | Streamed AI response rendered as markdown |
| Tool Card | `tool_started` → `tool_completed` / `tool_failed` | Tool invocation with collapsible detail |
| Thinking Indicator | `thinking` | Ephemeral thinking state shown inline |
| Status Event | `session_state` | Session lifecycle transitions (start, resume) |
| System Message | — | System-originated messages (context injection, warnings) |
| Error Card | `error` | Structured error with optional retry action |

### 2.4 User Message Card

Displays the submitted prompt text.

| Element | Token Reference |
|---------|----------------|
| Container | `color.surface.userMessage`, `radius.card`, `spacing.cardPadding` |
| Avatar | User icon, `color.accent.user` background |
| Text | `typography.body`, `color.text.primary` |
| Timestamp | `typography.caption`, `color.text.tertiary` |

### 2.5 Assistant Message Card

Displays streamed AI response. Content is rendered as CommonMark markdown with syntax-highlighted code blocks.

| Element | Token Reference |
|---------|----------------|
| Container | `color.surface.assistantMessage`, `radius.card`, `spacing.cardPadding` |
| Avatar | Locus icon, `color.accent.assistant` background |
| Markdown body | `typography.body`, `color.text.primary` |
| Code blocks | `typography.code`, `color.surface.codeBlock`, `radius.sm` |
| Inline code | `typography.codeInline`, `color.surface.codeInline` |
| Streaming cursor | Blinking `color.accent.assistant` bar at end of streaming text |
| Timestamp | `typography.caption`, `color.text.tertiary` |

### 2.6 Tool Card

Displays tool invocation lifecycle. Default state is **collapsed** (single-line summary). Expands to show parameters and result on click.

| Element | Token Reference |
|---------|----------------|
| Container | `color.surface.toolCard`, `radius.card`, `spacing.cardPaddingSm` |
| Tool icon | Per-tool icon (Read, Write, Edit, Bash, Grep, Glob, WebFetch) |
| Tool name | `typography.label`, `color.text.secondary` |
| Summary line (collapsed) | `typography.bodySm`, `color.text.secondary`. Shows tool name + key parameter (e.g., "Read — src/index.ts") |
| Status indicator | Spinner (`running`), checkmark (`completed`), × (`failed`) with semantic colors |
| Duration badge | `typography.caption`, `color.text.tertiary`. Only shown when `completed` |
| Parameters (expanded) | `typography.code`, truncated with "show more" toggle |
| Result (expanded) | `typography.code`, truncated with "show more" toggle |
| Error (expanded, failed) | `typography.bodySm`, `color.state.failed.text` |

**Tool-specific summary formats:**

| Tool | Collapsed Summary |
|------|-------------------|
| Read | `Read — {file_path}` |
| Write | `Write — {file_path}` |
| Edit | `Edit — {file_path}` |
| Bash | `Bash — {description \|\| truncate(command, 40)}` |
| Grep | `Grep — {pattern} in {path \|\| "."}` |
| Glob | `Glob — {pattern}` |
| WebFetch | `Fetch — {truncate(url, 40)}` |

### 2.7 Thinking Indicator

An ephemeral inline element shown while the AI is reasoning. Disappears when the next `text_delta` or `tool_started` event arrives.

| Element | Token Reference |
|---------|----------------|
| Container | No background, inline in timeline |
| Animation | Three-dot pulse animation, `color.accent.assistant` |
| Label | `typography.caption`, `color.text.tertiary`, text: "Thinking..." |

### 2.8 Status Event Card

Lightweight, non-interactive card for session lifecycle transitions.

| Element | Token Reference |
|---------|----------------|
| Container | No background, horizontal rule above and below |
| Icon | Session icon, `color.text.tertiary` |
| Text | `typography.caption`, `color.text.tertiary` (e.g., "Session started", "Session resumed") |
| Timestamp | `typography.caption`, `color.text.tertiary` |

### 2.9 System Message Card

For system-originated content such as context injection notices or rate-limit warnings.

| Element | Token Reference |
|---------|----------------|
| Container | `color.surface.systemMessage`, dashed `color.border.subtle` border, `radius.card` |
| Icon | Info icon, `color.accent.system` |
| Text | `typography.bodySm`, `color.text.secondary` |

### 2.10 Error Card

Structured error display with optional recovery action.

| Element | Token Reference |
|---------|----------------|
| Container | `color.surface.error`, `color.border.error` border, `radius.card` |
| Icon | Alert icon, `color.state.failed.text` |
| Title | `typography.bodyBold`, `color.state.failed.text` |
| Message | `typography.bodySm`, `color.text.secondary` |
| Retry button | `color.accent.assistant` background, `color.text.onAccent` text |
| Code (optional) | `typography.caption`, `color.text.tertiary` |

### 2.11 Composer

Text input for submitting prompts. Fixed to the bottom of the webview.

| Element | Token Reference |
|---------|----------------|
| Container | `color.surface.composer`, `color.border.default` top border |
| Textarea | `typography.body`, `color.text.primary`, `color.surface.input` background, `radius.md` |
| Placeholder | `typography.body`, `color.text.tertiary`, text: "Ask Locus..." |
| Submit button | `color.accent.assistant` background, send icon, `color.text.onAccent` |
| Context badge | `typography.caption`, `color.surface.badge` background. Shows attached context (file name, selection) |
| Character count | `typography.caption`, `color.text.tertiary`. Visible when > 80% of limit |
| Stop button (streaming) | Replaces submit button during `streaming`. `color.state.canceled.surface` background, stop icon |

**Behavior:**
- `Enter` submits; `Shift+Enter` inserts newline.
- Textarea auto-grows up to 6 lines, then scrolls internally.
- Disabled (with visual indication) during `starting` state.
- Submit button shows loading spinner during `starting`.

### 2.12 Status Rail

A thin strip between the timeline and composer showing real-time session metadata.

| Element | Token Reference |
|---------|----------------|
| Container | `color.surface.default`, `color.border.subtle` top/bottom borders. Height: `spacing.statusRailHeight` (24px) |
| State label | `typography.caption`, state-specific color (see §3 state color mapping) |
| Model indicator | `typography.caption`, `color.text.tertiary` |
| Duration | `typography.caption`, `color.text.tertiary`. Running timer during active states |
| Tool count | `typography.caption`, `color.text.tertiary`. e.g., "3 tools used" |

### 2.13 Empty State

Shown when no session exists (first launch or after clearing all sessions).

| Element | Token Reference |
|---------|----------------|
| Container | Centered in timeline area, vertical flex column |
| Icon | Locus logo, `color.text.tertiary`, 48px |
| Headline | `typography.h5`, `color.text.primary`, text: "Start a conversation" |
| Body | `typography.body`, `color.text.secondary`, text: "Ask Locus to explain, write, or refactor code in your workspace." |
| Quick actions | 2–3 suggestion chips with `color.surface.badge` background, `typography.bodySm` |

### 2.14 Retry State

Shown after a failed session with recovery options.

| Element | Token Reference |
|---------|----------------|
| Container | Inline in timeline after error card |
| Retry button | Primary button style. Text: "Retry" |
| New session button | Ghost button style. Text: "Start new session" |

---

## 3. Session States & UI Mapping

### 3.1 Session State Definitions

States are defined by the extension host session state machine (see `docs/architecture/vscode-extension.md` §4).

| State | UI Label | Description |
|-------|----------|-------------|
| `idle` | — | No active session. Show empty state or last completed session |
| `starting` | "Starting..." | CLI process spawning. Composer disabled |
| `running` | "Running" | CLI spawned, awaiting first output |
| `streaming` | "Streaming" | Active text/tool output. Auto-scroll enabled |
| `completed` | "Completed" | Session finished successfully |
| `failed` | "Failed" | Session encountered an error |
| `canceled` | "Canceled" | User stopped the session |
| `interrupted` | "Interrupted" | Process lost (VSCode reload). Resume available |
| `resuming` | "Resuming..." | Resuming an interrupted session |

### 3.2 State → UI Behavior Matrix

| State | Composer | Submit Btn | Stop Btn | Header Badge | Status Rail | Auto-scroll | Timeline |
|-------|----------|------------|----------|--------------|-------------|-------------|----------|
| `idle` | Enabled | Submit icon | Hidden | Hidden | Hidden | — | Empty state or history |
| `starting` | Disabled | Spinner | Hidden | Pulsing | "Starting..." | — | User message appended |
| `running` | Disabled | Spinner | Visible | Pulsing | "Running" | Yes | Thinking indicator |
| `streaming` | Disabled | Hidden | Visible (Stop) | Active dot | "Streaming" | Yes (unless user scrolled) | Live content |
| `completed` | Enabled | Submit icon | Hidden | Static green | "Completed" | No | Full timeline |
| `failed` | Enabled | Submit icon | Hidden | Static red | "Failed" | No | Timeline + error card |
| `canceled` | Enabled | Submit icon | Hidden | Static yellow | "Canceled" | No | Timeline (partial) |
| `interrupted` | Enabled (Resume) | Resume icon | Hidden | Static orange | "Interrupted" | No | Persisted timeline |
| `resuming` | Disabled | Spinner | Hidden | Pulsing | "Resuming..." | Yes | Persisted + new events |

### 3.3 State Color Mapping

Each session state maps to a semantic color for badges, rail labels, and indicators.

| State | Color Token | Hex (dark) | Usage |
|-------|-------------|------------|-------|
| `idle` | `color.state.idle` | `#a1a1aa` | Muted, neutral |
| `starting` | `color.state.starting` | `#38bdf8` | Blue, activity |
| `running` | `color.state.running` | `#38bdf8` | Blue, activity |
| `streaming` | `color.state.streaming` | `#22d3ee` | Cyan, active output |
| `completed` | `color.state.completed` | `#10b981` | Green, success |
| `failed` | `color.state.failed` | `#ef4444` | Red, error |
| `canceled` | `color.state.canceled` | `#f59e0b` | Amber, user-initiated |
| `interrupted` | `color.state.interrupted` | `#f97316` | Orange, attention |
| `resuming` | `color.state.resuming` | `#38bdf8` | Blue, activity |

---

## 4. Host Event → UI State Mapping

### 4.1 ExecEventType → Timeline Action

This table maps each `ExecEventType` (from `packages/sdk/src/exec/events.ts`) to the UI timeline action it triggers.

| Host Event | ExecEventType | UI Action | Timeline Entry | State Transition |
|------------|---------------|-----------|----------------|------------------|
| Session started | `session:started` | Show session header, start rail timer | Status event: "Session started" | `starting` → `running` |
| Prompt submitted | `prompt:submitted` | Append user message card | User Message Card | — |
| Thinking started | `thinking:started` | Show thinking indicator | Thinking Indicator (ephemeral) | — |
| Thinking stopped | `thinking:stopped` | Remove thinking indicator | — | — |
| Tool started | `tool:started` | Append tool card (collapsed, spinning) | Tool Card (status: running) | — |
| Tool completed | `tool:completed` | Update tool card: checkmark, duration | Tool Card (status: completed) | — |
| Tool failed | `tool:failed` | Update tool card: error icon, error text | Tool Card (status: failed) | — |
| Text delta | `text:delta` | Append text to current assistant message | Assistant Message Card (streaming) | `running` → `streaming` (on first delta) |
| Response completed | `response:completed` | Finalize assistant message, remove cursor | Assistant Message Card (final) | — |
| Error occurred | `error:occurred` | Append error card | Error Card | → `failed` |
| Session ended | `session:ended` | Update header badge, enable composer | Status event: "Session ended" | → `completed` or `failed` |

### 4.2 Host Protocol Events → Timeline Action

This table maps host↔webview protocol event types (from `docs/architecture/vscode-extension.md` §6) to UI behavior.

| Protocol Event Type | Direction | UI Action |
|---------------------|-----------|-----------|
| `session_state` | Host → Webview | Full state reconciliation. Replace or merge timeline, update all UI regions |
| `text_delta` | Host → Webview | Append text chunk to active assistant message card |
| `tool_started` | Host → Webview | Insert new tool card in running state |
| `tool_completed` | Host → Webview | Update existing tool card to completed state |
| `thinking` | Host → Webview | Show/update thinking indicator |
| `error` | Host → Webview | Insert error card, transition state |
| `session_list` | Host → Webview | Populate session picker dropdown |
| `session_completed` | Host → Webview | Transition to completed state, show summary |

### 4.3 UI Intent → Host Action

| UI Intent | Trigger | Host Response |
|-----------|---------|---------------|
| `submit_prompt` | User presses Enter or clicks Submit | Host creates or continues session, spawns CLI |
| `stop_session` | User clicks Stop button | Host sends SIGTERM to CLI process |
| `resume_session` | User clicks Resume button | Host respawns CLI with `--continue` flag |
| `request_sessions` | Session picker opened | Host reads persisted sessions, sends `session_list` |
| `request_session_detail` | User selects a session from picker | Host sends full `session_state` for that session |
| `clear_session` | User deletes a session | Host removes session from persistence |

### 4.4 Stream Chunk → UI Mapping

This table maps `StreamChunk` types (from `packages/sdk/src/exec/types.ts`) to their webview rendering.

| Stream Chunk Type | Webview Rendering |
|-------------------|-------------------|
| `text_delta` | Append to assistant message card body |
| `tool_use` | Create new tool card (collapsed) with tool name and parameters |
| `tool_result` | Update tool card with result, mark completed/failed |
| `tool_parameters` | Update tool card with parsed parameters |
| `thinking` | Show/update thinking indicator |
| `result` | Finalize assistant message card |
| `error` | Create error card |

---

## 5. Interaction & Behavior Rules

### 5.1 Stick-to-Bottom Scrolling

- During `streaming`, the timeline auto-scrolls to keep the latest content visible.
- If the user manually scrolls upward (> 20px from bottom), auto-scroll pauses and a "Jump to latest" FAB appears at the bottom-right of the timeline.
- Clicking the FAB or submitting a new prompt re-enables auto-scroll.
- On state transition to `completed`/`failed`/`canceled`, auto-scroll stops.

### 5.2 Tool Card Expand/Collapse

- Tool cards default to **collapsed** (single-line summary).
- Click anywhere on the collapsed card to expand.
- Click the header area of an expanded card to collapse.
- Keyboard: `Enter` or `Space` toggles expand/collapse when focused.
- Multiple tool cards may be expanded simultaneously.
- Expand/collapse uses `motion.expand` transition (150ms ease-out).

### 5.3 Composer Behavior

- **Submit:** `Enter` sends the prompt. `Shift+Enter` inserts a newline.
- **Auto-grow:** Textarea grows from 1 line to a maximum of 6 lines. After 6 lines, internal scrolling activates.
- **Disabled states:** During `starting`, `running`, `streaming`, and `resuming`, the composer input is disabled and visually dimmed (`color.text.disabled`).
- **Context badge:** When a file or selection is attached via the `Explain Selection` command, a dismissible badge appears above the textarea.
- **History:** Up/Down arrows cycle through previous prompts when the textarea is empty.

### 5.4 Session Switching

- The session picker in the header shows the 10 most recent sessions.
- Each session shows: truncated ID, status badge, timestamp.
- Selecting a session dispatches `request_session_detail` and replaces the timeline.
- The current active session is highlighted in the picker.
- Sessions in terminal states (`completed`, `failed`, `canceled`) can be deleted via a context menu.

### 5.5 Error Recovery

- Error cards include a "Retry" button that dispatches a new `submit_prompt` with the last prompt text.
- For auth errors, the "Retry" button is replaced with "Reconnect" which opens the auth flow.
- For CLI-not-found errors, the error card includes an install link.
- For context-limit errors, the card suggests starting a new session.

### 5.6 Streaming Text Rendering

- Text deltas are buffered on a 16ms (single frame) interval to prevent excessive re-renders.
- Markdown is parsed incrementally. Partial markdown (e.g., an unclosed code fence) renders as plain text until the fence closes.
- Code blocks use syntax highlighting with the `shiki` library (already a project dependency in `apps/www`).
- Long code blocks (> 20 lines) are collapsed with a "Show more" toggle.

---

## 6. Keyboard Navigation & Focus Order

### 6.1 Focus Order (Tab)

The focus order follows the visual layout top-to-bottom:

```
1. Session Header
   1a. Session picker (dropdown trigger)
   1b. Stop / New session button
2. Timeline (container receives focus)
   2a. Individual timeline entries (tool cards are focusable)
3. Status Rail (not focusable — display only)
4. Composer
   4a. Context badge dismiss button (if present)
   4b. Textarea
   4c. Submit / Stop button
```

### 6.2 Timeline Navigation

- `Tab` moves focus into the timeline container, then to the first focusable tool card.
- `Arrow Down` / `Arrow Up` moves between timeline entries (tool cards and error cards).
- `Enter` / `Space` toggles tool card expand/collapse.
- `Escape` collapses an expanded tool card and returns focus to the timeline container.
- `Home` / `End` jumps to the first / last timeline entry.

### 6.3 Composer Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Submit prompt |
| `Shift+Enter` | Insert newline |
| `Up` (empty textarea) | Load previous prompt from history |
| `Down` (empty textarea) | Load next prompt from history |
| `Escape` | Clear textarea / blur composer |
| `Ctrl+L` / `Cmd+L` | Clear session (with confirmation) |

### 6.4 Global Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+Shift+L` / `Cmd+Shift+L` | Focus Locus chat panel (VSCode keybinding) |
| `Escape` | Stop current session (when chat panel is focused and session is active) |

---

## 7. Accessibility Requirements

### 7.1 WCAG 2.1 AA Compliance Targets

| Criterion | Requirement | Implementation |
|-----------|-------------|----------------|
| **1.1.1 Non-text Content** | All icons have text alternatives | `aria-label` on all icon-only buttons |
| **1.3.1 Info and Relationships** | Programmatic structure matches visual | Timeline uses `role="log"`, cards use `role="article"`, tool cards use `role="button"` with `aria-expanded` |
| **1.3.2 Meaningful Sequence** | Reading order matches visual order | DOM order follows visual layout (header → timeline → rail → composer) |
| **1.4.3 Contrast (Minimum)** | 4.5:1 for normal text, 3:1 for large text | All token colors verified against surface backgrounds |
| **1.4.11 Non-text Contrast** | 3:1 for UI components | State indicators, borders, and icons meet threshold |
| **2.1.1 Keyboard** | All interactive elements keyboard accessible | Full tab order + arrow key navigation (§6) |
| **2.1.2 No Keyboard Trap** | Focus can always be moved away | `Escape` always blurs current element |
| **2.4.3 Focus Order** | Logical focus sequence | Tab order follows §6.1 |
| **2.4.7 Focus Visible** | Visible focus indicator | 2px `color.focus.ring` outline with 2px offset |
| **3.2.1 On Focus** | No context change on focus | Focus never triggers navigation or submission |
| **4.1.2 Name, Role, Value** | All components have accessible names | ARIA attributes on all interactive elements |

### 7.2 ARIA Roles & Attributes

| Component | Role | ARIA Attributes |
|-----------|------|-----------------|
| Timeline container | `log` | `aria-label="Session timeline"`, `aria-live="polite"` |
| User message card | `article` | `aria-label="Your message"` |
| Assistant message card | `article` | `aria-label="Locus response"` |
| Tool card (collapsed) | `button` | `aria-expanded="false"`, `aria-label="{tool} — {summary}"` |
| Tool card (expanded) | `region` | `aria-expanded="true"`, `aria-label="{tool} details"` |
| Error card | `alert` | `aria-live="assertive"` |
| Status rail | `status` | `aria-label="Session status"`, `aria-live="polite"` |
| Composer textarea | — | `aria-label="Message input"`, `aria-placeholder="Ask Locus..."` |
| Submit button | `button` | `aria-label="Send message"` or `aria-label="Stop session"` |
| Session picker | `listbox` | `aria-label="Switch session"` |
| Thinking indicator | `status` | `aria-label="Locus is thinking"`, `aria-live="polite"` |
| Streaming cursor | `presentation` | Hidden from screen readers |

### 7.3 Live Regions

- **Timeline:** `aria-live="polite"` — new messages announced after current speech completes.
- **Error card:** `aria-live="assertive"` — errors interrupt current speech.
- **Status rail:** `aria-live="polite"` — state changes announced passively.
- **Thinking indicator:** `aria-live="polite"` — announced once, not repeated.

### 7.4 Contrast Requirements

All text/surface combinations must meet WCAG 2.1 AA contrast ratios. The token file (see `vscode-tokens.json`) defines colors that satisfy:

| Text Level | Minimum Ratio | Token Pairs |
|------------|---------------|-------------|
| Body text | 4.5:1 | `color.text.primary` on `color.surface.default` |
| Secondary text | 4.5:1 | `color.text.secondary` on `color.surface.default` |
| Tertiary text | 4.5:1 | `color.text.tertiary` on `color.surface.default` |
| Large text (≥18px bold) | 3:1 | `color.text.primary` on any surface |
| UI components | 3:1 | State colors on their surface variants |

### 7.5 Reduced Motion

- When `prefers-reduced-motion: reduce` is active:
  - Thinking indicator shows static "Thinking..." text instead of animation.
  - Tool card expand/collapse is instant (no transition).
  - Streaming cursor is static (no blink).
  - "Jump to latest" FAB appears without transition.
- Motion tokens provide reduced-motion fallbacks (see `vscode-tokens.json`).

---

## 8. Visual Language — Semantic Intent

The webview does **not** copy raw CSS values from `apps/web` or `apps/www`. Instead, it reuses the **semantic intent** of the existing design system, adapted for VSCode's webview constraints.

### 8.1 Color Intent

| Semantic Role | Source (apps/web) | Source (apps/www) | Webview Intent |
|---------------|-------------------|-------------------|----------------|
| Background | `--background: #09090b` | `--background: #030305` | Defer to VSCode theme `--vscode-editor-background`. Surfaces layer above it |
| Surface (cards) | `--card: #09090b` | `--card: #060609` | Slightly elevated from VSCode bg. Use `--vscode-editorWidget-background` as base |
| Primary text | `--foreground: #fafafa` | `--foreground: #ededf0` | `--vscode-editor-foreground` for automatic theme adaptation |
| Secondary text | `foreground/70` | `--muted-foreground: #c8c8d4` | `--vscode-descriptionForeground` |
| Borders | `--border: #27272a` | `--border: #141425` | `--vscode-editorWidget-border` or `--vscode-panel-border` |
| Accent (brand) | `--primary: #fafafa` | `--cyan: #22d3ee` | Cyan `#22d3ee` for assistant identity. Adapts well in both light and dark themes |
| Success | `--status-done: #10b981` | `--emerald: #34d399` | `#10b981` — consistent with web dashboard |
| Warning | `--status-progress: #f59e0b` | `--amber: #fbbf24` | `#f59e0b` — consistent with web dashboard |
| Error | `--destructive: #7f1d1d` (bg) / `#ef4444` (text) | `--rose: #fb7185` | `#ef4444` text on subtle red surface |

### 8.2 Typography Intent

| Role | Source (apps/web) | Webview Intent |
|------|-------------------|----------------|
| Body | `text-sm` (14px), `font-normal`, `leading-relaxed` | `--vscode-font-size` (typically 13px), `--vscode-font-family` |
| Code | `font-mono`, `text-sm` | `--vscode-editor-font-family`, `--vscode-editor-font-size` |
| Labels | `text-[10px]`, `font-bold`, `uppercase`, `tracking-widest` | 10px, bold, uppercase — inherited pattern |
| Captions | `text-xs` (12px), `font-medium`, `foreground/65` | 11px, medium weight, secondary color |
| Card titles | `text-base` (16px), `font-semibold` | 13px, semibold — scaled for sidebar density |

### 8.3 Spacing Intent

| Role | Source (apps/web) | Webview Intent |
|------|-------------------|----------------|
| Card padding | `p-4` (16px) | 12px — tighter for sidebar width |
| Card gap | `gap-3` (12px) | 8px — denser timeline |
| Section gap | `gap-6` (24px) | 16px |
| Component internal | `gap-2` (8px) | 6px |
| Border radius | `rounded-lg` (8px) | 6px — slightly smaller for density |

### 8.4 Message Kind Styling

Each message kind has a distinct visual identity via subtle surface color differentiation.

| Message Kind | Surface | Accent | Icon |
|--------------|---------|--------|------|
| `user` | Slightly elevated, warm tint | `#fafafa` (neutral) | User avatar |
| `assistant` | Default surface | `#22d3ee` (cyan) | Locus icon |
| `system` | Dashed border, no fill | `#a1a1aa` (muted) | Info icon |
| `tool` | Slightly recessed | Tool-specific | Tool icon |
| `status` | Transparent, horizontal rules | `#a1a1aa` (muted) | Session icon |

---

## 9. Motion & Animation

| Token | Default | Reduced Motion |
|-------|---------|----------------|
| `motion.expand` | `150ms ease-out` | `0ms` |
| `motion.fade` | `200ms ease-in-out` | `0ms` |
| `motion.thinkingPulse` | `1.4s ease-in-out infinite` | `none` (static text) |
| `motion.streamingCursor` | `1s steps(2) infinite` | `none` (static bar) |
| `motion.scrollSmooth` | `smooth` | `auto` |
| `motion.fabEntrance` | `200ms ease-out` | `0ms` |

---

## 10. VSCode Theme Integration

The webview must adapt to VSCode's active color theme (light, dark, high contrast). Semantic tokens in `vscode-tokens.json` reference `--vscode-*` CSS variables where possible, with Locus-specific overrides for brand consistency.

### 10.1 Theme Adaptation Strategy

| Layer | Strategy |
|-------|----------|
| Background | Inherit `--vscode-editor-background` or `--vscode-sideBar-background` |
| Surfaces | Layer above VSCode background using `color-mix()` or alpha transparency |
| Text | Use `--vscode-editor-foreground` / `--vscode-descriptionForeground` |
| Borders | Use `--vscode-panel-border` / `--vscode-editorWidget-border` |
| Brand accent | Fixed `#22d3ee` (cyan) — works on both light and dark |
| State colors | Fixed semantic palette (§3.3) — verified for both themes |
| Focus ring | Use `--vscode-focusBorder` |

### 10.2 High Contrast Support

In high contrast themes:
- All surface elevations collapse to `--vscode-editor-background` with 1px solid borders.
- Text uses only `--vscode-editor-foreground` (no opacity reduction).
- State colors are augmented with underlines or icon-only indicators for non-color differentiation.
- Focus ring uses 2px solid `--vscode-focusBorder`.

---

## 11. Responsive Behavior

The webview renders in VSCode's sidebar panel (default ~300px width) or editor area (flexible width).

| Width Range | Behavior |
|-------------|----------|
| < 280px | Composer textarea shrinks; session picker collapses to icon-only |
| 280–400px (sidebar) | Default layout. All components visible at compact density |
| 400–600px (narrow editor) | Cards get more horizontal padding. Code blocks show more content |
| > 600px (wide editor) | Max-width constraint (640px) centers content. Generous spacing |

---

## 12. File Cross-References

| File | Relevance |
|------|-----------|
| `docs/design/vscode-tokens.json` | Machine-readable tokens referenced throughout this spec |
| `docs/architecture/vscode-extension.md` | Session state machine, host↔webview protocol, module boundaries |
| `docs/product/vscode-parity-matrix.md` | Feature scope and parity decisions |
| `packages/sdk/src/exec/events.ts` | `ExecEventType` enum and event interfaces |
| `packages/sdk/src/exec/types.ts` | `StreamChunk` types and tool parameter shapes |
| `apps/web/src/app/globals.css` | Source design system (dark theme, status colors) |
| `apps/web/src/components/ui/constants.ts` | UI component variants, sizing, z-index scale |
| `apps/web/src/lib/typography.ts` | Typography system and readability standards |
| `apps/www/src/app/globals.css` | Marketing site palette (cyan accent, vibrant colors) |
