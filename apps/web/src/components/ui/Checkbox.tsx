import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Checkbox component props
 *
 * @property checked - Whether checkbox is checked
 * @property onChange - Callback when checkbox state changes
 * @property label - Optional label text displayed next to checkbox
 * @property disabled - Disable the checkbox (default: false)
 */
interface CheckboxProps {
  /** Whether checkbox is currently checked */
  checked: boolean;
  /** Callback when checkbox state changes */
  onChange: (checked: boolean) => void;
  /** Optional label text */
  label?: string;
  /** Disable checkbox interaction */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Checkbox component
 *
 * A custom checkbox with optional label and full accessibility support.
 * Automatically applies line-through style to label when checked.
 *
 * @example
 * // Basic checkbox
 * const [checked, setChecked] = useState(false);
 * <Checkbox checked={checked} onChange={setChecked} />
 *
 * @example
 * // With label
 * <Checkbox
 *   checked={isSubscribed}
 *   onChange={setIsSubscribed}
 *   label="Subscribe to newsletter"
 * />
 */
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
        aria-label={label}
      />
      <span
        className={`h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-150 flex items-center justify-center ${
          checked ? "bg-primary text-primary-foreground" : "bg-transparent"
        }`}
        aria-hidden="true"
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
