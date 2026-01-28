/**
 * Property Item Component
 *
 * Displays an editable task property with label and value.
 * Supports text, date, and dropdown editing modes.
 * Used in task panels for property editing.
 *
 * Features:
 * - Inline editing
 * - Multiple input types (text, date, dropdown)
 * - Edit/save/cancel actions
 * - Optional dropdown options
 *
 * @example
 * <PropertyItem
 *   label="Priority"
 *   value="High"
 *   type="dropdown"
 *   options={["Low", "Medium", "High"]}
 *   onEdit={handleEdit}
 * />
 */

"use client";

import { Check, Edit2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { SecondaryText } from "./typography";
import { Button } from "./ui/Button";
import { Dropdown } from "./ui/Dropdown";
import { Input } from "./ui/Input";

export interface PropertyItemProps {
  /** Property label */
  label: string;
  /** Current property value */
  value: string | number;
  /** Called when value is updated */
  onEdit: (newValue: string) => void;
  /** Options for dropdown type */
  options?: string[];
  /** Input type for editing */
  type?: "text" | "date" | "dropdown";
  /** Whether the property is disabled */
  disabled?: boolean;
  /** Placeholder text for text input */
  placeholder?: string;
}

export function PropertyItem({
  label,
  value,
  onEdit,
  options,
  type = "text",
  disabled = false,
  placeholder,
}: PropertyItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));

  // Sync editValue with value prop when not editing, or always?
  // Ideally, if the task updates externally, we want to reflect that.
  useEffect(() => {
    if (!isEditing) {
      setEditValue(String(value));
    }
  }, [value, isEditing]);

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
      <SecondaryText as="span" size="xs" className="items-center">
        {label}
      </SecondaryText>
      <div className="relative group min-h-[32px] flex items-center">
        {isEditing ? (
          <div className="flex items-center gap-2 w-full">
            <div className="flex-1">
              {type === "dropdown" && options ? (
                <Dropdown
                  value={editValue}
                  options={options.map((o) => ({ value: o, label: o }))}
                  onChange={(v) => setEditValue(v)}
                  disabled={disabled}
                />
              ) : (
                <Input
                  type={type}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  disabled={disabled}
                  placeholder={placeholder}
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
                disabled={disabled}
              >
                <Check size={14} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={handleCancel}
                disabled={disabled}
              >
                <X size={14} />
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={`flex items-center justify-between gap-2 w-full px-2 -mx-2 py-1 rounded-md transition-colors ${
              disabled
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer hover:bg-secondary/50"
            }`}
            onClick={() => !disabled && setIsEditing(true)}
          >
            <span className="text-sm font-medium text-foreground truncate">
              {value || "None"}
            </span>
            {!disabled && (
              <Edit2
                size={12}
                className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
