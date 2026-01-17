"use client";
import { Check, Edit2, X } from "lucide-react";

import { useState } from "react";
import { Button } from "./ui/Button";
import { Dropdown } from "./ui/Dropdown";
import { Input } from "./ui/Input";

export interface PropertyItemProps {
  label: string;
  value: string | number;
  onEdit: (newValue: string) => void;
  options?: string[];
  type?: "text" | "date" | "dropdown";
}

export function PropertyItem({
  label,
  value,
  onEdit,
  options,
  type = "text",
}: PropertyItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));

  const handleSave = () => {
    onEdit(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(String(value));
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
      <span className="text-[10px] items-center font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="relative group min-h-[32px] flex items-center">
        {isEditing ? (
          <div className="flex items-center gap-2 w-full">
            <div className="flex-1">
              {type === "dropdown" && options ? (
                <Dropdown
                  value={editValue}
                  options={options.map((o) => ({ value: o, label: o }))}
                  onChange={(v) => setEditValue(v)}
                />
              ) : (
                <Input
                  type={type}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  autoFocus
                  className="h-8 py-1"
                />
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={handleSave}
              >
                <Check size={14} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={handleCancel}
              >
                <X size={14} />
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="flex items-center justify-between gap-2 w-full cursor-pointer hover:bg-secondary/50 px-2 -mx-2 py-1 rounded-md transition-colors"
            onClick={() => setIsEditing(true)}
          >
            <span className="text-sm font-medium text-foreground truncate">
              {value || "None"}
            </span>
            <Edit2
              size={12}
              className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            />
          </div>
        )}
      </div>
    </div>
  );
}
