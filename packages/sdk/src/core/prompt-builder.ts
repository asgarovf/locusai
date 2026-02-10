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

    // 0. Project Metadata (from config)
    const projectConfig = this.getProjectConfig();
    if (projectConfig) {
      prompt += `## Project Metadata\n`;
      prompt += `- Version: ${projectConfig.version || "Unknown"}\n`;
      prompt += `- Created At: ${projectConfig.createdAt || "Unknown"}\n\n`;
    }

    // 1. Agent Instructions (CLAUDE.md)
    const claudeMdPath = getLocusPath(this.projectPath, "contextFile");
    if (existsSync(claudeMdPath)) {
      try {
        const instructions = readFileSync(claudeMdPath, "utf-8");
        prompt += `## Agent Instructions\n${instructions}\n\n`;
      } catch (err) {
        console.warn(`Warning: Could not read CLAUDE.md: ${err}`);
      }
    }

    // 2. Project Context (from .locus/project/context.md)
    const projectContextPath = getLocusPath(
      this.projectPath,
      "projectContextFile"
    );

    if (existsSync(projectContextPath)) {
      try {
        const context = readFileSync(projectContextPath, "utf-8");
        prompt += `## Project Context\n${context}\n\n`;
      } catch (err) {
        console.warn(`Warning: Could not read project context: ${err}`);
      }
    }

    // 3. Current Progress (from .locus/project/progress.md)
    const progressPath = getLocusPath(this.projectPath, "projectProgressFile");
    if (existsSync(progressPath)) {
      try {
        const progress = readFileSync(progressPath, "utf-8");
        if (progress.trim().length > 20) {
          prompt += `## Current Progress\n${progress}\n\n`;
        }
      } catch (err) {
        console.warn(`Warning: Could not read project progress: ${err}`);
      }
    }

    // 4. Skills
    prompt += this.getSkillsInfo();

    // 5. Project Knowledge Base Docs
    prompt += `## Project Knowledge Base\n`;
    prompt += `You have access to the following documentation directories for context:\n`;
    prompt += `- Documents: \`.locus/documents/\`\n`;
    prompt += `If you need more information about the project strategies, plans, or architecture, please read files in these directories.\n\n`;

    // 6. Codebase Index context
    const indexPath = getLocusPath(this.projectPath, "indexFile");
    if (existsSync(indexPath)) {
      prompt += `## Codebase Overview\nThere is an index file in the .locus/codebase-index.json and if you need you can check it.\n\n`;
    }

    // 7. Add Checklist
    if (task.acceptanceChecklist && task.acceptanceChecklist.length > 0) {
      prompt += `## Acceptance Criteria\n`;
      for (const item of task.acceptanceChecklist) {
        prompt += `- ${item.done ? "[x]" : "[ ]"} ${item.text}\n`;
      }
      prompt += "\n";
    }

    // 8. Add Comments & Feedback
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
3. **Paths**: Use relative paths from the project root at all times. Do NOT use absolute local paths (e.g., /Users/...).\n`;
    return prompt;
  }

  async buildGenericPrompt(query: string): Promise<string> {
    let prompt = `# Direct Execution\n\n`;
    prompt += `## Prompt\n${query}\n\n`;

    // 0. Project Metadata (from config)
    const projectConfig = this.getProjectConfig();
    if (projectConfig) {
      prompt += `## Project Metadata\n`;
      prompt += `- Version: ${projectConfig.version || "Unknown"}\n`;
      prompt += `- Created At: ${projectConfig.createdAt || "Unknown"}\n\n`;
    }

    // 1. Agent Instructions (CLAUDE.md)
    const claudeMdPath = getLocusPath(this.projectPath, "contextFile");
    if (existsSync(claudeMdPath)) {
      try {
        const instructions = readFileSync(claudeMdPath, "utf-8");
        prompt += `## Agent Instructions\n${instructions}\n\n`;
      } catch (err) {
        console.warn(`Warning: Could not read CLAUDE.md: ${err}`);
      }
    }

    // 2. Project Context (from .locus/project/context.md)
    const projectContextPath = getLocusPath(
      this.projectPath,
      "projectContextFile"
    );

    if (existsSync(projectContextPath)) {
      try {
        const context = readFileSync(projectContextPath, "utf-8");
        prompt += `## Project Context\n${context}\n\n`;
      } catch (err) {
        console.warn(`Warning: Could not read project context: ${err}`);
      }
    }

    // 3. Current Progress (from .locus/project/progress.md)
    const progressPath = getLocusPath(this.projectPath, "projectProgressFile");
    if (existsSync(progressPath)) {
      try {
        const progress = readFileSync(progressPath, "utf-8");
        prompt += `## Current Progress\n${progress}\n\n`;
      } catch (err) {
        console.warn(`Warning: Could not read project progress: ${err}`);
      }
    }

    // 4. Skills
    prompt += this.getSkillsInfo();

    // 5. Project Knowledge Base (Docs & Artifacts)
    prompt += `## Project Knowledge Base\n`;
    prompt += `You have access to the following documentation directories for context:\n`;
    prompt += `- Documents: \`.locus/documents/\`\n`;
    prompt += `If you need more information about the project strategies, plans, or architecture, please read files in these directories.\n\n`;

    // 6. Codebase Index context
    const indexPath = getLocusPath(this.projectPath, "indexFile");
    if (existsSync(indexPath)) {
      prompt += `## Codebase Overview\nThere is an index file in the .locus/codebase-index.json and if you need you can check it.\n\n`;
    }

    prompt += `## Instructions
1. Execute the prompt based on the provided project context.
2. **Paths**: Use relative paths from the project root at all times. Do NOT use absolute local paths (e.g., /Users/...)\n`;

    return prompt;
  }

  private getProjectConfig(): { version?: string; createdAt?: string } | null {
    const configPath = getLocusPath(this.projectPath, "configFile");
    if (existsSync(configPath)) {
      try {
        return JSON.parse(readFileSync(configPath, "utf-8"));
      } catch {
        return null;
      }
    }
    return null;
  }

  private getSkillsInfo(): string {
    return `## Available Agent Skills are located at .agent/skills, .claude/skills, .cursor/skills, .codex/skills, .gemini/skills directories.\n\n`;
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
