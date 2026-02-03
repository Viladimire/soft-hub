import type { MetadataRoute } from "next";

import { supportedLocales } from "@/i18n/locales";
import { listStaticCollectionSlugs } from "@/lib/services/staticCollectionsRepository";
import { listStaticSoftwareSlugs } from "@/lib/services/staticSoftwareRepository";
import { fetchStaticSoftwareDataset } from "@/lib/services/staticSoftwareRepository";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes = [
    "",
    "/software",
    "/collections",
    "/insights",
    "/insights/trends",
    "/community/forums",
    "/community/alternatives",
    "/request",
    "/films",
    "/search",
  ];

  const staticPaths = staticRoutes.flatMap((path) =>
    supportedLocales.map((locale) => `/${locale}${path}`),
  );

  const slugs = await listStaticSoftwareSlugs();
  const dataset = await fetchStaticSoftwareDataset().catch(() => []);
  const softwareLastModified = new Map(
    dataset
      .filter((item) => item.slug)
      .map((item) => [item.slug, item.updatedAt || item.releaseDate || now.toISOString()] as const),
  );

  const softwareEntries = slugs.flatMap((slug) =>
    supportedLocales.map((locale) => {
      const lastModifiedRaw = softwareLastModified.get(slug);
      const lastModified = lastModifiedRaw ? new Date(lastModifiedRaw) : now;
      return {
        url: new URL(`/${locale}/software/${slug}`, SITE_URL).toString(),
        lastModified,
        changeFrequency: "weekly",
        priority: 0.8,
      } satisfies MetadataRoute.Sitemap[number];
    }),
  );

  const collectionSlugs = await listStaticCollectionSlugs();
  const collectionPaths = collectionSlugs.flatMap((slug) =>
    supportedLocales.map((locale) => `/${locale}/collections/${slug}`),
  );

  const staticEntries = staticPaths.map((path) => ({
    url: new URL(path, SITE_URL).toString(),
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: path === "/en" || path === "/ar" ? 1 : 0.6,
  })) satisfies MetadataRoute.Sitemap;

  const collectionEntries = collectionPaths.map((path) => ({
    url: new URL(path, SITE_URL).toString(),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  })) satisfies MetadataRoute.Sitemap;

  return [...staticEntries, ...softwareEntries, ...collectionEntries];
}
