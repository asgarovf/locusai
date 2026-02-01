/**
 * Context Menu Component
 *
 * A flexible right-click context menu with support for icons, dividers, and keyboard shortcuts.
 *
 * @example
 * <ContextMenu
 *   position={{ x: 100, y: 200 }}
 *   onClose={() => setOpen(false)}
 *   items={[
 *     { label: 'Edit', icon: Edit, onClick: handleEdit },
 *     { type: 'divider' },
 *     { label: 'Delete', icon: Trash, onClick: handleDelete, variant: 'danger' },
 *   ]}
 * />
 */

"use client";

import type { LucideIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface ContextMenuItem {
  type?: "item" | "divider";
  label?: string;
  icon?: LucideIcon;
  onClick?: () => void;
  shortcut?: string;
  variant?: "default" | "danger";
  disabled?: boolean;
}

interface ContextMenuProps {
  position: { x: number; y: number };
  onClose: () => void;
  items: ContextMenuItem[];
}

export function ContextMenu({ position, onClose, items }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    // Use setTimeout to avoid race condition with menu item clicks
    const timeoutId = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 0);
    document.addEventListener("keydown", handleEscape);
    document.addEventListener("scroll", handleScroll, true);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [onClose]);

  // Adjust position to keep menu within viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (rect.right > viewportWidth) {
        menuRef.current.style.left = `${position.x - rect.width}px`;
      }

      if (rect.bottom > viewportHeight) {
        menuRef.current.style.top = `${position.y - rect.height}px`;
      }
    }
  }, [position]);

  const menuContent = (
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[180px] bg-popover border border-border/60 rounded-xl shadow-xl shadow-black/20 py-1.5 animate-in fade-in zoom-in-95 duration-150"
      style={{ left: position.x, top: position.y }}
    >
      {items.map((item, index) => {
        if (item.type === "divider") {
          return (
            <div
              key={`divider-${index}`}
              className="h-px bg-border/40 my-1.5 mx-2"
            />
          );
        }

        const Icon = item.icon;

        return (
          <button
            key={item.label}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-xs transition-colors",
              item.disabled
                ? "opacity-40 cursor-not-allowed"
                : "cursor-pointer",
              item.variant === "danger"
                ? "text-red-400 hover:bg-red-500/10 hover:text-red-300"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            )}
            onClick={() => {
              if (!item.disabled && item.onClick) {
                item.onClick();
                onClose();
              }
            }}
            disabled={item.disabled}
          >
            {Icon && <Icon size={14} className="shrink-0" />}
            <span className="flex-1 text-left font-medium">{item.label}</span>
            {item.shortcut && (
              <span className="text-[10px] text-muted-foreground/60 font-mono">
                {item.shortcut}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  // Use portal to render at document body level, avoiding overflow clipping
  if (typeof document !== "undefined") {
    return createPortal(menuContent, document.body);
  }

  return menuContent;
}
