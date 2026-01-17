"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Header() {
  return (
    <header className="flex justify-between items-center mb-10 py-4 gap-4">
      <div className="relative flex-1 max-w-[420px] group">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-foreground transition-colors"
        />
        <input
          type="text"
          placeholder="Quick search... (⌘K)"
          className="w-full bg-secondary/50 border border-input rounded-md pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-ring focus:ring-1 focus:ring-ring"
        />
      </div>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => console.log("Help Center coming soon!")}
        >
          Help
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert("Project link copied to clipboard!");
          }}
        >
          Share
        </Button>
      </div>
    </header>
  );
}
