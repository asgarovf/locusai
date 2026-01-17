"use client";

import MDEditor from "@uiw/react-md-editor";
import {
  BookOpen,
  Code,
  File,
  FileCode,
  FileText,
  Filter,
  Folder,
  FolderOpen,
  Lightbulb,
  Palette,
  Plus,
  Save,
  Search,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import { DocNode, docService } from "@/services";

// Document categories for role-based filtering
const DOC_CATEGORIES = [
  {
    id: "all",
    label: "All Documents",
    icon: BookOpen,
    color: "text-foreground",
    bgColor: "bg-secondary",
  },
  {
    id: "product",
    label: "Product",
    icon: Lightbulb,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    description: "PRDs, roadmaps, specs",
  },
  {
    id: "engineering",
    label: "Engineering",
    icon: Code,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    description: "Technical docs, APIs",
  },
  {
    id: "design",
    label: "Design",
    icon: Palette,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    description: "UI specs, guidelines",
  },
  {
    id: "team",
    label: "Team",
    icon: Users,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    description: "Processes, onboarding",
  },
];

// Template options for new documents
const DOC_TEMPLATES = [
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

export function Docs() {
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
      // Auto-expand all folders
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
    } catch (err) {
      console.error("Failed to fetch doc tree", err);
    }
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  useEffect(() => {
    if (selectedPath) {
      docService.read(selectedPath).then((data) => {
        setContent(data.content || "");
        setOriginalContent(data.content || "");
      });
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

    // Build path with category prefix
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
      fetchTree();
      setSelectedPath(path);
    } catch (err) {
      console.error("Failed to create file", err);
    }
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Filter documents based on search and category
  const filterNodes = (nodes: DocNode[]): DocNode[] => {
    return nodes
      .map((node) => {
        if (node.type === "directory") {
          const filteredChildren = node.children
            ? filterNodes(node.children)
            : [];
          // Keep directory if it has matching children or matches search
          if (
            filteredChildren.length > 0 ||
            node.name.toLowerCase().includes(searchQuery.toLowerCase())
          ) {
            return { ...node, children: filteredChildren };
          }
          return null;
        } else {
          // File node - check category and search
          const matchesCategory =
            activeCategory === "all" ||
            node.path.toLowerCase().startsWith(activeCategory);
          const matchesSearch = node.name
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
          if (matchesCategory && matchesSearch) return node;
          return null;
        }
      })
      .filter(Boolean) as DocNode[];
  };

  const filteredTree = filterNodes(tree);

  const renderTree = (nodes: DocNode[], depth = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedFolders.has(node.path);
      const isSelected = selectedPath === node.path;

      if (node.type === "directory") {
        return (
          <div key={node.path}>
            <button
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 text-sm font-medium rounded-lg transition-all hover:bg-secondary/50",
                "text-muted-foreground"
              )}
              style={{ paddingLeft: `${12 + depth * 16}px` }}
              onClick={() => toggleFolder(node.path)}
            >
              {isExpanded ? (
                <FolderOpen size={16} className="text-amber-500 shrink-0" />
              ) : (
                <Folder size={16} className="text-amber-500 shrink-0" />
              )}
              <span className="truncate">{node.name}</span>
              <span className="ml-auto text-[10px] text-muted-foreground/50">
                {node.children?.length || 0}
              </span>
            </button>
            {isExpanded &&
              node.children &&
              renderTree(node.children, depth + 1)}
          </div>
        );
      }

      // Determine file icon based on path/name
      const getFileIcon = () => {
        const pathLower = node.path.toLowerCase();
        if (pathLower.includes("api") || pathLower.includes("technical"))
          return <FileCode size={16} className="text-blue-400" />;
        if (pathLower.includes("product") || pathLower.includes("prd"))
          return <Lightbulb size={16} className="text-amber-400" />;
        if (pathLower.includes("design"))
          return <Palette size={16} className="text-purple-400" />;
        return <FileText size={16} />;
      };

      return (
        <button
          key={node.path}
          className={cn(
            "flex items-center gap-2 w-full px-3 py-2 text-sm font-medium rounded-lg transition-all",
            isSelected
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
          )}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={() => setSelectedPath(node.path)}
        >
          <span className="shrink-0">{getFileIcon()}</span>
          <span className="truncate">{node.name.replace(".md", "")}</span>
        </button>
      );
    });
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Sidebar */}
      <aside className="w-80 flex flex-col bg-card/50 border border-border/50 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border/50">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-foreground">Documentation</h3>
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8"
              onClick={() => setIsCreating(true)}
            >
              <Plus size={16} />
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search docs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-sm bg-secondary/40"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="p-3 border-b border-border/50">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider mb-2 px-1">
            <Filter size={12} />
            Categories
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DOC_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                    activeCategory === cat.id
                      ? `${cat.bgColor} ${cat.color}`
                      : "text-muted-foreground hover:bg-secondary/50"
                  )}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  <Icon size={12} />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Create New Document Modal */}
        {isCreating && (
          <div className="p-4 bg-secondary/30 border-b border-border/50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-foreground">
                New Document
              </span>
              <button
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setIsCreating(false)}
              >
                <X size={14} />
              </button>
            </div>

            <Input
              autoFocus
              placeholder="document-name"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFile();
                if (e.key === "Escape") setIsCreating(false);
              }}
              className="h-9 mb-3"
            />

            <div className="mb-3">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 block">
                Template
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {DOC_TEMPLATES.slice(0, 4).map((template) => (
                  <button
                    key={template.id}
                    className={cn(
                      "px-2.5 py-2 text-[11px] font-medium rounded-lg border transition-all text-left",
                      selectedTemplate === template.id
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border/50 text-muted-foreground hover:border-border hover:bg-secondary/30"
                    )}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            </div>

            <Button
              size="sm"
              className="w-full h-8"
              onClick={handleCreateFile}
              disabled={!newFileName.trim()}
            >
              Create Document
            </Button>
          </div>
        )}

        {/* File Tree */}
        <div className="flex-1 overflow-y-auto p-2">
          {filteredTree.length > 0 ? (
            renderTree(filteredTree)
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <File size={32} className="text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No documents</p>
              <p className="text-xs text-muted-foreground/60">
                Create your first document
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {selectedPath ? (
          <div className="flex flex-col h-full gap-4" data-color-mode="dark">
            {/* Document Header */}
            <header className="flex justify-between items-center bg-card/50 border border-border/50 p-4 rounded-xl">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-primary/10 rounded-xl shrink-0">
                  <FileText size={18} className="text-primary" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-foreground truncate">
                    {selectedPath?.split("/").pop()?.replace(".md", "")}
                  </span>
                  <span className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5">
                    <span className="opacity-60">/</span>
                    {selectedPath}
                    {hasUnsavedChanges && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ml-1" />
                    )}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex bg-secondary/50 p-1 rounded-lg border border-border/50">
                  <button
                    className={cn(
                      "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                      contentMode === "edit"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setContentMode("edit")}
                  >
                    Edit
                  </button>
                  <button
                    className={cn(
                      "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                      contentMode === "preview"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setContentMode("preview")}
                  >
                    Preview
                  </button>
                </div>
                <Button
                  onClick={handleSave}
                  className="h-9"
                  disabled={!hasUnsavedChanges}
                >
                  <Save size={14} className="mr-2" />
                  Save
                </Button>
              </div>
            </header>

            {/* Editor */}
            <div className="flex-1 bg-card/50 border border-border/50 rounded-xl overflow-hidden p-4 markdown-container">
              <MDEditor
                value={content}
                onChange={(v) => setContent(v || "")}
                height="100%"
                preview={contentMode}
                hideToolbar={contentMode === "preview"}
                className="bg-transparent! border-none! text-foreground!"
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="max-w-lg w-full p-10 bg-card/50 border border-border/50 rounded-2xl flex flex-col items-center text-center space-y-5">
              <div className="p-5 bg-secondary/50 rounded-2xl">
                <BookOpen size={40} className="text-muted-foreground/40" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">
                  Welcome to Documentation
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
                  Select a document from the sidebar or create a new one using
                  templates for PRDs, technical specs, and more.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsCreating(true)}
                >
                  <Plus size={14} className="mr-1.5" />
                  New Document
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
