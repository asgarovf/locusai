"use client";

import {
  Check,
  Copy,
  ExternalLink,
  FileText,
  Maximize2,
  Terminal,
  X,
} from "lucide-react";
import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "@/components/ui/Button";
import { Artifact } from "./types";

interface ArtifactPanelProps {
  artifact: Artifact | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ArtifactPanel({
  artifact,
  isOpen,
  onClose,
}: ArtifactPanelProps) {
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen || !artifact) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="w-[400px] xl:w-[500px] border-l border-border/50 bg-card/30 backdrop-blur-xl flex flex-col h-full shrink-0 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-card/50">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary shrink-0">
            {artifact.type === "code" ? (
              <Terminal size={16} />
            ) : (
              <FileText size={16} />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold truncate">{artifact.title}</h3>
            <p className="text-[10px] text-muted-foreground truncate">
              {artifact.type === "code"
                ? `${artifact.language} snippet`
                : "Document preview"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <Maximize2 size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            <X size={16} />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-background/50 relative">
        {artifact.type === "code" ? (
          <div className="min-h-full font-mono text-sm relative group">
            <div className="absolute right-4 top-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="outline"
                className="bg-background/80 backdrop-blur h-8 gap-2"
                onClick={handleCopy}
              >
                {isCopied ? <Check size={14} /> : <Copy size={14} />}
                <span>{isCopied ? "Copied" : "Copy"}</span>
              </Button>
            </div>
            <SyntaxHighlighter
              language={artifact.language || "typescript"}
              style={oneDark}
              customStyle={{
                margin: 0,
                padding: "1.5rem",
                background: "transparent",
                fontSize: "13px",
                lineHeight: "1.5",
              }}
              showLineNumbers
            >
              {artifact.content}
            </SyntaxHighlighter>
          </div>
        ) : (
          <div className="p-6 prose prose-sm dark:prose-invert max-w-none">
            {/* Simple Markdown rendering placeholder */}
            <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/80">
              {artifact.content}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-border/40 bg-card/50 flex gap-2 justify-end">
        <Button variant="outline" size="sm" className="h-8 text-xs gap-2">
          <Copy size={12} />
          Copy to Clipboard
        </Button>
        <Button size="sm" className="h-8 text-xs gap-2">
          <ExternalLink size={12} />
          Open in Editor
        </Button>
      </div>
    </div>
  );
}
