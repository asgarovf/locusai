/**
 * Table of Contents Component
 *
 * Auto-generated TOC that extracts headings from markdown content
 * and allows quick navigation.
 */

"use client";

import { List, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface TocHeading {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
  className?: string;
  onClose?: () => void;
  collapsible?: boolean;
}

export function TableOfContents({
  content,
  className,
  onClose,
  collapsible = false,
}: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Extract headings from markdown content
  const headings = useMemo(() => {
    const lines = content.split("\n");
    const extracted: TocHeading[] = [];

    lines.forEach((line, index) => {
      const match = line.match(/^(#{1,3})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        const id = `heading-${index}-${text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")}`;

        extracted.push({ id, text, level });
      }
    });

    return extracted;
  }, [content]);

  // Update active heading based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      // Find the editor content area
      const editorContent = document.querySelector(".prose");
      if (!editorContent) return;

      // Get all headings in the editor
      const headingElements = editorContent.querySelectorAll("h1, h2, h3");
      let currentHeading: string | null = null;

      headingElements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        // Check if heading is near the top of the viewport
        if (rect.top < 200) {
          currentHeading = `heading-${index}`;
        }
      });

      if (currentHeading) {
        setActiveId(currentHeading);
      }
    };

    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, []);

  const handleClick = (heading: TocHeading, index: number) => {
    const editorContent = document.querySelector(".prose");
    if (!editorContent) return;

    const headingElements = editorContent.querySelectorAll("h1, h2, h3");
    const targetElement = headingElements[index];

    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(heading.id);
    }
  };

  if (headings.length === 0) {
    return null;
  }

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className={cn(
          "p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors",
          className
        )}
        title="Show Table of Contents"
      >
        <List size={16} className="text-muted-foreground" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "w-56 bg-card/30 backdrop-blur-sm border border-border/40 rounded-xl overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
        <div className="flex items-center gap-2">
          <List size={14} className="text-muted-foreground" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Contents
          </span>
        </div>
        {(onClose || collapsible) && (
          <button
            onClick={onClose || (() => setIsCollapsed(true))}
            className="p-1 rounded hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* TOC List */}
      <nav className="p-2 max-h-[400px] overflow-y-auto scrollbar-thin">
        <ul className="space-y-0.5">
          {headings.map((heading, index) => (
            <li key={heading.id}>
              <button
                onClick={() => handleClick(heading, index)}
                className={cn(
                  "w-full text-left px-2 py-1.5 text-xs rounded-lg transition-all",
                  "hover:bg-secondary/50 hover:text-foreground",
                  heading.level === 1 && "font-semibold",
                  heading.level === 2 && "pl-4 text-muted-foreground/90",
                  heading.level === 3 &&
                    "pl-6 text-muted-foreground/70 text-[11px]",
                  activeId === heading.id &&
                    "bg-primary/10 text-primary border-l-2 border-primary"
                )}
              >
                <span className="line-clamp-1">{heading.text}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Progress indicator */}
      <div className="px-3 py-2 border-t border-border/30">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground/60">
          <span>{headings.length} sections</span>
          {activeId && (
            <span>
              {headings.findIndex((h) => h.id === activeId) + 1} of{" "}
              {headings.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
