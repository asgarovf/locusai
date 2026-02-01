/**
 * Floating Toolbar Component
 *
 * A floating toolbar that appears when text is selected,
 * providing quick access to formatting options.
 */

"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold,
  Code,
  Highlighter,
  Italic,
  Link,
  Strikethrough,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface FloatingToolbarProps {
  editor: Editor;
}

export function FloatingToolbar({ editor }: FloatingToolbarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const updatePosition = () => {
      const { from, to, empty } = editor.state.selection;

      // Only show when there's a selection (not just cursor)
      if (empty || from === to) {
        setIsVisible(false);
        return;
      }

      // Get the coordinates of the selection
      const { view } = editor;
      const start = view.coordsAtPos(from);
      const end = view.coordsAtPos(to);

      // Calculate position above the selection
      const left = (start.left + end.left) / 2;
      const top = start.top - 50; // 50px above selection

      setPosition({ top, left });
      setIsVisible(true);
    };

    editor.on("selectionUpdate", updatePosition);
    editor.on("transaction", updatePosition);

    return () => {
      editor.off("selectionUpdate", updatePosition);
      editor.off("transaction", updatePosition);
    };
  }, [editor]);

  const buttons = [
    {
      icon: Bold,
      onClick: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive("bold"),
      label: "Bold",
      shortcut: "⌘B",
    },
    {
      icon: Italic,
      onClick: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive("italic"),
      label: "Italic",
      shortcut: "⌘I",
    },
    {
      icon: Strikethrough,
      onClick: () => editor.chain().focus().toggleStrike().run(),
      isActive: editor.isActive("strike"),
      label: "Strikethrough",
      shortcut: "⌘⇧S",
    },
    {
      icon: Code,
      onClick: () => editor.chain().focus().toggleCode().run(),
      isActive: editor.isActive("code"),
      label: "Inline Code",
      shortcut: "⌘E",
    },
    {
      icon: Highlighter,
      onClick: () => editor.chain().focus().toggleHighlight().run(),
      isActive: editor.isActive("highlight"),
      label: "Highlight",
      shortcut: "⌘⇧H",
    },
    {
      icon: Link,
      onClick: () => {
        const previousUrl = editor.getAttributes("link").href;
        const url = window.prompt("Enter URL:", previousUrl);
        if (url === null) return;
        if (url === "") {
          editor.chain().focus().extendMarkRange("link").unsetLink().run();
        } else {
          editor
            .chain()
            .focus()
            .extendMarkRange("link")
            .setLink({ href: url })
            .run();
        }
      },
      isActive: editor.isActive("link"),
      label: "Link",
      shortcut: "⌘K",
    },
  ];

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="fixed z-50 flex items-center gap-0.5 p-1 bg-popover/95 backdrop-blur-xl border border-border/60 rounded-xl shadow-xl shadow-black/20 animate-in fade-in zoom-in-95 duration-150"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: "translateX(-50%)",
      }}
      onMouseDown={(e) => e.preventDefault()} // Prevent losing selection
    >
      {buttons.map((btn, i) => (
        <button
          key={i}
          onClick={(e) => {
            e.preventDefault();
            btn.onClick();
          }}
          className={cn(
            "p-2 rounded-lg transition-all text-xs",
            btn.isActive
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
          )}
          title={`${btn.label} (${btn.shortcut})`}
        >
          <btn.icon size={14} />
        </button>
      ))}
    </div>
  );
}
