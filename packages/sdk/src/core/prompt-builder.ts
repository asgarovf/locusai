import { existsSync, readFileSync } from "node:fs";
import { AssigneeRole, Task } from "@locusai/shared";
import { getLocusPath } from "./config.js";

export class PromptBuilder {
  constructor(private projectPath: string) {}

  async build(task: Task): Promise<string> {
    let prompt = `# Task: ${task.title}\n\n`;

    const roleText = this.roleToText(task.assigneeRole);
    if (roleText) {
      prompt += `## Role\nYou are acting as a ${roleText}.\n\n`;
    }

    prompt += `## Description\n${task.description || "No description provided."}\n\n`;

    // 1. Add CLAUDE.md context
    const contextPath = getLocusPath(this.projectPath, "contextFile");
    if (existsSync(contextPath)) {
      try {
        const context = readFileSync(contextPath, "utf-8");
        prompt += `## Project Context (from CLAUDE.md)\n${context}\n\n`;
      } catch (err) {
        console.warn(`Warning: Could not read context file: ${err}`);
      }
    }

    // 2. Add Codebase Index context
    const indexPath = getLocusPath(this.projectPath, "indexFile");
    if (existsSync(indexPath)) {
      prompt += `## Codebase Overview\nThere is an index file in the .locus/codebase-index.json and if you need you can check it.\n\n`;
    }

    // 3. Add Documents
    if (task.docs && task.docs.length > 0) {
      prompt += `## Attached Documents\n`;
      for (const doc of task.docs) {
        prompt += `### ${doc.title}\n${doc.content || "(No content)"}\n\n`;
      }
    }

    // 4. Add Checklist
    if (task.acceptanceChecklist && task.acceptanceChecklist.length > 0) {
      prompt += `## Acceptance Criteria\n`;
      for (const item of task.acceptanceChecklist) {
        prompt += `- ${item.done ? "[x]" : "[ ]"} ${item.text}\n`;
      }
      prompt += "\n";
    }

    // 5. Add Comments & Feedback
    if (task.comments && task.comments.length > 0) {
      const comments = task.comments.slice(0, 5);
      prompt += `## Task History & Feedback\n`;
      prompt += `Review the following comments for context or rejection feedback:\n\n`;
      for (const comment of comments) {
        const date = new Date(comment.createdAt).toLocaleString();
        prompt += `### ${comment.author} (${date})\n${comment.text}\n\n`;
      }
    }

    prompt += `## Instructions
1. Complete this task. 
2. **Artifact Management**: If you create any high-level documentation (PRDs, technical drafts, architecture docs), you MUST save them in \`.locus/artifacts/\`. Do NOT create them in the root directory.
3. **Paths**: Use relative paths from the project root at all times. Do NOT use absolute local paths (e.g., /Users/...).
4. When finished successfully, output: <promise>COMPLETE</promise>\n`;
    return prompt;
  }

  roleToText(role: Task["assigneeRole"]): string | null {
    if (!role) {
      return null;
    }

    switch (role) {
      case AssigneeRole.BACKEND:
        return "Backend Engineer";
      case AssigneeRole.FRONTEND:
        return "Frontend Engineer";
      case AssigneeRole.PM:
        return "Product Manager";
      case AssigneeRole.QA:
        return "QA Engineer";
      case AssigneeRole.DESIGN:
        return "Product Designer";
      default:
        return "engineer";
    }
  }
}
