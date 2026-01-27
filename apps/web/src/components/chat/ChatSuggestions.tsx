"use client";

import { motion } from "framer-motion";
import { MessageSquarePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { SuggestedAction } from "./types";

interface ChatSuggestionsProps {
  suggestions: SuggestedAction[];
  onSelect: (suggestion: SuggestedAction) => void;
  className?: string;
}

export function ChatSuggestions({
  suggestions,
  onSelect,
  className,
}: ChatSuggestionsProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div
      className={cn("max-w-5xl mx-auto flex flex-wrap gap-2 px-12", className)}
    >
      {suggestions.map((suggestion, index) => (
        <motion.button
          key={index}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => onSelect(suggestion)}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-border/60 bg-card/50 hover:bg-secondary/80 hover:border-primary/30 hover:scale-105 active:scale-95 transition-all text-xs font-medium text-foreground/80 shadow-sm"
        >
          <MessageSquarePlus size={14} className="text-primary/60" />
          {suggestion.label}
        </motion.button>
      ))}
    </div>
  );
}
