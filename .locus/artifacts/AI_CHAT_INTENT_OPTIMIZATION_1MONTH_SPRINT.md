# AI Chat Intent Classification & Interviewing Optimization - 1 Month Sprint Plan

**Project**: Locus AI SDK v0.7.3+
**Created**: 2026-01-31
**Sprint Duration**: 4 weeks (20 working days)
**Goal**: Enable flexible AI conversations without forcing complete project manifest, while maintaining continuous context gathering

---

## Executive Summary

### Current Pain Points

1. **Forced Interview Completion**: Users must complete the project manifest before they can effectively use other features
2. **Rigid Flow**: Users can't explore technology options or do planning without providing full project details
3. **Poor Discoverability**: No way to ask "what can you help me with?" or explore capabilities
4. **Context Loss**: Switching between interview and other modes loses partial information
5. **Intent Misclassification**: Some user queries fall into UNKNOWN intent, causing confusion
6. **No Progressive Enhancement**: Can't start with vague ideas and progressively refine them

### Proposed Solution

Create a **flexible, continuous learning system** where:
- Users can start conversations from any point (question, idea, documentation)
- Project manifest builds **progressively in the background** across all interactions
- Interview questions are **contextual** and asked **only when needed** for current task
- Intent classification is **more granular** with better handling of hybrid intents
- Users can explicitly say "I don't know yet" and still get value

### Success Metrics

| Metric | Current | Target | Impact |
|--------|---------|--------|--------|
| Time to First Value | ~5 min (after interview) | <30 sec | -90% |
| Manifest Completion Rate | ~60% (forced) | 85% (organic) | +42% |
| Intent Classification Accuracy | ~80% | 95% | +19% |
| User Satisfaction (Chat) | Unknown | 4.5+/5.0 | New |
| Conversations Starting with Interview | 100% | <20% | -80% |
| Average Manifest Completeness Score | 45% (abandoned) | 75% (natural growth) | +67% |

---

## Sprint Overview

### Week 1: Intent System Redesign & New Intents
**Theme**: "Flexible Entry Points"
**Goal**: Add new intents and improve classification to handle diverse conversation starts

### Week 2: Progressive Manifest Building
**Theme**: "Continuous Context Gathering"
**Goal**: Build manifest progressively across all workflows, remove forced interview

### Week 3: Smart Interviewing & Context Awareness
**Theme**: "Just-in-Time Questions"
**Goal**: Ask only relevant questions when needed for current task

### Week 4: Polish, Testing & Migration
**Theme**: "Production-Ready"
**Goal**: Testing, performance optimization, and smooth rollout

---

## Detailed Week-by-Week Plan

## Week 1: Intent System Redesign & New Intents

### Days 1-2: Add New Intent Types

**Goal**: Expand from 8 to 13 intents to cover more conversation patterns

#### New Intents to Add

```typescript
export enum Intent {
  // Existing (keep)
  INTERVIEW = "INTERVIEW",
  QUERY = "QUERY",
  IDEA = "IDEA",
  PRODUCT_DOCUMENTING = "PRODUCT_DOCUMENTING",
  TECHNICAL_DOCUMENTING = "TECHNICAL_DOCUMENTING",
  COMPILING = "COMPILING",
  CREATE_TASK = "CREATE_TASK",
  UNKNOWN = "UNKNOWN",

  // NEW: Discovery & Exploration
  EXPLORE_TECH = "EXPLORE_TECH",        // "What's the best React state library?"
  COMPARE_OPTIONS = "COMPARE_OPTIONS",   // "Compare Next.js vs Remix"
  SEEK_ADVICE = "SEEK_ADVICE",          // "Should I use microservices?"

  // NEW: Project Planning
  ESTIMATE = "ESTIMATE",                 // "How long will this take?"
  PLAN_FEATURE = "PLAN_FEATURE",        // "Help me plan user authentication"

  // NEW: Meta
  HELP = "HELP",                        // "What can you help me with?"
  PROVIDE_CONTEXT = "PROVIDE_CONTEXT",  // User explicitly sharing project info
}
```

**Tasks**:
- [ ] Update `Intent` enum in `packages/ai-sdk/src/chains/intent.ts`
- [ ] Update intent classification prompt with examples for each new intent
- [ ] Add confidence threshold logic (if <60%, ask clarifying question)
- [ ] Update intent detection tests

**Files to Modify**:
- `packages/ai-sdk/src/chains/intent.ts` (10-15 lines)
- `packages/ai-sdk/src/interfaces/index.ts` (enum update)

**Acceptance Criteria**:
- [ ] All 13 intents classify correctly with example prompts
- [ ] Confidence scores accurately reflect ambiguity
- [ ] New intents have clear descriptions in code comments

---

### Days 3-4: Create Workflows for New Intents

**Goal**: Implement workflow handlers for the 5 new intents

#### EXPLORE_TECH Workflow
```typescript
// packages/ai-sdk/src/workflows/explore-tech.ts
class ExploreTechWorkflow extends BaseWorkflow {
  canHandle(context: AgentContext): boolean {
    return context.intent === Intent.EXPLORE_TECH;
  }

  async execute(context: AgentContext): Promise<AgentResponse> {
    // Provide tech exploration with:
    // 1. Pros/cons comparison
    // 2. Use case fit analysis
    // 3. Learning curve assessment
    // 4. Passive manifest update (if tech choice is mentioned)
  }
}
```

#### COMPARE_OPTIONS Workflow
```typescript
// packages/ai-sdk/src/workflows/compare-options.ts
class CompareOptionsWorkflow extends BaseWorkflow {
  // Side-by-side comparison table
  // Recommendation based on project context (if available)
  // Links to documentation
}
```

#### SEEK_ADVICE Workflow
```typescript
// packages/ai-sdk/src/workflows/seek-advice.ts
class SeekAdviceWorkflow extends BaseWorkflow {
  // Architecture/approach recommendations
  // Trade-offs analysis
  // Best practices
  // Contextual follow-up question if manifest is incomplete
}
```

#### HELP Workflow
```typescript
// packages/ai-sdk/src/workflows/help.ts
class HelpWorkflow extends BaseWorkflow {
  // Show capabilities based on current project state
  // Suggest next actions
  // Interactive menu of what AI can do
}
```

#### PROVIDE_CONTEXT Workflow
```typescript
// packages/ai-sdk/src/workflows/provide-context.ts
class ProvideContextWorkflow extends BaseWorkflow {
  // Explicitly update manifest
  // Acknowledge what was learned
  // Suggest what else would be helpful to know
}
```

**Tasks**:
- [ ] Create 5 new workflow files in `packages/ai-sdk/src/workflows/`
- [ ] Create corresponding chain files in `packages/ai-sdk/src/chains/`
- [ ] Register new workflows in `packages/ai-sdk/src/core/engine.ts`
- [ ] Add workflow priority ordering (HELP should be high priority)

**Files to Create**:
- `packages/ai-sdk/src/workflows/explore-tech.ts`
- `packages/ai-sdk/src/workflows/compare-options.ts`
- `packages/ai-sdk/src/workflows/seek-advice.ts`
- `packages/ai-sdk/src/workflows/help.ts`
- `packages/ai-sdk/src/workflows/provide-context.ts`
- `packages/ai-sdk/src/chains/explore-tech.ts`
- `packages/ai-sdk/src/chains/compare-options.ts`
- `packages/ai-sdk/src/chains/seek-advice.ts`
- `packages/ai-sdk/src/chains/help.ts`
- `packages/ai-sdk/src/chains/provide-context.ts`

**Acceptance Criteria**:
- [ ] Each workflow has appropriate tool access
- [ ] Each workflow returns structured `AgentResponse`
- [ ] Workflows integrate with passive manifest updates

---

### Days 5: Improve Intent Classification Prompt

**Goal**: Enhance prompt to better distinguish between similar intents

**Current Issues**:
- QUERY vs EXPLORE_TECH: "How do I implement auth?" could be either
- IDEA vs SEEK_ADVICE: Both involve brainstorming
- INTERVIEW vs PROVIDE_CONTEXT: Hard to distinguish when user volunteers info

**Solution**: Multi-factor classification

```typescript
interface IntentClassificationResult {
  intent: Intent;
  confidence: number;
  reasoning: string;

  // NEW: Multi-intent support
  alternativeIntents?: Array<{
    intent: Intent;
    confidence: number;
  }>;

  // NEW: Clarification needed
  needsClarification?: boolean;
  clarificationQuestion?: string;
}
```

**Tasks**:
- [ ] Rewrite intent classification prompt with decision tree logic
- [ ] Add examples for ambiguous cases
- [ ] Implement multi-intent fallback (execute primary, suggest alternatives)
- [ ] Add clarification flow for low-confidence (<60%) classifications

**Files to Modify**:
- `packages/ai-sdk/src/chains/intent.ts` (major refactor)
- `packages/ai-sdk/src/core/engine.ts` (support clarification flow)

**Acceptance Criteria**:
- [ ] 95%+ accuracy on test dataset (create 100 test examples)
- [ ] Clarification questions make sense and help resolve ambiguity
- [ ] Multi-intent results are ranked correctly

---

## Week 2: Progressive Manifest Building

### Days 6-7: Background Manifest Enrichment System

**Goal**: Extract project info from every conversation, not just interview

#### New Architecture: "Continuous Listener"

```typescript
// packages/ai-sdk/src/core/manifest-enricher.ts
export class ManifestEnricher {
  async enrichFromConversation(
    currentManifest: ProjectManifest,
    conversationHistory: Message[],
    latestMessage: string
  ): Promise<ManifestEnrichmentResult> {
    // Uses LLM to extract:
    // - Tech stack mentions ("I'm using React")
    // - Feature descriptions ("We need user authentication")
    // - Target users ("This is for DeFi traders")
    // - Success metrics ("Aiming for 10k users")
    // - Competitors ("Like Jira but simpler")
    // - Brand voice ("Professional tone")

    return {
      updates: { techStack: [...existing, "React"], ... },
      confidence: 0.85,
      reasoning: "User mentioned React in context of...",
      newCompleteness: 65
    };
  }
}
```

**How it Works**:
1. **Every workflow** calls `manifestEnricher.enrichFromConversation()` after execution
2. Updates are **tentative** until confidence > 80%
3. Low-confidence updates are **suggested** to user ("I noticed you mentioned React. Should I add it to tech stack?")
4. High-confidence updates are **automatic** with **notification** ("Added React to your tech stack")

**Tasks**:
- [ ] Create `ManifestEnricher` class
- [ ] Create enrichment chain prompt (extract structured data)
- [ ] Add enrichment result types
- [ ] Integrate into `LocusAgent.handleMessage()` as post-execution hook
- [ ] Add user confirmation flow for low-confidence updates

**Files to Create**:
- `packages/ai-sdk/src/core/manifest-enricher.ts`
- `packages/ai-sdk/src/chains/manifest-enrichment.ts`

**Files to Modify**:
- `packages/ai-sdk/src/core/agent.ts` (add enrichment hook)
- `packages/ai-sdk/src/interfaces/index.ts` (add enrichment types)

**Acceptance Criteria**:
- [ ] Enrichment extracts info from 90%+ of conversations
- [ ] False positive rate < 10%
- [ ] User can review and reject suggestions
- [ ] Completeness score increases organically over time

---

### Days 8-9: Remove Forced Interview Mode

**Goal**: Make interview **optional** and **on-demand**

#### Current Flow (BEFORE)
```
User starts chat
  ↓
Agent Mode = INTERVIEW (forced)
  ↓
User must complete manifest (9 fields)
  ↓
Only then can use other features
```

#### New Flow (AFTER)
```
User starts chat with ANY question
  ↓
Agent detects intent (EXPLORE_TECH, QUERY, IDEA, etc.)
  ↓
Agent executes workflow
  ↓
Manifest enricher runs in background
  ↓
If critical info missing for current task → ask targeted question
  ↓
Continue conversation naturally
```

**Changes Required**:

1. **Remove forced interview initialization**:
```typescript
// packages/ai-sdk/src/core/agent.ts
// BEFORE:
private initializeState(): AgentState {
  return {
    mode: AgentMode.INTERVIEW,  // ❌ Remove this
    manifest: createEmptyManifest(),
    ...
  };
}

// AFTER:
private initializeState(): AgentState {
  return {
    mode: AgentMode.ACTIVE,  // ✅ Start in active mode
    manifest: createEmptyManifest(),
    ...
  };
}
```

2. **Change Interview Workflow trigger**:
```typescript
// packages/ai-sdk/src/workflows/interview.ts
// BEFORE:
canHandle(context: AgentContext): boolean {
  return context.intent === Intent.INTERVIEW ||
         (context.state.mode === AgentMode.INTERVIEW &&
          context.intent === Intent.UNKNOWN);
}

// AFTER:
canHandle(context: AgentContext): boolean {
  return context.intent === Intent.INTERVIEW ||
         context.intent === Intent.PROVIDE_CONTEXT;
}
```

3. **Add "Want to tell me about your project?" suggestion**:
```typescript
// In workflows that benefit from project context
if (context.manifest.completenessScore < 30) {
  suggestedActions.push({
    label: "Tell me about my project",
    type: "chat_suggestion",
    payload: { text: "Let me tell you about my project" }
  });
}
```

**Tasks**:
- [ ] Update agent initialization to remove forced interview
- [ ] Update interview workflow trigger logic
- [ ] Add contextual suggestions for project info across workflows
- [ ] Update frontend to show manifest completeness indicator
- [ ] Add "Complete project profile" button in UI (optional)

**Files to Modify**:
- `packages/ai-sdk/src/core/agent.ts`
- `packages/ai-sdk/src/workflows/interview.ts`
- `apps/web/src/components/chat/ChatInterface.tsx` (add completeness indicator)
- `apps/web/src/stores/chat-store.ts` (track completeness)

**Acceptance Criteria**:
- [ ] Users can start conversations without interview
- [ ] Manifest still builds to 60%+ completeness organically
- [ ] Users can explicitly trigger interview anytime
- [ ] UI shows current project context level

---

### Day 10: Partial Manifest Handling

**Goal**: All workflows gracefully handle incomplete manifests

**Strategy**: Add **fallback behaviors** for missing info

```typescript
// packages/ai-sdk/src/workflows/compiling.ts (example)
async execute(context: AgentContext): Promise<AgentResponse> {
  const manifest = context.state.manifest;

  // Check required fields for this workflow
  const requiredForCompiling = ["features", "techStack"];
  const missing = requiredForCompiling.filter(field =>
    !manifest[field] || manifest[field].length === 0
  );

  if (missing.length > 0) {
    // Option 1: Ask inline
    return {
      content: `To create a sprint plan, I need to know about your ${missing.join(", ")}. Could you share that?`,
      suggestedActions: [
        { label: "Tell me now", type: "chat_suggestion", payload: { text: "Here's my tech stack..." } },
        { label: "Skip for now", type: "chat_suggestion", payload: { text: "Create a generic plan" } }
      ]
    };
  }

  // Option 2: Proceed with assumptions
  return {
    content: "Creating sprint plan based on what I know...\n\n*Note: This plan assumes a web application. Tell me more about your project for better accuracy.*",
    artifacts: [...],
    suggestedActions: [
      { label: "Add project details", type: "chat_suggestion", payload: { text: "Let me tell you about my project" } }
    ]
  };
}
```

**Tasks**:
- [ ] Audit all workflows for required manifest fields
- [ ] Add missing field checks at workflow start
- [ ] Implement graceful degradation (generic responses when info missing)
- [ ] Add inline contextual questions for critical missing info
- [ ] Create manifest field dependency map

**Files to Modify**:
- All workflow files in `packages/ai-sdk/src/workflows/`
- Create `packages/ai-sdk/src/utils/manifest-requirements.ts`

**Acceptance Criteria**:
- [ ] No workflow crashes due to missing manifest fields
- [ ] Users understand when/why they need to provide more context
- [ ] Workflows provide value even with minimal manifest (20% complete)

---

## Week 3: Smart Interviewing & Context Awareness

### Days 11-12: Just-in-Time Question System

**Goal**: Ask project questions **only when needed** for current task

#### Context-Aware Interview Triggers

```typescript
// packages/ai-sdk/src/core/jit-interviewer.ts
export class JustInTimeInterviewer {
  /**
   * Determines if we should ask for project info right now
   */
  shouldAskForInfo(
    workflow: string,
    manifest: ProjectManifest,
    userQuery: string
  ): {
    shouldAsk: boolean;
    field: keyof ProjectManifest | null;
    urgency: "critical" | "helpful" | "optional";
    question: string;
  } {
    // Example rules:
    // - COMPILING workflow + no features → CRITICAL: "What features should this sprint include?"
    // - TECHNICAL_DOCUMENTING + no techStack → HELPFUL: "What's your tech stack?"
    // - EXPLORE_TECH + no project info → OPTIONAL: (don't ask, provide generic advice)
  }
}
```

#### Priority Matrix

| Workflow | Required Fields | Helpful Fields | Optional Fields |
|----------|----------------|----------------|-----------------|
| INTERVIEW | (all) | - | - |
| QUERY | - | name, features | all others |
| IDEA | - | mission, targetUsers | techStack, phase |
| PRODUCT_DOCUMENTING | features | mission, targetUsers, competitors | techStack |
| TECHNICAL_DOCUMENTING | techStack, features | phase | brandVoice |
| COMPILING | features, techStack | timeline, phase | all others |
| CREATE_TASK | features | techStack | all others |
| EXPLORE_TECH | - | techStack | all others |
| COMPARE_OPTIONS | - | techStack, phase | all others |
| SEEK_ADVICE | - | mission, phase | all others |

**Tasks**:
- [ ] Create `JustInTimeInterviewer` utility class
- [ ] Define field requirements per workflow
- [ ] Implement urgency-based questioning logic
- [ ] Add question scheduling (don't ask multiple in one response)
- [ ] Create question templates for each field

**Files to Create**:
- `packages/ai-sdk/src/core/jit-interviewer.ts`
- `packages/ai-sdk/src/config/workflow-requirements.ts`

**Acceptance Criteria**:
- [ ] Users only get questions relevant to current task
- [ ] No more than 1 question per agent response
- [ ] Questions are contextual and natural
- [ ] Users can skip questions without blocking workflow

---

### Days 13-14: Conversational Interview Flow

**Goal**: Make interview feel like natural conversation, not form-filling

#### Current Interview (Form-like)
```
AI: What's your project name?
User: TaskMaster
AI: What's your mission?
User: Help teams manage tasks
AI: Who are your target users?
...
```

#### New Interview (Conversational)
```
AI: What are you building?
User: A task management app for remote teams
AI: Interesting! Task management for remote teams - that's a crowded space.
    What makes your approach different from tools like Asana or Linear?
User: We focus on async communication and timezone-friendly workflows
AI: Love it! So async-first design for distributed teams.
    Are you thinking web app, mobile, or both?
User: Web app first, React and Node.js
AI: Great stack choice. React + Node.js gives you flexibility.
    [Background: ✅ Added React, Node.js to techStack]

    One thing that helps me give better advice - what's the core workflow?
    Like, how does a user go from "I have a task" to "task is done" in your app?
User: Create task → assign to timezone-appropriate person → async updates → mark complete
AI: Perfect! That gives me a clear picture.
    [Background: ✅ Added key features, updated mission with "async" focus]

    You've given me enough to start helping! I can now:
    • Create detailed technical documentation
    • Plan your MVP sprint
    • Design your database schema
    • Compare state management options for your use case

    What would you like to work on first?
```

**Key Changes**:

1. **Open-ended starter question**: "What are you building?" instead of "What's your project name?"
2. **Follow-up questions** based on previous answers
3. **Acknowledge and validate** user responses
4. **Extract multiple fields** from single response
5. **Show progress** without forcing completion
6. **Offer clear next steps** when enough info is gathered

**Implementation**:

```typescript
// packages/ai-sdk/src/chains/conversational-interview.ts
export interface ConversationalInterviewResponse {
  message: string;              // Natural, contextual response
  manifestUpdates: Partial<ProjectManifest>;
  extractedInfo: string[];      // What was learned this turn
  nextQuestion?: string;        // Only if more info would be valuable
  suggestedTransitions: Array<{ // What user can do next
    label: string;
    intent: Intent;
    description: string;
  }>;
}
```

**Tasks**:
- [ ] Create new conversational interview chain
- [ ] Add multi-field extraction from single response
- [ ] Implement acknowledgment/validation logic
- [ ] Add follow-up question generator (based on previous answer)
- [ ] Create transition suggestions when interview is "good enough"
- [ ] Gradually deprecate old interview chain

**Files to Create**:
- `packages/ai-sdk/src/chains/conversational-interview.ts`
- `packages/ai-sdk/src/workflows/conversational-interview.ts`

**Files to Modify**:
- `packages/ai-sdk/src/workflows/interview.ts` (use new chain)

**Acceptance Criteria**:
- [ ] Interview feels natural, not interrogative
- [ ] Multiple manifest fields update from single user response
- [ ] Users can transition to other workflows mid-interview
- [ ] Interview completion rate increases to 85%+

---

### Day 15: "I Don't Know Yet" Handling

**Goal**: Users can explicitly say they don't know something and still get value

**Examples**:
- "I'm not sure what tech stack to use yet"
- "Still figuring out target users"
- "Don't have a name for the project"

**Response Strategy**:

```typescript
// When user says "I don't know" or "Not sure yet"
if (detectUncertainty(userMessage)) {
  return {
    content: `No problem! Let's explore that together. ${getExplorationPrompt(field)}`,
    suggestedActions: [
      { label: "See popular options", ... },
      { label: "Tell me your constraints", ... },
      { label: "Skip for now", ... }
    ]
  };
}
```

**Field-Specific Exploration Prompts**:

| Field | Uncertainty Response |
|-------|---------------------|
| `techStack` | "Let's explore tech options! What are your priorities? (Performance, developer experience, team expertise, ecosystem...)" |
| `mission` | "No worries! Let's brainstorm. What problem are you trying to solve?" |
| `targetUsers` | "That's okay! Who would benefit most from solving this problem?" |
| `features` | "Let's figure it out together. What's the core action users will do in your app?" |
| `competitors` | "Have you seen any similar tools, even if not exact matches?" |
| `brandVoice` | "We can define that later. For now, should the tone be more formal or casual?" |

**Tasks**:
- [ ] Add uncertainty detection to conversational interview
- [ ] Create exploration prompts for each manifest field
- [ ] Add "Skip for now" option with graceful handling
- [ ] Mark uncertain fields in manifest (e.g., `{ techStack: [], _techStackUncertain: true }`)
- [ ] Create "Review uncertain fields" workflow for later revisit

**Files to Modify**:
- `packages/ai-sdk/src/chains/conversational-interview.ts`
- `packages/ai-sdk/src/interfaces/index.ts` (add uncertainty flags)

**Acceptance Criteria**:
- [ ] "I don't know" responses don't block conversation
- [ ] AI offers helpful exploration when uncertainty detected
- [ ] Uncertain fields can be revisited later
- [ ] Users feel supported, not pressured

---

## Week 4: Polish, Testing & Migration

### Days 16-17: Intent Classification Performance Optimization

**Goal**: Reduce intent detection latency from ~800ms to <300ms

**Current Bottleneck**: Full LLM call for every message

**Optimization Strategies**:

1. **Pattern Matching First** (0-10ms):
```typescript
// Fast paths for obvious intents
const quickPatterns = {
  HELP: /^(help|what can you|show me what)/i,
  CREATE_TASK: /^(create|add|new) (task|ticket|bug)/i,
  EXPLORE_TECH: /^(what|which|compare|vs|versus) (framework|library|tool|tech)/i,
};

// Check patterns first, only use LLM if no match
if (quickPatterns[intent]?.test(userMessage)) {
  return { intent, confidence: 0.95, reasoning: "Pattern match" };
}
```

2. **Smaller Model** (300ms vs 800ms):
```typescript
// Use GPT-3.5-turbo or Claude Haiku for intent classification
// Only use GPT-4/Claude Sonnet for workflow execution
const intentModel = "gpt-3.5-turbo"; // or "claude-3-haiku"
```

3. **Caching** (0ms for duplicates):
```typescript
// Cache intent for similar messages (fuzzy match)
const cacheKey = hashMessage(userMessage);
if (intentCache.has(cacheKey)) {
  return intentCache.get(cacheKey);
}
```

4. **Parallel Detection + Execution**:
```typescript
// Start both in parallel, cancel detection if execution finishes first
const [intentResult, executionResult] = await Promise.race([
  detectIntent(message),
  executeWithDefaultIntent(message, Intent.QUERY)
]);
```

**Tasks**:
- [ ] Implement pattern matching for common intents
- [ ] Switch intent classification to faster model
- [ ] Add LRU cache for intent detection (100 items)
- [ ] Benchmark latency improvements
- [ ] Add monitoring for intent detection time

**Files to Modify**:
- `packages/ai-sdk/src/chains/intent.ts`
- `packages/ai-sdk/src/core/engine.ts`
- Create `packages/ai-sdk/src/utils/intent-cache.ts`

**Acceptance Criteria**:
- [ ] 90% of intents classified in <300ms
- [ ] Pattern matching handles 40%+ of requests
- [ ] Cache hit rate >30%
- [ ] No accuracy regression

---

### Days 18-19: Testing & Quality Assurance

**Goal**: Ensure all changes work correctly and don't break existing functionality

#### Test Categories

1. **Unit Tests**:
```typescript
// packages/ai-sdk/src/chains/__tests__/intent.test.ts
describe("Intent Classification", () => {
  it("should classify EXPLORE_TECH correctly", async () => {
    const result = await detectIntent("What's the best React state library?");
    expect(result.intent).toBe(Intent.EXPLORE_TECH);
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it("should handle ambiguous queries with clarification", async () => {
    const result = await detectIntent("help");
    expect(result.needsClarification).toBe(true);
    expect(result.clarificationQuestion).toBeDefined();
  });
});
```

2. **Integration Tests**:
```typescript
// packages/ai-sdk/src/__tests__/progressive-manifest.test.ts
describe("Progressive Manifest Building", () => {
  it("should enrich manifest from EXPLORE_TECH conversation", async () => {
    const agent = new LocusAgent();
    await agent.handleMessage("I'm using Next.js and Supabase");

    const state = agent.getState();
    expect(state.manifest.techStack).toContain("Next.js");
    expect(state.manifest.techStack).toContain("Supabase");
  });
});
```

3. **E2E Tests**:
```typescript
// apps/web/src/__tests__/e2e/chat-flow.test.ts
describe("Chat Flow", () => {
  it("should allow starting conversation without interview", async () => {
    const { user, screen } = setupTest();

    // User starts with question, not interview
    await user.type(screen.getByRole("textbox"), "What's the best database for a SaaS app?");
    await user.click(screen.getByRole("button", { name: /send/i }));

    // Should get response, not interview question
    expect(await screen.findByText(/database/i)).toBeInTheDocument();
    expect(screen.queryByText(/project name/i)).not.toBeInTheDocument();
  });
});
```

**Tasks**:
- [ ] Write 50+ unit tests for intent classification
- [ ] Write 30+ integration tests for workflows
- [ ] Write 20+ E2E tests for chat flows
- [ ] Create test dataset of 100 user messages with expected intents
- [ ] Add regression tests for manifest enrichment
- [ ] Test uncertainty handling ("I don't know" responses)

**Files to Create**:
- `packages/ai-sdk/src/chains/__tests__/intent.test.ts`
- `packages/ai-sdk/src/workflows/__tests__/*.test.ts`
- `packages/ai-sdk/src/__tests__/progressive-manifest.test.ts`
- `apps/web/src/__tests__/e2e/chat-flow.test.ts`

**Acceptance Criteria**:
- [ ] 90%+ code coverage on new code
- [ ] All tests pass
- [ ] No flaky tests
- [ ] Performance tests confirm <300ms intent classification

---

### Day 20: Migration, Rollout & Documentation

**Goal**: Deploy changes safely and document new system

#### Migration Strategy

**Phase 1: Feature Flag (Days 20-22)**
```typescript
// apps/api/src/config/feature-flags.ts
export const features = {
  PROGRESSIVE_INTERVIEW: process.env.ENABLE_PROGRESSIVE_INTERVIEW === "true",
  NEW_INTENTS: process.env.ENABLE_NEW_INTENTS === "true",
  CONVERSATIONAL_INTERVIEW: process.env.ENABLE_CONVERSATIONAL_INTERVIEW === "true",
};

// Gradual rollout:
// - Internal team: 100%
// - Beta users: 50%
// - All users: 10% → 25% → 50% → 100% over 2 weeks
```

**Phase 2: Data Migration (Day 23)**
```typescript
// Existing sessions need no migration
// New field: manifest._uncertainFields for tracking "I don't know" responses
```

**Phase 3: Monitoring (Days 24-30)**
- Track intent classification accuracy
- Monitor manifest completion rates
- Watch for error spikes
- Gather user feedback

#### Documentation Updates

**Tasks**:
- [ ] Update `.locus/artifacts/` with this sprint plan
- [ ] Write migration guide for developers
- [ ] Update API documentation with new intents
- [ ] Create user-facing changelog
- [ ] Add inline code comments for new architecture
- [ ] Create architecture decision record (ADR) for progressive interview

**Files to Create**:
- `.locus/artifacts/AI_CHAT_INTENT_OPTIMIZATION_1MONTH_SPRINT.md` (this file)
- `.locus/artifacts/AI_CHAT_MIGRATION_GUIDE.md`
- `.locus/artifacts/AI_CHAT_ARCHITECTURE_ADR.md`
- `packages/ai-sdk/CHANGELOG.md`

**Acceptance Criteria**:
- [ ] Feature flags work correctly
- [ ] Rollback procedure documented and tested
- [ ] All documentation updated
- [ ] Team trained on new system

---

## Detailed Task Breakdown by File

### New Files to Create (35 files)

#### Workflows (5 files)
1. `packages/ai-sdk/src/workflows/explore-tech.ts`
2. `packages/ai-sdk/src/workflows/compare-options.ts`
3. `packages/ai-sdk/src/workflows/seek-advice.ts`
4. `packages/ai-sdk/src/workflows/help.ts`
5. `packages/ai-sdk/src/workflows/provide-context.ts`

#### Chains (6 files)
6. `packages/ai-sdk/src/chains/explore-tech.ts`
7. `packages/ai-sdk/src/chains/compare-options.ts`
8. `packages/ai-sdk/src/chains/seek-advice.ts`
9. `packages/ai-sdk/src/chains/help.ts`
10. `packages/ai-sdk/src/chains/provide-context.ts`
11. `packages/ai-sdk/src/chains/conversational-interview.ts`

#### Core Logic (4 files)
12. `packages/ai-sdk/src/core/manifest-enricher.ts`
13. `packages/ai-sdk/src/core/jit-interviewer.ts`
14. `packages/ai-sdk/src/config/workflow-requirements.ts`
15. `packages/ai-sdk/src/utils/intent-cache.ts`

#### Tests (10 files)
16. `packages/ai-sdk/src/chains/__tests__/intent.test.ts`
17. `packages/ai-sdk/src/workflows/__tests__/explore-tech.test.ts`
18. `packages/ai-sdk/src/workflows/__tests__/compare-options.test.ts`
19. `packages/ai-sdk/src/workflows/__tests__/seek-advice.test.ts`
20. `packages/ai-sdk/src/workflows/__tests__/help.test.ts`
21. `packages/ai-sdk/src/workflows/__tests__/provide-context.test.ts`
22. `packages/ai-sdk/src/__tests__/progressive-manifest.test.ts`
23. `packages/ai-sdk/src/__tests__/jit-interviewer.test.ts`
24. `packages/ai-sdk/src/__tests__/manifest-enricher.test.ts`
25. `apps/web/src/__tests__/e2e/chat-flow.test.ts`

#### Documentation (10 files)
26. `.locus/artifacts/AI_CHAT_INTENT_OPTIMIZATION_1MONTH_SPRINT.md`
27. `.locus/artifacts/AI_CHAT_TASK_BREAKDOWN.md`
28. `.locus/artifacts/AI_CHAT_MIGRATION_GUIDE.md`
29. `.locus/artifacts/AI_CHAT_ARCHITECTURE_ADR.md`
30. `.locus/artifacts/AI_CHAT_TESTING_STRATEGY.md`
31. `.locus/artifacts/AI_CHAT_USER_GUIDE.md`
32. `packages/ai-sdk/CHANGELOG.md`
33. `packages/ai-sdk/README.md` (update)
34. `apps/web/docs/ai-chat-improvements.md`
35. `apps/api/docs/ai-endpoints.md` (update)

### Files to Modify (20 files)

#### Core SDK
1. `packages/ai-sdk/src/chains/intent.ts` - Add 5 new intents, improve prompt, add caching
2. `packages/ai-sdk/src/core/agent.ts` - Remove forced interview, add enrichment hook
3. `packages/ai-sdk/src/core/engine.ts` - Register new workflows, add clarification flow
4. `packages/ai-sdk/src/core/context.ts` - Add uncertainty tracking
5. `packages/ai-sdk/src/interfaces/index.ts` - Update types for new intents, enrichment
6. `packages/ai-sdk/src/workflows/interview.ts` - Use conversational chain, update triggers
7. `packages/ai-sdk/src/workflows/query.ts` - Add JIT questioning
8. `packages/ai-sdk/src/workflows/idea.ts` - Add JIT questioning
9. `packages/ai-sdk/src/workflows/compiling.ts` - Handle partial manifests
10. `packages/ai-sdk/src/workflows/product-documenting.ts` - Handle partial manifests
11. `packages/ai-sdk/src/workflows/technical-documenting.ts` - Handle partial manifests

#### Backend API
12. `apps/api/src/ai/ai.service.ts` - Add enrichment support, feature flags
13. `apps/api/src/ai/ai.controller.ts` - Add new endpoints if needed
14. `apps/api/src/config/feature-flags.ts` - Add progressive interview flags

#### Frontend
15. `apps/web/src/components/chat/ChatInterface.tsx` - Show manifest completeness
16. `apps/web/src/components/chat/MessageItem.tsx` - Show enrichment notifications
17. `apps/web/src/stores/chat-store.ts` - Track completeness, new intents
18. `apps/web/src/hooks/useChat.ts` - Handle new response types

#### Config
19. `packages/ai-sdk/tsconfig.json` - Ensure types are correct
20. `CLAUDE.md` - Update project instructions

---

## Success Metrics & Tracking

### Key Performance Indicators (KPIs)

| KPI | Measurement Method | Target | Tracking |
|-----|-------------------|--------|----------|
| Time to First Value | Analytics: First message → First useful response | <30 sec | Mixpanel/Amplitude |
| Manifest Completion Rate | % of sessions with completeness >70% | 85% | Database query |
| Intent Classification Accuracy | Manual review of 100 samples/week | 95% | Weekly audit |
| Conversation Quality Score | User thumbs up/down per response | 4.5/5 | In-app feedback |
| "I don't know" Handling Success | % of uncertain responses that convert to value | 70% | Custom tracking |
| Latency (Intent Detection) | P95 response time | <300ms | APM (Sentry/Datadog) |

### User Satisfaction Survey (Post-Sprint)

Send to 100 users after 1 week of using new system:

1. **How easy is it to start a conversation with Locus AI?** (1-5)
2. **How often do you feel blocked by needing to provide project info?** (Never / Rarely / Sometimes / Often / Always)
3. **How well does Locus AI understand your questions?** (1-5)
4. **How natural does the conversation feel?** (1-5)
5. **Would you recommend Locus AI to a colleague?** (NPS: 0-10)

**Open-ended**:
- What's your favorite improvement?
- What's still frustrating?
- What should we build next?

---

## Risk Assessment & Mitigation

### High-Risk Items

#### 1. Intent Classification Accuracy Drops
**Risk**: New intents cause confusion, accuracy falls below 80%
**Impact**: Poor user experience, wrong workflows triggered
**Mitigation**:
- [ ] Create test dataset BEFORE implementation (100 samples)
- [ ] A/B test old vs new classification (measure accuracy difference)
- [ ] Add confidence threshold (if <60%, ask clarifying question)
- [ ] Feature flag to rollback instantly

**Owner**: AI SDK Lead
**Contingency**: Roll back to 8 intents, iterate on prompts

---

#### 2. Manifest Enrichment False Positives
**Risk**: AI extracts wrong info from conversations (e.g., user mentions "React" as competitor)
**Impact**: Incorrect project context, wrong recommendations
**Mitigation**:
- [ ] Require 80%+ confidence for auto-updates
- [ ] Show notifications for all auto-updates (user can undo)
- [ ] Add "Review project details" button to catch errors
- [ ] Log all enrichment decisions for audit

**Owner**: AI SDK Lead
**Contingency**: Require manual approval for all updates

---

#### 3. Users Confused by No Interview
**Risk**: Users don't know how to start, expect guided flow
**Impact**: Reduced engagement, poor first impression
**Mitigation**:
- [ ] Add onboarding tooltip: "Ask me anything! I'll learn about your project as we talk."
- [ ] Show example questions on empty chat state
- [ ] Add "Tell me about your project" quick action button
- [ ] Monitor "HELP" intent usage (spike = confusion)

**Owner**: Product Manager
**Contingency**: Add optional "guided setup" mode

---

#### 4. Performance Regression
**Risk**: Enrichment + JIT questioning slow down responses
**Impact**: Poor UX, users abandon conversations
**Mitigation**:
- [ ] Run enrichment asynchronously (don't block response)
- [ ] Cache intent detection (LRU cache)
- [ ] Use faster model for classification (Haiku vs Sonnet)
- [ ] Monitor P95 latency (alert if >2 seconds)

**Owner**: Backend Lead
**Contingency**: Disable enrichment, simplify JIT logic

---

## Dependencies & Prerequisites

### Team Requirements
- **2 Backend Engineers** (AI SDK + API)
- **1 Frontend Engineer** (Chat UI updates)
- **1 QA Engineer** (Testing + validation)
- **1 Product Manager** (Metrics + user research)

### External Dependencies
- **LLM Provider**: OpenAI GPT-4 / Anthropic Claude (no changes needed)
- **Database**: PostgreSQL (add 1 field: `manifest._uncertainFields`)
- **Feature Flag System**: LaunchDarkly / Custom (already exists)

### Prerequisite Tasks (Must complete BEFORE sprint)
- [ ] Set up feature flag infrastructure
- [ ] Create test dataset of 100 user messages (with expected intents)
- [ ] Set up analytics tracking for KPIs
- [ ] Get buy-in from stakeholders on approach

---

## Post-Sprint: Iteration Plan

### Week 5-6: Feedback & Polish
- [ ] Analyze user feedback (survey + in-app)
- [ ] Fix top 5 pain points
- [ ] Improve intent classification based on real data
- [ ] Optimize enrichment accuracy

### Week 7-8: Advanced Features
- [ ] Multi-turn workflows (e.g., "Plan feature" → "Create tasks" → "Write PRD")
- [ ] Proactive suggestions ("Based on your project, you might want to...")
- [ ] Context inheritance (child projects inherit parent manifest)
- [ ] Manifest versioning (track changes over time)

### Week 9-12: Ecosystem Integration
- [ ] Import project context from GitHub README
- [ ] Sync manifest with package.json / requirements.txt
- [ ] Export manifest to Linear / Jira / Asana
- [ ] AI-powered manifest refinement ("Review my project details")

---

## Communication Plan

### Internal (Team)
- **Daily Standups**: 15 min (9:00 AM) - blockers, progress, plans
- **Weekly Demos**: Friday 4:00 PM - show progress to stakeholders
- **Sprint Retrospectives**: End of each week - what went well, what didn't

### External (Users)
- **Week 1**: No communication (internal testing)
- **Week 2**: Beta announcement to 50 power users (email)
- **Week 3**: Feature preview blog post + changelog
- **Week 4**: General release announcement (in-app + email)
- **Week 5**: User survey + case study

### Stakeholders
- **Weekly Updates**: Email every Friday (progress, risks, metrics)
- **Mid-Sprint Check-in**: Day 10 (adjust course if needed)
- **Final Presentation**: Day 25 (results, learnings, next steps)

---

## Appendix

### A. Example Conversations (Before vs After)

#### Scenario 1: New User Exploring Tech Options

**BEFORE (Forced Interview)**:
```
User: Hi!
AI: Welcome! Let's start by learning about your project. What's your project name?
User: I don't have one yet, just exploring ideas
AI: That's okay, you can change it later. What would you like to call it for now?
User: Ugh... "Project 1" I guess
AI: Great! What's your mission?
User: [frustrated, leaves]
```

**AFTER (Flexible Entry)**:
```
User: Hi!
AI: Hey! I'm here to help you build amazing software. What are you working on?
User: I don't have one yet, just exploring ideas
AI: Perfect! I love the exploration phase. What kind of problem are you thinking about solving?
User: Something to help developers manage their tasks better
AI: Nice! Task management for developers - that's a great space. Are you thinking:
    • Build it yourself (custom app)
    • Extend existing tools (Jira plugin, Asana integration)
    • Internal tool for your team
    • SaaS product for others
User: Build it myself, probably a web app
AI: Awesome! Web app it is. A few quick questions to point you in the right direction:
    • Full-stack or just frontend (API already exists)?
    • Team size? (Solo, small team, large org)
    • Any must-have tech? (React, Vue, Python, etc.)

    Or if you want, I can just recommend a solid starter stack and we go from there?
User: Recommend a stack, I'm open
AI: For a task management web app, I'd suggest:
    **Frontend**: React + Next.js (great DX, SEO-friendly, easy deployment)
    **Backend**: Next.js API routes or separate Node.js/Express
    **Database**: PostgreSQL (reliable, great for relational data like tasks/users)
    **Styling**: Tailwind CSS (fast, modern)
    **Deployment**: Vercel (seamless Next.js hosting)

    [Background: ✅ Added React, Next.js, PostgreSQL, Tailwind to techStack]

    Sound good? Want to explore alternatives? Or ready to start planning features?
User: Sounds great! Let's plan features
AI: Excellent! Let's break down your task management app...
```

---

#### Scenario 2: User Asking Technical Question Mid-Interview

**BEFORE (Blocked)**:
```
User: [In interview] What's the best React state library?
AI: Let's finish the interview first. What's your brand voice?
User: [ignores question] Seriously, should I use Redux or Zustand?
AI: I'll help with that after we complete your project profile. What's your brand voice?
User: [leaves, frustrated]
```

**AFTER (Flexible)**:
```
User: What's the best React state library?
AI: Great question! The best choice depends on your app's complexity:

    **Zustand** (Recommended for most cases):
    • ✅ Simple API, minimal boilerplate
    • ✅ Great TypeScript support
    • ✅ ~1KB size
    • ✅ Perfect for small-to-medium apps

    **Redux Toolkit**:
    • ✅ Best for large, complex apps
    • ✅ Excellent DevTools
    • ✅ Strong ecosystem
    • ❌ More boilerplate

    **Jotai/Recoil**:
    • ✅ Atomic state (great for fine-grained updates)
    • ✅ Good for apps with many independent states
    • ❌ Smaller community

    **Context + useReducer**:
    • ✅ Built-in, no extra dependency
    • ❌ Can cause performance issues at scale

    What's your app like? (Simple CRUD, real-time collab, e-commerce, etc.)
User: Task management app, medium complexity
AI: Zustand is perfect for that! Task management apps have:
    • Task lists (Zustand handles this beautifully)
    • Filters (easy with Zustand selectors)
    • Optimistic updates (Zustand makes this simple)

    I can show you a basic Zustand setup for tasks if you'd like?

    [Background: ✅ Added Zustand to techStack, inferred "task management" as feature]
User: Yes please!
AI: [Provides code example]
```

---

### B. Glossary of Terms

| Term | Definition |
|------|------------|
| **Intent** | The user's goal for the current message (e.g., QUERY, INTERVIEW, EXPLORE_TECH) |
| **Workflow** | A multi-step process to fulfill an intent (e.g., InterviewWorkflow, CompilingWorkflow) |
| **Manifest** | Structured project information (name, tech stack, features, etc.) |
| **Completeness Score** | Percentage of required manifest fields that are filled (0-100%) |
| **Enrichment** | Automatic extraction of project info from conversations |
| **JIT Interviewing** | Asking project questions only when needed for current task |
| **Progressive Building** | Gradually building manifest across multiple conversations |
| **Uncertainty Flag** | Marker that user explicitly said "I don't know" for a field |
| **Clarification Flow** | AI asking follow-up question when intent confidence is low |

---

### C. Code Examples

#### Example 1: Pattern Matching for Fast Intent Detection

```typescript
// packages/ai-sdk/src/utils/intent-patterns.ts
export const INTENT_PATTERNS: Record<Intent, RegExp[]> = {
  [Intent.HELP]: [
    /^(help|what can you|show me what|capabilities)/i,
    /^what (can|do) (you|locus)/i,
  ],
  [Intent.CREATE_TASK]: [
    /^(create|add|new|make) (a )?(task|ticket|bug|issue)/i,
    /^(can you |please )?(create|add|make)/i,
  ],
  [Intent.EXPLORE_TECH]: [
    /^(what|which|best|recommend|suggest) (framework|library|tool|database|tech)/i,
    /^(compare|vs|versus|difference between)/i,
    /should i use/i,
  ],
  [Intent.SEEK_ADVICE]: [
    /^(should i|is it (good|bad|okay) to|recommended to)/i,
    /^(advice|recommend|suggest|opinion) (on|about)/i,
  ],
  [Intent.QUERY]: [
    /^(what|how|when|where|why|who)/i,
    /^(show|list|display|get)/i,
  ],
  [Intent.PROVIDE_CONTEXT]: [
    /^(my project|i'?m (building|using|working on)|here'?s my)/i,
    /^let me tell you/i,
  ],
};

export function quickMatchIntent(message: string): Intent | null {
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (patterns.some(pattern => pattern.test(message))) {
      return intent as Intent;
    }
  }
  return null;
}
```

#### Example 2: Manifest Enrichment Chain

```typescript
// packages/ai-sdk/src/chains/manifest-enrichment.ts
import { PromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";

const ENRICHMENT_PROMPT = PromptTemplate.fromTemplate(`
You are a project information extractor. Analyze the conversation and extract structured project details.

Current Project Manifest:
{currentManifest}

Recent Conversation:
{conversationHistory}

Latest User Message:
{latestMessage}

Extract any NEW information about:
- name: Project name
- mission: What the project does and why
- targetUsers: Who will use it
- techStack: Technologies mentioned (languages, frameworks, databases, tools)
- features: Specific functionality mentioned
- competitors: Other tools/products mentioned as similar
- brandVoice: Tone/personality (formal, casual, playful, etc.)
- successMetrics: KPIs, goals, metrics
- phase: PLANNING | MVP_BUILD | SCALING | MAINTENANCE

IMPORTANT:
- Only extract information explicitly mentioned or strongly implied
- Do not make assumptions
- Indicate confidence level (0-1) for each extraction
- If user says "I don't know" or shows uncertainty, mark that field as uncertain

Return JSON:
{{
  "updates": {{
    "techStack": ["React", "PostgreSQL"],  // Only NEW items
    "features": ["user authentication"],
    ...
  }},
  "uncertainFields": ["brandVoice"],  // Fields user is uncertain about
  "confidence": 0.85,  // Overall confidence
  "reasoning": "User mentioned React and PostgreSQL explicitly. Inferred user auth from 'login system'."
}}
`);

export async function enrichManifest(
  currentManifest: ProjectManifest,
  conversationHistory: Message[],
  latestMessage: string
): Promise<ManifestEnrichmentResult> {
  const chain = ENRICHMENT_PROMPT
    .pipe(model)
    .pipe(new JsonOutputParser());

  const result = await chain.invoke({
    currentManifest: JSON.stringify(currentManifest, null, 2),
    conversationHistory: formatConversationHistory(conversationHistory),
    latestMessage,
  });

  return result as ManifestEnrichmentResult;
}
```

#### Example 3: JIT Interviewer Decision Logic

```typescript
// packages/ai-sdk/src/core/jit-interviewer.ts
export class JustInTimeInterviewer {
  /**
   * Decides if we should ask for project info right now
   */
  shouldAskForInfo(
    workflow: Intent,
    manifest: ProjectManifest,
    userQuery: string
  ): JITQuestion | null {
    const requirements = WORKFLOW_REQUIREMENTS[workflow];

    // Check critical fields
    for (const field of requirements.critical) {
      if (this.isFieldEmpty(manifest[field])) {
        return {
          field,
          urgency: "critical",
          question: this.generateQuestion(field, "critical", userQuery),
        };
      }
    }

    // Check helpful fields (only ask if it would significantly improve response)
    if (Math.random() < 0.3) {  // 30% chance to ask for helpful field
      for (const field of requirements.helpful) {
        if (this.isFieldEmpty(manifest[field])) {
          return {
            field,
            urgency: "helpful",
            question: this.generateQuestion(field, "helpful", userQuery),
          };
        }
      }
    }

    return null;  // No question needed
  }

  private generateQuestion(
    field: keyof ProjectManifest,
    urgency: "critical" | "helpful",
    userQuery: string
  ): string {
    const templates = {
      critical: {
        techStack: "To give you the best answer, what's your tech stack?",
        features: "What features does your project include? (Helps me give specific advice)",
      },
      helpful: {
        techStack: "By the way, knowing your tech stack would help me give more tailored advice. Mind sharing?",
        targetUsers: "Quick question: who are you building this for?",
      },
    };

    return templates[urgency][field] || `Could you tell me about your ${field}?`;
  }
}
```

---

### D. Testing Checklist

#### Intent Classification Tests
- [ ] All 13 intents classify correctly (100 test samples)
- [ ] Ambiguous queries trigger clarification (<60% confidence)
- [ ] Pattern matching handles 40%+ of common intents
- [ ] Multi-intent responses rank correctly
- [ ] Performance: 90% of classifications <300ms

#### Progressive Manifest Tests
- [ ] Enrichment extracts info from all workflow types
- [ ] False positive rate <10%
- [ ] Uncertainty detection works ("I don't know" → flag set)
- [ ] Completeness score updates correctly
- [ ] Background enrichment doesn't block responses

#### Conversational Interview Tests
- [ ] Multi-field extraction from single response
- [ ] Follow-up questions are contextual
- [ ] Users can transition to other workflows mid-interview
- [ ] "I don't know" responses offer exploration
- [ ] Interview completion rate >85%

#### JIT Interviewing Tests
- [ ] Critical fields trigger questions
- [ ] Helpful fields asked <30% of time
- [ ] No more than 1 question per response
- [ ] Questions are contextual to current task
- [ ] Users can skip questions

#### Performance Tests
- [ ] Intent detection <300ms (P95)
- [ ] Enrichment runs asynchronously
- [ ] Cache hit rate >30%
- [ ] No latency regression vs baseline

#### E2E Tests
- [ ] User starts with tech question (no interview)
- [ ] Manifest builds to >60% organically
- [ ] User can explicitly trigger interview
- [ ] Completeness indicator shows in UI
- [ ] Users can review and edit manifest

---

### E. Rollout Checklist

#### Pre-Launch (Days 1-19)
- [ ] All development complete
- [ ] All tests passing (unit, integration, E2E)
- [ ] Code review approved
- [ ] Documentation updated
- [ ] Feature flags configured
- [ ] Monitoring/alerting set up
- [ ] Rollback procedure tested

#### Launch Day (Day 20)
- [ ] Deploy to production
- [ ] Enable feature flags for internal team (100%)
- [ ] Monitor error rates, latency
- [ ] Test core flows manually
- [ ] Fix any critical bugs

#### Week 1 (Days 21-25)
- [ ] Enable for beta users (50 users)
- [ ] Send beta announcement email
- [ ] Monitor metrics (intent accuracy, completion rate)
- [ ] Gather feedback (in-app + email)
- [ ] Make adjustments based on feedback

#### Week 2 (Days 26-30)
- [ ] Gradual rollout: 10% → 25% → 50% → 100%
- [ ] Monitor metrics daily
- [ ] Fix non-critical bugs
- [ ] Prepare general release announcement

#### Post-Launch (Days 31+)
- [ ] Send user survey
- [ ] Analyze results vs targets
- [ ] Write case study
- [ ] Plan iteration based on feedback

---

## Quick Reference

### Key Files to Know

| File | Purpose |
|------|---------|
| `packages/ai-sdk/src/chains/intent.ts` | Intent classification logic |
| `packages/ai-sdk/src/core/agent.ts` | Main orchestrator (LocusAgent) |
| `packages/ai-sdk/src/core/manifest-enricher.ts` | Progressive manifest building |
| `packages/ai-sdk/src/core/jit-interviewer.ts` | Just-in-time question system |
| `packages/ai-sdk/src/workflows/conversational-interview.ts` | Natural interview flow |
| `apps/api/src/ai/ai.service.ts` | Backend service layer |
| `apps/web/src/components/chat/ChatInterface.tsx` | Chat UI |

### Commands

```bash
# Development
bun run dev                    # Start all services
bun run dev:ai-sdk            # Start AI SDK only

# Testing
bun run test                   # Run all tests
bun run test:ai-sdk           # Test AI SDK only
bun run test:e2e              # E2E tests

# Quality
bun run lint                   # Lint all code
bun run typecheck             # Type checking
bun run lint:fix              # Auto-fix lint issues

# Deployment
bun run build                  # Build all packages
bun run deploy:staging        # Deploy to staging
bun run deploy:production     # Deploy to production
```

### Contacts

**Sprint Lead**: [Name]
**AI SDK Lead**: [Name]
**Backend Lead**: [Name]
**Frontend Lead**: [Name]
**QA Lead**: [Name]
**Product Manager**: [Name]

**Slack Channel**: #ai-chat-optimization
**Meeting Notes**: [Link]
**Task Board**: [Link]

---

**Document Version**: 1.0
**Last Updated**: 2026-01-31
**Status**: Ready for Review
**Next Steps**: Team review → Approval → Kick-off (Week 1, Day 1)

