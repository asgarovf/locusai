"use client";

import { motion } from "framer-motion";
import { Bot, FileText, Terminal } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Artifact, Message } from "./types";

interface ChatMessageProps {
  message: Message;
  artifact?: Artifact;
  onArtifactClick?: (artifact: Artifact) => void;
  isTyping?: boolean;
}

export function ChatMessage({
  message,
  artifact,
  onArtifactClick,
  isTyping,
}: ChatMessageProps) {
  const { user } = useAuth();
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-4 max-w-4xl mx-auto w-full group",
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
          "flex flex-col gap-2 min-w-0 max-w-[85%]",
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
        <div
          className={cn(
            "rounded-2xl px-5 py-3.5 text-sm shadow-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-none"
              : "bg-card border border-border/50 text-foreground rounded-tl-none"
          )}
        >
          {/* If typing, show dots, else standard markdown content */}
          {isTyping ? (
            <div className="flex items-center gap-1 h-5">
              <span className="w-1.5 h-1.5 bg-current/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-current/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-current/40 rounded-full animate-bounce"></span>
            </div>
          ) : (
            <div className="markdown-content space-y-2">
              {/* 
                     We are rendering markdown here. 
                     For simplicity in this step, we just render children.
                     In a real app, we'd configure remark-gfm etc.
                 */}
              {message.content.split("\n").map((line, i) => (
                <p key={i} className="min-h-[1em]">
                  {line}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Artifact Attachment / Preview */}
        {artifact && !isTyping && (
          <button
            onClick={() => onArtifactClick?.(artifact)}
            className="flex items-center gap-3 p-3 mt-1 rounded-xl border border-border/60 bg-card hover:bg-secondary/50 hover:border-primary/30 transition-all text-left group/artifact w-full max-w-sm"
          >
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-secondary/50 text-foreground/70 group-hover/artifact:text-primary group-hover/artifact:bg-primary/10 transition-colors">
              {artifact.type === "code" ? (
                <Terminal size={20} />
              ) : (
                <FileText size={20} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">
                {artifact.title}
              </div>
              <div className="text-xs text-muted-foreground">
                Click to view {artifact.type}
              </div>
            </div>
          </button>
        )}
      </div>
    </motion.div>
  );
}
