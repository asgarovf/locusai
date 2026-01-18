"use client";

import { Check, Copy, Terminal } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

interface CopyCommandProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function CopyCommand({ value, className, ...props }: CopyCommandProps) {
  const [hasCopied, setHasCopied] = React.useState(false);

  React.useEffect(() => {
    if (hasCopied) {
      const timeout = setTimeout(() => {
        setHasCopied(false);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [hasCopied]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(value);
    setHasCopied(true);
  };

  return (
    <div
      className={cn(
        "relative rounded-lg bg-secondary/50 font-mono text-sm border border-border flex items-center pl-4 pr-12 py-3",
        className
      )}
      {...props}
    >
      <Terminal className="w-4 h-4 mr-3 text-muted-foreground" />
      <span className="text-foreground">{value}</span>
      <button
        type="button"
        className="absolute right-2 top-2 p-2 hover:bg-background/50 rounded-md transition-colors"
        onClick={copyToClipboard}
      >
        {hasCopied ? (
          <Check className="w-4 h-4 text-green-500" />
        ) : (
          <Copy className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="sr-only">Copy</span>
      </button>
    </div>
  );
}
