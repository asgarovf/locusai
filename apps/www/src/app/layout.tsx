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
    default: "Locus | The Local-First AI Software Engineer",
    template: "%s | Locus",
  },
  description:
    "The open-source, local-first platform for autonomous AI software engineering. Keep your code private while AI agents build your projects locally.",
  keywords: [
    "AI agents",
    "agentic engineering",
    "local-first",
    "MCP",
    "autonomous agents",
    "AI development",
    "developer tools",
    "privacy-first AI",
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
    title: "Locus | The Local-First AI Software Engineer",
    description:
      "The open-source, local-first platform for autonomous AI software engineering. Keep your code private while AI agents build your projects locally.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Locus - The Local-First AI Software Engineer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Locus | The Local-First AI Software Engineer",
    description:
      "The open-source, local-first platform for autonomous AI software engineering.",
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
