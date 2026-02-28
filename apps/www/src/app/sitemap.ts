import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://locusai.dev";

  const routes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date("2026-02-28"),
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date("2026-02-28"),
    },
    {
      url: `${baseUrl}/security`,
      lastModified: new Date("2026-02-01"),
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date("2026-02-28"),
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date("2026-01-15"),
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date("2026-01-15"),
    },
  ];

  return routes;
}
