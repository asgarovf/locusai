import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { AssigneeRole, Task } from "@locusai/shared";
import { getLocusPath, LOCUS_CONFIG } from "./config.js";

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

    // 0. Project Metadata (from config)
    const projectConfig = this.getProjectConfig();
    if (projectConfig) {
      prompt += `## Project Metadata\n`;
      prompt += `- Version: ${projectConfig.version || "Unknown"}\n`;
      prompt += `- Created At: ${projectConfig.createdAt || "Unknown"}\n\n`;
    }

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
        if (context.trim().length > 20) {
          prompt += `## Project Context (Local)\n${context}\n\n`;
          hasLocalContext = true;
        }
      } catch (err) {
        console.warn(`Warning: Could not read context file: ${err}`);
      }
    }

    // Fallback to README if local context is missing or thin
    if (!hasLocalContext) {
      const fallback = this.getFallbackContext();
      if (fallback) {
        prompt += `## Project Context (README Fallback)\n${fallback}\n\n`;
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

    // 2. Project Awareness (Structure & Skills)
    prompt += this.getProjectStructure();
    prompt += this.getSkillsInfo();

    // 3. Project Knowledge Base (Docs & Artifacts)
    prompt += `## Project Knowledge Base\n`;
    prompt += `You have access to the following documentation directories for context:\n`;
    prompt += `- Artifacts: \`.locus/artifacts\`)\n`;
    prompt += `- Documents: \`.locus/documents\`\n`;
    prompt += `If you need more information about the project strategies, plans, or architecture, please read files in these directories.\n\n`;

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

    // 1. Project Context (Smart Merge)
    const contextPath = getLocusPath(this.projectPath, "contextFile");
    let hasLocalContext = false;

    if (existsSync(contextPath)) {
      try {
        const context = readFileSync(contextPath, "utf-8");
        if (context.trim().length > 20) {
          prompt += `## Project Context (Local)\n${context}\n\n`;
          hasLocalContext = true;
        }
      } catch (err) {
        console.warn(`Warning: Could not read context file: ${err}`);
      }
    }

    // Fallback to README if local context is missing or thin
    if (!hasLocalContext) {
      const fallback = this.getFallbackContext();
      if (fallback) {
        prompt += `## Project Context (README Fallback)\n${fallback}\n\n`;
      }
    }

    // 2. Project Awareness (Structure & Skills)
    prompt += this.getProjectStructure();
    prompt += this.getSkillsInfo();

    // 3. Project Knowledge Base (Docs & Artifacts)
    prompt += `## Project Knowledge Base\n`;
    prompt += `You have access to the following documentation directories for context:\n`;
    prompt += `- Artifacts: \`.locus/artifacts\` (local-only, not synced to cloud)\n`;
    prompt += `- Documents: \`.locus/documents\` (synced from cloud)\n`;
    prompt += `If you need more information about the project strategies, plans, or architecture, please read files in these directories.\n\n`;

    // 4. Codebase Index context
    const indexPath = getLocusPath(this.projectPath, "indexFile");
    if (existsSync(indexPath)) {
      prompt += `## Codebase Overview\nThere is an index file in the .locus/codebase-index.json and if you need you can check it.\n\n`;
    }

    prompt += `## Instructions
1. Execute the prompt based on the provided project context.
2. **Paths**: Use relative paths from the project root at all times. Do NOT use absolute local paths (e.g., /Users/...).
3. When finished successfully, output: <promise>COMPLETE</promise>\n`;

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

  private getProjectStructure(): string {
    try {
      const entries = readdirSync(this.projectPath);
      const folders = entries.filter((e) => {
        if (e.startsWith(".") || e === "node_modules") return false;
        try {
          return statSync(join(this.projectPath, e)).isDirectory();
        } catch {
          return false;
        }
      });

      if (folders.length === 0) return "";

      let structure = `## Project Structure\n`;
      structure += `Key directories in this project:\n`;
      for (const folder of folders) {
        structure += `- \`${folder}/\`\n`;
      }
      return `${structure}\n`;
    } catch {
      return "";
    }
  }

  private getSkillsInfo(): string {
    const projectSkillsDirs = [
      LOCUS_CONFIG.agentSkillsDir, // .agent/skills
      ".cursor/skills",
      ".claude/skills",
      ".codex/skills",
      ".gemini/skills",
    ];

    const globalHome = homedir();
    const globalSkillsDirs = [
      join(globalHome, ".cursor/skills"),
      join(globalHome, ".claude/skills"),
      join(globalHome, ".codex/skills"),
      join(globalHome, ".gemini/skills"),
    ];

    const allSkillNames = new Set<string>();

    // 1. Scan Project-level skills
    for (const relativePath of projectSkillsDirs) {
      const fullPath = join(this.projectPath, relativePath);
      this.scanSkillsInDirectory(fullPath, allSkillNames);
    }

    // 2. Scan Global-level skills
    for (const fullPath of globalSkillsDirs) {
      this.scanSkillsInDirectory(fullPath, allSkillNames);
    }

    const uniqueSkills = Array.from(allSkillNames).sort();
    if (uniqueSkills.length === 0) return "";

    return (
      `## Available Agent Skills\n` +
      `The project has the following specialized skills available (from project or global locations):\n` +
      uniqueSkills.map((s) => `- ${s}`).join("\n") +
      "\n\n"
    );
  }

  private scanSkillsInDirectory(dirPath: string, skillSet: Set<string>): void {
    if (!existsSync(dirPath)) return;

    try {
      const entries = readdirSync(dirPath).filter((name) => {
        try {
          return statSync(join(dirPath, name)).isDirectory();
        } catch {
          return false;
        }
      });
      for (const entry of entries) {
        skillSet.add(entry);
      }
    } catch {
      // Silently ignore directory read errors
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
