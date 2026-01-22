"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * OTP input component props
 *
 * @property length - Number of input fields (default: 6)
 * @property value - Current OTP value (e.g., "123456")
 * @property onChange - Callback when OTP value changes
 * @property disabled - Disable the inputs
 */
interface OtpInputProps {
  /** Number of OTP digits (default: 6) */
  length?: number;
  /** Current OTP value as string */
  value: string;
  /** Callback when OTP changes */
  onChange: (value: string) => void;
  /** Disable OTP inputs */
  disabled?: boolean;
}

/**
 * OTP input component
 *
 * A specialized input component for one-time passwords.
 * - Auto-focuses next field on digit entry
 * - Supports backspace and arrow navigation
 * - Supports paste functionality
 * - Numeric input only
 *
 * @example
 * const [otp, setOtp] = useState("");
 * <OtpInput
 *   length={6}
 *   value={otp}
 *   onChange={setOtp}
 * />
 */
export function OtpInput({
  length = 6,
  value,
  onChange,
  disabled = false,
}: OtpInputProps) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const char = e.target.value.slice(-1); // Only take last character

    // Only allow numbers
    if (char && !/^\d$/.test(char)) return;

    const newValue = value.split("");
    newValue[index] = char;
    const finalValue = newValue.join("");
    onChange(finalValue);

    // Focus next input
    if (char && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === "Backspace") {
      if (!value[index] && index > 0) {
        // If current is empty, move back and clear previous
        const newValue = value.split("");
        newValue[index - 1] = "";
        onChange(newValue.join(""));
        inputRefs.current[index - 1]?.focus();
      } else {
        // Just clear current
        const newValue = value.split("");
        newValue[index] = "";
        onChange(newValue.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .slice(0, length)
      .replace(/\D/g, "");
    if (pastedData) {
      onChange(pastedData);
      // Focus the next available slot or the last one
      const nextIndex = Math.min(pastedData.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <fieldset
      className="flex justify-between gap-2 sm:gap-3"
      onPaste={handlePaste}
    >
      <legend className="sr-only">One-time password input</legend>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={value[i] || ""}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onFocus={() => setFocusedIndex(i)}
          onBlur={() => setFocusedIndex(null)}
          disabled={disabled}
          className={cn(
            "w-full h-12 sm:h-14 text-center text-xl font-bold rounded-xl border transition-all duration-200 outline-none",
            "bg-secondary/20 border-border/40 text-foreground",
            focusedIndex === i
              ? "border-primary bg-background ring-4 ring-primary/10"
              : "hover:border-border/80",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </fieldset>
  );
}
