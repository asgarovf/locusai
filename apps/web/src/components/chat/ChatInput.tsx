"use client";

import { Mic, MicOff, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, showToast } from "@/components/ui";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
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

  const {
    isListening,
    startListening,
    stopListening,
    transcript,
    interimTranscript,
    isSupported,
    error: speechError,
  } = useSpeechRecognition();

  // Handle errors
  useEffect(() => {
    if (speechError) {
      if (speechError === "not-allowed") {
        showToast.error(
          "Microphone access denied",
          "Please allow microphone access in your browser settings to use voice input."
        );
      } else if (speechError === "no-speech") {
        showToast.warning("No speech detected", "Please try speaking again.");
      } else if (speechError === "network") {
        showToast.error(
          "Network error",
          "Please checking your internet connection."
        );
      } else {
        showToast.error(
          "Voice input error",
          `Something went wrong: ${speechError}`
        );
      }
    }
  }, [speechError]);

  // Helper to update value based on control mode
  const setInputValue = useCallback(
    (val: string) => {
      if (isControlled) {
        onValueChange?.(val);
      } else {
        setInternalValue(val);
      }
    },
    [isControlled, onValueChange]
  );

  const baseTextRef = useRef("");

  useEffect(() => {
    if (isListening) {
      // Capture current text as base when starting?
      // No, this runs on every render.
    }
  }, [isListening]);

  // We need to capture the starting text only ONCE when isListening goes False -> True.

  // We need to capture the starting text only ONCE when isListening goes False -> True.
  // biome-ignore lint/correctness/useExhaustiveDependencies: We intentionally only want to capture the base text when listening STARTS, not on every input change, to avoid duplicating the transcript.
  useEffect(() => {
    if (isListening) {
      baseTextRef.current = inputValue;
    }
  }, [isListening]);

  // Update input value as speech comes in
  useEffect(() => {
    if (isListening) {
      // Logic: replace input with base + new speech
      const prefix = baseTextRef.current;
      const speech = transcript + interimTranscript;
      const combined = prefix + (prefix && speech ? " " : "") + speech;
      setInputValue(combined);
    }
  }, [transcript, interimTranscript, isListening, setInputValue]); // setInputValue is stable or we can suppress if needed, but moving it up allows it to be used.

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
    <div className="p-4 md:p-6 pb-20 lg:pb-6 bg-linear-to-t from-background via-background to-transparent">
      <div className="max-w-3xl mx-auto w-full">
        <div className="relative flex items-end gap-2 p-2 bg-card border border-border/60 rounded-xl shadow-lg focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all w-full">
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
            {isSupported && (
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={cn(
                  "p-2 rounded-lg transition-all duration-200",
                  isListening
                    ? "text-red-500 bg-red-50 hover:bg-red-100 animate-pulse"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
                title={isListening ? "Stop recording" : "Use voice"}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
            )}
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
