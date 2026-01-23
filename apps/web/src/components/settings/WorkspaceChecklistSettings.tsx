"use client";

import { ChecklistItem } from "@locusai/shared";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, Input } from "@/components/ui";
import { useWorkspaceIdOptional } from "@/hooks";
import { locusClient } from "@/lib/api-client";
import { SettingSection } from "./SettingSection";

export function WorkspaceChecklistSettings() {
  const workspaceId = useWorkspaceIdOptional();
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newItemText, setNewItemText] = useState("");

  useEffect(() => {
    if (!workspaceId) return;

    const fetchWorkspace = async () => {
      setIsLoading(true);
      try {
        const workspace = await locusClient.workspaces.getById(workspaceId);
        setChecklist(workspace.defaultChecklist || []);
      } catch (_error) {
        toast.error("Failed to fetch workspace settings");
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkspace();
  }, [workspaceId]);

  const handleSave = async (updatedChecklist: ChecklistItem[]) => {
    if (!workspaceId) return;

    try {
      await locusClient.workspaces.update(workspaceId, {
        defaultChecklist: updatedChecklist,
      });
      toast.success("Default checklist updated");
    } catch (_error) {
      toast.error("Failed to save checklist");
    }
  };

  const addItem = () => {
    if (!newItemText.trim()) return;

    const newItem: ChecklistItem = {
      id: `item-${Date.now()}`,
      text: newItemText.trim(),
      done: false,
    };

    const updated = [...checklist, newItem];
    setChecklist(updated);
    setNewItemText("");
    handleSave(updated);
  };

  const removeItem = (id: string) => {
    const updated = checklist.filter((item) => item.id !== id);
    setChecklist(updated);
    handleSave(updated);
  };

  const updateItemText = (id: string, text: string) => {
    const updated = checklist.map((item) =>
      item.id === id ? { ...item, text } : item
    );
    setChecklist(updated);
  };

  const handleBlur = () => {
    handleSave(checklist);
  };

  if (isLoading) {
    return (
      <SettingSection title="Acceptance Checklist">
        <div className="p-8 text-center text-muted-foreground animate-pulse">
          Loading settings...
        </div>
      </SettingSection>
    );
  }

  return (
    <SettingSection title="Default Acceptance Checklist">
      <div className="p-4 space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            These items will be automatically added to every new task when it's
            moved to In Progress.
          </p>

          <div className="space-y-2">
            {checklist.map((item) => (
              <div key={item.id} className="flex items-center gap-2 group">
                <GripVertical size={16} className="text-muted-foreground/30" />
                <Input
                  value={item.text}
                  onChange={(e) => updateItemText(item.id, e.target.value)}
                  onBlur={handleBlur}
                  className="flex-1 h-9"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} className="text-destructive" />
                </Button>
              </div>
            ))}

            {checklist.length === 0 && (
              <div className="py-4 text-center border border-dashed rounded-md text-muted-foreground text-sm">
                No default checklist items configured.
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
          <Input
            placeholder="Add a new checklist item..."
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            className="flex-1 h-9"
          />
          <Button size="sm" onClick={addItem} disabled={!newItemText.trim()}>
            <Plus size={16} className="mr-1" />
            Add
          </Button>
        </div>
      </div>
    </SettingSection>
  );
}
