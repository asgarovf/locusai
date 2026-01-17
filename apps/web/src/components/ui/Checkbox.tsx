import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
  className,
}: CheckboxProps) {
  return (
    <label
      className={cn(
        `flex items-center gap-2.5 select-none transition-opacity duration-200`,
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        className || ""
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="hidden"
      />
      <span
        className={`h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-150 flex items-center justify-center ${
          checked ? "bg-primary text-primary-foreground" : "bg-transparent"
        }`}
      >
        {checked && <Check size={12} strokeWidth={3} />}
      </span>
      {label && (
        <span
          className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 transition-all duration-150 ${
            checked ? "line-through text-muted-foreground" : "text-foreground"
          }`}
        >
          {label}
        </span>
      )}
    </label>
  );
}
