"use client";

import {
  ArrowRight,
  BadgeCheck,
  Check,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Package,
  Search,
  Terminal,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LocusPackageManifest {
  displayName: string;
  description: string;
  commands: string[];
  version: string;
}

export interface PackageData {
  name: string;
  version: string;
  description: string;
  date: string;
  publisher: { username: string };
  links: { npm: string; homepage?: string };
  locusManifest?: LocusPackageManifest;
  weeklyDownloads: number;
  isOfficial: boolean;
  installCommand: string;
}

type SortOption = "downloads" | "updated" | "alphabetical";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 30) return `${days}d ago`;
    if (days < 365) {
      const months = Math.floor(days / 30);
      return `${months}mo ago`;
    }
    const years = Math.floor(days / 365);
    return `${years}y ago`;
  } catch {
    return dateStr;
  }
}

function formatDownloads(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// ─── CopyInstallButton ────────────────────────────────────────────────────────

function CopyInstallButton({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [command]);

  return (
    <div className="flex items-center gap-2 bg-background/60 rounded-lg border border-border/30 px-3 py-2">
      <Terminal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <code className="text-xs font-mono text-cyan flex-1 truncate min-w-0">
        {command}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
        aria-label="Copy install command"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}

// ─── PackageCard ──────────────────────────────────────────────────────────────

function PackageCard({ pkg }: { pkg: PackageData }) {
  const displayName = pkg.locusManifest?.displayName ?? pkg.name;

  return (
    <div className="relative flex flex-col rounded-xl border border-border/40 bg-[#060609] p-5 hover:border-border/70 transition-colors h-full">
      {/* Official badge */}
      {pkg.isOfficial && (
        <div className="absolute top-4 right-4 flex items-center gap-1 text-xs font-medium text-cyan bg-cyan/[0.08] border border-cyan/[0.15] rounded-full px-2 py-0.5">
          <BadgeCheck className="h-3 w-3" />
          Official
        </div>
      )}

      {/* Package name */}
      <div className="mb-3 pr-20">
        <h3 className="text-sm font-semibold text-white truncate">
          {displayName}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">
          {pkg.name}
        </p>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-1 line-clamp-2 min-h-[2.5rem]">
        {pkg.description || "No description available."}
      </p>

      {/* Install command */}
      <CopyInstallButton command={pkg.installCommand} />

      {/* Commands contributed */}
      {pkg.locusManifest?.commands && pkg.locusManifest.commands.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {pkg.locusManifest.commands.slice(0, 3).map((cmd) => (
            <span
              key={cmd}
              className="text-xs font-mono bg-white/[0.04] border border-border/20 rounded px-1.5 py-0.5 text-muted-foreground"
            >
              {`locus pkg ${pkg.name.replace(/^locus-/, "")} ${cmd}`}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/10">
        <div className="flex items-center gap-3">
          <span className="text-xs text-emerald font-mono">v{pkg.version}</span>
          {pkg.weeklyDownloads > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Download className="h-3 w-3" />
              {formatDownloads(pkg.weeklyDownloads)}/wk
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDate(pkg.date)}
          </span>
          <Link
            href={pkg.links.npm}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="View on npm"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── MarketplaceClient ────────────────────────────────────────────────────────

export function MarketplaceClient({ packages }: { packages: PackageData[] }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("downloads");

  const filtered = useMemo(() => {
    let result = [...packages];

    // Filter by search query
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.locusManifest?.displayName ?? "").toLowerCase().includes(q)
      );
    }

    // Sort
    switch (sort) {
      case "downloads":
        result.sort((a, b) => b.weeklyDownloads - a.weeklyDownloads);
        break;
      case "updated":
        result.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        break;
      case "alphabetical":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    // Official packages always appear first (stable sort)
    result.sort((a, b) => {
      if (a.isOfficial && !b.isOfficial) return -1;
      if (!a.isOfficial && b.isOfficial) return 1;
      return 0;
    });

    return result;
  }, [packages, search, sort]);

  return (
    <>
      {/* Hero */}
      <section className="relative pt-36 pb-16 md:pt-44 md:pb-20 overflow-hidden">
        <div className="mesh-gradient-hero absolute inset-0" />
        <div className="max-w-4xl px-6 mx-auto relative text-center">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-violet mb-4">
            Packages
          </p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6">
            Extend Locus with community packages
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Install integrations built by the community — Telegram, Slack, and
            more — all with a single command.
          </p>
        </div>
      </section>

      {/* Packages list */}
      <section className="pb-28 relative">
        <div className="max-w-6xl px-6 mx-auto">
          {/* Search + sort bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search packages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#060609] border border-border/40 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border/80 transition-colors"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="sm:w-52 px-3 py-2.5 text-sm bg-[#060609] border border-border/40 rounded-xl text-foreground focus:outline-none focus:border-border/80 transition-colors cursor-pointer"
            >
              <option value="downloads">Most downloaded</option>
              <option value="updated">Recently updated</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
          </div>

          {/* Results count */}
          <p className="text-xs text-muted-foreground mb-6">
            {filtered.length === packages.length
              ? `${packages.length} package${packages.length === 1 ? "" : "s"}`
              : `${filtered.length} of ${packages.length} packages`}
          </p>

          {/* Package grid */}
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((pkg) => (
                <PackageCard key={pkg.name} pkg={pkg} />
              ))}
            </div>
          ) : (
            <div className="text-center py-24">
              <Package className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
              {packages.length === 0 ? (
                <>
                  <p className="text-sm text-muted-foreground mb-2">
                    No packages published yet.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Be the first — read the guide below to get started.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    No packages match &ldquo;{search}&rdquo;
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="mt-3 text-xs text-cyan hover:text-cyan/80 transition-colors"
                  >
                    Clear search
                  </button>
                </>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="glow-line-multi mt-20 mb-16" />

          {/* Submit your package */}
          <div className="text-center">
            <Package className="h-8 w-8 text-violet mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-3">
              Publish your own package
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed mb-3">
              Built something useful? Publish it to npm with the{" "}
              <code className="text-xs font-mono bg-white/[0.04] px-1.5 py-0.5 rounded border border-border/20 text-muted-foreground">
                locusai-package
              </code>{" "}
              keyword and the{" "}
              <code className="text-xs font-mono bg-white/[0.04] px-1.5 py-0.5 rounded border border-border/20 text-muted-foreground">
                locus-
              </code>{" "}
              name prefix, and it will appear here automatically.
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-8">
              Packages must include a{" "}
              <code className="font-mono text-xs">&quot;locus&quot;</code> field
              in <code className="font-mono text-xs">package.json</code> for
              full CLI integration.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="https://github.com/asgarovf/locusai/blob/master/packages/sdk/PACKAGE_GUIDE.md"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium bg-white text-background px-7 py-3 rounded-xl hover:bg-white/85 transition-colors"
              >
                Read the Package Guide
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="https://www.npmjs.com/search?q=keywords:locusai-package"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Browse on npm
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
