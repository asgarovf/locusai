import { existsSync, readdirSync, readFileSync } from "node:fs";
import { Task } from "@locusai/shared";
import { getLocusPath } from "./config";
import { CodebaseIndex } from "./indexer";

export class PromptBuilder {
  constructor(private projectPath: string) {}

  async build(task: Task): Promise<string> {
    let prompt = `# Task: ${task.title}\n\n`;

    if (task.assigneeRole) {
      prompt += `## Role\nYou are acting as a ${task.assigneeRole} engineer.\n\n`;
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

    // 2. Add Local Artifacts (.locus/artifacts)
    const artifactsDir = getLocusPath(this.projectPath, "artifactsDir");
    if (existsSync(artifactsDir)) {
      try {
        const files = readdirSync(artifactsDir).filter((f) =>
          f.endsWith(".md")
        );
        if (files.length > 0) {
          prompt += `## Available Project Documents (.locus/artifacts)\n`;
          prompt += `The following documents are available for reference. If you need to read any of them to complete your task, use your tools to read the file content:\n\n`;
          for (const file of files) {
            prompt += `- \`.locus/artifacts/${file}\`\n`;
          }
          prompt += "\n";
        }
      } catch (err) {
        console.warn(`Warning: Could not read artifacts directory: ${err}`);
      }
    }

    // 3. Add Codebase Index context
    const indexPath = getLocusPath(this.projectPath, "indexFile");
    if (existsSync(indexPath)) {
      try {
        const indexContent = readFileSync(indexPath, "utf-8");
        const index = JSON.parse(indexContent) as CodebaseIndex;
        prompt += this.formatIndex(index, task);
      } catch (err) {
        console.warn(`Warning: Could not read codebase index: ${err}`);
      }
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
      prompt += `## Task History & Feedback\n`;
      prompt += `Review the following comments for context or rejection feedback:\n\n`;
      for (const comment of task.comments) {
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

  private formatIndex(index: CodebaseIndex, task: Task): string {
    let section = `## Codebase Overview\nThis codebase has been indexed to help you navigate.\n\n`;

    // Structural directories
    const structuralDirs = Object.entries(index.responsibilities || {})
      .filter(([path]) => !path.includes(".") || path.split("/").length <= 2)
      .slice(0, 15);

    if (structuralDirs.length > 0) {
      section += `### Project Structure\n${structuralDirs.map(([p, d]) => `- \`${p}\`: ${d}`).join("\n")}\n\n`;
    }

    // Relevant symbols
    const keywords = `${task.title} ${task.description}`.toLowerCase();
    const symbols = Object.entries(index.symbols || {})
      .filter(([symbol]) => keywords.includes(symbol.toLowerCase()))
      .slice(0, 10);

    if (symbols.length > 0) {
      section += `### Potentially Relevant Symbols\n${symbols.map(([s, f]) => `- \`${s}\` is defined in: ${Array.isArray(f) ? f.join(", ") : f}`).join("\n")}\n\n`;
    }

    return section;
  }
}
