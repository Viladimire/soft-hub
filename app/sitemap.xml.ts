import type { MetadataRoute } from "next";

import { getSettings, getSoftwareSlugs } from "@/lib/data";

export const fetchCache = "force-cache";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, slugs] = await Promise.all([getSettings(), getSoftwareSlugs()]);
  const baseUrl = settings.seo?.canonical ?? "https://example.github.io/soft-hub";

  const softwareEntries = slugs.map((slug) => ({
    url: `${baseUrl}/software/${slug}`,
    lastModified: new Date().toISOString(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date().toISOString(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...softwareEntries,
  ];
}
