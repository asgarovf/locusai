/**
 * Create Doc Form Component
 *
 * Form for creating new documents with template selection.
 */

"use client";

import type { DocGroup } from "@locusai/shared";
import { FileText, X } from "lucide-react";
import { SecondaryText, SectionLabel } from "@/components/typography";
import { Button, Input } from "@/components/ui";
import { DOC_TEMPLATES } from "@/hooks";
import { cn } from "@/lib/utils";

interface CreateDocFormProps {
  fileName: string;
  onFileNameChange: (name: string) => void;
  selectedTemplate: string;
  onTemplateSelect: (id: string) => void;
  selectedGroupId: string | null;
  onGroupSelect: (id: string | null) => void;
  groups: DocGroup[];
  onSubmit: () => void;
  onCancel: () => void;
}

export function CreateDocForm({
  fileName,
  onFileNameChange,
  selectedTemplate,
  onTemplateSelect,
  selectedGroupId,
  onGroupSelect,
  groups,
  onSubmit,
  onCancel,
}: CreateDocFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fileName.trim()) {
      onSubmit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-5 bg-primary/5 border-b border-border/40 animate-in fade-in slide-in-from-top-4 duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-primary" />
          <SectionLabel className="text-primary m-0">New Document</SectionLabel>
        </div>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-secondary/50"
          onClick={onCancel}
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <SecondaryText size="xs" className="ml-1 font-medium">
            Document Name
          </SecondaryText>
          <Input
            autoFocus
            placeholder="my-document..."
            value={fileName}
            onChange={(e) => onFileNameChange(e.target.value)}
            className="h-9 bg-background/50 border-border/40 rounded-xl font-mono text-xs"
          />
        </div>

        <div className="space-y-2">
          <SecondaryText size="xs" className="ml-1 font-medium">
            Assign to Group
          </SecondaryText>
          <select
            value={selectedGroupId || ""}
            onChange={(e) => onGroupSelect(e.target.value || null)}
            className="w-full h-9 bg-background/50 border border-border/40 rounded-xl text-xs px-3 focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none cursor-pointer"
          >
            <option value="">No Group (Root)</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <SecondaryText size="xs" className="ml-1 font-medium">
            Template
          </SecondaryText>
          <div className="grid grid-cols-2 gap-2">
            {DOC_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                className={cn(
                  "px-3 py-2.5 text-[10px] font-bold rounded-xl border transition-all text-left uppercase tracking-wider",
                  selectedTemplate === template.id
                    ? "border-primary bg-primary/10 text-primary shadow-inner"
                    : "border-border/20 text-muted-foreground/60 hover:border-border/40 hover:bg-secondary/30"
                )}
                onClick={() => onTemplateSelect(template.id)}
              >
                {template.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-10 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 rounded-xl"
          disabled={!fileName.trim()}
        >
          Create Document
        </Button>
      </div>
    </form>
  );
}
