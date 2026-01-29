"use client";

import { $FixMe } from "@locusai/shared";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { MermaidRenderer } from "../editor/MermaidRenderer";

interface MarkdownProps {
  content: string;
  className?: string;
}

export function Markdown({ content, className }: MarkdownProps) {
  if (!content?.trim?.()) return null;

  return (
    <div
      className={cn(
        "prose prose-sm max-w-none prose-invert prose-p:leading-relaxed prose-pre:bg-secondary/50 prose-pre:border prose-pre:border-border/40 prose-pre:p-4 prose-pre:rounded-xl prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: (props) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            />
          ),
          ul: (props) => <ul {...props} className="list-disc pl-4 space-y-2" />,
          ol: (props) => (
            <ol {...props} className="list-decimal pl-4 space-y-2" />
          ),
          li: (props) => <li {...props} className="my-1" />,
          h1: (props) => (
            <h1 {...props} className="text-xl font-bold mb-4 mt-6" />
          ),
          h2: (props) => (
            <h2 {...props} className="text-lg font-bold mb-3 mt-5" />
          ),
          h3: (props) => (
            <h3 {...props} className="text-base font-bold mb-2 mt-4" />
          ),
          blockquote: (props) => (
            <blockquote
              {...props}
              className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground bg-primary/5 py-1 rounded-r-lg my-4"
            />
          ),
          code: ({ node, inline, className, children, ...props }: $FixMe) => {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";

            if (!inline && language === "mermaid") {
              return (
                <MermaidRenderer
                  content={String(children).replace(/\n$/, "")}
                />
              );
            }

            return (
              <code {...props} className={className}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
