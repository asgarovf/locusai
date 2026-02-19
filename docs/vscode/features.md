---
description: Features available in the Locus VSCode extension.
---

# Features

## Chat View

The main interface for interacting with AI agents from VSCode. Open the Locus panel from the sidebar to start chatting.

* **Full project context** — The AI has access to your project structure, codebase index, and workspace documents
* **Streaming responses** — See AI responses as they're generated, with real-time tool usage tracking
* **Session persistence** — Conversations are saved and can be resumed later

---

## Explain Selection

Select any code in the editor and get an instant AI explanation:

1. Select the code you want explained
2. Right-click and choose **Locus: Explain Selection**
3. The explanation appears in the Locus chat view

The AI analyzes the selected code in the context of your full project, providing explanations that reference related files and patterns.

---

## Run Exec Tasks

Execute prompts with full repository context directly from the extension:

* Same capabilities as `locus exec` from the terminal
* Results stream in real-time in the chat view
* Tool usage (file reads, writes, etc.) is tracked and displayed

---

## Session Management

* **Resume sessions** — Pick up previous conversations where you left off
* **Session history** — View past interactions and their results
* **Multiple sessions** — Work on different topics in separate sessions

---

## Thinking & Tool Indicators

The chat view shows real-time status indicators:

* **Thinking** — When the AI is processing your request
* **Tool usage** — When the AI reads files, writes code, or performs other operations
* **Completion** — When the task is finished
