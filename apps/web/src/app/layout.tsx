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
  title: "Locus Dashboard",
  description:
    "Local-first task management and documentation for agentic engineering.",
  icons: {
    icon: "/favicon.ico",
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
