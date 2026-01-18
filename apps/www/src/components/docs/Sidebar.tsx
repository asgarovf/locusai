"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  {
    title: "Getting Started",
    href: "/docs/getting-started",
  },
  {
    title: "Architecture",
    href: "/docs/architecture",
  },
  {
    title: "Contributing",
    href: "/docs/contributing",
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="w-64 pr-8 hidden md:block shrink-0 py-8">
      <h4 className="mb-4 text-sm font-semibold text-foreground/80 tracking-wider uppercase">
        Documentation
      </h4>
      <div className="flex flex-col space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "block px-2 py-1.5 text-sm font-medium rounded-md transition-colors",
              pathname === item.href
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            {item.title}
          </Link>
        ))}
      </div>
    </nav>
  );
}
