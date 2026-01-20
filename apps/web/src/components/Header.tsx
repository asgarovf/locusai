"use client";

import { Search } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
  children,
  searchValue,
  onSearchChange,
}: PageHeaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="mb-6">
      <div className="flex items-start justify-between gap-4">
        {/* Left: Title area */}
        <div className="flex items-center gap-4">
          {icon && (
            <div className="p-2.5 rounded-xl bg-linear-to-br from-primary/20 to-primary/5 border border-primary/20">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right: Search + Actions */}
        <div className="flex items-center gap-3">
          {/* Search */}
          {onSearchChange && (
            <div className="relative group hidden sm:block">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
              />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search... (⌘K)"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-48 lg:w-56 bg-secondary/30 border border-border/40 rounded-lg pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:bg-background hover:bg-secondary/50"
              />
            </div>
          )}

          {/* Actions */}
          {actions}
        </div>
      </div>

      {/* Optional children (e.g., filter bar, inline forms) */}
      {children}
    </header>
  );
}
