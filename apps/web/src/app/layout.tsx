import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Locus Dashboard | The Local-First AI Software Engineer",
  description:
    "Local-first autonomous AI software engineering. Build software while keeping your code private and secure on your machine.",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Locus Dashboard | The Local-First AI Software Engineer",
    description:
      "Local-first autonomous AI software engineering. Build software while keeping your code private and secure on your machine.",
    url: "https://locus.sh",
    siteName: "Locus",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Locus Dashboard",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Locus Dashboard | The Local-First AI Software Engineer",
    description:
      "Local-first autonomous AI software engineering. Build software while keeping your code private and secure on your machine.",
    images: ["/og-image.png"],
  },
};

type Props = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: Props) {
  return (
    <html suppressHydrationWarning lang="en" className="dark">
      <body
        suppressHydrationWarning
        className={`${roboto.className} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
