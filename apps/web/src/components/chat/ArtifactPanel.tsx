"use client";

import {
  Check,
  CheckSquare,
  Copy,
  FileText,
  Layers,
  Maximize2,
  Minimize2,
  Terminal,
  X,
} from "lucide-react";
import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Markdown } from "./Markdown";
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
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isOpen || !artifact) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "border-l border-border/50 bg-card/30 backdrop-blur-xl flex flex-col h-full shrink-0 transition-all duration-300",
        isExpanded ? "w-[800px] xl:w-[900px]" : "w-[400px] xl:w-[500px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-card/50">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary shrink-0">
            {artifact.type === "code" ? (
              <Terminal size={16} />
            ) : artifact.type === "sprint" ? (
              <Layers size={16} />
            ) : artifact.type === "task" ? (
              <CheckSquare size={16} />
            ) : (
              <FileText size={16} />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold truncate">{artifact.title}</h3>
            <p className="text-[10px] text-muted-foreground truncate">
              {artifact.type === "code"
                ? `${artifact.language} snippet`
                : artifact.type === "sprint"
                  ? "Sprint details"
                  : artifact.type === "task"
                    ? "Task details"
                    : "Document preview"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
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
              codeTagProps={{
                style: {
                  backgroundColor: "transparent",
                },
              }}
              showLineNumbers
              wrapLines
            >
              {artifact.content}
            </SyntaxHighlighter>
          </div>
        ) : artifact.content ? (
          <div className="p-6">
            <Markdown content={artifact.content} />
          </div>
        ) : (
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/5 flex items-center justify-center text-primary/40">
              {artifact.type === "sprint" ? (
                <Layers size={32} />
              ) : (
                <CheckSquare size={32} />
              )}
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-semibold">{artifact.title}</h4>
              <p className="text-sm text-muted-foreground max-w-xs">
                This {artifact.type} has been successfully created in your
                workspace.
              </p>
            </div>
            {artifact.metadata && (
              <div className="pt-4 flex flex-wrap justify-center gap-2">
                {Object.entries(artifact.metadata).map(([key, value]) => (
                  <div
                    key={key}
                    className="px-2.5 py-1 rounded-full bg-secondary/50 border border-border/50 text-[10px] uppercase tracking-wider font-bold"
                  >
                    <span className="opacity-50 mr-1">{key}:</span>
                    {String(value)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-border/40 bg-card/50 flex gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-2"
          onClick={handleCopy}
        >
          {isCopied ? <Check size={12} /> : <Copy size={12} />}
          {isCopied ? "Copied" : "Copy to Clipboard"}
        </Button>
      </div>
    </div>
  );
}
