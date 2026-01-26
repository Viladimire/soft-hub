import type { MetadataRoute } from "next";

import { supportedLocales } from "@/i18n/locales";
import { listStaticCollectionSlugs } from "@/lib/services/staticCollectionsRepository";
import { listStaticSoftwareSlugs } from "@/lib/services/staticSoftwareRepository";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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

  const softwarePaths = slugs.flatMap((slug) =>
    supportedLocales.map((locale) => `/${locale}/software/${slug}`),
  );

  const collectionSlugs = await listStaticCollectionSlugs();
  const collectionPaths = collectionSlugs.flatMap((slug) =>
    supportedLocales.map((locale) => `/${locale}/collections/${slug}`),
  );

  return [...staticPaths, ...softwarePaths, ...collectionPaths].map((path) => ({
    url: new URL(path, SITE_URL).toString(),
    lastModified: now,
  }));
}
