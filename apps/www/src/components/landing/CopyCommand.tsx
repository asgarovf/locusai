"use client";

import { Check, Copy } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

interface CopyCommandProps {
  value: string;
  className?: string;
  variant?: "default" | "violet" | "cyan";
}

export function CopyCommand({
  value,
  className,
  variant = "default",
}: CopyCommandProps) {
  const [hasCopied, setHasCopied] = React.useState(false);

  React.useEffect(() => {
    if (hasCopied) {
      const timeout = setTimeout(() => setHasCopied(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [hasCopied]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(value);
    setHasCopied(true);
  };

  const prefixColor =
    variant === "violet"
      ? "text-violet/70"
      : variant === "cyan"
        ? "text-cyan/70"
        : "text-violet/60";

  const borderStyle =
    variant === "violet"
      ? "border-violet/20 hover:border-violet/30"
      : variant === "cyan"
        ? "border-cyan/20 hover:border-cyan/30"
        : "border-border/60 hover:border-border/80";

  return (
    <button
      type="button"
      onClick={copyToClipboard}
      className={cn(
        "group/copy relative w-full rounded-xl bg-[#060610] border font-mono text-sm flex items-center px-4 py-3.5 hover:bg-[#08081a] transition-all cursor-pointer text-left",
        borderStyle,
        className
      )}
    >
      <span className={cn("mr-2 select-none shrink-0", prefixColor)}>$</span>
      <span className="text-foreground/90 truncate flex-1">{value}</span>
      <span className="shrink-0 ml-3 p-1 rounded-md group-hover/copy:bg-white/[0.04] transition-colors">
        {hasCopied ? (
          <Check className="w-3.5 h-3.5 text-emerald" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-muted-foreground group-hover/copy:text-foreground/70 transition-colors" />
        )}
      </span>
    </button>
  );
}
