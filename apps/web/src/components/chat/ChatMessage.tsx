"use client";

import { motion } from "framer-motion";
import {
  Bot,
  CheckSquare,
  Copy,
  FileText,
  Layers,
  Terminal,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Markdown } from "./Markdown";
import { Artifact, Message } from "./types";

interface ChatMessageProps {
  message: Message;
  artifacts?: Artifact[];
  onArtifactClick?: (artifact: Artifact) => void;
  isTyping?: boolean;
  loadingState?: "IDLE" | "DETECTING" | "EXECUTING";
  intent?: string;
}

export function ChatMessage({
  message,
  artifacts,
  onArtifactClick,
  isTyping,
  loadingState,
  intent,
}: ChatMessageProps) {
  const { user } = useAuth();

  const [loadingMsg, setLoadingMsg] = useState("Processing...");

  useEffect(() => {
    if (loadingState !== "EXECUTING") return;

    const messages = [
      "Analyzing your request...",
      "Consulting the neural network...",
      "Reviewing project context...",
      "Generating optimized code...",
      "Checking database schemas...",
      "Validating dependencies...",
      "Constructing the response...",
      "Synthesizing output...",
      "Aligning with project manifesto...",
      "Fetching relevant documentation...",
      "Executing workflow steps...",
      "Calibrating confidence levels...",
      "Parsing intended actions...",
      "Formatting artifact data...",
      "Optimizing performance metrics...",
      "Double-checking security rules...",
      "Applying best practices...",
      "Drafting the solution...",
      "Finalizing response...",
      "Almost there...",
    ];

    // Pick a random start
    let index = Math.floor(Math.random() * messages.length);
    setLoadingMsg(messages[index]);

    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setLoadingMsg(messages[index]);
    }, 5000);

    return () => clearInterval(interval);
  }, [loadingState]);

  // Typewriter effect
  const [displayedMsg, setDisplayedMsg] = useState("");

  useEffect(() => {
    setDisplayedMsg("");
    let charIndex = 0;

    // Slight delay before starting to type
    const startTimeout = setTimeout(() => {
      const typeInterval = setInterval(() => {
        if (charIndex < loadingMsg.length) {
          setDisplayedMsg(loadingMsg.slice(0, charIndex + 1));
          charIndex++;
        } else {
          clearInterval(typeInterval);
        }
      }, 30); // Speed of typing

      // Cleanup interval on unmount or change
      return () => clearInterval(typeInterval);
    }, 100);

    return () => clearTimeout(startTimeout);
  }, [loadingMsg]);

  // Dynamic loading message
  const getLoadingText = () => {
    if (loadingState === "DETECTING") return "Understanding your request...";
    if (loadingState === "EXECUTING")
      return intent ? `Executing: ${intent.toLowerCase()}...` : "Executing...";
    return "Thinking...";
  };

  // Handle System Messages
  if (message.role === "system") {
    return (
      <div className="flex items-center justify-center py-4">
        <span
          className={cn(
            "text-xs px-3 py-1 rounded-full",
            message.level === "error"
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground"
          )}
        >
          {message.content}
        </span>
      </div>
    );
  }

  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "flex gap-4 max-w-5xl mx-auto w-full group transition-all",
        isUser ? "flex-row-reverse" : ""
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "shrink-0 flex items-center justify-center shadow-sm h-9 w-9 rounded-full",
          !isUser ? "bg-primary/10 border border-primary/20 text-primary" : ""
        )}
      >
        {!isUser ? (
          <Bot size={18} />
        ) : (
          <Avatar
            name={user?.name || "User"}
            src={user?.avatarUrl}
            size="md"
            className="h-9 w-9"
          />
        )}
      </div>

      <div
        className={cn(
          "flex flex-col gap-2 min-w-0 max-w-[90%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs font-semibold text-foreground/80">
            {isUser ? "You" : "Locus AI"}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {message.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* Message Content */}
        {message.role === "assistant" &&
          message.thoughtProcess &&
          !isTyping && (
            <div className="text-[11px] text-muted-foreground/60 italic mb-1 px-1 max-w-lg line-clamp-2 hover:line-clamp-none transition-all cursor-help">
              💭 {message.thoughtProcess}
            </div>
          )}
        {(isTyping || message.content) && (
          <div
            className={cn(
              "rounded-2xl px-5 py-3.5 text-sm shadow-sm leading-relaxed relative overflow-hidden",
              isUser
                ? "bg-secondary text-secondary-foreground rounded-tr-none"
                : "bg-card border border-border/50 text-foreground rounded-tl-none"
            )}
          >
            {/* If typing, show dynamic loading state */}
            {isTyping ? (
              <div className="flex items-center gap-3 min-h-[24px]">
                {loadingState && loadingState !== "IDLE" ? (
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/40 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-primary/20 border-2 border-primary/60"></span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-medium text-foreground/90 animate-pulse">
                        {getLoadingText()}
                      </span>
                      {intent && loadingState === "EXECUTING" && (
                        <span className="text-[10px] text-muted-foreground transition-all duration-500 font-mono">
                          {displayedMsg}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-current/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-current/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-current/40 rounded-full animate-bounce"></span>
                  </div>
                )}

                {/* Subtle sheen effect for loading */}
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite] pointer-events-none" />
              </div>
            ) : (
              <Markdown content={message.content} />
            )}
          </div>
        )}

        {/* Artifact Attachments / Previews */}
        {artifacts && artifacts.length > 0 && !isTyping && (
          <ArtifactList
            artifacts={artifacts}
            onArtifactClick={onArtifactClick}
          />
        )}
      </div>
    </motion.div>
  );
}

function ArtifactList({
  artifacts,
  onArtifactClick,
}: {
  artifacts: Artifact[];
  onArtifactClick?: (artifact: Artifact) => void;
}) {
  const MAX_VISIBLE = 4;
  const shouldGroup = artifacts.length > MAX_VISIBLE;

  if (shouldGroup) {
    // Group by type
    const groups = artifacts.reduce(
      (acc, art) => {
        const type = art.type || "unknown";
        if (!acc[type]) acc[type] = [];
        acc[type].push(art);
        return acc;
      },
      {} as Record<string, Artifact[]>
    );

    return (
      <div className="grid grid-cols-1 gap-2 mt-1 w-full max-w-2xl">
        {Object.entries(groups).map(([type, items]) => (
          <ArtifactGroup
            key={type}
            type={type}
            count={items.length}
            items={items}
            onArtifactClick={onArtifactClick}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 w-full max-w-2xl">
      {artifacts.map((art) => (
        <ArtifactCard
          key={art.id}
          artifact={art}
          onClick={() => onArtifactClick?.(art)}
        />
      ))}
    </div>
  );
}

function ArtifactGroup({
  type,
  count,
  items,
  onArtifactClick,
}: {
  type: string;
  count: number;
  items: Artifact[];
  onArtifactClick?: (artifact: Artifact) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // Icon based on type
  const Icon =
    type === "code"
      ? Terminal
      : type === "sprint"
        ? Layers
        : type === "task"
          ? CheckSquare
          : FileText;

  return (
    <div className="w-full">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card hover:bg-secondary/50 transition-all text-left w-full group"
      >
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-secondary/50 text-foreground/70 group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
          <Icon size={20} />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-foreground">
            {count} {type.charAt(0).toUpperCase() + type.slice(1)}s Created
          </div>
          <div className="text-[10px] text-muted-foreground">
            {expanded ? "Click to collapse" : "Click to view details"}
          </div>
        </div>
        <div className="text-xs text-primary font-medium px-2">
          {expanded ? "Collapse" : "View All"}
        </div>
      </button>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pl-4 border-l-2 border-border/50"
        >
          {items.map((art) => (
            <ArtifactCard
              key={art.id}
              artifact={art}
              onClick={() => onArtifactClick?.(art)}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}

function ArtifactCard({
  artifact,
  onClick,
}: {
  artifact: Artifact;
  onClick: () => void;
}) {
  const Icon =
    artifact.type === "code"
      ? Terminal
      : artifact.type === "sprint"
        ? Layers
        : artifact.type === "task"
          ? CheckSquare
          : FileText;

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card hover:bg-secondary/50 hover:border-primary/30 transition-all text-left group/artifact w-full cursor-pointer"
    >
      <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-secondary/50 text-foreground/70 group-hover/artifact:text-primary group-hover/artifact:bg-primary/10 transition-colors shrink-0">
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">
          {artifact.title}
        </div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
          {artifact.type}
        </div>
        <button
          className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors mt-2"
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(artifact.id);
            toast.success("Artifact ID copied to clipboard");
          }}
        >
          <Copy size={12} />
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            {artifact.id}
          </p>
        </button>
      </div>
    </div>
  );
}
