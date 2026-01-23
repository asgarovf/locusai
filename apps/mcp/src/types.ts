export interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assigneeRole?: string;
  lockedBy?: string | null;
  lockExpiresAt?: string | null;
  assignedTo?: string | null;
  acceptanceChecklist?: Array<{
    id: string;
    text: string;
    done: boolean;
  }>;
}

export interface Sprint {
  id: number;
  name: string;
  status: string;
  mindmap?: string | null;
}

export const ROLE_PROMPTS: Record<string, string> = {
  FRONTEND: `## Frontend Implementation Guidelines

### Locus Design Aesthetics
- **Visual Excellence**: Create stunning, premium interfaces. Use vibrant, harmonious color palettes (avoid generic colors).
- **Glassmorphism & Depth**: Use subtle backgrounds, blurred overlays, and soft shadows to create depth.
- **Dynamic Interactions**: Implement smooth transitions, hover effects, and micro-animations for a responsive feel.
- **Typography**: Use modern, readable fonts (Inter, Roboto, Outfit). Ensure perfect hierarchy and spacing.

### Technical Standards
- **Component-Driven**: Build modular, reusable components with clear prop interfaces.
- **Modern CSS**: Use Vanilla CSS with variables for the design system. Avoid ad-hoc utilities.
- **Performance**: Optimize assets and minimize re-renders.

### Workflow Rules (CRITICAL)
1. **Implementation**: Build the feature based on the technical draft and acceptance criteria.
2. **Verification**: Run \`bun run lint\` and \`bun run typecheck\`. Use \`ci.run(taskId, "quick")\` to validate your changes.
3. **Submission**: Use \`kanban.check\` to mark items as done, then move to **VERIFICATION** using \`kanban.move(taskId, "VERIFICATION")\`.
4. **NEVER move to DONE**: Only the manager can approve a task to DONE.
5. **Rejection**: If rejected, review feedback in task comments and resubmit.`,

  BACKEND: `## Backend Implementation Guidelines

### Architecture & Quality
- **Modularity**: Use a strict Controller-Service-Repository pattern.
- **Type Safety**: Ensure 100% type coverage. Avoid \`any\`. Use Zod for validation.
- **Error Handling**: Use the centralized error handling middleware and return semantic HTTP status codes.

### Security & Efficiency
- **Data Integrity**: Use transactions where necessary. Optimize queries to avoid N+1 problems.
- **Security**: Sanitize all inputs and follow least privilege principles.

### Workflow Rules (CRITICAL)
1. **Implementation**: Implement core logic and endpoints according to the draft.
2. **Verification**: Run \`bun run lint\` and \`bun run typecheck\`. Use \`ci.run(taskId, "quick")\` to validate your changes.
3. **Submission**: Use \`kanban.check\` to mark items as done, then move to **VERIFICATION** using \`kanban.move(taskId, "VERIFICATION")\`.
4. **NEVER move to DONE**: Only the manager can approve a task to DONE.
5. **Rejection**: If rejected, review feedback in task comments and resubmit.`,
};
