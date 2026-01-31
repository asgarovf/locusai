"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MODAL_SIZES, Z_INDEXES } from "./constants";

/**
 * Modal component props
 *
 * @property isOpen - Control modal visibility
 * @property onClose - Callback when modal should close
 * @property title - Optional modal header title
 * @property size - Modal width size (default: "md")
 */
interface ModalProps {
  /** Whether modal is visible */
  isOpen: boolean;
  /** Called when user attempts to close modal */
  onClose: () => void;
  /** Modal content */
  children: ReactNode;
  /** Optional modal header title */
  title?: string;
  /** Modal size */
  size?: keyof typeof MODAL_SIZES;
  /** Optional keyboard shortcut hint */
  shortcutHint?: string;
}

export function Modal({
  isOpen,
  onClose,
  children,
  title,
  size = "md",
  shortcutHint,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className={`fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center ${Z_INDEXES.modalOverlay} animate-in fade-in duration-300`}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="presentation"
    >
      <div
        className={`bg-background border border-border rounded-xl shadow-lg animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden flex flex-col ${
          MODAL_SIZES[size]
        } ${Z_INDEXES.modal}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
      >
        {title && (
          <div className="flex justify-between items-center p-5 border-b border-border">
            <h3
              id="modal-title"
              className="text-lg font-semibold m-0 text-foreground"
            >
              {title}
            </h3>
            <div className="flex items-center gap-3">
              {shortcutHint && (
                <kbd className="px-2 py-1 text-xs bg-muted rounded">
                  {shortcutHint}
                </kbd>
              )}
              <button
                className="bg-transparent border-none text-muted-foreground hover:text-foreground cursor-pointer p-0 transition-colors duration-200"
                onClick={onClose}
                aria-label="Close modal"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Modal component
 *
 * A accessible, dismissable modal dialog component.
 * - Closes on Escape key
 * - Closes on backdrop click
 * - Prevents body scroll when open
 * - Includes proper ARIA attributes
 *
 * @example
 * // Basic modal
 * <Modal isOpen={isOpen} onClose={handleClose} title="Confirm Action">
 *   <p>Are you sure?</p>
 *   <Button onClick={handleConfirm}>Confirm</Button>
 * </Modal>
 */
