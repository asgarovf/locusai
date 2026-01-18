"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const groups = [
  {
    title: "Getting Started",
    items: [
      {
        title: "Introduction",
        href: "/docs/getting-started",
      },
      {
        title: "Architecture",
        href: "/docs/architecture",
      },
    ],
  },
  {
    title: "Community",
    items: [
      {
        title: "Contributing",
        href: "/docs/contributing",
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="w-64 pr-8 hidden md:block shrink-0 py-8 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
      {groups.map((group, i) => (
        <div key={i} className="mb-8">
          <h4 className="mb-3 text-sm font-semibold text-foreground/90 tracking-tight">
            {group.title}
          </h4>
          <div className="flex flex-col space-y-1">
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative block px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  pathname === item.href
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {pathname === item.href && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-secondary rounded-md"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    style={{ zIndex: -1 }}
                  />
                )}
                {item.title}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
