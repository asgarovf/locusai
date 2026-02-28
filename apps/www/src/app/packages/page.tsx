import type { Metadata } from "next";
import { Footer, Navbar } from "@/components/layout";
import {
  type LocusPackageManifest,
  MarketplaceClient,
  type PackageData,
} from "@/components/marketplace";

export const metadata: Metadata = {
  title: "Packages",
  description:
    "Discover community packages for the Locus CLI. Install integrations and tools built by the community with a single command.",
  alternates: {
    canonical: "https://locusai.dev/packages",
  },
  openGraph: {
    url: "https://locusai.dev/packages",
  },
  robots: {
    index: false,
    follow: true,
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface NpmSearchObject {
  package: {
    name: string;
    version: string;
    description: string;
    date: string;
    publisher: { username: string; email?: string };
    links: { npm: string; homepage?: string; repository?: string };
    keywords?: string[];
  };
}

interface NpmSearchResult {
  objects: NpmSearchObject[];
  total: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert an npm package name to the short `locus install <name>` form.
 *
 * - `locus-telegram`  → `locus install telegram`
 * - `@org/locus-pkg`  → `locus install @org/locus-pkg`  (scoped, unchanged)
 */
function getInstallCommand(name: string): string {
  if (name.startsWith("@")) {
    return `locus install ${name}`;
  }
  if (name.startsWith("locus-")) {
    return `locus install ${name.slice("locus-".length)}`;
  }
  return `locus install ${name}`;
}

/**
 * Encode a package name for use in an npm registry URL.
 * Scoped packages (`@scope/name`) must be percent-encoded.
 */
function encodeRegistryName(name: string): string {
  return name.startsWith("@") ? encodeURIComponent(name) : name;
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchMarketplacePackages(): Promise<PackageData[]> {
  try {
    // 1. Search npm for packages tagged with locusai-package keyword
    const searchRes = await fetch(
      "https://registry.npmjs.org/-/v1/search?text=keywords:locusai-package&size=100",
      { next: { revalidate: 3600 } }
    );

    if (!searchRes.ok) return [];

    const searchData: NpmSearchResult =
      (await searchRes.json()) as NpmSearchResult;

    // 2. Fetch full metadata + weekly downloads for each package in parallel
    const packages: PackageData[] = await Promise.all(
      searchData.objects.map(async ({ package: pkg }) => {
        const encoded = encodeRegistryName(pkg.name);

        const [metaResult, downloadsResult] = await Promise.allSettled([
          fetch(`https://registry.npmjs.org/${encoded}/latest`, {
            next: { revalidate: 3600 },
          }),
          fetch(`https://api.npmjs.org/downloads/point/last-week/${encoded}`, {
            next: { revalidate: 3600 },
          }),
        ]);

        // Parse `locus` manifest field from full package metadata
        let locusManifest: LocusPackageManifest | undefined;
        if (metaResult.status === "fulfilled" && metaResult.value.ok) {
          try {
            const meta = (await metaResult.value.json()) as {
              locus?: LocusPackageManifest;
            };
            locusManifest = meta.locus;
          } catch {
            // ignore — malformed JSON from registry
          }
        }

        // Parse weekly download count
        let weeklyDownloads = 0;
        if (
          downloadsResult.status === "fulfilled" &&
          downloadsResult.value.ok
        ) {
          try {
            const dl = (await downloadsResult.value.json()) as {
              downloads?: number;
            };
            weeklyDownloads = dl.downloads ?? 0;
          } catch {
            // ignore
          }
        }

        const isOfficial =
          pkg.publisher.username === "locusai" ||
          pkg.name.startsWith("@locusai/");

        return {
          name: pkg.name,
          version: pkg.version,
          description: locusManifest?.description || pkg.description || "",
          date: pkg.date,
          publisher: { username: pkg.publisher.username },
          links: {
            npm: pkg.links.npm,
            homepage: pkg.links.homepage,
          },
          locusManifest,
          weeklyDownloads,
          isOfficial,
          installCommand: getInstallCommand(pkg.name),
        } satisfies PackageData;
      })
    );

    return packages;
  } catch {
    return [];
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PackagesPage() {
  const packages = await fetchMarketplacePackages();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <MarketplaceClient packages={packages} />
      </main>
      <Footer />
    </div>
  );
}
