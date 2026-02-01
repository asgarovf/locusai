/**
 * Search Input Component
 *
 * Enhanced search input with keyboard navigation support and shortcuts.
 */

"use client";

import { Search, X } from "lucide-react";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { Input } from "@/components/ui";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  className?: string;
}

export interface SearchInputRef {
  focus: () => void;
}

export const SearchInput = forwardRef<SearchInputRef, SearchInputProps>(
  function SearchInput(
    {
      value,
      onChange,
      placeholder = "Search documents...",
      onKeyDown,
      className,
    },
    ref
  ) {
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }));

    return (
      <div className={cn("relative", className)}>
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60"
        />
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          className="h-9 pl-9 pr-8 text-xs bg-secondary/20 border-border/30 focus:bg-secondary/40 rounded-xl"
        />
        {value && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground/60 hover:text-foreground transition-colors"
            onClick={() => onChange("")}
          >
            <X size={12} />
          </button>
        )}
      </div>
    );
  }
);
