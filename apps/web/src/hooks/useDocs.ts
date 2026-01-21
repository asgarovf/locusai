import { type Doc } from "@locusai/shared";
import { useCallback, useEffect, useState } from "react";
import { locusClient } from "@/lib/api-client";
import { useWorkspaceId } from "./useWorkspaceId";

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
  const [docs, setDocs] = useState<Doc[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null);
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewFileName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("blank");
  const [contentMode, setContentMode] = useState<"edit" | "preview">("edit");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const workspaceId = useWorkspaceId();

  const hasUnsavedChanges = content !== originalContent;

  const fetchDocs = useCallback(async () => {
    try {
      const data = await locusClient.docs.list(workspaceId);
      setDocs(data);
    } catch (err) {
      console.error("Failed to fetch docs", err);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  useEffect(() => {
    if (selectedId) {
      locusClient.docs.getById(selectedId, workspaceId).then((doc) => {
        setSelectedDoc(doc);
        setContent(doc.content || "");
        setOriginalContent(doc.content || "");
      });
    } else {
      setSelectedDoc(null);
      setContent("");
      setOriginalContent("");
    }
  }, [selectedId, workspaceId]);

  const handleSave = async () => {
    if (!selectedId || !workspaceId) return;
    try {
      const updated = await locusClient.docs.update(selectedId, workspaceId, {
        content,
      });
      setOriginalContent(content);
      setSelectedDoc(updated);
      await fetchDocs();
    } catch (err) {
      console.error("Failed to save document", err);
    }
  };

  const handleCreateFile = async () => {
    if (!newTitle.trim() || !workspaceId) return;

    const template = DOC_TEMPLATES.find((t) => t.id === selectedTemplate);
    const initialContent = template?.content || `# ${newTitle}\n\n`;

    try {
      const newDoc = await locusClient.docs.create(workspaceId, {
        title: newTitle,
        content: initialContent,
      });
      setIsCreating(false);
      setNewFileName("");
      setSelectedTemplate("blank");
      await fetchDocs();
      setSelectedId(newDoc.id);
    } catch (err) {
      console.error("Failed to create document", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    if (!workspaceId) return;
    try {
      await locusClient.docs.delete(id, workspaceId);
      if (selectedId === id) {
        setSelectedId(null);
      }
      await fetchDocs();
    } catch (err) {
      console.error("Failed to delete document", err);
    }
  };

  const filteredDocs = docs.filter((doc) => {
    const matchesSearch = doc.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return {
    docs: filteredDocs,
    selectedId,
    setSelectedId,
    selectedDoc,
    content,
    setContent,
    originalContent,
    hasUnsavedChanges,
    isCreating,
    setIsCreating,
    newFileName: newTitle,
    setNewFileName,
    selectedTemplate,
    setSelectedTemplate,
    contentMode,
    setContentMode,
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    handleSave,
    handleCreateFile,
    handleDelete,
    refreshTree: fetchDocs,
  };
}
