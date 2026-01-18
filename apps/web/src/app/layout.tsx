import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${roboto.className} antialiased`}>
        <Providers>
          <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar />

            <main className="flex-1 overflow-auto bg-background p-8">
              <div className="max-w-[1440px] mx-auto">
                <Header />
                {children}
              </div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
