import type { Metadata } from "next";
import {
  CallToAction,
  FeatureGrid,
  Hero,
  ProductShowcase,
  SupportedTools,
  TerminalDemo,
} from "@/components/landing";
import { Footer, Navbar } from "@/components/layout";

export const metadata: Metadata = {
  alternates: {
    canonical: "https://locusai.dev",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Locus",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Linux, macOS, Windows",
  url: "https://locusai.dev",
  description:
    "GitHub-native AI engineering CLI. Turn GitHub issues into shipped code with AI agents. Plan sprints, execute tasks, and iterate on feedback.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  author: {
    "@id": "https://locusai.dev/#organization",
  },
};

async function getNpmVersion(): Promise<string> {
  try {
    const res = await fetch("https://registry.npmjs.org/@locusai/cli/latest", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    return data.version;
  } catch {
    return process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
  }
}

export default async function Home() {
  const version = await getNpmVersion();

  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main className="flex-1">
        {/* Hero with install command */}
        <Hero version={version} />

        {/* Terminal demo */}
        <div className="relative -mt-16 md:-mt-28 z-20 mb-16">
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl max-w-5xl mx-auto px-3 sm:px-6">
            <div className="absolute inset-0 bg-white rounded-3xl" />

            <svg
              aria-hidden="true"
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 800 600"
              preserveAspectRatio="none"
              fill="none"
            >
              <path
                d="M-50 200 C100 150, 250 350, 400 250 S650 150, 850 300"
                stroke="black"
                strokeWidth="2.5"
              />
              <path
                d="M-50 280 C150 220, 300 400, 450 300 S700 200, 850 350"
                stroke="black"
                strokeWidth="2"
              />
              <path
                d="M-50 380 C100 320, 200 500, 400 400 S600 300, 850 450"
                stroke="black"
                strokeWidth="2"
              />
              <path
                d="M-50 100 C200 80, 350 200, 500 130 S700 80, 850 180"
                stroke="black"
                strokeWidth="1.5"
              />
              <path
                d="M-50 480 C150 440, 300 550, 500 470 S700 400, 850 520"
                stroke="black"
                strokeWidth="1.5"
              />
            </svg>

            <div className="relative z-10 py-6 sm:py-10 md:py-14 px-2 sm:px-4 md:px-10">
              <TerminalDemo />
            </div>
          </div>
        </div>

        {/* Tool logos */}
        <SupportedTools />

        {/* Why Locus - feature grid */}
        <FeatureGrid />

        {/* How it works - product showcase */}
        <ProductShowcase />

        {/* Final CTA */}
        <CallToAction />
      </main>
      <Footer />
    </div>
  );
}
