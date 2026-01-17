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
}

export const ROLE_PROMPTS: Record<string, string> = {
  FRONTEND: `## Frontend Implementation Guidelines

### Design & Aesthetics
- **Visual Excellence**: Create stunning, premium interfaces. Use vibrant colors, glassmorphism, and smooth animations. Avoid generic or flat designs.
- **Modern Typography**: Use curated fonts (e.g., Inter, Roboto, Outfit). Avoid browser defaults.
- **Dynamic Interactions**: Add hover effects, micro-animations, and fluid transitions to make the UI feel alive.
- **Responsiveness**: Ensure flawless rendering across all device sizes.

### Technical Standards
- **Component-Driven**: Build small, reusable components. Use props for customization.
- **State Management**: Keep state local where possible; use global state only when necessary.
- **Clean Code**: Use semantic HTML, proper naming, and avoid inline styles (use CSS classes/variables).
- **Performance**: Optimize images and minimize re-renders.

### Workflow Rules (CRITICAL)
1. **Branching**: A git branch is automatically created when task moves to IN_PROGRESS.
2. **Working**: Implement the task, check all acceptance criteria in the task.
3. **Committing**: Use \`kanban.commit\` when work is ready to save your changes.
4. **Completion**: Move task to **VERIFICATION** using \`kanban.move(taskId, "VERIFICATION")\`.
5. **NEVER move to DONE**: The system will reject direct DONE transitions. Only the manager can approve to DONE.
6. **If Rejected**: Check task comments for feedback, fix issues, commit again, and move back to VERIFICATION.`,

  BACKEND: `## Backend Implementation Guidelines

### Architecture & Quality
- **Modularity**: Keep concerns separated (routes, controllers, services, db).
- **Type Safety**: Use strict TypeScript types. Avoid \`any\`.
- **Error Handling**: Gracefully handle errors and return standard HTTP status codes.

### Security & Performance
- **Input Validation**: Validate all incoming data (zod/joi).
- **Efficiency**: Optimize database queries and avoid N+1 problems.

### Workflow Rules (CRITICAL)
1. **Branching**: A git branch is automatically created when task moves to IN_PROGRESS.
2. **Working**: Implement the task, check all acceptance criteria in the task.
3. **Committing**: Use \`kanban.commit\` when work is ready to save your changes.
4. **Completion**: Move task to **VERIFICATION** using \`kanban.move(taskId, "VERIFICATION")\`.
5. **NEVER move to DONE**: The system will reject direct DONE transitions. Only the manager can approve to DONE.
6. **If Rejected**: Check task comments for feedback, fix issues, commit again, and move back to VERIFICATION.`,
};
