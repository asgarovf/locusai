import { type Doc, DocType } from "@locusai/shared";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { showToast } from "@/components/ui";
import {
  useCreateDocGroupMutation,
  useCreateDocMutation,
  useDeleteDocGroupMutation,
  useDeleteDocMutation,
  useDocGroupsQuery,
  useDocsQuery,
  useUpdateDocGroupMutation,
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
  const updateGroupMutation = useUpdateDocGroupMutation();
  const deleteGroupMutation = useDeleteDocGroupMutation();

  // Derived State (URL is source of truth)
  const selectedId = searchParams.get("docId");

  // Local UI State
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

  const handleSelectDoc = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("docId", id);
    } else {
      params.delete("docId");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

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
      showToast.success("Document saved");
    } catch {
      showToast.error("Failed to save document");
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

      // Update URL
      const params = new URLSearchParams(searchParams.toString());
      params.set("docId", newDoc.id);
      router.push(`${pathname}?${params.toString()}`);

      showToast.success("Document created");
    } catch {
      showToast.error("Failed to create document");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await deleteDocMutation.mutateAsync(id);
      if (selectedId === id) {
        handleSelectDoc(null);
      }
      showToast.success("Document deleted");
    } catch {
      showToast.error("Failed to delete document");
    }
  };

  const handleCreateGroup = async (name: string) => {
    try {
      await createGroupMutation.mutateAsync({ name });
      showToast.success("Group created");
    } catch {
      showToast.error("Failed to create group");
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
      showToast.success("Document moved");
    } catch {
      showToast.error("Failed to move document");
    }
  };

  const handleDuplicate = async (doc: Doc) => {
    try {
      const newDoc = await createDocMutation.mutateAsync({
        title: `${doc.title}-copy`,
        content: doc.content || "",
        groupId: doc.groupId || undefined,
        type: DocType.GENERAL,
      });
      handleSelectDoc(newDoc.id);
      showToast.success("Document duplicated");
    } catch {
      showToast.error("Failed to duplicate document");
    }
  };

  const handleRename = (doc: Doc) => {
    const newTitle = prompt("Enter new document name:", doc.title);
    if (newTitle?.trim() && newTitle !== doc.title) {
      updateDocMutation.mutate(
        { id: doc.id, updates: { title: newTitle.trim() } },
        {
          onSuccess: () => showToast.success("Document renamed"),
          onError: () => showToast.error("Failed to rename document"),
        }
      );
    }
  };

  const handleCreateWithTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    setIsCreating(true);
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this group? Documents in this group will be moved to 'Other'."
      )
    )
      return;
    try {
      await deleteGroupMutation.mutateAsync(groupId);
      showToast.success("Group deleted");
    } catch {
      showToast.error("Failed to delete group");
    }
  };

  const handleRenameGroup = (groupId: string, currentName: string) => {
    const newName = prompt("Enter new group name:", currentName);
    if (newName?.trim() && newName !== currentName) {
      updateGroupMutation.mutate(
        { id: groupId, name: newName.trim() },
        {
          onSuccess: () => showToast.success("Group renamed"),
          onError: () => showToast.error("Failed to rename group"),
        }
      );
    }
  };

  return {
    docs: filteredDocs,
    allDocs: docs,
    groups,
    docsByGroup,
    selectedId,
    setSelectedId: handleSelectDoc,
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
    handleDuplicate,
    handleRename,
    handleCreateWithTemplate,
    handleDeleteGroup,
    handleRenameGroup,
  };
}
