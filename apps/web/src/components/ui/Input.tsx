import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Input component props
 *
 * @property icon - Optional left icon element
 * @property rightElement - Optional right element (e.g., clear button)
 * @property error - Show error state
 */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Icon displayed on the left side of input */
  icon?: ReactNode;
  /** Element displayed on the right side of input */
  rightElement?: ReactNode;
  /** Show error state */
  error?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, rightElement, error, ...props }, ref) => {
    return (
      <div className="relative w-full group">
        {icon && (
          <div
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            "flex h-9 w-full rounded-lg border bg-secondary/30 px-3 py-1 text-sm transition-all",
            "placeholder:text-muted-foreground/50",
            "hover:border-border hover:bg-secondary/50",
            "focus:outline-none focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-primary/10",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium",
            error
              ? "border-red-500/50 ring-2 ring-red-500/10"
              : "border-border/60",
            icon && "pl-10",
            rightElement && "pr-10",
            className
          )}
          {...props}
        />
        {rightElement && (
          <div
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          >
            {rightElement}
          </div>
        )}
      </div>
    );
  }
);

/**
 * Input component
 *
 * A flexible input component with support for left/right icons and error states.
 * Automatically adjusts padding when icons are present.
 *
 * @example
 * // Basic input
 * <Input placeholder="Enter text..." />
 *
 * @example
 * // With left icon
 * <Input icon={<Search size={16} />} placeholder="Search..." />
 *
 * @example
 * // With error state
 * <Input error value={value} onChange={handleChange} />
 */
Input.displayName = "Input";

export { Input };
