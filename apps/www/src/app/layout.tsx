import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google"; // Next 15 might use next/font/google or local fonts
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Locus | Mission Control for Agentic Engineering",
    template: "%s | Locus",
  },
  description:
    "A local-first AI development platform that combines task management, documentation, and CI coordination to help AI agents build your projects.",
  keywords: [
    "AI agents",
    "agentic engineering",
    "local-first",
    "MCP",
    "task management",
    "AI development",
    "developer tools",
    "CI/CD",
    "documentation",
  ],
  authors: [{ name: "Locus Team" }],
  creator: "Locus",
  metadataBase: new URL("https://locusai.dev"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://locusai.dev",
    siteName: "Locus",
    title: "Locus | Mission Control for Agentic Engineering",
    description:
      "A local-first AI development platform that combines task management, documentation, and CI coordination to help AI agents build your projects.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Locus - Mission Control for Agentic Engineering",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Locus | Mission Control for Agentic Engineering",
    description:
      "A local-first AI development platform for AI agents to build your projects.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable}`}>
      <body
        suppressHydrationWarning
        className="font-sans antialiased min-h-screen bg-background text-foreground"
      >
        {children}
      </body>
    </html>
  );
}
