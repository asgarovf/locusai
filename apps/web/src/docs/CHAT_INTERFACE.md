# Locus Chat Interface - Frontend Implementation Plan

## 1. Overview
The Locus Chat Interface is a sophisticated, real-time command center where users interact with the Locus AI Agent. It follows the "Assistant-First" design philosophy, providing both conversational capabilities and interactive artifacts (code, documentation, sprint plans).

## 2. Architecture & Communication
The frontend does not communicate directly with the LLM or `ai-sdk`. Instead, it leverages the `@locusai/sdk` to talk to the NestJS backend, which orchestrates the autonomous agent logic.

### Communication Flow:
`Web App (React)` <-> `Locus SDK` <-> `NestJS API (apps/api)` <-> `AI Engine (packages/ai-sdk)`

## 3. Data Models & State Management

### Message Types
We use a structured message format to support rich interactions:
- **BaseMessage**: ID, Role, Timestamp.
- **UserMessage**: Content, context references.
- **AssistantMessage**: 
  - `content`: Markdown-supported text.
  - `thoughtProcess`: Hidden or expandable chain-of-thought.
  - `artifacts`: Generated executable content (code, tasks).
  - `references`: Links to existing project entities (tasks, docs).

### State Handling (`useChat` Hook)
The current `useChat` hook will be refactored to:
1. **Sync with API**: Fetch existing sessions and message history via `@tanstack/react-query`.
2. **Handle Streaming**: Support Server-Sent Events (SSE) for "typing" effects and incremental message building.
3. **Artifact Lifecycle**: Manage the `activeArtifact` state, allowing users to view and interact with generated content in the side panel.

## 4. Interaction Patterns

### A. Real-time Streaming
To ensure a premium feel, responses MUST stream.
- **Backend**: Emits data chunks via SSE.
- **Frontend**: `EventSource` (or SDK wrapper) listens to stream and updates the `messages` array in real-time.

### B. Artifact Sidecar
When the Agent generates code or a document:
1. It is attached as an `Artifact` to the message.
2. Clicking the artifact message opens the `ArtifactPanel`.
3. The `ArtifactPanel` provides syntax highlighting (via Tiptap/Lowlight) and action buttons (e.g., "Apply Code", "Copy").

### C. Context Injection
The frontend automatically injects the active workspace context:
- `workspaceId`
- `activeProjectId`
- `currentUser`

## 5. Implementation Phases

### Phase 1: SDK & Backend Bridge
- Define `AIModule` in `@locusai/sdk`.
- Implement `/api/ai/chat` endpoints in `apps/api`.
- Connect `ai-sdk` to the NestJS service layer.

### Phase 2: Refined Chat UI
- Implement `ChatLayout` with the three-column system (Sidebar | Chat | Artifacts).
- Build the `ArtifactPanel` with proper editors (Code, Markdown).
- Add support for "Thought Blocks" in the message UI.

### Phase 3: Streaming & Polish
- Wire up SSE for real-time response generation.
- Add micro-animations (Framer Motion) for message arrival and artifact transitions.

## 6. Performance & Scalability
- **Virtualization**: Use windowing for long chat histories.
- **Caching**: Persist chat sessions locally for instant load, then sync with backend.
- **Optimistic UI**: Immediatly show user messages and "Agent is thinking" state.
