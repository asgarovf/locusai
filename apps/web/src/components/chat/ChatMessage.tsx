"use client";

import { motion } from "framer-motion";
import { Bot } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Markdown } from "./Markdown";
import { Message } from "./types";

interface ChatMessageProps {
  message: Message;
  isTyping?: boolean;
  loadingState?: "IDLE" | "DETECTING" | "EXECUTING";
  intent?: string;
}

export function ChatMessage({
  message,
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
      "Generating response...",
      "Checking project details...",
      "Validating information...",
      "Constructing the response...",
      "Synthesizing output...",
      "Aligning with project context...",
      "Fetching relevant information...",
      "Executing workflow steps...",
      "Calibrating confidence levels...",
      "Parsing intended actions...",
      "Formatting response data...",
      "Optimizing output...",
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
              {message.thoughtProcess}
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
      </div>
    </motion.div>
  );
}
