import { DemoVideo, FeatureGrid, Hero } from "@/components/landing";
import { Footer, Navbar } from "@/components/layout";

async function getNpmVersion(): Promise<string> {
  try {
    const res = await fetch("https://registry.npmjs.org/@locusai/cli/latest", {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    return data.version;
  } catch {
    // Fallback to build-time version
    return process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
  }
}

export default async function Home() {
  const version = await getNpmVersion();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-background">
        <Hero version={version} />
        <DemoVideo />
        <FeatureGrid />
      </main>
      <Footer />
    </div>
  );
}
