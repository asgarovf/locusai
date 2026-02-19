import {
  ArrowRight,
  Code2,
  MessageSquare,
  Play,
  RefreshCw,
  Terminal,
  Zap,
} from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { Footer, Navbar } from "@/components/layout";

export const metadata: Metadata = {
  title: "VSCode Extension",
  description:
    "Chat with AI, explain code, and run tasks directly from your editor with the Locus VSCode extension.",
  alternates: {
    canonical: "https://locusai.dev/products/vscode",
  },
  openGraph: {
    url: "https://locusai.dev/products/vscode",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Locus VSCode Extension",
  applicationCategory: "DeveloperApplication",
  url: "https://locusai.dev/products/vscode",
  description:
    "Chat with AI, explain code, and run tasks directly from your editor with the Locus VSCode extension.",
  author: {
    "@id": "https://locusai.dev/#organization",
  },
};

const features = [
  {
    icon: <MessageSquare className="h-4 w-4" />,
    title: "Chat sidebar",
    description:
      "Open a chat view in the VSCode sidebar to have conversations with AI that have full project context.",
    color: "text-cyan",
  },
  {
    icon: <Code2 className="h-4 w-4" />,
    title: "Explain Selection",
    description:
      "Select any code in the editor and get an instant AI explanation of what it does and how it works.",
    color: "text-violet",
  },
  {
    icon: <Play className="h-4 w-4" />,
    title: "Run Exec tasks",
    description:
      "Execute prompts with full repository context directly from the editor. Same power as the CLI exec command.",
    color: "text-amber",
  },
  {
    icon: <RefreshCw className="h-4 w-4" />,
    title: "Session management",
    description:
      "Resume previous conversations, manage sessions, and maintain context across multiple coding sessions.",
    color: "text-emerald",
  },
  {
    icon: <Terminal className="h-4 w-4" />,
    title: "CLI bridge",
    description:
      "The extension communicates with the Locus CLI under the hood, using the same agent capabilities you already know.",
    color: "text-rose",
  },
  {
    icon: <Zap className="h-4 w-4" />,
    title: "Streaming responses",
    description:
      "See AI responses stream in real-time with tool usage tracking, thinking indicators, and structured output.",
    color: "text-cyan",
  },
];

export default function VSCodePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-36 pb-20 md:pt-44 md:pb-28 overflow-hidden">
          <div className="mesh-gradient-hero absolute inset-0" />
          <div className="max-w-4xl px-6 mx-auto relative text-center">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-cyan mb-4">
              VSCode Extension
            </p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6">
              AI agents inside your editor
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Chat with AI, explain code selections, and run exec tasks — all
              without leaving VSCode. Powered by the same Locus CLI under the
              hood.
            </p>
          </div>
        </section>

        {/* Features */}
        <section className="pb-28 relative">
          <div className="max-w-5xl px-6 mx-auto">
            <div className="glow-line-multi mb-16" />
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-12 text-center">
              What you can do
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature) => (
                <div key={feature.title}>
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.06] ${feature.color} mb-4`}
                  >
                    {feature.icon}
                  </div>
                  <h3 className="text-sm font-medium text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="pb-28 relative">
          <div className="max-w-3xl px-6 mx-auto">
            <h2 className="text-2xl font-bold tracking-tight text-white mb-8 text-center">
              How it works
            </h2>
            <div className="space-y-6">
              <div className="rounded-xl border border-border/40 bg-[#060609] p-6">
                <h3 className="text-sm font-medium text-white mb-2">
                  1. Install the extension
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Search for &quot;Locus&quot; in the VSCode Extensions
                  marketplace, or install the VSIX package from the GitHub
                  releases.
                </p>
              </div>
              <div className="rounded-xl border border-border/40 bg-[#060609] p-6">
                <h3 className="text-sm font-medium text-white mb-2">
                  2. Configure your setup
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The extension uses your existing Locus CLI configuration. Make
                  sure you have run{" "}
                  <code className="text-xs px-1.5 py-0.5 rounded bg-white/[0.03] border border-border/30 text-cyan">
                    locus init
                  </code>{" "}
                  and{" "}
                  <code className="text-xs px-1.5 py-0.5 rounded bg-white/[0.03] border border-border/30 text-cyan">
                    locus config setup
                  </code>{" "}
                  in your project.
                </p>
              </div>
              <div className="rounded-xl border border-border/40 bg-[#060609] p-6">
                <h3 className="text-sm font-medium text-white mb-2">
                  3. Start chatting
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Open the Locus chat view from the sidebar. Ask questions about
                  your code, run exec tasks, or select code and use
                  &quot;Explain Selection&quot; from the context menu.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-28 relative">
          <div className="max-w-3xl px-6 mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-4">
              Try it in your editor
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm mb-8 leading-relaxed">
              Install the Locus VSCode extension and start using AI agents
              directly from your editor.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="https://github.com/asgarovf/locusai"
                target="_blank"
                className="inline-flex items-center gap-2 text-sm font-medium bg-white text-background px-7 py-3 rounded-xl hover:bg-white/85 transition-colors"
              >
                View on GitHub
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="https://docs.locusai.dev"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Read the docs
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
