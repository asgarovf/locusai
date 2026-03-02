import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata } from "next";
import { DM_Sans, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { WhelpWidget } from "@/components/layout";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Locus | Sandboxed AI Engineering for GitHub Teams",
    template: "%s | Locus",
  },
  description:
    "Run AI agents in isolated Docker sandboxes. One CLI across Claude and Codex with unified context, GitHub-native workflows, and full execution isolation.",
  keywords: [
    "AI sandboxing",
    "Docker sandbox",
    "AI agents",
    "GitHub CLI",
    "AI engineering",
    "developer tools",
    "CLI",
    "code automation",
    "isolated execution",
    "AI coding",
    "Claude",
    "Codex",
    "autonomous coding",
    "open source",
  ],
  authors: [{ name: "Locus Team" }],
  creator: "Locus",
  metadataBase: new URL("https://locusai.dev"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://locusai.dev",
    siteName: "Locus",
    title: "Locus | Sandboxed AI Engineering for GitHub Teams",
    description:
      "Run AI agents in isolated Docker sandboxes. One CLI across Claude and Codex with unified context, GitHub-native workflows, and full execution isolation.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Locus - Sandboxed AI Engineering for GitHub Teams",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Locus | Sandboxed AI Engineering for GitHub Teams",
    description:
      "Run AI agents in isolated Docker sandboxes. One CLI across Claude and Codex with unified context, GitHub-native workflows, and full execution isolation.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://locusai.dev/#organization",
      name: "Locus AI",
      url: "https://locusai.dev",
      logo: {
        "@type": "ImageObject",
        url: "https://locusai.dev/logo.png",
      },
      sameAs: [
        "https://github.com/asgarovf/locusai",
        "https://www.npmjs.com/package/@locusai/cli",
      ],
    },
    {
      "@type": "WebSite",
      "@id": "https://locusai.dev/#website",
      url: "https://locusai.dev",
      name: "Locus",
      publisher: {
        "@id": "https://locusai.dev/#organization",
      },
      description:
        "Run AI agents in isolated Docker sandboxes. One CLI across Claude and Codex with unified context, GitHub-native workflows, and full execution isolation.",
    },
    {
      "@type": "WebPage",
      "@id": "https://locusai.dev/#webpage",
      url: "https://locusai.dev",
      name: "Locus | Sandboxed AI Engineering for GitHub Teams",
      isPartOf: {
        "@id": "https://locusai.dev/#website",
      },
      about: {
        "@id": "https://locusai.dev/#software",
      },
      description:
        "Run AI agents in isolated Docker sandboxes. One CLI across Claude and Codex with unified context, GitHub-native workflows, and full execution isolation.",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${dmSans.variable} ${geistMono.variable} ${instrumentSerif.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://widget.whelp.co" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://widget.whelp.co" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="font-sans antialiased min-h-screen bg-background text-foreground grain"
      >
        {children}
        {process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID} />
        )}
        <WhelpWidget />
      </body>
    </html>
  );
}
