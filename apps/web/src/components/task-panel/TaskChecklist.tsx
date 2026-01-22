"use client";

import { type Task } from "@locusai/shared";
import { motion } from "framer-motion";
import { CheckCircle, X } from "lucide-react";
import { SecondaryText, SectionLabel } from "@/components/typography";
import { Button, Checkbox, EmptyState, Input } from "@/components/ui";
import { cn } from "@/lib/utils";

interface TaskChecklistProps {
  task: Task;
  isLoading?: boolean;
  checklistProgress: number;
  newChecklistItem: string;
  setNewChecklistItem: (val: string) => void;
  handleAddChecklistItem: () => void;
  handleToggleChecklistItem: (id: string) => void;
  handleRemoveChecklistItem: (id: string) => void;
}

export function TaskChecklist({
  task,
  isLoading = false,
  checklistProgress,
  newChecklistItem,
  setNewChecklistItem,
  handleAddChecklistItem,
  handleToggleChecklistItem,
  handleRemoveChecklistItem,
}: TaskChecklistProps) {
  return (
    <div className="px-8 pb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-500">
            <CheckCircle size={16} />
          </div>
          <SectionLabel as="h4">Definition of Done</SectionLabel>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <SecondaryText size="xs" className="mb-1.5">
              Calibration
            </SecondaryText>
            <span className="text-sm font-mono font-black text-sky-500">
              {checklistProgress}%
            </span>
          </div>
          <div className="w-48 h-2 bg-secondary/40 rounded-full overflow-hidden border border-border/30 shadow-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${checklistProgress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.4)]"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3 mb-6">
        {task.acceptanceChecklist.length === 0 && (
          <EmptyState
            variant="compact"
            title="Zero Quality Gates"
            description="Deployment requires standard validation criteria."
            className="bg-secondary/5 border-dashed border-2 border-border/40 py-8"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setNewChecklistItem("Initialize unit validation")
                }
                className="text-[10px] font-black uppercase tracking-widest hover:text-sky-500"
              >
                Suggest Criteria
              </Button>
            }
          />
        )}
        {task.acceptanceChecklist.map((item) => (
          <motion.div
            layout
            key={item.id}
            className={cn(
              "group flex items-center gap-4 p-4 bg-card/30 border border-border/40 rounded-2xl hover:border-sky-500/50 hover:bg-card/50 transition-all duration-300 shadow-sm",
              isLoading && "opacity-60 pointer-events-none"
            )}
          >
            <Checkbox
              checked={item.done}
              onChange={() => !isLoading && handleToggleChecklistItem(item.id)}
              disabled={isLoading}
              className="scale-110"
            />
            <span
              className={cn(
                "flex-1 text-sm font-bold transition-all duration-300",
                item.done
                  ? "line-through text-muted-foreground/30 scale-[0.98] translate-x-1"
                  : "text-foreground/90"
              )}
            >
              {item.text}
            </span>
            <Button
              size="icon"
              variant="ghost"
              disabled={isLoading}
              className="opacity-0 group-hover:opacity-100 h-8 w-8 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all rounded-lg"
              onClick={() => !isLoading && handleRemoveChecklistItem(item.id)}
            >
              <X size={14} />
            </Button>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-4 p-2.5 bg-secondary/5 rounded-2xl border border-border/40 focus-within:border-primary/40 transition-all shadow-inner">
        <Input
          value={newChecklistItem}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            !isLoading && setNewChecklistItem(e.target.value)
          }
          disabled={isLoading}
          placeholder="Add validation gate..."
          className="h-10 bg-transparent border-none focus:ring-0 text-sm font-bold placeholder:font-black placeholder:uppercase placeholder:text-[10px] placeholder:tracking-widest"
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter" && !isLoading) handleAddChecklistItem();
          }}
        />
        <Button
          onClick={handleAddChecklistItem}
          disabled={!newChecklistItem.trim() || isLoading}
          className="px-6 h-10 bg-foreground text-background font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all rounded-xl"
        >
          Append
        </Button>
      </div>
    </div>
  );
}
