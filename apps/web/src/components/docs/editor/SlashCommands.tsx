/**
 * Slash Commands Extension
 *
 * Provides a command menu that appears when typing "/" in the editor.
 * Supports fuzzy search and keyboard navigation.
 */

"use client";

import { Extension } from "@tiptap/core";
import { type Editor, ReactRenderer } from "@tiptap/react";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import {
  CheckSquare,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  type LucideIcon,
  Minus,
  Quote,
} from "lucide-react";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface CommandItem {
  title: string;
  description: string;
  icon: LucideIcon;
  command: (editor: Editor) => void;
}

const SLASH_COMMANDS: CommandItem[] = [
  {
    title: "Heading 1",
    description: "Large section heading",
    icon: Heading1,
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: Heading2,
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    icon: Heading3,
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    title: "Bullet List",
    description: "Create a simple bullet list",
    icon: List,
    command: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: "Numbered List",
    description: "Create a numbered list",
    icon: ListOrdered,
    command: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    title: "Task List",
    description: "Create a to-do list with checkboxes",
    icon: CheckSquare,
    command: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    title: "Quote",
    description: "Capture a quote",
    icon: Quote,
    command: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    title: "Code Block",
    description: "Add a code snippet",
    icon: Code,
    command: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: "Divider",
    description: "Add a horizontal divider",
    icon: Minus,
    command: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
];

interface CommandListProps {
  items: CommandItem[];
  command: (item: CommandItem) => void;
}

interface CommandListRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

const CommandList = forwardRef<CommandListRef, CommandListProps>(
  function CommandList({ items, command }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Reset index when items change (using ref to track previous length)
    const prevLengthRef = useRef(items.length);
    if (prevLengthRef.current !== items.length) {
      prevLengthRef.current = items.length;
      // This will trigger on next render
      if (selectedIndex >= items.length) {
        setSelectedIndex(0);
      }
    }

    useImperativeHandle(ref, () => ({
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((prev) => (prev <= 0 ? items.length - 1 : prev - 1));
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((prev) => (prev >= items.length - 1 ? 0 : prev + 1));
          return true;
        }
        if (event.key === "Enter") {
          const item = items[selectedIndex];
          if (item) {
            command(item);
          }
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="p-3 text-center text-xs text-muted-foreground bg-popover border border-border rounded-xl shadow-xl min-w-[220px]">
          No commands found
        </div>
      );
    }

    return (
      <div className="p-1.5 max-h-[300px] overflow-y-auto scrollbar-thin bg-popover border border-border rounded-xl shadow-xl min-w-[220px]">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              onClick={() => command(item)}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left transition-colors",
                index === selectedIndex
                  ? "bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:bg-secondary/50"
              )}
            >
              <div className="p-1.5 rounded-md bg-secondary/50">
                <Icon size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium">{item.title}</div>
                <div className="text-[10px] text-muted-foreground/70 truncate">
                  {item.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }
);

const renderItems = () => {
  let component: ReactRenderer<CommandListRef> | null = null;
  let popup: HTMLElement | null = null;
  let currentRange: { from: number; to: number } | null = null;

  return {
    onStart: (props: {
      editor: Editor;
      clientRect: (() => DOMRect | null) | null;
      range: { from: number; to: number };
    }) => {
      currentRange = props.range;

      component = new ReactRenderer(CommandList, {
        props: {
          items: SLASH_COMMANDS,
          command: (item: CommandItem) => {
            // Delete the "/" and any query text first, then execute the command
            if (currentRange) {
              props.editor.chain().focus().deleteRange(currentRange).run();
            }
            item.command(props.editor);
            popup?.remove();
            popup = null;
          },
        },
        editor: props.editor,
      });

      if (!props.clientRect) {
        return;
      }

      const rect = props.clientRect();
      if (!rect) return;

      // Create and position the popup
      popup = document.createElement("div");
      popup.style.position = "fixed";
      popup.style.left = `${rect.left}px`;
      popup.style.top = `${rect.bottom + 8}px`;
      popup.style.zIndex = "9999";
      popup.appendChild(component.element);
      document.body.appendChild(popup);
    },

    onUpdate: (props: {
      editor: Editor;
      query: string;
      clientRect: (() => DOMRect | null) | null;
      range: { from: number; to: number };
    }) => {
      currentRange = props.range;

      const filteredItems = SLASH_COMMANDS.filter((item) =>
        item.title.toLowerCase().includes(props.query.toLowerCase())
      );

      component?.updateProps({
        items: filteredItems,
        command: (item: CommandItem) => {
          // Delete the "/" and any query text first, then execute the command
          if (currentRange) {
            props.editor.chain().focus().deleteRange(currentRange).run();
          }
          item.command(props.editor);
          popup?.remove();
          popup = null;
        },
      });

      if (!props.clientRect || !popup) {
        return;
      }

      const rect = props.clientRect();
      if (rect) {
        popup.style.left = `${rect.left}px`;
        popup.style.top = `${rect.bottom + 8}px`;
      }
    },

    onKeyDown: (props: { event: KeyboardEvent }) => {
      if (props.event.key === "Escape") {
        popup?.remove();
        popup = null;
        return true;
      }

      return component?.ref?.onKeyDown(props.event) ?? false;
    },

    onExit: () => {
      popup?.remove();
      popup = null;
      component?.destroy();
    },
  };
};

export const SlashCommands = Extension.create({
  name: "slashCommands",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor;
          range: { from: number; to: number };
          props: CommandItem;
        }) => {
          props.command(editor);
          editor.chain().focus().deleteRange(range).run();
        },
      } as Partial<SuggestionOptions>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        render: renderItems,
      }),
    ];
  },
});
