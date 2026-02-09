import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { getLocusPath } from "../core/config.js";

export interface ProjectInfo {
  name: string;
  mission: string;
  techStack: string[];
}

export interface ProgressEvent {
  type: "task_completed" | "sprint_started" | "sprint_completed" | "blocker";
  title: string;
  details?: string;
  timestamp?: Date;
}

export class KnowledgeBase {
  private contextPath: string;
  private progressPath: string;

  constructor(private projectPath: string) {
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

  updateProgress(event: ProgressEvent): void {
    this.ensureDir(this.progressPath);
    const existing = this.readProgress();
    const timestamp = (event.timestamp ?? new Date()).toISOString();

    let entry = "";
    switch (event.type) {
      case "task_completed":
        entry = `- [x] ${event.title} — completed ${timestamp}`;
        break;
      case "sprint_started":
        entry = `\n## Current Sprint: ${event.title}\n**Status:** ACTIVE | Started: ${timestamp}\n`;
        break;
      case "sprint_completed":
        entry = `\n### Sprint Completed: ${event.title} — ${timestamp}\n`;
        break;
      case "blocker":
        entry = `- BLOCKER: ${event.title}`;
        break;
    }

    if (event.details) {
      entry += `\n  ${event.details}`;
    }

    const updated = existing
      ? `${existing}\n${entry}`
      : `# Project Progress\n\n${entry}`;
    writeFileSync(this.progressPath, updated);
  }

  getFullContext(): string {
    const context = this.readContext();
    const progress = this.readProgress();

    const parts: string[] = [];

    if (context.trim()) {
      parts.push(context.trim());
    }

    if (progress.trim()) {
      parts.push(progress.trim());
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

    const progressContent = `# Project Progress

No sprints started yet.
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
