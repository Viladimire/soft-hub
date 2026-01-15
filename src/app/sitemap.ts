import type { MetadataRoute } from "next";

import { defaultLocale } from "@/i18n/locales";
import { mockSoftwares } from "@/lib/data/software";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const PRIMARY_LOCALES = [defaultLocale, "en"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPaths = ["", "/software", "/collections", "/insights"].flatMap((path) =>
    PRIMARY_LOCALES.map((locale) => `/${locale}${path}`),
  );

  const softwarePaths = mockSoftwares.flatMap((software) =>
    PRIMARY_LOCALES.map((locale) => `/${locale}/software/${software.slug}`),
  );

  return [...staticPaths, ...softwarePaths].map((path) => ({
    url: new URL(path, SITE_URL).toString(),
    lastModified: now,
  }));
}
