"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  size?: "sm" | "md" | "lg";
}

export function Modal({
  isOpen,
  onClose,
  children,
  title,
  size = "md",
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

  const widths = {
    sm: "w-[400px]",
    md: "w-[520px]",
    lg: "w-[680px]",
  };

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-1000 animate-in fade-in duration-300"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={`bg-background border border-border rounded-xl shadow-lg animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden flex flex-col ${
          widths[size]
        } max-w-[90vw]`}
      >
        {title && (
          <div className="flex justify-between items-center p-5 border-b border-border">
            <h3 className="text-lg font-semibold m-0 text-foreground">
              {title}
            </h3>
            <button
              className="bg-transparent border-none text-muted-foreground hover:text-foreground cursor-pointer p-0 transition-colors duration-200"
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </div>
        )}
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  );
}
