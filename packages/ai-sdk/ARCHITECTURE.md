# Locus AI Agent Architecture

## Overview
This document outlines the architectural roadmap for the next generation of the Locus AI Agent. The goal is to evolve from a simple chat interface into a robust "Project Manager & Architect" agent capable of handling both new product creation and existing project maintenance with high context awareness.

## 1. Dual-Track Workflow Architecture

We distinguish between two primary user archetypes: **Builders (Blueprints)** and **Maintainers (Renovations)**.

### Track A: The Builder (New Project)
*Target: Users starting from zero.*

**Workflow:**
1. **Enhanced Interview Phase**:
   - rigorous requirements gathering (as currently implemented).
   - **New**: Visual feedback during interview (live manifest updates).
   - **New**: "Proactive Suggestions" - The AI suggests tech stacks or features based on vague descriptions.
2. **Architecture Generation**:
   - Before coding, the agent generates a `Project Blueprint` (Manifest + Docs).
3. **Transition to Execution**:
   - Once the Manifest is "Approved", the agent switches to `EXECUTION` mode.

### Track B: The Maintainer (Existing Project)
*Target: Users importing an existing repository.*

**Workflow:**
1. **Ingestion & Analysis Phase** (New Mode: `ANALYZING`):
   - The agent scans the file structure, `package.json`, and key configuration files.
   - **Output**: `RepositoryContext` (Summary of languages, frameworks, dependencies, and file tree).
2. **Context Alignment**:
   - The agent creates a "Virtual Manifest" based on the existing code.
   - It asks the user: "I see this is a Next.js app with Tailwind. What are we building next?"
3. **Execution**:
   - The agent operates with full awareness of existing patterns.

---

## 2. Rich Interaction & Context Layer

The system must handle general knowledge queries without losing project context.

### "Consult & Create" Pattern
Users often ask general questions ("How does OAuth work?") before deciding on implementation.
- **Problem**: Current tools try to execute immediately or lack depth.
- **Solution**: 
  - **General Q&A**: Pure text responses for educational queries.
  - **Context-to-Artifact**: Ability to convert a chat explanation into a persistent document.
  - *Example*: User asks for "JWT Structure", Agent explains. User says "Make this our auth doc", Agent captures the explanation into a `Authentication` artifact.

---

## 3. Tooling & Artifact Architecture (The "Crash-Proof" System)

A major pain point is text parsing failures when combining conversational text with structured data (artifacts).

### Separation of Concerns
We will enforce a strict separation between **Conversation** and **Data**.

**Current (Brittle):**
```json
{
  "response": "Here is the task: {\"id\": ...}"
}
```

**Proposed (Structured):**
The Agent response will be split into two distinct channels in the data layer:
1. **Message Content (Markdown)**: The conversational text.
2. **Artifacts Payload (JSON)**: An array of structured objects (Tasks, Docs, Sprints) attached to the message.

**Implementation Strategy:**
- Tools will NOT return user-facing text descriptions as their primary output.
- Tools will return structured JSON.
- The Agent Core will listen for Tool Calls, execute them, and capture the JSON results into the `artifacts` array of the response object.
- The UI handles the rendering of these artifacts (e.g., creating a "Task Card" or "Document View").

---

## 4. "The PM Assistant" Capabilities

The agent needs to be proactive, not just reactive.

### Smart Actions & Suggestions
The Agent State will include a `suggestedActions` field. After every turn, the agent can propose next steps:
- **Timeline Creation**: "Should I generate a 4-week Sprint Document based on this feature list?"
- **Sprint Management**: "You have 5 tasks in backlog. Start Sprint 1?"
- **Task Breakdown**: "This feature seems complex. Should I break it down into sub-tasks?"

### Data Model Updates

#### New `ProjectManifest` Fields
```typescript
interface ProjectManifest {
  // ... existing fields
  timeline?: {
    sprints: Sprint[];
    milestones: Milestone[];
  };
  repositoryState?: {
    summary: string;
    lastAnalysis: Date;
  };
}
```

#### New `Sprint` Entity
```typescript
interface Sprint {
  id: string;
  goal: string;
  tasks: TaskId[];
  status: "PLANNED" | "ACTIVE" | "COMPLETED";
}
```

---

## 5. Implementation Roadmap

### Phase 1: Infrastructure (Immediate)
- [ ] Refactor `AgentResponse` to strictly separate `content` and `artifacts`.
- [ ] Update `LocusAgent.handleMessage` to parse tool outputs reliably.
- [ ] Update `AgentState` to support `ANALYZING` mode.

### Phase 2: Knowledge Ingestion
- [ ] Create `FileAnalysisTool` for reading repo structure.
- [ ] Implement `RepositoryContext` summarizer.

### Phase 3: The Project Manager
- [ ] Implement `Timeline` and `Sprint` data structures.
- [ ] Add `suggestedActions` logic to the Agent's reasoning loop.
