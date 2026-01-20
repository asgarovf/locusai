import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  rightElement?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, rightElement, ...props }, ref) => {
    return (
      <div className="relative w-full group">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            "flex h-9 w-full rounded-lg border border-border/60 bg-secondary/30 px-3 py-1 text-sm transition-all",
            "placeholder:text-muted-foreground/50",
            "hover:border-border hover:bg-secondary/50",
            "focus:outline-none focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-primary/10",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium",
            icon && "pl-10",
            rightElement && "pr-10",
            className
          )}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {rightElement}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
