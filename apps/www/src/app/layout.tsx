import { GoogleAnalytics } from "@next/third-parties/google";
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
    default: "Locus | Mission Control for AI Engineering Teams",
    template: "%s | Locus",
  },
  description:
    "The AI-native project management platform for engineering teams. Plan sprints, manage tasks, and coordinate documentation in the cloud—while agents run securely on your machine.",
  keywords: [
    "AI agents",
    "agentic engineering",
    "project management",
    "MCP",
    "autonomous agents",
    "AI development",
    "developer tools",
    "engineering teams",
    "AI planning",
  ],
  authors: [{ name: "Locus Team" }],
  creator: "Locus",
  metadataBase: new URL("https://locusai.dev"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://locusai.dev",
    siteName: "Locus",
    title: "Locus | Mission Control for AI Engineering Teams",
    description:
      "The AI-native project management platform for engineering teams. Plan sprints, manage tasks, and coordinate documentation in the cloud—while agents run securely on your machine.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Locus - Mission Control for AI Engineering Teams",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Locus | Mission Control for AI Engineering Teams",
    description:
      "The AI-native project management platform for engineering teams. Agents run securely on your machine.",
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
        {process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID} />
        )}
      </body>
    </html>
  );
}
