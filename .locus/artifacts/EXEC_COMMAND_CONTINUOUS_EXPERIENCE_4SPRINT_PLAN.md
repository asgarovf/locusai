# Locus Exec Command - Continuous CLI Experience - 4 Sprint Plan

**Project**: Locus CLI v0.7.3+
**Created**: 2026-02-01
**Sprint Duration**: 4 weeks (20 working days)
**Goal**: Transform `locus exec` from one-time input-output to a continuous, interactive CLI experience similar to Claude CLI

---

## Executive Summary

### Current Pain Points

1. **One-Time Execution**: `locus exec` is fire-and-forget - no continuous conversation
2. **No Streaming Output**: User sees nothing until entire AI response completes
3. **No Progress Indicators**: No visibility into what AI is doing (tool use, thinking, etc.)
4. **No History Management**: Each execution is isolated, no conversation context
5. **Poor User Experience**: Long wait times with no feedback feel unresponsive
6. **Limited Interactivity**: Cannot ask follow-up questions or iterate on results
7. **No Graceful Shutdown**: CTRL+C doesn't cleanly interrupt execution
8. **No Context Persistence**: Must re-provide project context every time

### Proposed Solution

Create a **continuous, streaming CLI experience** where:
- Users enter an interactive session with persistent conversation history
- Real-time streaming output shows AI responses as they're generated
- Progress indicators display tool usage and task status
- Graceful shutdown allows clean interruption
- Conversation history persists across sessions
- Multi-turn workflows enable iterative refinement
- Event-driven architecture provides rich feedback

### Success Metrics

| Metric | Current | Target | Impact |
|--------|---------|--------|--------|
| Time to First Output | N/A (all at once) | <500ms | New capability |
| User Perceived Responsiveness | Poor (blocking) | Excellent (streaming) | +200% satisfaction |
| Average Session Length | 1 interaction | 5+ interactions | +400% |
| Task Completion Rate | ~60% (single shot) | 85% (iterative) | +42% |
| Error Recovery Success | 0% (no retry) | 80% (conversational) | New capability |
| User Satisfaction (Exec) | 2.5/5 (assumed) | 4.5+/5.0 | +80% |
| Conversation Context Retention | 0 sessions | 30+ sessions | Infinite |
| Latency to First Token | N/A | <500ms | New |

---

## Sprint Overview

### Week 1: Streaming Foundation & Event System
**Theme**: "Real-Time Feedback"
**Goal**: Implement streaming output and event-driven progress updates

### Week 2: Interactive Session Management
**Theme**: "Continuous Conversation"
**Goal**: Add session persistence, history management, and multi-turn support

### Week 3: Progress Indicators & Tool Visibility
**Theme**: "Rich User Feedback"
**Goal**: Beautiful progress displays, tool execution visibility, status indicators

### Week 4: Polish, Error Handling & Migration
**Theme**: "Production-Ready Experience"
**Goal**: Graceful shutdown, error recovery, testing, documentation

---

## Detailed Week-by-Week Plan

## Week 1: Streaming Foundation & Event System

### Days 1-2: Implement Real-Time Streaming Output

**Goal**: Show AI responses as they're generated, not after completion

#### Current Architecture (Blocking)

```typescript
// packages/cli/src/cli.ts (current)
async function execCommand(args: string[]) {
  const prompt = parseArgs(args);
  const aiRunner = createAiRunner(provider);
  const result = await aiRunner.run(fullPrompt);  // ❌ Blocks until complete
  console.log(result);  // ❌ Shows everything at once
}
```

#### New Architecture (Streaming)

```typescript
// packages/cli/src/cli.ts (new)
async function execCommand(args: string[]) {
  const session = await ExecSession.create();
  const stream = session.executeStreaming(userPrompt);

  for await (const chunk of stream) {
    switch (chunk.type) {
      case 'text_delta':
        process.stdout.write(chunk.content);  // ✅ Real-time output
        break;
      case 'tool_use':
        displayToolIndicator(chunk.tool);      // ✅ Show tool usage
        break;
      case 'thinking':
        displayThinkingIndicator();            // ✅ Show AI is thinking
        break;
    }
  }
}
```

#### Implementation Details

**1. Create Streaming Executor**

```typescript
// packages/sdk/src/exec/streaming-executor.ts
export class StreamingExecutor {
  async *executeStreaming(
    prompt: string,
    context: ExecutionContext
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const runner = this.createRunner();

    // Leverage existing Claude runner's streaming capability
    if (runner instanceof ClaudeRunner) {
      yield* this.streamFromClaudeRunner(runner, prompt);
    } else if (runner instanceof CodexRunner) {
      yield* this.streamFromCodexRunner(runner, prompt);
    }
  }

  private async *streamFromClaudeRunner(
    runner: ClaudeRunner,
    prompt: string
  ): AsyncGenerator<StreamChunk, void, unknown> {
    // Claude runner already has streaming - expose it!
    const claude = spawn("claude", ["--output-format", "stream-json"], {...});

    claude.stdout.on("data", (data: Buffer) => {
      const lines = data.toString().split("\n");
      for (const line of lines) {
        const parsed = JSON.parse(line);

        if (parsed.type === "text_delta") {
          yield { type: "text_delta", content: parsed.content };
        } else if (parsed.type === "tool_use") {
          yield { type: "tool_use", tool: parsed.tool_name };
        }
      }
    });
  }
}
```

**2. Display Streamed Output**

```typescript
// packages/cli/src/display/stream-renderer.ts
export class StreamRenderer {
  private currentLine = "";

  renderChunk(chunk: StreamChunk): void {
    switch (chunk.type) {
      case "text_delta":
        process.stdout.write(chunk.content);
        this.currentLine += chunk.content;

        if (chunk.content.includes("\n")) {
          this.currentLine = "";
        }
        break;

      case "tool_use":
        // Show inline indicator
        process.stdout.write(c.gray(`\n[Using ${chunk.tool}...]\n`));
        break;

      case "thinking":
        // Show thinking indicator (animated)
        this.showThinkingSpinner();
        break;
    }
  }
}
```

**Tasks**:
- [ ] Create `StreamingExecutor` class in `packages/sdk/src/exec/`
- [ ] Extract streaming logic from `ClaudeRunner` and `CodexRunner`
- [ ] Create `StreamChunk` type definitions
- [ ] Implement `StreamRenderer` for CLI output
- [ ] Update `execCommand` to use streaming executor
- [ ] Add tests for streaming flow

**Files to Create**:
- `packages/sdk/src/exec/streaming-executor.ts`
- `packages/sdk/src/exec/types.ts` (stream types)
- `packages/cli/src/display/stream-renderer.ts`

**Files to Modify**:
- `packages/cli/src/cli.ts` (use streaming)
- `packages/sdk/src/ai/claude-runner.ts` (expose streaming)
- `packages/sdk/src/ai/codex-runner.ts` (expose streaming)

**Acceptance Criteria**:
- [ ] Text appears in real-time as AI generates it
- [ ] Tool usage shows inline indicators
- [ ] No blocking - output streams continuously
- [ ] Performance: First token < 500ms

---

### Days 3-4: Event System for Progress Tracking

**Goal**: Emit events during execution for rich progress feedback

#### Event Architecture

```typescript
// packages/sdk/src/exec/events.ts
export enum ExecEventType {
  SESSION_STARTED = "session:started",
  PROMPT_SUBMITTED = "prompt:submitted",
  THINKING_STARTED = "thinking:started",
  THINKING_STOPPED = "thinking:stopped",
  TOOL_STARTED = "tool:started",
  TOOL_COMPLETED = "tool:completed",
  TOOL_FAILED = "tool:failed",
  TEXT_DELTA = "text:delta",
  RESPONSE_COMPLETED = "response:completed",
  ERROR_OCCURRED = "error:occurred",
  SESSION_ENDED = "session:ended",
}

export interface ExecEvent {
  type: ExecEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

export class ExecEventEmitter extends EventEmitter {
  emitThinkingStarted(): void {
    this.emit(ExecEventType.THINKING_STARTED, {
      timestamp: Date.now(),
    });
  }

  emitToolStarted(toolName: string): void {
    this.emit(ExecEventType.TOOL_STARTED, {
      toolName,
      timestamp: Date.now(),
    });
  }

  emitTextDelta(content: string): void {
    this.emit(ExecEventType.TEXT_DELTA, {
      content,
      timestamp: Date.now(),
    });
  }
}
```

#### Listening to Events in CLI

```typescript
// packages/cli/src/cli.ts
async function execCommand(args: string[]) {
  const session = await ExecSession.create();
  const renderer = new ProgressRenderer();

  // Listen to events
  session.on(ExecEventType.TOOL_STARTED, (event) => {
    renderer.showToolStarted(event.data.toolName);
  });

  session.on(ExecEventType.TOOL_COMPLETED, (event) => {
    renderer.showToolCompleted(event.data.toolName);
  });

  session.on(ExecEventType.TEXT_DELTA, (event) => {
    renderer.renderText(event.data.content);
  });

  await session.execute(userPrompt);
}
```

**Tasks**:
- [ ] Create `ExecEventEmitter` class
- [ ] Define all event types and payloads
- [ ] Integrate events into `StreamingExecutor`
- [ ] Update `ClaudeRunner` to emit events during execution
- [ ] Create event listener system in CLI
- [ ] Add event logging for debugging

**Files to Create**:
- `packages/sdk/src/exec/events.ts`
- `packages/sdk/src/exec/event-emitter.ts`

**Files to Modify**:
- `packages/sdk/src/ai/claude-runner.ts` (emit events)
- `packages/cli/src/cli.ts` (listen to events)

**Acceptance Criteria**:
- [ ] All execution stages emit appropriate events
- [ ] Events include accurate timestamps and metadata
- [ ] Event listeners receive events in correct order
- [ ] No event loss or duplication

---

### Day 5: Interactive Input Handling

**Goal**: Enable continuous interaction, not just single execution

#### REPL-Style Interface

```typescript
// packages/cli/src/repl/interactive-session.ts
export class InteractiveSession {
  private session: ExecSession;
  private readline: readline.Interface;

  async start(): Promise<void> {
    console.log(c.blue("Locus Exec Interactive Mode"));
    console.log(c.gray("Type your prompt, or 'exit' to quit\n"));

    this.readline = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: c.cyan("> "),
    });

    this.readline.prompt();

    this.readline.on("line", async (input) => {
      const trimmed = input.trim();

      if (trimmed === "exit" || trimmed === "quit") {
        await this.shutdown();
        return;
      }

      if (trimmed === "") {
        this.readline.prompt();
        return;
      }

      // Execute prompt
      await this.executePrompt(trimmed);

      this.readline.prompt();
    });
  }

  private async executePrompt(prompt: string): Promise<void> {
    try {
      const stream = this.session.executeStreaming(prompt);

      for await (const chunk of stream) {
        this.renderer.renderChunk(chunk);
      }

      console.log("\n");  // Add spacing
    } catch (error) {
      console.error(c.red(`Error: ${error.message}`));
    }
  }
}
```

#### Usage

```bash
# Single execution (like before)
locus exec "create a sprint plan"

# Interactive mode (NEW)
locus exec --interactive
> create a sprint plan
[AI generates plan...]
> can you add more details to week 2?
[AI refines week 2...]
> exit
```

**Tasks**:
- [ ] Create `InteractiveSession` class
- [ ] Add `--interactive` flag to exec command
- [ ] Implement REPL interface with readline
- [ ] Add special commands (exit, clear, help, etc.)
- [ ] Handle multi-line input (optional)
- [ ] Add input validation

**Files to Create**:
- `packages/cli/src/repl/interactive-session.ts`
- `packages/cli/src/repl/commands.ts` (special commands)

**Files to Modify**:
- `packages/cli/src/cli.ts` (add --interactive mode)

**Acceptance Criteria**:
- [ ] Interactive mode starts with clear instructions
- [ ] Users can submit multiple prompts in sequence
- [ ] Graceful exit with 'exit' or CTRL+D
- [ ] Session context preserved across prompts

---

## Week 2: Interactive Session Management

### Days 6-7: Conversation History Persistence

**Goal**: Store and restore conversation history across sessions

#### History Storage Architecture

```typescript
// packages/sdk/src/exec/history-manager.ts
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  metadata?: {
    toolsUsed?: string[];
    duration?: number;
  };
}

export interface ConversationSession {
  id: string;
  projectPath: string;
  messages: ConversationMessage[];
  createdAt: number;
  updatedAt: number;
  metadata: {
    model: string;
    provider: string;
  };
}

export class HistoryManager {
  private historyDir: string;

  constructor(projectPath: string) {
    this.historyDir = path.join(projectPath, ".locus", "exec-history");
    this.ensureHistoryDir();
  }

  async saveSession(session: ConversationSession): Promise<void> {
    const filePath = path.join(this.historyDir, `${session.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(session, null, 2));
  }

  async loadSession(sessionId: string): Promise<ConversationSession | null> {
    const filePath = path.join(this.historyDir, `${sessionId}.json`);

    if (!await fs.exists(filePath)) {
      return null;
    }

    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  }

  async listSessions(): Promise<ConversationSession[]> {
    const files = await fs.readdir(this.historyDir);
    const sessions: ConversationSession[] = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        const session = await this.loadSession(file.replace(".json", ""));
        if (session) sessions.push(session);
      }
    }

    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async getCurrentSession(): Promise<ConversationSession> {
    // Get or create current session
    const sessions = await this.listSessions();

    if (sessions.length > 0) {
      return sessions[0];  // Most recent
    }

    return this.createNewSession();
  }

  private createNewSession(): ConversationSession {
    return {
      id: nanoid(),
      projectPath: process.cwd(),
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {
        model: "claude-sonnet-4-5",
        provider: "claude",
      },
    };
  }
}
```

#### Using History in Execution

```typescript
// packages/sdk/src/exec/exec-session.ts
export class ExecSession {
  private history: HistoryManager;
  private currentSession: ConversationSession;

  async executeStreaming(
    userPrompt: string
  ): AsyncGenerator<StreamChunk, void, unknown> {
    // Add user message to history
    this.currentSession.messages.push({
      role: "user",
      content: userPrompt,
      timestamp: Date.now(),
    });

    // Build full prompt with history context
    const fullPrompt = this.buildPromptWithHistory(userPrompt);

    const assistantMessage: ConversationMessage = {
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      metadata: { toolsUsed: [] },
    };

    // Stream execution
    const stream = this.executor.executeStreaming(fullPrompt);

    for await (const chunk of stream) {
      if (chunk.type === "text_delta") {
        assistantMessage.content += chunk.content;
      } else if (chunk.type === "tool_use") {
        assistantMessage.metadata.toolsUsed.push(chunk.tool);
      }

      yield chunk;
    }

    // Save assistant response to history
    this.currentSession.messages.push(assistantMessage);
    this.currentSession.updatedAt = Date.now();

    await this.history.saveSession(this.currentSession);
  }

  private buildPromptWithHistory(currentPrompt: string): string {
    const historyContext = this.currentSession.messages
      .slice(-10)  // Last 10 messages for context
      .map(msg => `${msg.role}: ${msg.content}`)
      .join("\n\n");

    return `
# Conversation History
${historyContext}

# Current Prompt
${currentPrompt}

${this.getProjectContext()}
`;
  }
}
```

**Tasks**:
- [ ] Create `HistoryManager` class
- [ ] Define conversation storage schema
- [ ] Implement session save/load functionality
- [ ] Create `.locus/exec-history/` directory structure
- [ ] Add history pruning (keep last 30 sessions)
- [ ] Implement history search/filter
- [ ] Add `--session <id>` flag to resume sessions

**Files to Create**:
- `packages/sdk/src/exec/history-manager.ts`
- `packages/sdk/src/exec/exec-session.ts`

**Files to Modify**:
- `packages/cli/src/cli.ts` (integrate history)

**Acceptance Criteria**:
- [ ] Conversation history saves automatically
- [ ] History restores on session resume
- [ ] Last 10 messages included in context
- [ ] History files are human-readable JSON
- [ ] Old sessions auto-prune after 30 sessions

---

### Days 8-9: Multi-Turn Workflow Support

**Goal**: Enable iterative refinement through follow-up questions

#### Context Awareness Across Turns

```typescript
// packages/sdk/src/exec/context-tracker.ts
export class ContextTracker {
  private artifacts: Map<string, Artifact> = new Map();
  private tasks: Map<string, Task> = new Map();

  trackArtifact(artifact: Artifact): void {
    this.artifacts.set(artifact.id, artifact);
  }

  trackTask(task: Task): void {
    this.tasks.set(task.id, task);
  }

  getReferencedArtifact(reference: string): Artifact | null {
    // Support references like "the plan" or "sprint doc"
    for (const [id, artifact] of this.artifacts) {
      if (artifact.title.toLowerCase().includes(reference.toLowerCase())) {
        return artifact;
      }
    }
    return null;
  }

  buildContextSummary(): string {
    return `
## Active Context

### Artifacts Created
${Array.from(this.artifacts.values()).map(a => `- ${a.title} (${a.type})`).join("\n")}

### Tasks Created
${Array.from(this.tasks.values()).map(t => `- ${t.title} (${t.status})`).join("\n")}
`;
  }
}
```

#### Follow-up Prompt Enhancement

```typescript
// Example conversation flow
// Turn 1:
User: Create a 4-week sprint plan for authentication feature
AI: [Creates plan, saves as artifact "Authentication Feature Sprint Plan"]

// Turn 2:
User: Can you add more details to week 2?
AI: [Understands "week 2" refers to the plan, updates it]

// Turn 3:
User: What testing strategy should we use?
AI: [Knows context is auth + sprint plan, gives relevant answer]
```

**Tasks**:
- [ ] Create `ContextTracker` class
- [ ] Track artifacts created in session
- [ ] Track tasks created in session
- [ ] Implement reference resolution ("the plan", "that doc")
- [ ] Add context summary to each prompt
- [ ] Enable artifact editing in follow-ups

**Files to Create**:
- `packages/sdk/src/exec/context-tracker.ts`

**Files to Modify**:
- `packages/sdk/src/exec/exec-session.ts` (integrate context tracking)

**Acceptance Criteria**:
- [ ] Follow-up questions understand previous context
- [ ] Artifact references resolve correctly
- [ ] Context summary includes relevant info
- [ ] Multi-turn refinement works smoothly

---

### Day 10: Session Management Commands

**Goal**: Allow users to manage their conversation sessions

#### Session Commands

```typescript
// packages/cli/src/commands/exec-sessions.ts
export class SessionCommands {
  async list(): Promise<void> {
    const sessions = await historyManager.listSessions();

    console.log(c.blue("Recent Exec Sessions:\n"));

    for (const session of sessions.slice(0, 10)) {
      const lastMessage = session.messages[session.messages.length - 1];
      const preview = lastMessage.content.slice(0, 60);
      const age = formatRelativeTime(session.updatedAt);

      console.log(c.cyan(session.id.slice(0, 8)) + c.gray(" - ") + preview);
      console.log(c.gray(`  ${session.messages.length} messages • ${age}`));
      console.log();
    }
  }

  async show(sessionId: string): Promise<void> {
    const session = await historyManager.loadSession(sessionId);

    if (!session) {
      console.error(c.red(`Session ${sessionId} not found`));
      return;
    }

    console.log(c.blue(`Session: ${session.id}\n`));

    for (const message of session.messages) {
      const role = message.role === "user" ? c.cyan("You") : c.green("AI");
      console.log(`${role}: ${message.content}\n`);
    }
  }

  async delete(sessionId: string): Promise<void> {
    await historyManager.deleteSession(sessionId);
    console.log(c.green(`Deleted session ${sessionId}`));
  }

  async clear(): Promise<void> {
    await historyManager.clearAllSessions();
    console.log(c.green("Cleared all exec sessions"));
  }
}
```

#### CLI Commands

```bash
# List recent sessions
locus exec sessions list

# Show specific session
locus exec sessions show <session-id>

# Delete session
locus exec sessions delete <session-id>

# Clear all sessions
locus exec sessions clear

# Resume session (continue conversation)
locus exec --session <session-id>
```

**Tasks**:
- [ ] Create session management commands
- [ ] Add `locus exec sessions` subcommand
- [ ] Implement list, show, delete, clear
- [ ] Add `--session` flag to resume
- [ ] Format session output nicely
- [ ] Add session export/import

**Files to Create**:
- `packages/cli/src/commands/exec-sessions.ts`

**Files to Modify**:
- `packages/cli/src/cli.ts` (register session commands)
- `packages/sdk/src/exec/history-manager.ts` (add delete/clear methods)

**Acceptance Criteria**:
- [ ] Users can list their sessions
- [ ] Sessions display with previews and metadata
- [ ] Users can resume any session
- [ ] Delete/clear work correctly
- [ ] Session IDs are easy to reference (8 chars)

---

## Week 3: Progress Indicators & Tool Visibility

### Days 11-12: Rich Progress Display

**Goal**: Beautiful, informative progress indicators during execution

#### Progress Renderer

```typescript
// packages/cli/src/display/progress-renderer.ts
import ora from "ora";
import chalk from "chalk";

export class ProgressRenderer {
  private spinner: ora.Ora | null = null;
  private currentTool: string | null = null;

  showThinkingStarted(): void {
    this.spinner = ora({
      text: chalk.gray("Thinking..."),
      color: "cyan",
    }).start();
  }

  showThinkingStopped(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  showToolStarted(toolName: string): void {
    this.currentTool = toolName;

    const icon = this.getToolIcon(toolName);
    const message = this.getToolMessage(toolName);

    this.spinner = ora({
      text: chalk.cyan(`${icon} ${message}`),
      color: "blue",
    }).start();
  }

  showToolCompleted(toolName: string, duration: number): void {
    if (this.spinner) {
      const icon = this.getToolIcon(toolName);
      const message = this.getToolMessage(toolName);

      this.spinner.succeed(
        chalk.green(`${icon} ${message}`) + chalk.gray(` (${duration}ms)`)
      );

      this.spinner = null;
    }
    this.currentTool = null;
  }

  showToolFailed(toolName: string, error: string): void {
    if (this.spinner) {
      const icon = this.getToolIcon(toolName);
      this.spinner.fail(chalk.red(`${icon} ${toolName} failed: ${error}`));
      this.spinner = null;
    }
    this.currentTool = null;
  }

  private getToolIcon(toolName: string): string {
    const icons = {
      Read: "📖",
      Write: "✍️",
      Edit: "✏️",
      Bash: "⚡",
      Grep: "🔍",
      Glob: "📁",
      WebFetch: "🌐",
      Task: "🤖",
    };
    return icons[toolName] || "🔧";
  }

  private getToolMessage(toolName: string): string {
    const messages = {
      Read: "Reading file",
      Write: "Writing file",
      Edit: "Editing file",
      Bash: "Running command",
      Grep: "Searching code",
      Glob: "Finding files",
      WebFetch: "Fetching URL",
      Task: "Spawning agent",
    };
    return messages[toolName] || `Using ${toolName}`;
  }

  renderTextDelta(content: string): void {
    // Stop spinner before showing text
    if (this.spinner) {
      this.showThinkingStopped();
    }

    process.stdout.write(content);
  }

  showSummary(stats: ExecutionStats): void {
    console.log("\n");
    console.log(chalk.gray("─".repeat(50)));
    console.log(chalk.blue("Execution Summary:"));
    console.log(chalk.gray(`  Duration: ${stats.duration}ms`));
    console.log(chalk.gray(`  Tools used: ${stats.toolsUsed.join(", ")}`));
    console.log(chalk.gray(`  Tokens: ${stats.tokensUsed}`));
    console.log(chalk.gray("─".repeat(50)));
  }
}
```

#### Example Output

```
> locus exec "create a sprint plan for auth"

⠋ Thinking...
📖 Reading file (234ms) ✓
📁 Finding files (123ms) ✓
⠋ Thinking...
✍️ Writing file...

# Authentication Feature Sprint Plan

## Week 1: Foundation
...

──────────────────────────────────────────────────
Execution Summary:
  Duration: 12.4s
  Tools used: Read, Glob, Write
  Tokens: 8,432
──────────────────────────────────────────────────
```

**Tasks**:
- [ ] Install `ora` (spinner) and `chalk` (colors)
- [ ] Create `ProgressRenderer` class
- [ ] Add tool icons and messages
- [ ] Implement spinner states (thinking, tool use)
- [ ] Add execution summary
- [ ] Handle concurrent tool usage display
- [ ] Add progress percentage (if available)

**Files to Create**:
- `packages/cli/src/display/progress-renderer.ts`
- `packages/cli/src/display/execution-stats.ts`

**Files to Modify**:
- `packages/cli/src/cli.ts` (use ProgressRenderer)
- `packages/sdk/src/exec/exec-session.ts` (track stats)

**Acceptance Criteria**:
- [ ] Spinners show during thinking/tool use
- [ ] Tools display with appropriate icons
- [ ] Execution summary shows at end
- [ ] Output is visually appealing
- [ ] No flickering or UI artifacts

---

### Days 13-14: Detailed Tool Execution Visibility

**Goal**: Show what tools are doing, not just that they're running

#### Enhanced Tool Display

```typescript
// packages/cli/src/display/tool-display.ts
export class ToolDisplay {
  showToolExecution(tool: ToolExecution): void {
    switch (tool.name) {
      case "Read":
        this.showReadTool(tool);
        break;
      case "Write":
        this.showWriteTool(tool);
        break;
      case "Edit":
        this.showEditTool(tool);
        break;
      case "Bash":
        this.showBashTool(tool);
        break;
      case "Grep":
        this.showGrepTool(tool);
        break;
    }
  }

  private showReadTool(tool: ToolExecution): void {
    const filePath = tool.parameters.file_path;
    const fileName = path.basename(filePath);

    console.log(chalk.cyan(`📖 Reading ${chalk.bold(fileName)}`));
    console.log(chalk.gray(`   ${filePath}`));
  }

  private showWriteTool(tool: ToolExecution): void {
    const filePath = tool.parameters.file_path;
    const fileName = path.basename(filePath);
    const size = tool.parameters.content.length;

    console.log(chalk.cyan(`✍️  Writing ${chalk.bold(fileName)}`));
    console.log(chalk.gray(`   ${filePath} (${size} bytes)`));
  }

  private showBashTool(tool: ToolExecution): void {
    const command = tool.parameters.command;
    const description = tool.parameters.description;

    console.log(chalk.cyan(`⚡ ${description || "Running command"}`));
    console.log(chalk.gray(`   $ ${command}`));
  }

  private showGrepTool(tool: ToolExecution): void {
    const pattern = tool.parameters.pattern;
    const glob = tool.parameters.glob || "**/*";

    console.log(chalk.cyan(`🔍 Searching for "${pattern}"`));
    console.log(chalk.gray(`   in ${glob}`));
  }

  showToolResult(tool: ToolExecution, result: ToolResult): void {
    if (result.success) {
      console.log(chalk.green(`   ✓ Completed in ${result.duration}ms`));

      // Show key results
      if (tool.name === "Grep" && result.data.matches) {
        console.log(chalk.gray(`   Found ${result.data.matches} matches`));
      } else if (tool.name === "Glob" && result.data.files) {
        console.log(chalk.gray(`   Found ${result.data.files.length} files`));
      }
    } else {
      console.log(chalk.red(`   ✗ Failed: ${result.error}`));
    }

    console.log();  // Add spacing
  }
}
```

#### Example Output with Details

```
> locus exec "refactor the auth module"

⠋ Thinking...

📁 Finding files matching "auth"
   in **/*.ts
   ✓ Completed in 145ms
   Found 8 files

📖 Reading auth-service.ts
   packages/api/src/auth/auth-service.ts
   ✓ Completed in 23ms

🔍 Searching for "class.*Auth"
   in **/*.ts
   ✓ Completed in 234ms
   Found 12 matches

⠋ Thinking...

✏️  Editing auth-service.ts
   packages/api/src/auth/auth-service.ts
   ✓ Completed in 45ms

I've refactored the authentication module...
```

**Tasks**:
- [ ] Create `ToolDisplay` class
- [ ] Implement detailed display for each tool type
- [ ] Show tool parameters (file paths, commands, patterns)
- [ ] Display tool results summary
- [ ] Add result metrics (matches found, files changed, etc.)
- [ ] Format output for readability

**Files to Create**:
- `packages/cli/src/display/tool-display.ts`

**Files to Modify**:
- `packages/cli/src/display/progress-renderer.ts` (integrate ToolDisplay)
- `packages/sdk/src/exec/events.ts` (include tool parameters in events)

**Acceptance Criteria**:
- [ ] Tool usage shows meaningful details
- [ ] File paths are displayed clearly
- [ ] Commands show with descriptions
- [ ] Results show success/failure with metrics
- [ ] Output helps users understand what's happening

---

### Day 15: Status Bar & Real-Time Indicators

**Goal**: Top-of-screen status bar showing current activity

#### Status Bar Display

```typescript
// packages/cli/src/display/status-bar.ts
import cliCursor from "cli-cursor";

export class StatusBar {
  private isVisible = false;
  private currentStatus = "";

  show(status: string): void {
    if (!this.isVisible) {
      cliCursor.hide();
      this.isVisible = true;
    }

    this.currentStatus = status;
    this.render();
  }

  hide(): void {
    if (this.isVisible) {
      this.clear();
      cliCursor.show();
      this.isVisible = false;
    }
  }

  private render(): void {
    const width = process.stdout.columns || 80;
    const bar = "━".repeat(width);

    // Save cursor position
    process.stdout.write("\x1B7");

    // Move to top
    process.stdout.write("\x1B[1;1H");

    // Render status bar
    process.stdout.write(chalk.bgBlue.white(` ${this.currentStatus.padEnd(width - 2)} `));

    // Restore cursor position
    process.stdout.write("\x1B8");
  }

  private clear(): void {
    const width = process.stdout.columns || 80;

    process.stdout.write("\x1B7");
    process.stdout.write("\x1B[1;1H");
    process.stdout.write(" ".repeat(width));
    process.stdout.write("\x1B8");
  }

  updateProgress(current: number, total: number): void {
    const percentage = Math.round((current / total) * 100);
    const status = `Progress: ${current}/${total} (${percentage}%)`;
    this.show(status);
  }
}
```

#### Integration

```typescript
// Show status during execution
const statusBar = new StatusBar();

session.on(ExecEventType.THINKING_STARTED, () => {
  statusBar.show("🤔 Thinking...");
});

session.on(ExecEventType.TOOL_STARTED, (event) => {
  statusBar.show(`🔧 ${event.data.toolName}...`);
});

session.on(ExecEventType.RESPONSE_COMPLETED, () => {
  statusBar.hide();
});
```

**Tasks**:
- [ ] Create `StatusBar` class
- [ ] Implement top-of-screen rendering
- [ ] Add cursor save/restore logic
- [ ] Show current activity in status bar
- [ ] Add progress percentage (if applicable)
- [ ] Handle terminal resize
- [ ] Make optional via `--no-status` flag

**Files to Create**:
- `packages/cli/src/display/status-bar.ts`

**Files to Modify**:
- `packages/cli/src/cli.ts` (integrate status bar)

**Acceptance Criteria**:
- [ ] Status bar appears at top of terminal
- [ ] Updates in real-time during execution
- [ ] Doesn't interfere with scrolling output
- [ ] Hides cleanly when done
- [ ] Works on different terminal sizes

---

## Week 4: Polish, Error Handling & Migration

### Days 16-17: Graceful Shutdown & Interruption

**Goal**: Handle CTRL+C cleanly, allow task cancellation

#### Signal Handling

```typescript
// packages/cli/src/repl/signal-handler.ts
export class SignalHandler {
  private session: ExecSession | null = null;
  private isShuttingDown = false;

  setup(session: ExecSession): void {
    this.session = session;

    process.on("SIGINT", async () => {
      await this.handleInterrupt();
    });

    process.on("SIGTERM", async () => {
      await this.handleTermination();
    });
  }

  private async handleInterrupt(): Promise<void> {
    if (this.isShuttingDown) {
      // Second CTRL+C - force exit
      console.log(c.red("\nForce exiting..."));
      process.exit(1);
    }

    this.isShuttingDown = true;

    console.log(c.yellow("\n\nInterrupting execution..."));

    // Cancel ongoing execution
    if (this.session) {
      await this.session.cancel();
    }

    // Ask user what to do
    const answer = await this.prompt(
      "Save session before exiting? (y/n)"
    );

    if (answer.toLowerCase() === "y") {
      await this.session?.save();
      console.log(c.green("Session saved!"));
    }

    console.log(c.gray("Goodbye!"));
    process.exit(0);
  }

  private async handleTermination(): Promise<void> {
    console.log(c.yellow("\n\nReceived termination signal..."));

    // Save session automatically
    if (this.session) {
      await this.session.save();
      console.log(c.green("Session saved!"));
    }

    process.exit(0);
  }
}
```

#### Cancellable Execution

```typescript
// packages/sdk/src/exec/exec-session.ts
export class ExecSession {
  private abortController: AbortController | null = null;

  async executeStreaming(
    prompt: string
  ): AsyncGenerator<StreamChunk, void, unknown> {
    this.abortController = new AbortController();

    try {
      const stream = this.executor.executeStreaming(
        prompt,
        { signal: this.abortController.signal }
      );

      for await (const chunk of stream) {
        if (this.abortController.signal.aborted) {
          break;
        }
        yield chunk;
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.log(c.yellow("\nExecution cancelled"));
        return;
      }
      throw error;
    }
  }

  async cancel(): Promise<void> {
    if (this.abortController) {
      this.abortController.abort();
    }
  }
}
```

**Tasks**:
- [ ] Create `SignalHandler` class
- [ ] Implement SIGINT (CTRL+C) handler
- [ ] Implement SIGTERM handler
- [ ] Add execution cancellation via AbortController
- [ ] Prompt user to save on interrupt
- [ ] Clean up resources on exit
- [ ] Add timeout protection (force exit after 5s)

**Files to Create**:
- `packages/cli/src/repl/signal-handler.ts`

**Files to Modify**:
- `packages/sdk/src/exec/exec-session.ts` (add cancel method)
- `packages/cli/src/cli.ts` (setup signal handlers)

**Acceptance Criteria**:
- [ ] CTRL+C interrupts execution cleanly
- [ ] User can choose to save session
- [ ] Second CTRL+C force exits
- [ ] Resources cleaned up properly
- [ ] No hanging processes

---

### Days 18-19: Error Handling & Recovery

**Goal**: Robust error handling with helpful messages and recovery options

#### Error Recovery System

```typescript
// packages/sdk/src/exec/error-handler.ts
export class ErrorHandler {
  async handleExecutionError(
    error: Error,
    context: ExecutionContext
  ): Promise<ErrorRecoveryResult> {
    // Classify error type
    const errorType = this.classifyError(error);

    switch (errorType) {
      case "RATE_LIMIT":
        return this.handleRateLimit(error);

      case "NETWORK_ERROR":
        return this.handleNetworkError(error);

      case "TOOL_FAILURE":
        return this.handleToolFailure(error, context);

      case "PERMISSION_DENIED":
        return this.handlePermissionError(error);

      case "UNKNOWN":
      default:
        return this.handleUnknownError(error);
    }
  }

  private async handleRateLimit(error: Error): Promise<ErrorRecoveryResult> {
    console.log(c.yellow("\n⚠️  Rate limit reached"));
    console.log(c.gray("The API has rate-limited your request.\n"));

    const shouldRetry = await this.promptRetry(
      "Retry in 60 seconds?",
      { defaultDelay: 60000 }
    );

    if (shouldRetry) {
      await this.delay(60000);
      return { action: "retry" };
    }

    return { action: "abort" };
  }

  private async handleNetworkError(error: Error): Promise<ErrorRecoveryResult> {
    console.log(c.red("\n❌ Network error"));
    console.log(c.gray("Failed to connect to the AI service.\n"));
    console.log(c.gray("Possible causes:"));
    console.log(c.gray("  - No internet connection"));
    console.log(c.gray("  - Service is down"));
    console.log(c.gray("  - Firewall/proxy blocking requests\n"));

    const shouldRetry = await this.promptRetry("Retry?");

    return shouldRetry
      ? { action: "retry" }
      : { action: "abort" };
  }

  private async handleToolFailure(
    error: Error,
    context: ExecutionContext
  ): Promise<ErrorRecoveryResult> {
    console.log(c.yellow("\n⚠️  Tool execution failed"));
    console.log(c.gray(`Tool: ${context.currentTool}`));
    console.log(c.red(`Error: ${error.message}\n`));

    const options = [
      "Retry with same parameters",
      "Skip this tool and continue",
      "Abort execution",
    ];

    const choice = await this.promptChoice("What would you like to do?", options);

    switch (choice) {
      case 0:
        return { action: "retry" };
      case 1:
        return { action: "skip_tool" };
      case 2:
      default:
        return { action: "abort" };
    }
  }

  private classifyError(error: Error): ErrorType {
    if (error.message.includes("rate limit")) return "RATE_LIMIT";
    if (error.message.includes("network") || error.message.includes("ECONNREFUSED")) {
      return "NETWORK_ERROR";
    }
    if (error.message.includes("permission")) return "PERMISSION_DENIED";
    if (error.message.includes("tool")) return "TOOL_FAILURE";
    return "UNKNOWN";
  }
}
```

#### Retry Logic

```typescript
// packages/sdk/src/exec/retry-manager.ts
export class RetryManager {
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      backoffFactor = 2,
      initialDelay = 1000,
    } = options;

    let lastError: Error;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries - 1) {
          const delay = initialDelay * Math.pow(backoffFactor, attempt);

          console.log(
            c.yellow(`Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`)
          );

          await this.delay(delay);
        }
      }
    }

    throw lastError;
  }
}
```

**Tasks**:
- [ ] Create `ErrorHandler` class
- [ ] Classify error types
- [ ] Implement recovery strategies for each type
- [ ] Add retry logic with exponential backoff
- [ ] Create user-friendly error messages
- [ ] Add recovery prompts (retry, skip, abort)
- [ ] Log errors for debugging

**Files to Create**:
- `packages/sdk/src/exec/error-handler.ts`
- `packages/sdk/src/exec/retry-manager.ts`

**Files to Modify**:
- `packages/sdk/src/exec/exec-session.ts` (integrate error handling)
- `packages/cli/src/cli.ts` (handle errors gracefully)

**Acceptance Criteria**:
- [ ] All error types handled gracefully
- [ ] User gets helpful error messages
- [ ] Recovery options presented clearly
- [ ] Retry logic works with backoff
- [ ] Errors logged for debugging
- [ ] Session saved on fatal errors

---

### Day 20: Testing, Documentation & Migration

**Goal**: Comprehensive testing and smooth rollout

#### Testing Strategy

**Unit Tests**:
```typescript
// packages/sdk/src/exec/__tests__/streaming-executor.test.ts
describe("StreamingExecutor", () => {
  it("should stream text deltas in real-time", async () => {
    const executor = new StreamingExecutor();
    const chunks: StreamChunk[] = [];

    for await (const chunk of executor.executeStreaming("test prompt")) {
      chunks.push(chunk);
    }

    expect(chunks.some(c => c.type === "text_delta")).toBe(true);
  });

  it("should emit tool events during execution", async () => {
    const executor = new StreamingExecutor();
    const toolEvents: StreamChunk[] = [];

    for await (const chunk of executor.executeStreaming("read a file")) {
      if (chunk.type === "tool_use") {
        toolEvents.push(chunk);
      }
    }

    expect(toolEvents.length).toBeGreaterThan(0);
  });
});
```

**Integration Tests**:
```typescript
// packages/sdk/src/exec/__tests__/exec-session.test.ts
describe("ExecSession", () => {
  it("should persist conversation history", async () => {
    const session = await ExecSession.create();

    await session.execute("create a file");
    await session.execute("edit that file");

    const history = session.getHistory();
    expect(history.messages).toHaveLength(4);  // 2 user + 2 assistant
  });

  it("should restore session from history", async () => {
    const session1 = await ExecSession.create();
    await session1.execute("test");
    const sessionId = session1.getId();

    const session2 = await ExecSession.load(sessionId);
    expect(session2.getHistory().messages).toHaveLength(2);
  });
});
```

**E2E Tests**:
```typescript
// packages/cli/src/__tests__/e2e/exec-interactive.test.ts
describe("Interactive Exec", () => {
  it("should handle multi-turn conversation", async () => {
    const { stdin, stdout } = mockTerminal();

    // Start interactive session
    execCommand(["--interactive"]);

    // Send first prompt
    stdin.write("create a sprint plan\n");
    await waitForOutput(stdout, "Sprint Plan");

    // Send follow-up
    stdin.write("add more details to week 2\n");
    await waitForOutput(stdout, "Week 2");

    // Exit
    stdin.write("exit\n");

    expect(stdout.toString()).toContain("Goodbye");
  });
});
```

**Tasks**:
- [ ] Write 40+ unit tests for streaming, sessions, history
- [ ] Write 20+ integration tests for exec flows
- [ ] Write 10+ E2E tests for CLI interaction
- [ ] Test error scenarios and recovery
- [ ] Test graceful shutdown
- [ ] Performance testing (latency, throughput)
- [ ] Load testing (long sessions, large history)

**Documentation**:
- [ ] Update README with exec usage
- [ ] Write interactive mode guide
- [ ] Document session management
- [ ] Create examples and recipes
- [ ] Add troubleshooting guide
- [ ] Write migration guide from old exec

**Migration**:
- [ ] Add feature flag for new exec experience
- [ ] Keep old exec as `locus exec --legacy`
- [ ] Migrate existing scripts gradually
- [ ] Update CI/CD to use new exec
- [ ] Announce changes to users

**Files to Create**:
- `packages/sdk/src/exec/__tests__/*.test.ts` (unit tests)
- `packages/cli/src/__tests__/e2e/*.test.ts` (E2E tests)
- `packages/cli/docs/exec-guide.md`
- `packages/cli/docs/exec-examples.md`
- `.locus/artifacts/EXEC_MIGRATION_GUIDE.md`

**Acceptance Criteria**:
- [ ] 90%+ code coverage on new code
- [ ] All tests pass
- [ ] Documentation complete and clear
- [ ] Feature flag system working
- [ ] Migration path documented

---

## Detailed Task Breakdown by File

### New Files to Create (42 files)

#### Core Execution (8 files)
1. `packages/sdk/src/exec/streaming-executor.ts`
2. `packages/sdk/src/exec/exec-session.ts`
3. `packages/sdk/src/exec/history-manager.ts`
4. `packages/sdk/src/exec/context-tracker.ts`
5. `packages/sdk/src/exec/events.ts`
6. `packages/sdk/src/exec/event-emitter.ts`
7. `packages/sdk/src/exec/error-handler.ts`
8. `packages/sdk/src/exec/retry-manager.ts`
9. `packages/sdk/src/exec/types.ts`

#### CLI Display (6 files)
10. `packages/cli/src/display/stream-renderer.ts`
11. `packages/cli/src/display/progress-renderer.ts`
12. `packages/cli/src/display/tool-display.ts`
13. `packages/cli/src/display/status-bar.ts`
14. `packages/cli/src/display/execution-stats.ts`

#### Interactive Session (4 files)
15. `packages/cli/src/repl/interactive-session.ts`
16. `packages/cli/src/repl/commands.ts`
17. `packages/cli/src/repl/signal-handler.ts`
18. `packages/cli/src/commands/exec-sessions.ts`

#### Tests (15 files)
19. `packages/sdk/src/exec/__tests__/streaming-executor.test.ts`
20. `packages/sdk/src/exec/__tests__/exec-session.test.ts`
21. `packages/sdk/src/exec/__tests__/history-manager.test.ts`
22. `packages/sdk/src/exec/__tests__/context-tracker.test.ts`
23. `packages/sdk/src/exec/__tests__/events.test.ts`
24. `packages/sdk/src/exec/__tests__/error-handler.test.ts`
25. `packages/cli/src/display/__tests__/progress-renderer.test.ts`
26. `packages/cli/src/display/__tests__/tool-display.test.ts`
27. `packages/cli/src/repl/__tests__/interactive-session.test.ts`
28. `packages/cli/src/__tests__/e2e/exec-streaming.test.ts`
29. `packages/cli/src/__tests__/e2e/exec-interactive.test.ts`
30. `packages/cli/src/__tests__/e2e/exec-sessions.test.ts`
31. `packages/cli/src/__tests__/e2e/exec-errors.test.ts`
32. `packages/cli/src/__tests__/e2e/exec-signals.test.ts`
33. `packages/cli/src/__tests__/integration/exec-history.test.ts`

#### Documentation (9 files)
34. `packages/cli/docs/exec-guide.md`
35. `packages/cli/docs/exec-interactive-mode.md`
36. `packages/cli/docs/exec-sessions.md`
37. `packages/cli/docs/exec-examples.md`
38. `packages/cli/docs/exec-troubleshooting.md`
39. `.locus/artifacts/EXEC_COMMAND_CONTINUOUS_EXPERIENCE_4SPRINT_PLAN.md`
40. `.locus/artifacts/EXEC_MIGRATION_GUIDE.md`
41. `.locus/artifacts/EXEC_ARCHITECTURE.md`
42. `packages/cli/CHANGELOG.md` (update)

### Files to Modify (12 files)

#### Core SDK
1. `packages/sdk/src/ai/claude-runner.ts` - Expose streaming, emit events
2. `packages/sdk/src/ai/codex-runner.ts` - Expose streaming, emit events
3. `packages/sdk/src/ai/runner.ts` - Add streaming interface
4. `packages/sdk/src/core/prompt-builder.ts` - Support history context

#### CLI
5. `packages/cli/src/cli.ts` - Refactor execCommand, add interactive mode
6. `packages/cli/src/index.ts` - Register new commands
7. `packages/cli/package.json` - Add dependencies (ora, cli-cursor, etc.)

#### Config
8. `packages/sdk/tsconfig.json` - Ensure correct types
9. `packages/cli/tsconfig.json` - Ensure correct types
10. `CLAUDE.md` - Update project instructions
11. `README.md` - Add exec command documentation
12. `.gitignore` - Add `.locus/exec-history/` to gitignore

---

## Success Metrics & Tracking

### Key Performance Indicators (KPIs)

| KPI | Measurement Method | Target | Tracking |
|-----|-------------------|--------|----------|
| Time to First Token | Latency from submit to first output | <500ms | Performance logs |
| Streaming Smoothness | Frame drops, stuttering | 0 issues | User feedback |
| Session Persistence Rate | % of sessions successfully saved | 100% | Error logs |
| Multi-Turn Usage | Avg messages per session | 5+ | Analytics |
| Error Recovery Success | % of errors recovered vs aborted | 80% | Error logs |
| User Satisfaction | Rating after using new exec | 4.5+/5 | Survey |
| Adoption Rate | % using new exec vs legacy | 90%+ | Usage analytics |

---

## Risk Assessment & Mitigation

### High-Risk Items

#### 1. Streaming Performance Degradation
**Risk**: Streaming adds overhead, slows down responses
**Impact**: Poor UX, users prefer old exec
**Mitigation**:
- [ ] Benchmark streaming vs blocking (should be <10% slower)
- [ ] Optimize chunk processing (batch small chunks)
- [ ] Use worker threads for heavy rendering
- [ ] Profile and fix bottlenecks

**Owner**: SDK Lead
**Contingency**: Add `--no-stream` flag for blocking mode

---

#### 2. History Storage Growth
**Risk**: Conversation history files grow unbounded
**Impact**: Disk space issues, slow session loading
**Mitigation**:
- [ ] Auto-prune sessions older than 30 days
- [ ] Compress old sessions (gzip)
- [ ] Limit session size (max 100 messages)
- [ ] Add `locus exec clean` command

**Owner**: SDK Lead
**Contingency**: Disable history persistence

---

#### 3. Terminal Compatibility Issues
**Risk**: Progress indicators break on some terminals
**Impact**: Garbled output, unusable CLI
**Mitigation**:
- [ ] Test on iTerm, Terminal.app, Windows Terminal, tmux
- [ ] Detect terminal capabilities (use `supports-color`, `is-unicode-supported`)
- [ ] Graceful fallback to simple output
- [ ] Add `--simple` flag for basic output

**Owner**: CLI Lead
**Contingency**: Default to simple mode, opt-in to rich UI

---

## Dependencies & Prerequisites

### Team Requirements
- **2 Backend/SDK Engineers** (streaming, sessions, history)
- **1 CLI Engineer** (REPL, display, terminal UI)
- **1 QA Engineer** (testing, terminal compatibility)

### External Dependencies
- **Node.js packages**:
  - `ora` (spinners)
  - `chalk` (colors)
  - `cli-cursor` (cursor control)
  - `readline` (REPL)
  - `nanoid` (session IDs)
- **Claude CLI**: Already a dependency
- **File system**: `.locus/exec-history/` directory

### Prerequisite Tasks
- [ ] Audit current exec usage patterns
- [ ] Survey users on desired features
- [ ] Set up performance benchmarking
- [ ] Prepare test environments (different terminals)

---

## Post-Sprint: Iteration Plan

### Week 5-6: Polish & Feedback
- [ ] Gather user feedback
- [ ] Fix top bugs and UX issues
- [ ] Optimize performance bottlenecks
- [ ] Add requested features

### Week 7-8: Advanced Features
- [ ] Multi-agent exec (parallel tasks)
- [ ] Session branching (fork conversation)
- [ ] Session sharing (export/import)
- [ ] Voice input (optional)
- [ ] Session playback/replay

### Week 9-12: Integration
- [ ] Integrate with `locus run` (unified experience)
- [ ] Add exec sessions to web UI
- [ ] Sync sessions across devices (cloud storage)
- [ ] AI-powered session search

---

## Communication Plan

### Internal (Team)
- **Daily Standups**: 15 min (9:00 AM) - progress, blockers
- **Weekly Demos**: Friday 4:00 PM - show progress
- **Sprint Retros**: End of each week

### External (Users)
- **Week 1**: Silent (internal testing)
- **Week 2**: Beta announcement to power users
- **Week 3**: Preview blog post
- **Week 4**: General release announcement
- **Week 5**: User survey + case studies

### Stakeholders
- **Weekly Updates**: Email every Friday
- **Mid-Sprint Check-in**: Day 10
- **Final Presentation**: Day 25

---

## Quick Reference

### Key Commands

```bash
# Single execution (like before)
locus exec "create a sprint plan"

# Interactive mode (NEW)
locus exec --interactive
locus exec -i

# Resume session (NEW)
locus exec --session <session-id>

# Session management (NEW)
locus exec sessions list
locus exec sessions show <id>
locus exec sessions delete <id>
locus exec sessions clear

# Options (NEW)
locus exec --no-stream     # Disable streaming
locus exec --no-status     # Disable status bar
locus exec --simple        # Simple output mode
locus exec --legacy        # Use old exec (fallback)
```

### Key Files

| File | Purpose |
|------|---------|
| `packages/sdk/src/exec/streaming-executor.ts` | Real-time streaming execution |
| `packages/sdk/src/exec/exec-session.ts` | Session management |
| `packages/sdk/src/exec/history-manager.ts` | Conversation persistence |
| `packages/cli/src/repl/interactive-session.ts` | Interactive REPL |
| `packages/cli/src/display/progress-renderer.ts` | Progress indicators |

---

## Appendix

### A. Example Session Flows

#### Flow 1: Single Execution (Non-Interactive)

```bash
$ locus exec "create a 4-week sprint plan for authentication"

⠋ Thinking...
📁 Finding files (145ms) ✓
📖 Reading CLAUDE.md (23ms) ✓
⠋ Thinking...
✍️  Writing sprint-plan.md (45ms) ✓

# Authentication Feature - 4 Week Sprint Plan

## Week 1: Foundation
...

──────────────────────────────────────────────────
Execution Summary:
  Duration: 8.2s
  Tools used: Glob, Read, Write
  Tokens: 6,234
──────────────────────────────────────────────────
```

---

#### Flow 2: Interactive Session

```bash
$ locus exec --interactive

Locus Exec Interactive Mode
Type your prompt, or 'exit' to quit

> create a user authentication module

⠋ Thinking...
✍️  Writing auth-module.ts (234ms) ✓

I've created a user authentication module with:
- JWT-based authentication
- Password hashing with bcrypt
- Login and registration endpoints

> add password reset functionality

⠋ Thinking...
✏️  Editing auth-module.ts (156ms) ✓
✍️  Writing password-reset.ts (89ms) ✓

I've added password reset with:
- Email-based reset tokens
- Secure token generation
- Expiration handling

> show me the auth-module.ts file

📖 Reading auth-module.ts

Here's the current auth-module.ts:
[file contents...]

> exit

Session saved! ID: a8f3d9e2
Goodbye!
```

---

#### Flow 3: Resuming Session

```bash
$ locus exec sessions list

Recent Exec Sessions:

a8f3d9e2 - create a user authentication module
  15 messages • 2 hours ago

5b2c7a4f - refactor the API endpoints
  8 messages • 1 day ago

$ locus exec --session a8f3d9e2

Resumed session a8f3d9e2

> add rate limiting to the login endpoint

⠋ Thinking...
✏️  Editing auth-module.ts (123ms) ✓

I've added rate limiting to prevent brute force attacks:
- Max 5 attempts per 15 minutes
- IP-based throttling
- Temporary lockout after threshold

> exit
```

---

### B. Architecture Diagrams

#### Streaming Flow

```
User Input
    ↓
ExecSession.executeStreaming(prompt)
    ↓
StreamingExecutor
    ↓
ClaudeRunner (spawn claude --output-format stream-json)
    ↓
stdout → parse JSON lines
    ↓
Emit events: text_delta, tool_use, thinking
    ↓
StreamRenderer
    ↓
Terminal output (real-time)
```

#### Event Flow

```
ClaudeRunner
    ├─→ ExecEventEmitter.emitThinkingStarted()
    ├─→ ExecEventEmitter.emitToolStarted(toolName)
    ├─→ ExecEventEmitter.emitTextDelta(content)
    └─→ ExecEventEmitter.emitResponseCompleted()
            ↓
        EventListeners in CLI
            ├─→ ProgressRenderer.showThinking()
            ├─→ ToolDisplay.showToolExecution()
            ├─→ StreamRenderer.renderText()
            └─→ StatusBar.hide()
```

---

### C. Testing Checklist

#### Streaming Tests
- [ ] Text streams in real-time
- [ ] Tool events emit correctly
- [ ] Thinking indicators appear/disappear
- [ ] First token latency <500ms
- [ ] No chunk loss or corruption

#### Session Tests
- [ ] Sessions save automatically
- [ ] Sessions restore correctly
- [ ] History includes last 10 messages
- [ ] Session IDs are unique
- [ ] Old sessions auto-prune

#### Interactive Tests
- [ ] REPL starts and accepts input
- [ ] Multi-turn conversations work
- [ ] Exit command works
- [ ] CTRL+D exits gracefully
- [ ] Context preserved across turns

#### Error Handling Tests
- [ ] Rate limit errors handled
- [ ] Network errors retry
- [ ] Tool failures recoverable
- [ ] Graceful degradation on errors
- [ ] Sessions saved on fatal errors

#### Signal Handling Tests
- [ ] CTRL+C interrupts cleanly
- [ ] Second CTRL+C force exits
- [ ] Session save prompt appears
- [ ] Resources cleaned up
- [ ] No zombie processes

---

### D. Rollout Checklist

#### Pre-Launch (Days 1-19)
- [ ] All development complete
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Documentation complete
- [ ] Feature flag configured
- [ ] Performance benchmarked
- [ ] Terminal compatibility tested

#### Launch Day (Day 20)
- [ ] Deploy to production
- [ ] Enable for internal team
- [ ] Monitor performance
- [ ] Test manually
- [ ] Fix critical bugs

#### Week 1 (Days 21-25)
- [ ] Enable for beta users (50 users)
- [ ] Send beta announcement
- [ ] Monitor metrics
- [ ] Gather feedback
- [ ] Iterate based on feedback

#### Week 2 (Days 26-30)
- [ ] Gradual rollout: 10% → 25% → 50% → 100%
- [ ] Monitor daily
- [ ] Fix bugs
- [ ] Prepare announcement

#### Post-Launch (Days 31+)
- [ ] User survey
- [ ] Analyze results
- [ ] Write case study
- [ ] Plan next iteration

---

**Document Version**: 1.0
**Last Updated**: 2026-02-01
**Status**: Ready for Review
**Next Steps**: Team review → Approval → Sprint kickoff
