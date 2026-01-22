import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./Spinner";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "subtle"
    | "outline"
    | "ghost"
    | "danger"
    | "success"
    | "emerald"
    | "amber"
    | "emerald-subtle"
    | "amber-subtle";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
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
    const variants = {
      primary:
        "bg-primary text-primary-foreground shadow-sm hover:translate-y-[-1px] hover:shadow-md",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      subtle: "bg-primary/10 text-primary hover:bg-primary/20",
      outline: "border border-border bg-transparent hover:bg-secondary/50",
      ghost: "hover:bg-secondary text-muted-foreground hover:text-foreground",
      danger: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
      success: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20",
      emerald: "bg-emerald-500 text-white hover:bg-emerald-600",
      amber: "bg-amber-500 text-black hover:bg-amber-600 font-bold",
      "emerald-subtle":
        "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20",
      "amber-subtle":
        "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border border-amber-500/20",
    };

    const sizes = {
      sm: "h-8 px-3 text-[10px] uppercase tracking-wider",
      md: "h-10 px-5 text-sm",
      lg: "h-12 px-8 text-base",
      icon: "h-10 w-10 p-0",
    };

    const isDisabled = isLoading || disabled;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Spinner size="sm" className="mr-2" />
            {loadingText || children}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
