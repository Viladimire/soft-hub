import { notFound } from "next/navigation";

import type { Metadata } from "next";
import type { TranslationValues } from "next-intl";

import Link from "next/link";

import { defaultLocale, supportedLocales } from "@/i18n/locales";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCollectionBySlug } from "@/lib/services/collectionsService";
import { listStaticCollectionSlugs } from "@/lib/services/staticCollectionsRepository";

import { AppShell } from "@/components/layouts/app-shell";
import { SideBar } from "@/components/layouts/sidebar";
import { CollectionHero } from "@/components/collections/collection-hero";
import { CollectionItemsGrid } from "@/components/collections/collection-items-grid";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";

export const dynamicParams = true;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateStaticParams() {
  const slugs = await listStaticCollectionSlugs();
  return supportedLocales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

const resolveCollectionTranslations = async (locale: string) => {
  const { getTranslations } = await import("next-intl/server");
  const tCollections = await getTranslations({ locale, namespace: "pages.collections" });
  const tDetail = await getTranslations({ locale, namespace: "pages.collectionDetail" }).catch(() => tCollections);
  return { tCollections, tDetail } as const;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = rawLocale ?? defaultLocale;

  const client = isSupabaseConfigured() ? createSupabaseServerClient() : undefined;
  const collection = await getCollectionBySlug(slug, client);

  if (!collection) {
    return {};
  }

  const canonicalPath = `/${locale}/collections/${slug}`;
  const languages = Object.fromEntries(
    supportedLocales.map((value) => [value, new URL(`/${value}/collections/${slug}`, SITE_URL).toString()]),
  );

  const description = collection.subtitle ?? collection.description ?? undefined;
  const ogImage = new URL("/branding/soft-hub-logomark.svg", SITE_URL).toString();

  return {
    title: collection.title,
    description,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: new URL(canonicalPath, SITE_URL).toString(),
      languages,
    },
    openGraph: {
      title: collection.title,
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
          alt: collection.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: collection.title,
      description,
      images: [ogImage],
    },
  } satisfies Metadata;
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale = rawLocale ?? defaultLocale;

  if (!supportedLocales.includes(locale as (typeof supportedLocales)[number])) {
    notFound();
  }

  const { tCollections, tDetail } = await resolveCollectionTranslations(locale);
  const translateCollections = (key: Parameters<typeof tCollections>[0], values?: TranslationValues) =>
    tCollections(key, values);
  const translateDetail = (key: Parameters<typeof tDetail>[0], values?: TranslationValues) => tDetail(key, values);

  const client = isSupabaseConfigured() ? createSupabaseServerClient() : undefined;
  const collection = await getCollectionBySlug(slug, client);

  if (!collection || (!collection.publishedAt && !isSupabaseConfigured())) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: collection.title,
    description: collection.subtitle ?? collection.description ?? undefined,
    url: new URL(`/${locale}/collections/${collection.slug}`, SITE_URL).toString(),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: (collection.items ?? []).map((item: (typeof collection.items)[number], index: number) => ({
        "@type": "ListItem",
        position: item.position ?? index,
        name: item.software?.name ?? item.softwareSlug ?? item.softwareId,
        url: item.softwareSlug
          ? new URL(`/${locale}/software/${item.softwareSlug}`, SITE_URL).toString()
          : undefined,
      })),
    },
  } as const;

  return (
    <AppShell sidebar={<SideBar />} className="pt-10">
      <div className="space-y-10">
        <JsonLd data={jsonLd} />
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild className="text-sm text-neutral-300 hover:text-white">
            <Link href={`/${locale}/collections`}>
              ← {translateDetail("backLink")}
            </Link>
          </Button>
        </div>

        <CollectionHero
          collection={collection}
          labels={{
            featuredBadge: translateCollections("cards.featured"),
            itemsUnit: translateDetail("itemsUnit"),
            statItems: translateDetail("hero.stats.items"),
            statYear: translateDetail("hero.stats.year"),
            statOrder: translateDetail("hero.stats.order"),
            featuredProgramsLabel: translateDetail("hero.featuredProgramsLabel"),
          }}
        />

        <CollectionItemsGrid collection={collection} locale={locale} t={translateDetail} />

        <section className="rounded-3xl border border-white/10 bg-neutral-950/70 p-6 text-sm text-neutral-300">
          <h3 className="text-lg font-semibold text-white">{translateCollections("highlights.heading")}</h3>
          <p className="mt-2 leading-6">{collection.description ?? translateCollections("highlights.default")}</p>
        </section>
      </div>
    </AppShell>
  );
}
