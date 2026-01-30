/**
 * API Key Confirmation Modal
 * Shows the newly created API key (only time it's visible)
 */

import { Copy } from "lucide-react";
import { Button, Modal, showToast } from "@/components/ui";

interface ApiKeyConfirmationModalProps {
  isOpen: boolean;
  apiKey: string | null;
  keyName: string;
  onClose: () => void;
}

export function ApiKeyConfirmationModal({
  isOpen,
  apiKey,
  keyName,
  onClose,
}: ApiKeyConfirmationModalProps) {
  const handleCopy = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    showToast.success("API key copied to clipboard");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">API Key Created</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Save your API key now. You won't be able to see it again!
          </p>
        </div>

        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Key Name
            </p>
            <p className="font-medium">{keyName}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              API Key
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-secondary/50 px-3 py-2 rounded font-mono text-sm break-all">
                {apiKey}
              </code>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopy}
                className="shrink-0"
              >
                <Copy size={16} className="mr-1.5" />
                Copy
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
          <p className="text-xs text-amber-400">
            ⚠️ <strong>Important:</strong> Keep this key secure. Never share it
            publicly or commit it to version control.
          </p>
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  );
}
