import { ArrowRight, Github, Mail, MessageSquare } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Footer, Navbar } from "@/components/layout";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the Locus team. Report issues, request features, or ask questions about the GitHub-native AI engineering CLI.",
  alternates: {
    canonical: "https://locusai.dev/contact",
  },
  openGraph: {
    url: "https://locusai.dev/contact",
  },
};

const channels = [
  {
    icon: <Github className="h-5 w-5" />,
    title: "GitHub Issues",
    description:
      "Report bugs, request features, or ask questions. This is the fastest way to get a response from the team.",
    href: "https://github.com/asgarovf/locusai/issues",
    label: "Open an issue",
    color: "text-foreground",
  },
  {
    icon: <MessageSquare className="h-5 w-5" />,
    title: "GitHub Discussions",
    description:
      "Join the community to discuss ideas, share workflows, and get help from other Locus users.",
    href: "https://github.com/asgarovf/locusai/discussions",
    label: "Start a discussion",
    color: "text-violet",
  },
  {
    icon: <Mail className="h-5 w-5" />,
    title: "Email",
    description:
      "For security reports, partnership inquiries, or anything that doesn't fit a public issue.",
    href: "mailto:hello@locusai.dev",
    label: "hello@locusai.dev",
    color: "text-cyan",
  },
];

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-36 pb-20 md:pt-44 md:pb-28 overflow-hidden">
          <div className="mesh-gradient-hero absolute inset-0" />
          <div className="max-w-4xl px-6 mx-auto relative text-center">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-cyan mb-4">
              Contact
            </p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6">
              Get in touch
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Have a question, found a bug, or want to contribute? Here&apos;s
              how to reach the Locus team.
            </p>
          </div>
        </section>

        {/* Contact channels */}
        <section className="pb-28 relative">
          <div className="max-w-3xl px-6 mx-auto">
            <div className="space-y-5">
              {channels.map((channel) => (
                <div
                  key={channel.title}
                  className="rounded-2xl border border-border/30 bg-[#060609] p-7 md:p-8"
                >
                  <div className="flex gap-5">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.06] ${channel.color} shrink-0`}
                    >
                      {channel.icon}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-base font-semibold text-white mb-2">
                        {channel.title}
                      </h2>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                        {channel.description}
                      </p>
                      <Link
                        href={channel.href}
                        target={
                          channel.href.startsWith("mailto:")
                            ? undefined
                            : "_blank"
                        }
                        rel={
                          channel.href.startsWith("mailto:")
                            ? undefined
                            : "noopener noreferrer"
                        }
                        className="inline-flex items-center gap-1.5 text-sm text-violet hover:underline"
                      >
                        {channel.label}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
