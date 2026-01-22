import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { BUTTON_SIZES, BUTTON_VARIANTS } from "./constants";
import { Spinner } from "./Spinner";

/**
 * Button component props
 *
 * @property variant - Button visual style (default: "primary")
 * @property size - Button size (default: "md")
 * @property isLoading - Show loading state with spinner
 * @property loadingText - Text to show while loading (if not provided, shows original children)
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button visual style */
  variant?: keyof typeof BUTTON_VARIANTS;
  /** Button size */
  size?: keyof typeof BUTTON_SIZES;
  /** Show loading state */
  isLoading?: boolean;
  /** Text to display when loading */
  loadingText?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      loadingText,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = isLoading || disabled;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
          BUTTON_VARIANTS[variant],
          BUTTON_SIZES[size],
          className
        )}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Spinner size="sm" className="mr-2" aria-hidden="true" />
            {loadingText || children}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

/**
 * Button component
 *
 * A reusable button component with multiple variants and sizes.
 * Supports loading state with spinner and automatic disabling.
 *
 * @example
 * // Primary button
 * <Button onClick={handleClick}>Click me</Button>
 *
 * @example
 * // Loading state
 * <Button isLoading loadingText="Saving...">Save</Button>
 *
 * @example
 * // Different variants
 * <Button variant="danger">Delete</Button>
 * <Button variant="ghost">Cancel</Button>
 */
Button.displayName = "Button";

export { Button };
