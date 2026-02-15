import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { getLocusPath } from "../core/config.js";

export interface ProjectInfo {
  name: string;
  mission: string;
  techStack: string[];
}

export interface ProgressEntry {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

export class KnowledgeBase {
  private contextPath: string;
  private progressPath: string;

  constructor(projectPath: string) {
    this.contextPath = getLocusPath(projectPath, "projectContextFile");
    this.progressPath = getLocusPath(projectPath, "projectProgressFile");
  }

  readContext(): string {
    if (!existsSync(this.contextPath)) {
      return "";
    }
    return readFileSync(this.contextPath, "utf-8");
  }

  readProgress(): string {
    if (!existsSync(this.progressPath)) {
      return "";
    }
    return readFileSync(this.progressPath, "utf-8");
  }

  updateContext(content: string): void {
    this.ensureDir(this.contextPath);
    writeFileSync(this.contextPath, content);
  }

  updateProgress(entry: ProgressEntry): void {
    this.ensureDir(this.progressPath);
    const existing = this.readProgress();
    const timestamp = (entry.timestamp ?? new Date()).toISOString();
    const label = entry.role === "user" ? "User" : "Assistant";
    const line = `**${label}** (${timestamp}):\n${entry.content}`;

    const updated = existing
      ? `${existing}\n\n---\n\n${line}`
      : `# Conversation History\n\n${line}`;
    writeFileSync(this.progressPath, updated);
  }

  getFullContext(): string {
    const context = this.readContext();

    const parts: string[] = [];

    if (context.trim()) {
      parts.push(context.trim());
    }

    return parts.join("\n\n---\n\n");
  }

  initialize(info: ProjectInfo): void {
    this.ensureDir(this.contextPath);
    this.ensureDir(this.progressPath);

    const techStackList = info.techStack.map((t) => `- ${t}`).join("\n");

    const contextContent = `# Project: ${info.name}

## Mission
${info.mission}

## Tech Stack
${techStackList}

## Architecture
<!-- Describe your high-level architecture here -->

## Key Decisions
<!-- Document important technical decisions and their rationale -->

## Feature Areas
<!-- List your main feature areas and their status -->
`;

    const progressContent = `# Conversation History
`;

    writeFileSync(this.contextPath, contextContent);
    writeFileSync(this.progressPath, progressContent);
  }

  get exists(): boolean {
    return existsSync(this.contextPath) || existsSync(this.progressPath);
  }

  private ensureDir(filePath: string): void {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}
