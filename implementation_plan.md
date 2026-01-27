# Implementation Plan: Chat Interface Compliance with Server-Authoritative Sprint Planning

The objective is to ensure the web application's chat interface is fully aligned with the new server-side sprint planning logic. This involves exposing the planning capability to the AI agent and updating the UI to reflect planning status.

## 1. AI SDK Alignment
- [ ] Add `plan(sprintId, workspaceId)` method to `ISprintProvider` in `packages/ai-sdk/src/tools/interfaces.ts`.
- [ ] Implement `createPlanSprintTool` in `packages/ai-sdk/src/tools/sprints.ts`.
- [ ] Register `createPlanSprintTool` in `packages/ai-sdk/src/tools/index.ts`.

## 2. API Alignment
- [ ] Update `AiService` in `apps/api/src/ai/ai.service.ts` to implement the `plan` method in the `locusProvider` passed to the agent.
  - This should call `this.sprintsService.planSprintWithAi`.

## 3. Web Application Enhancements
- [ ] Update `useChat` hook or chat components if they need to handle special "planning" artifacts or status messages.
- [ ] Add a visual indicator or system message when the AI triggers a sprint plan.
- [ ] Ensure the UI refreshes task lists/board after a plan is updated (if applicable, though ordering is handled on dispatch).

## 4. Verification
- [ ] Verify that the AI can now respond to requests like "Please plan my current sprint" or "Reorder tasks based on dependencies".
- [ ] Confirm the database `order` column is updated and the `mindmap` is refreshed.
