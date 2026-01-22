"use client";

import { ChevronDown } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

/**
 * Dropdown option configuration
 *
 * @property value - Unique value identifier
 * @property label - Display label for option
 * @property color - Optional color indicator
 */
interface DropdownOption<T extends string> {
  /** Unique value identifier */
  value: T;
  /** Display label */
  label: string;
  /** Optional color for indicator dot */
  color?: string;
}

/**
 * Dropdown component props
 *
 * @property value - Currently selected value
 * @property onChange - Callback when selection changes
 * @property options - Available options to select from
 * @property placeholder - Placeholder text when no selection
 * @property label - Optional label above dropdown
 * @property disabled - Disable dropdown interaction
 * @property renderOption - Custom option rendering
 */
interface DropdownProps<T extends string> {
  /** Currently selected value */
  value: T | undefined;
  /** Callback when selection changes */
  onChange: (value: T) => void;
  /** Available options */
  options: DropdownOption<T>[];
  /** Placeholder text */
  placeholder?: string;
  /** Optional label */
  label?: string;
  /** Disable dropdown */
  disabled?: boolean;
  /** Custom option renderer */
  renderOption?: (option: DropdownOption<T>) => ReactNode;
}

/**
 * Dropdown component
 *
 * A generic, type-safe dropdown select component with support for
 * custom option rendering and color indicators.
 *
 * @example
 * // Basic dropdown
 * const [status, setStatus] = useState<"pending" | "done">();
 * <Dropdown
 *   value={status}
 *   onChange={setStatus}
 *   options={[
 *     { value: "pending", label: "Pending" },
 *     { value: "done", label: "Done" },
 *   ]}
 * />
 *
 * @example
 * // With color indicators
 * <Dropdown
 *   value={priority}
 *   onChange={setPriority}
 *   options={[
 *     { value: "low", label: "Low", color: "#22c55e" },
 *     { value: "high", label: "High", color: "#ef4444" },
 *   ]}
 * />
 */
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
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={selectedOption ? "" : "text-muted-foreground"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`transition-transform duration-200 text-muted-foreground ${isOpen ? "rotate-180" : "rotate-0"}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-md p-1 z-50 max-h-[240px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 shadow-md"
          role="listbox"
        >
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
              role="option"
              aria-selected={option.value === value}
            >
              {renderOption ? (
                renderOption(option)
              ) : (
                <>
                  {option.color && (
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: option.color }}
                      aria-hidden="true"
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
