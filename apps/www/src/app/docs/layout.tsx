import { Sidebar } from "@/components/docs/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="container flex-1 items-start md:grid md:grid-cols-[240px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10 px-4 md:px-6 mx-auto pt-14">
        <Sidebar />
        <main className="relative py-8 md:py-10 lg:gap-10 xl:grid xl:grid-cols-[1fr_300px] w-full max-w-3xl">
          <div className="mx-auto w-full min-w-0">{children}</div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
