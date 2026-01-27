"use client";

import { motion } from "framer-motion";
import { Bot, CheckSquare, FileText, Layers, Terminal } from "lucide-react";
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
}

export function ChatMessage({
  message,
  artifacts,
  onArtifactClick,
  isTyping,
}: ChatMessageProps) {
  const { user } = useAuth();

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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
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
            <Markdown content={message.content} isInverted={!isUser} />
          )}
        </div>

        {/* Artifact Attachments / Previews */}
        {artifacts && artifacts.length > 0 && !isTyping && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 w-full max-w-2xl">
            {artifacts.map((art) => (
              <button
                key={art.id}
                onClick={() => onArtifactClick?.(art)}
                className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card hover:bg-secondary/50 hover:border-primary/30 transition-all text-left group/artifact w-full"
              >
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-secondary/50 text-foreground/70 group-hover/artifact:text-primary group-hover/artifact:bg-primary/10 transition-colors shrink-0">
                  {art.type === "code" ? (
                    <Terminal size={20} />
                  ) : art.type === "sprint" ? (
                    <Layers size={20} />
                  ) : art.type === "task" ? (
                    <CheckSquare size={20} />
                  ) : (
                    <FileText size={20} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {art.title}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                    {art.type}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
