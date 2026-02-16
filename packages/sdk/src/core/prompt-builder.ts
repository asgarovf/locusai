import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { AssigneeRole, Task } from "@locusai/shared";
import { getLocusPath } from "./config.js";

export class PromptBuilder {
  constructor(private projectPath: string) {}

  async build(task: Task): Promise<string> {
    const roleText = this.roleToText(task.assigneeRole);
    const description = task.description || "No description provided.";
    const context = this.getProjectContext();
    const learnings = this.getLearningsContent();
    const knowledgeBase = this.getKnowledgeBaseSection();

    let sections = "";

    // Role
    if (roleText) {
      sections += `\n<role>\nYou are acting as a ${roleText}.\n</role>\n`;
    }

    // Project context
    if (context) {
      sections += `\n<project_context>\n${context}\n</project_context>\n`;
    }

    // Knowledge base
    sections += `\n<knowledge_base>\n${knowledgeBase}\n</knowledge_base>\n`;

    // Learnings
    if (learnings) {
      sections += `\n<learnings>\nThese are accumulated lessons from past tasks. Follow them to avoid repeating mistakes:\n${learnings}\n</learnings>\n`;
    }

    // Attached documents
    if (task.docs && task.docs.length > 0) {
      let docsContent = "";
      for (const doc of task.docs) {
        const content = doc.content || "";
        const limit = 800;
        const preview = content.slice(0, limit);
        const isTruncated = content.length > limit;
        docsContent += `### ${doc.title}\n${preview}${isTruncated ? "\n...(truncated)..." : ""}\n\n`;
      }
      sections += `\n<documents>\n${docsContent.trimEnd()}\n</documents>\n`;
    }

    // Acceptance criteria
    if (task.acceptanceChecklist && task.acceptanceChecklist.length > 0) {
      let criteria = "";
      for (const item of task.acceptanceChecklist) {
        criteria += `- ${item.done ? "[x]" : "[ ]"} ${item.text}\n`;
      }
      sections += `\n<acceptance_criteria>\n${criteria.trimEnd()}\n</acceptance_criteria>\n`;
    }

    // Comments & feedback
    if (task.comments && task.comments.length > 0) {
      const filteredComments = task.comments.filter(
        (comment) => comment.author !== "system"
      );
      const comments = filteredComments.slice(0, 3);
      if (comments.length > 0) {
        let commentsContent = "";
        for (const comment of comments) {
          const date = new Date(comment.createdAt).toLocaleString();
          commentsContent += `- ${comment.author} (${date}): ${comment.text}\n`;
        }
        sections += `\n<feedback>\n${commentsContent.trimEnd()}\n</feedback>\n`;
      }
    }

    return `<task_execution>
Complete this task: ${task.title}

<description>
${description}
</description>
${sections}
<rules>
- Complete the task as described
- Save any high-level documentation (PRDs, technical drafts, architecture docs) in \`.locus/artifacts/\`
- Use relative paths from the project root at all times — no absolute local paths
- Do NOT run \`git add\`, \`git commit\`, \`git push\`, or create branches — Locus handles git automatically
</rules>
</task_execution>`;
  }

  async buildGenericPrompt(query: string): Promise<string> {
    const context = this.getProjectContext();
    const learnings = this.getLearningsContent();
    const knowledgeBase = this.getKnowledgeBaseSection();

    let sections = "";

    // Project context
    if (context) {
      sections += `\n<project_context>\n${context}\n</project_context>\n`;
    }

    // Knowledge base
    sections += `\n<knowledge_base>\n${knowledgeBase}\n</knowledge_base>\n`;

    // Learnings
    if (learnings) {
      sections += `\n<learnings>\nThese are accumulated lessons from past tasks. Follow them to avoid repeating mistakes:\n${learnings}\n</learnings>\n`;
    }

    return `<direct_execution>
Execute this prompt: ${query}
${sections}
<rules>
- Execute the prompt based on the provided project context
- Use relative paths from the project root at all times — no absolute local paths
- Do NOT run \`git add\`, \`git commit\`, \`git push\`, or create branches — Locus handles git automatically
</rules>
</direct_execution>`;
  }

  private getProjectContext(): string | null {
    const contextPath = getLocusPath(this.projectPath, "contextFile");
    if (existsSync(contextPath)) {
      try {
        const context = readFileSync(contextPath, "utf-8");
        if (context.trim().length > 20) {
          return context;
        }
      } catch (err) {
        console.warn(`Warning: Could not read context file: ${err}`);
      }
    }

    // Fallback to README
    return this.getFallbackContext() || null;
  }

  private getFallbackContext(): string {
    const readmePath = join(this.projectPath, "README.md");
    if (existsSync(readmePath)) {
      try {
        const content = readFileSync(readmePath, "utf-8");
        const limit = 1000;
        return (
          content.slice(0, limit) +
          (content.length > limit ? "\n...(truncated)..." : "")
        );
      } catch {
        return "";
      }
    }
    return "";
  }

  private getKnowledgeBaseSection(): string {
    return `You have access to the following documentation directories for context:
- Artifacts: \`.locus/artifacts\` (local-only, not synced to cloud)
- Documents: \`.locus/documents\` (synced from cloud)
If you need more information about the project strategies, plans, or architecture, read files in these directories.`;
  }

  private getLearningsContent(): string | null {
    const learningsPath = getLocusPath(this.projectPath, "learningsFile");
    if (!existsSync(learningsPath)) {
      return null;
    }
    try {
      const content = readFileSync(learningsPath, "utf-8");
      const lines = content.split("\n").filter((l) => l.startsWith("- "));
      if (lines.length === 0) {
        return null;
      }
      return lines.join("\n");
    } catch {
      return null;
    }
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
