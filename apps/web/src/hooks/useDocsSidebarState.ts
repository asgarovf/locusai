"use client";

import { useState } from "react";

/**
 * DocsSidebar state management hook.
 *
 * Encapsulates all local UI state for the docs sidebar:
 * - Search and filtering
 * - Creation mode for docs and groups
 * - Group expansion
 * - Selection and form inputs
 *
 * This significantly reduces prop drilling and makes the component
 * easier to maintain and extend.
 */
export function useDocsSidebarState() {
  // Search/Filter
  const [searchQuery, setSearchQuery] = useState("");

  // Creation/Editing
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newGroupName, setNewGroupName] = useState("");

  // Selection
  const [selectedTemplate, setSelectedTemplate] = useState("readme");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Expansion
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["ungrouped"])
  );

  // Document selection
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Group toggling
  const toggleGroup = (groupId: string) => {
    const next = new Set(expandedGroups);
    if (next.has(groupId)) {
      next.delete(groupId);
    } else {
      next.add(groupId);
    }
    setExpandedGroups(next);
  };

  // Reset group form
  const resetGroupForm = () => {
    setNewGroupName("");
    setIsCreatingGroup(false);
  };

  // Reset file form
  const resetFileForm = () => {
    setNewFileName("");
    setSelectedTemplate("readme");
    setSelectedGroupId(null);
    setIsCreating(false);
  };

  // Close all forms
  const closeAllForms = () => {
    resetGroupForm();
    resetFileForm();
  };

  return {
    // Search
    searchQuery,
    setSearchQuery,

    // Creation/Editing
    isCreating,
    setIsCreating,
    isCreatingGroup,
    setIsCreatingGroup,
    newFileName,
    setNewFileName,
    newGroupName,
    setNewGroupName,

    // Selection
    selectedTemplate,
    setSelectedTemplate,
    selectedGroupId,
    setSelectedGroupId,

    // Expansion
    expandedGroups,
    toggleGroup,

    // Selection
    selectedId,
    setSelectedId,

    // Helpers
    resetGroupForm,
    resetFileForm,
    closeAllForms,
  };
}
