/**
 * Create API Key Modal Component
 * Modal form for creating new API keys
 */

import { useState } from "react";
import { toast } from "sonner";
import { Button, Input, Modal } from "@/components/ui";

interface CreateApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
  isLoading?: boolean;
}

export function CreateApiKeyModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: CreateApiKeyModalProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Please enter a name for the API key");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(name.trim());
      setName("");
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create API key"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Create API Key</h2>
          <p className="text-sm text-muted-foreground mt-1">
            API keys allow external applications (like the CLI) to authenticate
            with your workspace.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Key Name
          </label>
          <Input
            placeholder="e.g., Production Agent, CI/CD"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting || isLoading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) {
                handleSubmit();
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            Give this key a meaningful name to remember its purpose.
          </p>
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting || isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || isSubmitting || isLoading}
            isLoading={isSubmitting || isLoading}
          >
            Create Key
          </Button>
        </div>
      </div>
    </Modal>
  );
}
