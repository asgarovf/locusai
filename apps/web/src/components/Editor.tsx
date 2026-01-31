/**
 * Rich Text Editor Component
 *
 * TipTap-based rich text editor with markdown support.
 * Includes formatting toolbar and multiple editing modes.
 * Supports headings, lists, code blocks, links, and more.
 *
 * Features:
 * - Markdown support with live preview
 * - Rich formatting toolbar
 * - Code syntax highlighting
 * - Task lists and checkboxes
 * - Link editing
 * - Undo/redo functionality
 * - Heading and list formatting
 * - Quote and code block support
 *
 * @example
 * <Editor
 *   value={markdown}
 *   onChange={handleChange}
 *   placeholder="Write your documentation..."
 * />
 */

"use client";

import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { TextStyle } from "@tiptap/extension-text-style";
import Typography from "@tiptap/extension-typography";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { common, createLowlight } from "lowlight";
import {
  Bold,
  CheckSquare,
  Code as CodeIcon,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo,
  Terminal,
  Undo,
} from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { Markdown } from "tiptap-markdown";
import { cn } from "@/lib/utils";
import { Markdown as UnifiedMarkdown } from "./chat/Markdown";

const lowlight = createLowlight(common);

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}

const MenuBar = ({ editor }: { editor: TiptapEditor | null }) => {
  if (!editor) {
    return null;
  }

  const buttons = [
    {
      icon: Heading1,
      onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: editor.isActive("heading", { level: 1 }),
      label: "H1",
    },
    {
      icon: Heading2,
      onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive("heading", { level: 2 }),
      label: "H2",
    },
    {
      icon: Heading3,
      onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: editor.isActive("heading", { level: 3 }),
      label: "H3",
    },
    {
      icon: Bold,
      onClick: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive("bold"),
      label: "Bold",
    },
    {
      icon: Italic,
      onClick: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive("italic"),
      label: "Italic",
    },
    {
      icon: Highlighter,
      onClick: () => editor.chain().focus().toggleHighlight().run(),
      isActive: editor.isActive("highlight"),
      label: "Highlight",
    },
    {
      icon: CodeIcon,
      onClick: () => editor.chain().focus().toggleCode().run(),
      isActive: editor.isActive("code"),
      label: "Code",
    },
    {
      icon: Terminal,
      onClick: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: editor.isActive("codeBlock"),
      label: "Code Block",
    },
    {
      icon: List,
      onClick: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive("bulletList"),
      label: "Bullet List",
    },
    {
      icon: ListOrdered,
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive("orderedList"),
      label: "Ordered List",
    },
    {
      icon: CheckSquare,
      onClick: () => editor.chain().focus().toggleTaskList().run(),
      isActive: editor.isActive("taskList"),
      label: "Task List",
    },
    {
      icon: Quote,
      onClick: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: editor.isActive("blockquote"),
      label: "Quote",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-card/50 backdrop-blur-md border-b border-border/40 sticky top-0 z-10">
      {buttons.map((btn, i) => (
        <button
          key={i}
          onClick={(e) => {
            e.preventDefault();
            btn.onClick();
          }}
          className={cn(
            "p-2 rounded-lg transition-all hover:bg-secondary/80",
            btn.isActive
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground"
          )}
          title={btn.label}
        >
          <btn.icon size={16} />
        </button>
      ))}
      <div className="w-px h-6 bg-border/40 mx-1" />
      <button
        onClick={(e) => {
          e.preventDefault();
          editor.chain().focus().undo().run();
        }}
        disabled={!editor.can().chain().focus().undo().run()}
        className="p-2 rounded-lg text-muted-foreground hover:bg-secondary/80 disabled:opacity-30"
      >
        <Undo size={16} />
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          editor.chain().focus().redo().run();
        }}
        disabled={!editor.can().chain().focus().redo().run()}
        className="p-2 rounded-lg text-muted-foreground hover:bg-secondary/80 disabled:opacity-30"
      >
        <Redo size={16} />
      </button>
    </div>
  );
};

export function Editor({ value, onChange, readOnly = false, placeholder = "Initialize content flow..." }: EditorProps) {
  // useRef for debouncing to avoid re-creating the debounce function on every render
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastEmittedValue = useRef<string>(value);

  // Debounce helper
  const debouncedUpdate = (fn: () => void, delay: number) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(fn, delay);
  };

  // Memoize extensions to prevent reconfiguration on every render
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      Markdown.configure({
        html: true,
        tightLists: true,
        tightListClass: "tight",
        bulletListMarker: "-",
        linkify: true,
        breaks: true,
      }),
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline underline-offset-4",
        },
      }),
      Typography,
      CodeBlockLowlight.configure({
        lowlight,
      }),
      TextStyle,
      Color,
    ],
    [placeholder]
  );

  // Memoize editor props
  const editorProps = useMemo(
    () => ({
      attributes: {
        class: cn(
          "prose prose-invert max-w-none min-h-[500px] p-8 focus:outline-none",
          "prose-pre:bg-secondary/40 prose-pre:border prose-pre:border-border/40 prose-pre:rounded-xl",
          "prose-p:text-muted-foreground prose-p:leading-relaxed",
          "prose-li:text-muted-foreground",
          "prose-strong:text-foreground prose-strong:font-bold",
          "prose-code:text-primary prose-code:bg-primary/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none",
          "prose-blockquote:border-l-primary prose-blockquote:bg-primary/5 prose-blockquote:py-2 prose-blockquote:rounded-r-xl"
        ),
      },
    }),
    []
  );

  const editor = useEditor({
    extensions,
    immediatelyRender: false,
    content: value,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      debouncedUpdate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: Tiptap storage is not strictly typed
        const markdown = (editor.storage as any).markdown.getMarkdown();
        // Only trigger change if content actually changed from what we last knew
        if (markdown !== lastEmittedValue.current) {
          lastEmittedValue.current = markdown;
          onChange(markdown);
        }
      }, 500);
    },
    editorProps,
  });

  useEffect(() => {
    if (editor) {
      if (value !== lastEmittedValue.current) {
        // biome-ignore lint/suspicious/noExplicitAny: Tiptap storage is not strictly typed
        const currentMarkdown = (editor.storage as any).markdown.getMarkdown();
        if (value !== currentMarkdown) {
          editor.commands.setContent(value);
          lastEmittedValue.current = value;
        }
      }
    }
  }, [value, editor]);

  return (
    <div className="w-full h-full flex flex-col">
      {!readOnly && <MenuBar editor={editor} />}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {readOnly ? (
          <UnifiedMarkdown
            content={value}
            className="p-8 prose-invert prose-p:text-muted-foreground prose-p:leading-relaxed prose-strong:text-foreground prose-strong:font-bold prose-blockquote:border-l-primary prose-blockquote:bg-primary/5 prose-blockquote:py-2 prose-blockquote:rounded-r-xl"
          />
        ) : (
          <EditorContent editor={editor} />
        )}
      </div>
    </div>
  );
}
