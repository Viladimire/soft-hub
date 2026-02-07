import { notFound } from "next/navigation";

import type { Metadata } from "next";

import { defaultLocale, supportedLocales } from "@/i18n/locales";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchSoftwareBySlug } from "@/lib/services/softwareService";
import { getStaticRelatedSoftware, getStaticSoftwareBySlug, listStaticSoftwareSlugs } from "@/lib/services/staticSoftwareRepository";

import { AppShell } from "@/components/layouts/app-shell";
import { SideBar } from "@/components/layouts/sidebar";
import { AnalyticsTracker } from "@/components/software/analytics-tracker";
import { DownloadCard } from "@/components/software/download-card";
import { RelatedSoftware } from "@/components/software/related-software";
import { SoftwareDetailsTabs } from "@/components/software/software-details-tabs";
import { SoftwareGallery } from "@/components/software/software-gallery";
import { SoftwareHeader } from "@/components/software/software-header";
import { JsonLd } from "@/components/seo/json-ld";

export const dynamicParams = true;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateStaticParams() {
  const slugs = await listStaticSoftwareSlugs();

  return supportedLocales.flatMap((locale) =>
    slugs.map((slug) => ({
      locale,
      slug,
    })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = rawLocale ?? defaultLocale;

  const softwareFromSupabase = isSupabaseConfigured()
    ? await fetchSoftwareBySlug(slug, createSupabaseServerClient()).catch(() => null)
    : null;

  const software = softwareFromSupabase ?? (await getStaticSoftwareBySlug(slug));

  if (!software) {
    return {};
  }

  const description = software.summary ?? undefined;

  const canonicalPath = `/${locale}/software/${slug}`;
  const languages = Object.fromEntries(
    supportedLocales.map((value) => [value, new URL(`/${value}/software/${slug}`, SITE_URL).toString()]),
  );

  const ogImage = new URL("/branding/soft-hub-logomark.svg", SITE_URL).toString();

  return {
    metadataBase: new URL(SITE_URL),
    title: software.name,
    description,
    alternates: {
      canonical: new URL(canonicalPath, SITE_URL).toString(),
      languages,
    },
    openGraph: {
      title: software.name,
      description,
      locale,
      url: new URL(canonicalPath, SITE_URL).toString(),
      type: "article",
      siteName: "SOFT-HUB",
      images: [
        {
          url: ogImage,
          width: 176,
          height: 176,
          alt: software.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: software.name,
      description,
      images: [ogImage],
    },
  };
}

export default async function SoftwareDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale = rawLocale ?? defaultLocale;

  if (!supportedLocales.includes(locale as (typeof supportedLocales)[number])) {
    notFound();
  }

  const softwareFromSupabase = isSupabaseConfigured()
    ? await fetchSoftwareBySlug(slug, createSupabaseServerClient()).catch(() => null)
    : null;

  const software = softwareFromSupabase ?? (await getStaticSoftwareBySlug(slug));

  if (!software) {
    notFound();
  }

  const related = await getStaticRelatedSoftware(slug, 3);

  const latestRelease = software.releases?.[0];
  const resolvedVersion = latestRelease?.version ?? software.version;
  const resolvedDownloadUrl = latestRelease?.downloadUrl ?? software.downloadUrl;
  const resolvedReleaseDate = latestRelease?.releaseDate ?? software.releaseDate;
  const resolvedSize = latestRelease?.sizeInBytes ?? software.sizeInBytes;
  const displaySoftware = {
    ...software,
    version: resolvedVersion,
    downloadUrl: resolvedDownloadUrl,
    releaseDate: resolvedReleaseDate,
    sizeInBytes: resolvedSize,
  };
  const screenshots = (software.media?.gallery ?? []).filter(Boolean).slice(0, 8);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: software.name,
    operatingSystem: software.platforms?.join(", ") ?? undefined,
    applicationCategory: software.categories?.join(", ") ?? undefined,
    description: software.summary ?? software.description ?? undefined,
    softwareVersion: resolvedVersion,
    url: new URL(`/${locale}/software/${software.slug}`, SITE_URL).toString(),
    downloadUrl: resolvedDownloadUrl,
    datePublished: resolvedReleaseDate,
    dateModified: software.updatedAt,
    fileSize: typeof resolvedSize === "number" && resolvedSize > 0 ? `${resolvedSize}` : undefined,
    screenshot: screenshots.length
      ? screenshots.map((value) => new URL(value, SITE_URL).toString())
      : undefined,
    publisher: {
      "@type": "Organization",
      name: "SOFT-HUB",
      url: new URL(`/${locale}`, SITE_URL).toString(),
    },
    offers: resolvedDownloadUrl
      ? {
          "@type": "Offer",
          price: 0,
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          url: resolvedDownloadUrl,
        }
      : undefined,
    aggregateRating:
      software.stats?.rating && software.stats.rating > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: software.stats.rating,
            ratingCount: software.stats.votes ?? 0,
          }
        : undefined,
  } as const;

  return (
    <AppShell
      sidebar={
        <div className="space-y-6">
          <DownloadCard software={displaySoftware} locale={locale} />
          <SideBar />
        </div>
      }
      sidebarClassName="max-w-[360px] xl:w-[360px]"
      className="pt-12"
    >
      <article className="space-y-10">
        <JsonLd data={jsonLd} />
        <AnalyticsTracker softwareId={software.id} />
        <SoftwareHeader software={displaySoftware} />

        <section className="space-y-6">
          <SoftwareGallery software={software} />
          <SoftwareDetailsTabs software={displaySoftware} />
        </section>

        <RelatedSoftware items={related} />
      </article>
    </AppShell>
  );
}
