export const TASK_TEMPLATES = {
  bug: {
    title: "",
    description:
      "## Steps to Reproduce\n\n1. \n2. \n3. \n\n## Expected Behavior\n\n\n## Actual Behavior\n\n",
    priority: "high",
    status: "backlog",
  },
  feature: {
    title: "",
    description:
      "## User Story\n\nAs a [user type], I want [goal] so that [benefit].\n",
    priority: "medium",
    status: "backlog",
  },
  documentation: {
    title: "",
    description: "## Purpose\n\n\n## Audience\n\n\n## Content\n\n",
    priority: "low",
    status: "backlog",
  },
  research: {
    title: "",
    description:
      "## Research Question\n\n\n## Approach\n\n\n## Deliverables\n\n",
    priority: "medium",
    status: "backlog",
  },
} as const;

export type TaskTemplate = keyof typeof TASK_TEMPLATES;
