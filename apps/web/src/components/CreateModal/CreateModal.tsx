"use client";

import React from "react";
import { Button, Modal } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface CreateModalField {
  name: string;
  label: string;
  component: React.ReactNode;
  required?: boolean;
  help?: string;
}

export interface CreateModalProps {
  isOpen: boolean;
  title: string;
  fields: CreateModalField[];
  onSubmit: (e: React.FormEvent) => Promise<void> | void;
  onClose: () => void;
  submitText?: string;
  submitVariant?: "primary" | "secondary";
  cancelText?: string;
  isPending?: boolean;
  submitDisabled?: boolean;
  icon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

/**
 * Compound component for create/edit modals.
 *
 * Provides consistent styling and layout for modal forms.
 * Handles field rendering, form submission, and action buttons.
 *
 * @example
 * <CreateModal
 *   isOpen={isOpen}
 *   title="Create Task"
 *   fields={[
 *     {
 *       name: "title",
 *       label: "Task Title",
 *       component: <Input {...titleProps} />,
 *       required: true,
 *     },
 *   ]}
 *   onSubmit={handleSubmit}
 *   onClose={handleClose}
 *   submitText="Create"
 *   isPending={isLoading}
 * />
 */
export function CreateModal({
  isOpen,
  title,
  fields,
  onSubmit,
  onClose,
  submitText = "Submit",
  submitVariant = "primary",
  cancelText = "Cancel",
  isPending = false,
  submitDisabled = false,
  icon,
  size = "md",
}: CreateModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size={size}>
      <form
        onSubmit={onSubmit}
        className={cn("space-y-6 py-2", "md:space-y-8")}
      >
        {fields.map((field) => (
          <div key={field.name} className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
              {field.label}
              {field.required && <span className="text-destructive">*</span>}
            </label>
            {field.component}
            {field.help && (
              <p className="text-xs text-muted-foreground/60 ml-1">
                {field.help}
              </p>
            )}
          </div>
        ))}

        <div className="flex justify-end gap-3 pt-6 border-t mt-4">
          <Button
            type="button"
            onClick={onClose}
            variant="ghost"
            className="px-6"
            disabled={isPending}
          >
            {cancelText}
          </Button>
          <Button
            type="submit"
            variant={submitVariant}
            disabled={submitDisabled || isPending}
            isLoading={isPending}
            loadingText={`${submitText}...`}
            className="px-8 shadow-lg shadow-primary/10"
          >
            {icon && <span className="mr-2">{icon}</span>}
            {submitText}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
