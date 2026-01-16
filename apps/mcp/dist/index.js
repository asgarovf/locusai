#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
const { values } = parseArgs({
    args: Bun.argv,
    options: {
        project: { type: "string" },
    },
    strict: true,
    allowPositionals: true,
});
if (!values.project) {
    console.error("Usage: bun run mcp -- --project <workspaceDir>");
    process.exit(1);
}
const API_BASE = "http://localhost:3080/api";
// Create server instance
const server = new McpServer({
    name: "locus",
    version: "0.1.0",
});
// Documentation tools
server.registerTool("docs.tree", {
    title: "Documentation Tree",
    description: "Get the documentation tree structure",
    inputSchema: {},
}, async () => {
    try {
        const res = await fetch(`${API_BASE}/docs/tree`);
        const data = await res.json();
        return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
    }
    catch (error) {
        return {
            content: [{ type: "text", text: `Error: ${error}` }],
            isError: true,
        };
    }
});
server.registerTool("docs.read", {
    title: "Read Document",
    description: "Read a document from the documentation",
    inputSchema: { path: z.string() },
}, async ({ path }) => {
    try {
        const res = await fetch(`${API_BASE}/docs/read?path=${encodeURIComponent(path)}`);
        const data = await res.json();
        return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
    }
    catch (error) {
        return {
            content: [{ type: "text", text: `Error: ${error}` }],
            isError: true,
        };
    }
});
server.registerTool("docs.write", {
    title: "Write Document",
    description: "Write content to a document",
    inputSchema: {
        path: z.string(),
        content: z.string(),
    },
}, async ({ path, content }) => {
    try {
        const res = await fetch(`${API_BASE}/docs/write`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path, content }),
        });
        const data = await res.json();
        return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
    }
    catch (error) {
        return {
            content: [{ type: "text", text: `Error: ${error}` }],
            isError: true,
        };
    }
});
// Kanban tools
server.registerTool("kanban.list", {
    title: "List Tasks",
    description: "Get all tasks from the Kanban board",
    inputSchema: {},
}, async () => {
    try {
        const res = await fetch(`${API_BASE}/tasks`);
        const data = await res.json();
        return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
    }
    catch (error) {
        return {
            content: [{ type: "text", text: `Error: ${error}` }],
            isError: true,
        };
    }
});
server.registerTool("kanban.get", {
    title: "Get Task",
    description: "Get details for a specific task",
    inputSchema: { taskId: z.number() },
}, async ({ taskId }) => {
    try {
        const res = await fetch(`${API_BASE}/tasks/${taskId}`);
        const data = await res.json();
        return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
    }
    catch (error) {
        return {
            content: [{ type: "text", text: `Error: ${error}` }],
            isError: true,
        };
    }
});
server.registerTool("kanban.create", {
    title: "Create Task",
    description: "Create a new task on the Kanban board",
    inputSchema: {
        title: z.string(),
        description: z.string().optional(),
        status: z.string().optional(),
        priority: z.string().optional(),
    },
}, async (args) => {
    try {
        const res = await fetch(`${API_BASE}/tasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(args),
        });
        const data = await res.json();
        return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
    }
    catch (error) {
        return {
            content: [{ type: "text", text: `Error: ${error}` }],
            isError: true,
        };
    }
});
server.registerTool("kanban.move", {
    title: "Move Task",
    description: "Update task status (move to different column)",
    inputSchema: {
        taskId: z.number(),
        status: z.string(),
    },
}, async ({ taskId, status }) => {
    try {
        const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        const data = await res.json();
        return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
    }
    catch (error) {
        return {
            content: [{ type: "text", text: `Error: ${error}` }],
            isError: true,
        };
    }
});
server.registerTool("kanban.comment", {
    title: "Add Comment",
    description: "Add a comment to a task",
    inputSchema: {
        taskId: z.number(),
        author: z.string(),
        text: z.string(),
    },
}, async ({ taskId, author, text }) => {
    try {
        const res = await fetch(`${API_BASE}/tasks/${taskId}/comment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ author, text }),
        });
        const data = await res.json();
        return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
    }
    catch (error) {
        return {
            content: [{ type: "text", text: `Error: ${error}` }],
            isError: true,
        };
    }
});
server.registerTool("kanban.check", {
    title: "Check Acceptance Item",
    description: "Mark acceptance checklist items as completed. Pass the full updated checklist array with completed items marked.",
    inputSchema: {
        taskId: z.number(),
        acceptanceChecklist: z.array(z.object({
            id: z.string(),
            text: z.string(),
            done: z.boolean(),
        })),
    },
}, async ({ taskId, acceptanceChecklist }) => {
    try {
        const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ acceptanceChecklist }),
        });
        const data = await res.json();
        return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
    }
    catch (error) {
        return {
            content: [{ type: "text", text: `Error: ${error}` }],
            isError: true,
        };
    }
});
// Artifact tools
server.registerTool("artifacts.list", {
    title: "List Artifacts",
    description: "List all artifacts for a task (including implementation drafts)",
    inputSchema: { taskId: z.number() },
}, async ({ taskId }) => {
    try {
        const res = await fetch(`${API_BASE}/artifacts?taskId=${taskId}`);
        const data = await res.json();
        return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
    }
    catch (error) {
        return {
            content: [{ type: "text", text: `Error: ${error}` }],
            isError: true,
        };
    }
});
server.registerTool("artifacts.get", {
    title: "Get Artifact",
    description: "Get the content of a specific artifact by ID",
    inputSchema: { artifactId: z.number() },
}, async ({ artifactId }) => {
    try {
        const res = await fetch(`${API_BASE}/artifacts/${artifactId}`);
        const data = await res.json();
        return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
    }
    catch (error) {
        return {
            content: [{ type: "text", text: `Error: ${error}` }],
            isError: true,
        };
    }
});
// CI tools
server.registerTool("ci.run", {
    title: "Run CI",
    description: "Run a CI preset (e.g., 'quick' or 'full') for a task",
    inputSchema: {
        taskId: z.number(),
        preset: z.string(),
    },
}, async ({ taskId, preset }) => {
    try {
        const res = await fetch(`${API_BASE}/ci/run`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ taskId, preset }),
        });
        const data = await res.json();
        return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
    }
    catch (error) {
        return {
            content: [{ type: "text", text: `Error: ${error}` }],
            isError: true,
        };
    }
});
// Start the server
async function main() {
    try {
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("Locus MCP server running on stdio");
    }
    catch (error) {
        console.error("Failed to start MCP server:", error);
        process.exit(1);
    }
}
main();
