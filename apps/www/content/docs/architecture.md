---
title: Understanding Locus Architecture
---

Locus is built as a modular monorepo. It consists of three main applications and a shared package ecosystem.

## Core Components

### 1. Unified CLI (`packages/cli`)
This is the entry point for the user. It is a bundled executable that contains:
- The **Locus Engine**: Logic for task management and file operations.
- The **Dashboard**: A static export of the Next.js web app.
- The **Server**: An Express.js API that serves the dashboard and handles requests.
- The **MCP Server**: A standardized interface for AI agents.

### 2. The Engine (`apps/api`)
The engine is responsible for maintaining the state of your project. It uses `better-sqlite3` to store task data, comments, and history in a local `.locus/db.sqlite` file within your project root.

### 3. The Dashboard (`apps/web`)
A Next.js application that provides a beautiful UI for managing your tasks and viewing documentation. When built, it is exported as purely static HTML/CSS/JS and served by the CLI.

### 4. MCP Server (`apps/mcp`)
This component implements the **Model Context Protocol**. It exposes tools like `kanban_create_task`, `docs_read`, and `ci_run` to any MCP-compatible AI client (like Claude Desktop or Cursor).

## Design Philosophy

- **Local-First**: We never send your data to our cloud.
- **Agentic**: Everything is built to be used by both humans and AI agents.
- **Transparent**: Your data is stored in open formats (SQLite, Markdown, JSON) that you can inspect and version control.
