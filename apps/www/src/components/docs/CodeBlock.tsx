"use client";

import { Check, Copy } from "lucide-react";
import dynamic from "next/dynamic";
import * as React from "react";
import { Button } from "@/components/ui/button";

// Lazy load to avoid hydration mismatch
const SyntaxHighlighter = dynamic(
  () => import("react-syntax-highlighter").then((mod) => mod.Prism),
  {
    ssr: false,
    loading: () => <div className="p-4 text-sm font-mono">Loading...</div>,
  }
);

// Import style on client only
const useDraculaStyle = () => {
  const [style, setStyle] = React.useState<Record<
    string,
    React.CSSProperties
  > | null>(null);
  React.useEffect(() => {
    import("react-syntax-highlighter/dist/esm/styles/prism").then((mod) => {
      setStyle(mod.dracula);
    });
  }, []);
  return style;
};

interface CodeBlockProps {
  children?: React.ReactNode;
  className?: string;
  node?: unknown;
}

export function CodeBlock({ className, children, ...props }: CodeBlockProps) {
  const [hasCopied, setHasCopied] = React.useState(false);
  const style = useDraculaStyle();

  const match = /language-(\w+)/.exec(className || "");
  const lang = match ? match[1] : "";
  const codeString = String(children).replace(/\n$/, "");

  // Detect inline code: no language class AND no newlines in content
  const isInline = !match && !codeString.includes("\n");

  const copyToClipboard = () => {
    navigator.clipboard.writeText(codeString);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  // Inline code rendering
  if (isInline) {
    return (
      <code
        className="bg-zinc-800 text-emerald-400 px-1.5 py-0.5 rounded text-sm font-mono"
        {...props}
      >
        {children}
      </code>
    );
  }

  // Block code rendering
  return (
    <div className="relative group my-6 rounded-xl">
      <div className="relative rounded-xl bg-[#0d1117]">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-white/2 rounded-t-xl">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <span className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <span className="text-xs font-medium text-white/40 ml-2">
              {lang || "text"}
            </span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            onClick={copyToClipboard}
          >
            {hasCopied ? (
              <Check className="h-3.5 w-3.5 text-green-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span className="sr-only">Copy code</span>
          </Button>
        </div>
        <div className="p-0 rounded-b-xl">
          {style ? (
            <SyntaxHighlighter
              style={style}
              language={lang || "text"}
              PreTag="div"
              customStyle={{
                margin: 0,
                padding: "1.25rem",
                background: "transparent",
                fontSize: "0.875rem",
                lineHeight: "1.7",
              }}
            >
              {codeString}
            </SyntaxHighlighter>
          ) : (
            <pre className="p-5 text-sm font-mono overflow-x-auto text-white/90">
              <code>{codeString}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
