---
title: MCP Tools Reference
---

Locus provides a comprehensive set of MCP tools that AI agents can use to interact with your workspace. This reference documents all available tools and their parameters.

## Kanban Tools

### `kanban.list`
Lists all tasks in the workspace.

**Parameters:**
- `status` (optional): Filter by status (`BACKLOG`, `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`)
- `assignee` (optional): Filter by assignee role

**Example:**
```
kanban.list({ status: "IN_PROGRESS" })
```

### `kanban.get`
Get details of a specific task.

**Parameters:**
- `id` (required): The task ID

### `kanban.create`
Create a new task.

**Parameters:**
- `title` (required): Task title
- `description` (optional): Task description
- `status` (optional): Initial status (defaults to `BACKLOG`)
- `priority` (optional): `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- `labels` (optional): Array of label strings

### `kanban.update`
Update an existing task.

**Parameters:**
- `id` (required): The task ID
- `title`, `description`, `status`, `priority`, `labels` (optional)

### `kanban.next`
Get the next task to work on (used by agents during sprint execution).

---

## Documentation Tools

### `docs.list`
List all documentation files in the workspace.

### `docs.read`
Read the content of a documentation file.

**Parameters:**
- `slug` (required): The document slug (filename without extension)

### `docs.write`
Create or update a documentation file.

**Parameters:**
- `slug` (required): The document slug
- `content` (required): Markdown content
- `title` (optional): Document title

### `docs.delete`
Delete a documentation file.

**Parameters:**
- `slug` (required): The document slug

---

## Artifact Tools

### `artifacts.list`
List all artifacts for a task.

**Parameters:**
- `taskId` (required): The task ID

### `artifacts.create`
Create an artifact (code snippet, design doc, etc.) for a task.

**Parameters:**
- `taskId` (required): The task ID
- `type` (required): Artifact type (`CODE`, `DESIGN`, `TEST`, `OTHER`)
- `content` (required): Artifact content
- `filename` (optional): Suggested filename

### `artifacts.get`
Get a specific artifact.

**Parameters:**
- `id` (required): The artifact ID

---

## CI Tools

### `ci.run`
Execute a CI command from the allowlist.

**Parameters:**
- `command` (required): The command to run (must be in the CI allowlist)
- `taskId` (optional): Associate the run with a task

**Allowlisted commands** (by default):
- `bun run lint`
- `bun run typecheck`
- `bun run test`
- `bun run build`

### `ci.status`
Get the status of a CI run.

**Parameters:**
- `runId` (required): The CI run ID

### `ci.logs`
Get the logs of a CI run.

**Parameters:**
- `runId` (required): The CI run ID

---

## Best Practices for Agents

1. **Always check task status** before starting work with `kanban.list`
2. **Read relevant docs** with `docs.read` to understand context
3. **Create artifacts** for significant code changes
4. **Run CI** after making changes to verify correctness
5. **Update task status** when completing work
