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
    default: "Locus | AI Agents That Ship Your Code",
    template: "%s | Locus",
  },
  description:
    "The AI-native project management platform for engineering teams. Plan sprints, assign tasks to AI agents, and ship code — all from your terminal. Agents run securely on your machine with git worktree isolation.",
  keywords: [
    "AI agents",
    "agentic engineering",
    "project management",
    "autonomous agents",
    "AI development",
    "developer tools",
    "engineering teams",
    "AI planning",
    "git worktree",
    "CLI",
    "code automation",
    "sprint planning",
    "code review",
    "Telegram bot",
    "self-hosting",
  ],
  authors: [{ name: "Locus Team" }],
  creator: "Locus",
  metadataBase: new URL("https://locusai.dev"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://locusai.dev",
    siteName: "Locus",
    title: "Locus | AI Agents That Ship Your Code",
    description:
      "Plan sprints, assign tasks to AI agents, and ship code — all from your terminal. Agents run securely on your machine with git worktree isolation.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Locus - AI Agents That Ship Your Code",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Locus | AI Agents That Ship Your Code",
    description:
      "Plan sprints, assign tasks to AI agents, and ship code — all from your terminal.",
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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${dmSans.variable} ${geistMono.variable} ${instrumentSerif.variable}`}
    >
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
