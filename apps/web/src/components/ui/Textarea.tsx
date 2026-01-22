import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Textarea component props
 *
 * Extends standard HTML textarea attributes
 */
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

/**
 * Textarea component
 *
 * A multi-line text input field with consistent styling.
 * Automatically prevents resizing via CSS (use JavaScript if needed).
 *
 * @example
 * // Basic textarea
 * <Textarea placeholder="Enter description..." />
 *
 * @example
 * // With value binding
 * <Textarea
 *   value={description}
 *   onChange={(e) => setDescription(e.target.value)}
 *   disabled={isLoading}
 * />
 */
const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none",
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };
