"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DocNode, docService } from "@/services";

export const DOC_TEMPLATES = [
  { id: "blank", label: "Blank Document", content: "# Untitled\n\n" },
  {
    id: "prd",
    label: "Product Spec (PRD)",
    category: "product",
    content: `# Product Requirements Document

## Overview
Brief description of the feature/product.

## Goals
- Goal 1
- Goal 2

## User Stories
As a [user type], I want [action] so that [benefit].

## Requirements
### Functional Requirements
1. 

### Non-Functional Requirements
1. 

## Success Metrics
- 

## Timeline
| Phase | Description | Date |
|-------|-------------|------|
| | | |
`,
  },
  {
    id: "technical",
    label: "Technical Design",
    category: "engineering",
    content: `# Technical Design Document

## Summary
Brief technical overview.

## Architecture
Describe the system architecture.

## API Design
\`\`\`typescript
// API endpoints
\`\`\`

## Database Schema
\`\`\`sql
-- Schema changes
\`\`\`

## Implementation Plan
1. 

## Testing Strategy
- Unit tests
- Integration tests

## Rollout Plan
- 
`,
  },
  {
    id: "api",
    label: "API Documentation",
    category: "engineering",
    content: `# API Documentation

## Endpoints

### GET /api/resource
Description of the endpoint.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| | | | |

**Response:**
\`\`\`json
{
  "data": []
}
\`\`\`

### POST /api/resource
`,
  },
  {
    id: "runbook",
    label: "Runbook",
    category: "engineering",
    content: `# Runbook: [Service Name]

## Overview
What this service does.

## Common Issues

### Issue 1
**Symptoms:** 
**Resolution:** 

## Monitoring
- Dashboard: 
- Alerts: 

## Contacts
- Team: 
- Escalation: 
`,
  },
];

export function useDocs() {
  const [tree, setTree] = useState<DocNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("blank");
  const [contentMode, setContentMode] = useState<"edit" | "preview">("edit");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );

  const hasUnsavedChanges = content !== originalContent;

  const fetchTree = useCallback(async () => {
    try {
      const data = await docService.getTree();
      setTree(data);
      // Auto-expand all folders on initial load if none expanded
      if (expandedFolders.size === 0) {
        const folders = new Set<string>();
        const collectFolders = (nodes: DocNode[]) => {
          nodes.forEach((n) => {
            if (n.type === "directory") {
              folders.add(n.path);
              if (n.children) collectFolders(n.children);
            }
          });
        };
        collectFolders(data);
        setExpandedFolders(folders);
      }
    } catch (err) {
      console.error("Failed to fetch doc tree", err);
    }
  }, [expandedFolders.size]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  useEffect(() => {
    if (selectedPath) {
      docService.read(selectedPath).then((content) => {
        setContent(content || "");
        setOriginalContent(content || "");
      });
    } else {
      setContent("");
      setOriginalContent("");
    }
  }, [selectedPath]);

  const handleSave = async () => {
    if (!selectedPath) return;
    try {
      await docService.write(selectedPath, content);
      setOriginalContent(content);
    } catch (err) {
      console.error("Failed to save document", err);
    }
  };

  const handleCreateFile = async () => {
    if (!newFileName.trim()) return;

    let path = newFileName;
    if (activeCategory !== "all" && !newFileName.includes("/")) {
      path = `${activeCategory}/${newFileName}`;
    }
    if (!path.endsWith(".md")) path += ".md";

    const template = DOC_TEMPLATES.find((t) => t.id === selectedTemplate);
    const initialContent =
      template?.content ||
      `# ${newFileName.split("/").pop()?.replace(".md", "") || "New Document"}\n\n`;

    try {
      await docService.write(path, initialContent);
      setIsCreating(false);
      setNewFileName("");
      setSelectedTemplate("blank");
      await fetchTree();
      setSelectedPath(path);
    } catch (err) {
      console.error("Failed to create file", err);
    }
  };

  const handleDelete = async (path: string) => {
    if (!confirm(`Are you sure you want to delete ${path}?`)) return;
    try {
      console.log("[useDocs] Deleting document:", path);
      const result = await docService.delete(path);
      console.log("[useDocs] Delete result:", result);
      if (selectedPath === path) {
        setSelectedPath(null);
      }
      await fetchTree();
      console.log("[useDocs] Tree refreshed after deletion");
    } catch (err) {
      console.error("[useDocs] Failed to delete document", err);
      alert(
        `Failed to delete document: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  };

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const filterNodes = useCallback(
    (nodes: DocNode[]): DocNode[] => {
      return nodes
        .map((node) => {
          if (node.type === "directory") {
            const filteredChildren = node.children
              ? filterNodes(node.children)
              : [];

            const isMatchesSearch =
              searchQuery !== "" &&
              node.name.toLowerCase().includes(searchQuery.toLowerCase());
            const isMatchesCategory =
              activeCategory !== "all" &&
              node.path
                .toLowerCase()
                .split("/")
                .includes(activeCategory.toLowerCase());

            if (
              filteredChildren.length > 0 ||
              isMatchesSearch ||
              isMatchesCategory ||
              (activeCategory === "all" && searchQuery === "")
            ) {
              return { ...node, children: filteredChildren };
            }
            return null;
          } else {
            const matchesCategory =
              activeCategory === "all" ||
              node.path
                .toLowerCase()
                .split("/")
                .includes(activeCategory.toLowerCase());
            const matchesSearch = node.name
              .toLowerCase()
              .includes(searchQuery.toLowerCase());
            if (matchesCategory && matchesSearch) return node;
            return null;
          }
        })
        .filter(Boolean) as DocNode[];
    },
    [searchQuery, activeCategory]
  );

  const filteredTree = useMemo(() => {
    const sorted = [...filterNodes(tree)].sort((a, b) => {
      // Directories first
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    return sorted;
  }, [tree, filterNodes]);

  return {
    tree,
    filteredTree,
    selectedPath,
    setSelectedPath,
    content,
    setContent,
    originalContent,
    hasUnsavedChanges,
    isCreating,
    setIsCreating,
    newFileName,
    setNewFileName,
    selectedTemplate,
    setSelectedTemplate,
    contentMode,
    setContentMode,
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    expandedFolders,
    toggleFolder,
    handleSave,
    handleCreateFile,
    handleDelete,
    refreshTree: fetchTree,
  };
}
