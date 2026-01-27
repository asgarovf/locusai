import { existsSync, readFileSync } from "node:fs";
import { AssigneeRole, Task } from "@locusai/shared";
import { getLocusPath } from "./config.js";

export interface PromptOptions {
  taskContext?: string;
}

export class PromptBuilder {
  constructor(private projectPath: string) {}

  async build(task: Task, options: PromptOptions = {}): Promise<string> {
    let prompt = `# Task: ${task.title}\n\n`;

    const roleText = this.roleToText(task.assigneeRole);
    if (roleText) {
      prompt += `## Role\nYou are acting as a ${roleText}.\n\n`;
    }

    prompt += `## Description\n${task.description || "No description provided."}\n\n`;

    // Parse Server Context if available
    let serverContext: {
      project?: { name: string; techStack?: string[] };
      context?: string;
    } | null = null;

    if (options.taskContext) {
      try {
        serverContext = JSON.parse(options.taskContext);
      } catch {
        serverContext = { context: options.taskContext };
      }
    }

    // 1. Project Context (Smart Merge)
    const contextPath = getLocusPath(this.projectPath, "contextFile");
    let hasLocalContext = false;

    if (existsSync(contextPath)) {
      try {
        const context = readFileSync(contextPath, "utf-8");
        prompt += `## Project Context (Local)\n${context}\n\n`;
        hasLocalContext = true;
      } catch (err) {
        console.warn(`Warning: Could not read context file: ${err}`);
      }
    }

    // Add Server Context (Selective)
    if (serverContext) {
      prompt += `## Project Context (Server)\n`;
      // Always include project-level strategic info
      if (serverContext.project) {
        prompt += `- Project: ${serverContext.project.name || "Unknown"}\n`;
        // Only include Tech Stack from server if local context (CLAUDE.md) is missing
        // CLAUDE.md usually contains definitive tech patterns
        if (!hasLocalContext && serverContext.project.techStack?.length) {
          prompt += `- Tech Stack: ${serverContext.project.techStack.join(", ")}\n`;
        }
      }
      // The main context string
      if (serverContext.context) {
        prompt += `\n${serverContext.context}\n`;
      }
      prompt += `\n`;
    }

    // 2. Codebase Index context
    const indexPath = getLocusPath(this.projectPath, "indexFile");
    if (existsSync(indexPath)) {
      prompt += `## Codebase Overview\nThere is an index file in the .locus/codebase-index.json and if you need you can check it.\n\n`;
    }

    // 4. Add Documents (Optimized)
    if (task.docs && task.docs.length > 0) {
      prompt += `## Attached Documents (Summarized)\n`;
      prompt += `> Full content available on server. Rely on Task Description for specific requirements.\n\n`;
      for (const doc of task.docs) {
        const content = doc.content || "";
        const limit = 800; // Character limit per doc to save tokens
        const preview = content.slice(0, limit);
        const isTruncated = content.length > limit;

        prompt += `### Doc: ${doc.title}\n${preview}${isTruncated ? "\n...(truncated)..." : ""}\n\n`;
      }
    }

    // 5. Add Checklist
    if (task.acceptanceChecklist && task.acceptanceChecklist.length > 0) {
      prompt += `## Acceptance Criteria\n`;
      for (const item of task.acceptanceChecklist) {
        prompt += `- ${item.done ? "[x]" : "[ ]"} ${item.text}\n`;
      }
      prompt += "\n";
    }

    // 6. Add Comments & Feedback
    if (task.comments && task.comments.length > 0) {
      const comments = task.comments.slice(0, 3); // Limit to 3 recent comments
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
