import type { MetadataRoute } from "next";

import { defaultLocale } from "@/i18n/locales";
import { listStaticSoftwareSlugs } from "@/lib/services/staticSoftwareRepository";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const PRIMARY_LOCALES = [defaultLocale, "en"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPaths = ["", "/software", "/collections", "/insights"].flatMap((path) =>
    PRIMARY_LOCALES.map((locale) => `/${locale}${path}`),
  );

  const slugs = await listStaticSoftwareSlugs();

  const softwarePaths = slugs.flatMap((slug) =>
    PRIMARY_LOCALES.map((locale) => `/${locale}/software/${slug}`),
  );

  return [...staticPaths, ...softwarePaths].map((path) => ({
    url: new URL(path, SITE_URL).toString(),
    lastModified: now,
  }));
}
