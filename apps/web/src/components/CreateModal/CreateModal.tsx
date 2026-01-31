"use client";

import React from "react";
import { SecondaryText } from "@/components/typography";
import { Button, Modal } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface CreateModalField {
  /** Field identifier */
  name: string;
  /** Display label */
  label: string | React.ReactNode;
  /** Form component (Input, Textarea, etc) */
  component: React.ReactNode;
  /** Whether field is required */
  required?: boolean;
  /** Help text for field */
  help?: string;
}

export interface CreateModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Modal title */
  title: string;
  /** Array of form fields */
  fields: CreateModalField[];
  /** Form submission handler */
  onSubmit: (e: React.FormEvent) => Promise<void> | void;
  /** Called to close modal */
  onClose: () => void;
  /** Submit button text */
  submitText?: string;
  /** Submit button variant */
  submitVariant?: "primary" | "secondary";
  /** Cancel button text */
  cancelText?: string;
  /** Whether submission is in progress */
  isPending?: boolean;
  /** Whether submit button is disabled */
  submitDisabled?: boolean;
  /** Optional icon for modal header */
  icon?: React.ReactNode;
  /** Modal size */
  size?: "sm" | "md" | "lg" | "responsive";
  /** Optional keyboard shortcut hint */
  shortcutHint?: string;
}

/**
 * Create Modal Component
 *
 * Reusable compound component for create/edit modals.
 * Provides consistent styling, field rendering, and form submission.
 * Supports custom fields, icons, and submission handlers.
 *
 * Features:
 * - Customizable form fields
 * - Consistent styling and layout
 * - Submit and cancel actions
 * - Loading state handling
 * - Optional icon display
 * - Multiple size options
 *
 * @component
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
  shortcutHint,
}: CreateModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      shortcutHint={shortcutHint}
    >
      <form
        onSubmit={onSubmit}
        className={cn("space-y-6 py-2", "md:space-y-8")}
      >
        {fields.map((field) => (
          <div key={field.name} className="space-y-3">
            <SecondaryText as="label" size="xs" className="block ml-1">
              {field.label}
              {field.required && <span className="text-destructive">*</span>}
            </SecondaryText>
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
