"use client";

import { Mic, Paperclip, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
}

export function ChatInput({
  onSendMessage,
  isLoading,
  value: controlledValue,
  onValueChange,
}: ChatInputProps) {
  const [internalValue, setInternalValue] = useState("");
  const isControlled = controlledValue !== undefined;
  const inputValue = isControlled ? controlledValue : internalValue;

  const setInputValue = (val: string) => {
    if (isControlled) {
      onValueChange?.(val);
    } else {
      setInternalValue(val);
    }
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Input value triggers the textarea height adjustment
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return;
    onSendMessage(inputValue);
    setInputValue("");
  };

  return (
    <div className="p-4 md:p-6 bg-linear-to-t from-background via-background to-transparent">
      <div className="max-w-3xl mx-auto">
        <div className="relative flex items-end gap-2 p-2 bg-card border border-border/60 rounded-xl shadow-lg focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
          <button
            className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
            title="Attach file"
          >
            <Paperclip size={20} />
          </button>

          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your roadmap, tasks, or docs..."
            className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none focus:ring-0 focus:outline-none resize-none py-2.5 px-2 text-sm text-foreground placeholder:text-muted-foreground/60 scrollbar-none"
            rows={1}
            disabled={isLoading}
          />

          <div className="flex items-center gap-1 pb-1">
            <button
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
              title="Use voice"
            >
              <Mic size={20} />
            </button>
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              size="icon"
              className={cn(
                "h-9 w-9 transition-all duration-200",
                inputValue.trim() ? "opacity-100" : "opacity-50"
              )}
            >
              <Send size={16} />
            </Button>
          </div>
        </div>
        <div className="text-center mt-3">
          <p className="text-[10px] text-muted-foreground/60">
            Locus AI may produce inaccurate information about people, places, or
            facts.
          </p>
        </div>
      </div>
    </div>
  );
}
