"use client";

import { Target } from "lucide-react";
import { useState } from "react";
import { Button, Input, Modal } from "@/components/ui";

interface SprintCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (name: string) => void;
  isSubmitting?: boolean;
}

export function SprintCreateModal({
  isOpen,
  onClose,
  onCreated,
  isSubmitting = false,
}: SprintCreateModalProps) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreated(name.trim());
    setName("");
  };

  const handleClose = () => {
    setName("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Sprint"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-6 py-2">
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
            Sprint Name <span className="text-destructive">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sprint 24"
            autoFocus
            className="h-11"
          />
          <p className="text-xs text-muted-foreground/60 ml-1">
            Give your sprint a descriptive name to identify it later.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" onClick={handleClose} variant="ghost">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            className="gap-2"
          >
            <Target size={16} />
            {isSubmitting ? "Creating..." : "Create Sprint"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
