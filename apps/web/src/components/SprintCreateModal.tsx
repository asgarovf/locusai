"use client";

import { Target } from "lucide-react";
import { useState } from "react";
import { CreateModal } from "@/components/CreateModal";
import { Input } from "@/components/ui";

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
    <CreateModal
      isOpen={isOpen}
      title="Create New Sprint"
      size="sm"
      fields={[
        {
          name: "name",
          label: "Sprint Name",
          component: (
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sprint 24"
              autoFocus
              className="h-11"
            />
          ),
          required: true,
          help: "Give your sprint a descriptive name to identify it later.",
        },
      ]}
      onSubmit={handleSubmit}
      onClose={handleClose}
      submitText="Create Sprint"
      icon={<Target size={16} />}
      isPending={isSubmitting}
      submitDisabled={!name.trim()}
    />
  );
}
