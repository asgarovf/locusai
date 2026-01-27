import { type Doc, DocType } from "@locusai/shared";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useCreateDocGroupMutation,
  useCreateDocMutation,
  useDeleteDocMutation,
  useDocGroupsQuery,
  useDocsQuery,
  useUpdateDocMutation,
} from "./useDocsQuery";

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
];

export function useDocs() {
  // Queries
  const { data: docs = [], isLoading: docsLoading } = useDocsQuery();
  const { data: groups = [], isLoading: groupsLoading } = useDocGroupsQuery();

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Mutations
  const createDocMutation = useCreateDocMutation();
  const updateDocMutation = useUpdateDocMutation();
  const deleteDocMutation = useDeleteDocMutation();
  const createGroupMutation = useCreateDocGroupMutation();

  // Local UI State
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewFileName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("blank");
  const [contentMode, setContentMode] = useState<"edit" | "preview">("edit");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const selectedDoc = useMemo(
    () => docs.find((d) => d.id === selectedId) || null,
    [docs, selectedId]
  );

  // Sync with URL
  useEffect(() => {
    const docId = searchParams.get("docId");
    if (docId && docId !== selectedId) {
      setSelectedId(docId);
    } else if (!docId && selectedId && !isCreating) {
      // Clear selection if URL param is removed (optional, but good for back nav)
      // Actually, typically we want URL to drive state.
      // If we want two-way sync:
    }
  }, [searchParams, selectedId, isCreating]);

  // Update URL when selectedId changes
  useEffect(() => {
    const currentDocId = searchParams.get("docId");
    if (selectedId && selectedId !== currentDocId) {
      const params = new URLSearchParams(searchParams);
      params.set("docId", selectedId);
      router.push(`${pathname}?${params.toString()}`);
    } else if (!selectedId && currentDocId) {
      const params = new URLSearchParams(searchParams);
      params.delete("docId");
      router.push(`${pathname}?${params.toString()}`);
    }
  }, [selectedId, router, pathname, searchParams]);

  const hasUnsavedChanges = content !== originalContent;

  useEffect(() => {
    if (selectedDoc) {
      setContent(selectedDoc.content || "");
      setOriginalContent(selectedDoc.content || "");
    } else {
      setContent("");
      setOriginalContent("");
    }
  }, [selectedDoc]);

  const handleSave = async () => {
    if (!selectedId) return;
    try {
      await updateDocMutation.mutateAsync({
        id: selectedId,
        updates: { content },
      });
      toast.success("Document saved");
    } catch {
      toast.error("Failed to save document");
    }
  };

  const handleCreateFile = async () => {
    if (!newTitle.trim()) return;

    const template = DOC_TEMPLATES.find((t) => t.id === selectedTemplate);
    const initialContent = template?.content || `# ${newTitle}\n\n`;

    try {
      const newDoc = await createDocMutation.mutateAsync({
        title: newTitle,
        content: initialContent,
        groupId: selectedGroupId || undefined,
        type: DocType.GENERAL,
      });
      setIsCreating(false);
      setNewFileName("");
      setSelectedTemplate("blank");
      setSelectedId(newDoc.id);
      toast.success("Document created");
    } catch {
      toast.error("Failed to create document");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await deleteDocMutation.mutateAsync(id);
      if (selectedId === id) {
        setSelectedId(null);
      }
      toast.success("Document deleted");
    } catch {
      toast.error("Failed to delete document");
    }
  };

  const handleCreateGroup = async (name: string) => {
    try {
      await createGroupMutation.mutateAsync({ name });
      toast.success("Group created");
    } catch {
      toast.error("Failed to create group");
    }
  };

  const filteredDocs = useMemo(() => {
    return docs.filter((doc) => {
      const matchesSearch = doc.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [docs, searchQuery]);

  // Group docs by their groupId
  const docsByGroup = useMemo(() => {
    const grouped: Record<string, Doc[]> = {
      ungrouped: [],
    };

    groups.forEach((g) => {
      grouped[g.id] = [];
    });

    filteredDocs.forEach((doc) => {
      if (doc.groupId && grouped[doc.groupId]) {
        grouped[doc.groupId].push(doc);
      } else {
        grouped.ungrouped.push(doc);
      }
    });

    return grouped;
  }, [filteredDocs, groups]);

  const handleGroupChange = async (docId: string, groupId: string | null) => {
    try {
      await updateDocMutation.mutateAsync({
        id: docId,
        updates: { groupId },
      });
      toast.success("Document moved");
    } catch {
      toast.error("Failed to move document");
    }
  };

  return {
    docs: filteredDocs,
    groups,
    docsByGroup,
    selectedId,
    setSelectedId,
    selectedDoc,
    content,
    setContent,
    originalContent,
    hasUnsavedChanges,
    isLoading: docsLoading || groupsLoading,
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
    selectedGroupId,
    setSelectedGroupId,
    handleSave,
    handleCreateFile,
    handleDelete,
    handleCreateGroup,
    handleGroupChange,
  };
}
