import type { MetadataRoute } from "next";

import { getSettings } from "@/lib/data";

export const fetchCache = "force-cache";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSettings();
  const baseUrl = settings.seo?.canonical ?? "https://example.github.io/soft-hub";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
