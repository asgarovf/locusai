import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
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
        <Providers>
          <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar />
            <main className="flex-1 overflow-auto bg-background p-6">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
