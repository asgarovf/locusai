/**
 * Create Group Form Component
 *
 * Form for creating new document groups/folders.
 */

"use client";

import { FolderPlus, X } from "lucide-react";
import { useState } from "react";
import { SectionLabel } from "@/components/typography";
import { Button, Input } from "@/components/ui";

interface CreateGroupFormProps {
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

export function CreateGroupForm({ onSubmit, onCancel }: CreateGroupFormProps) {
  const [groupName, setGroupName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (groupName.trim()) {
      onSubmit(groupName.trim());
      setGroupName("");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-5 bg-secondary/10 border-b border-border/40 animate-in fade-in slide-in-from-top-4 duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FolderPlus size={16} className="text-muted-foreground" />
          <SectionLabel className="text-foreground m-0">New Group</SectionLabel>
        </div>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-secondary/50"
          onClick={onCancel}
        >
          <X size={16} />
        </button>
      </div>

      <Input
        autoFocus
        placeholder="group-name..."
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        className="h-9 mb-4 bg-background/50 border-border/40 rounded-xl font-mono text-xs"
      />

      <Button
        type="submit"
        variant="secondary"
        className="w-full h-10 font-black uppercase tracking-widest text-[10px] rounded-xl"
        disabled={!groupName.trim()}
      >
        Create Group
      </Button>
    </form>
  );
}
