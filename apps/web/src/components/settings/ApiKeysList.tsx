/**
 * API Keys List Component
 * Displays organization API keys with copy, view, and delete actions
 */

import { Copy, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge, Button, showToast } from "@/components/ui";

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: Date | string;
  lastUsedAt: Date | string | null;
  active: boolean;
}

interface ApiKeysListProps {
  apiKeys: ApiKey[];
  isLoading: boolean;
  onDelete: (id: string) => Promise<void>;
}

function formatDate(date: Date | string | null) {
  if (!date) return "Never";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function maskApiKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return key;
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

export function ApiKeysList({
  apiKeys,
  isLoading,
  onDelete,
}: ApiKeysListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    showToast.success("API key copied to clipboard");
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDelete(id);
      showToast.success("API key deleted");
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : "Failed to delete API key"
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">Loading...</div>
    );
  }

  if (apiKeys.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No API keys created yet. Create one to get started.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/50">
      {apiKeys.map((apiKey) => {
        return (
          <div
            key={apiKey.id}
            className="flex items-center justify-between p-4 hover:bg-secondary/10 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <span className="font-medium truncate">{apiKey.name}</span>
                {apiKey.active ? (
                  <Badge variant="success" size="sm" className="shrink-0">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary" size="sm" className="shrink-0">
                    Inactive
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                <div className="flex items-center gap-2 shrink-0">
                  <code className="text-xs bg-secondary/50 px-2 py-1 rounded font-mono whitespace-nowrap">
                    {maskApiKey(apiKey.key)}
                  </code>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => copyToClipboard(apiKey.key)}
                    title="Copy"
                  >
                    <Copy size={14} />
                  </Button>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground whitespace-nowrap">
                  <span>Created {formatDate(apiKey.createdAt)}</span>
                  <span>Last used {formatDate(apiKey.lastUsedAt)}</span>
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(apiKey.id)}
              disabled={deletingId === apiKey.id}
              className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
              title="Delete"
            >
              <Trash2 size={18} />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
