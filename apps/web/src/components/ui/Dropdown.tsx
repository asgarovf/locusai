"use client";

import { ChevronDown } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

interface DropdownOption<T extends string> {
  value: T;
  label: string;
  color?: string;
}

interface DropdownProps<T extends string> {
  value: T | undefined;
  onChange: (value: T) => void;
  options: DropdownOption<T>[];
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  renderOption?: (option: DropdownOption<T>) => ReactNode;
}

export function Dropdown<T extends string>({
  value,
  onChange,
  options,
  placeholder = "Select...",
  label,
  disabled = false,
  renderOption,
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
          {label}
        </label>
      )}
      <button
        type="button"
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-background border border-input rounded-md text-foreground text-sm cursor-pointer transition-all hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className={selectedOption ? "" : "text-muted-foreground"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`transition-transform duration-200 text-muted-foreground ${isOpen ? "rotate-180" : "rotate-0"}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-md p-1 z-50 max-h-[240px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 shadow-md">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`w-full flex items-center gap-2 px-3 py-2 bg-transparent border-none rounded-sm text-popover-foreground text-sm cursor-pointer transition-colors text-left hover:bg-accent hover:text-accent-foreground ${
                option.value === value
                  ? "bg-accent/10 text-accent-foreground"
                  : ""
              }`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {renderOption ? (
                renderOption(option)
              ) : (
                <>
                  {option.color && (
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: option.color }}
                    />
                  )}
                  {option.label}
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
