import type { Metadata } from "next";

import Link from "next/link";

import { defaultLocale, supportedLocales } from "@/i18n/locales";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCollections } from "@/lib/services/collectionsService";

import { AppShell } from "@/components/layouts/app-shell";
import { SideBar } from "@/components/layouts/sidebar";
import { CollectionCard } from "@/components/collections/collection-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ComingSoonHero, type ComingSoonFeature } from "@/components/templates/coming-soon-hero";

type DraftCollection = {
  id: "productivity" | "creator" | "security";
};

const UPCOMING_COLLECTIONS: DraftCollection[] = [
  { id: "productivity" },
  { id: "creator" },
  { id: "security" },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = rawLocale ?? defaultLocale;

  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations({ locale, namespace: "pages.collections" });

  return {
    title: t("title"),
  } satisfies Metadata;
}

export function generateStaticParams() {
  return supportedLocales.map((locale) => ({ locale }));
}

const resolveTranslations = async (locale: string) => {
  const { getTranslations } = await import("next-intl/server");
  const tCollections = await getTranslations({ locale, namespace: "pages.collections" });
  return {
    tCollections,
  } as const;
};

export default async function CollectionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale ?? defaultLocale;

  if (!supportedLocales.includes(locale as (typeof supportedLocales)[number])) {
    const { notFound } = await import("next/navigation");
    notFound();
  }

  const { tCollections } = await resolveTranslations(locale);

  const client = isSupabaseConfigured() ? createSupabaseServerClient() : undefined;
  const collections = await getCollections(client);

  const hasCollections = collections.length > 0;

  const heroFeatures: ComingSoonFeature[] = [
    {
      title: tCollections("hero.features.launch.title"),
      items: [
        tCollections("hero.features.launch.items.0"),
        tCollections("hero.features.launch.items.1"),
        tCollections("hero.features.launch.items.2"),
      ],
    },
    {
      title: tCollections("hero.features.contributors.title"),
      items: [
        tCollections("hero.features.contributors.items.0"),
        tCollections("hero.features.contributors.items.1"),
        tCollections("hero.features.contributors.items.2"),
      ],
    },
  ];

  return (
    <AppShell sidebar={<SideBar />} className="pt-10">
      <div className="space-y-12">
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <ComingSoonHero
            badge={tCollections("hero.badge")}
            title={tCollections("hero.title")}
            description={tCollections("hero.description")}
            gradientClassName="bg-gradient-to-br from-slate-900/70 via-neutral-950/75 to-slate-950/80"
            overlayClassName="bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.28),transparent_65%),radial-gradient(circle_at_bottom_right,rgba(167,139,250,0.25),transparent_60%)]"
            features={heroFeatures}
            actions={[
              {
                label: tCollections("hero.actions.primary"),
                href: `/${locale}/software`,
                variant: "secondary",
              },
            ]}
            secondaryActions={[
              {
                label: tCollections("hero.actions.secondary"),
                href: `/${locale}/request`,
                variant: "outline",
              },
            ]}
          />

          <Card className="border-white/10 bg-neutral-950/65">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">{tCollections("draft.title")}</CardTitle>
              <CardDescription className="text-sm text-neutral-300">
                {tCollections("draft.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {UPCOMING_COLLECTIONS.map((collection) => (
                <div
                  key={collection.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-white/30 hover:bg-white/10"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-white">{tCollections(`draft.items.${collection.id}.title`)}</h3>
                    <Badge className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                      {tCollections(`draft.items.${collection.id}.entries`)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-neutral-300">{tCollections(`draft.items.${collection.id}.summary`)}</p>
                  <p className="mt-3 text-xs uppercase tracking-wide text-cyan-200">{tCollections(`draft.items.${collection.id}.focus`)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-8">
          <header className="space-y-2">
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">{tCollections("title")}</h1>
            <p className="text-sm text-neutral-300 md:text-base">{tCollections("subtitle")}</p>
          </header>

          {hasCollections ? (
            <div className="grid auto-rows-fr items-stretch gap-6 md:grid-cols-2">
              {collections.map((collection) => (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  locale={locale}
                  labels={{
                    featured: tCollections("cards.featured"),
                    explore: tCollections("cards.explore"),
                    items: (count: number) => tCollections("cards.itemsLabel", { count }),
                    ariaLabel: (title: string) => tCollections("cards.ariaLabel", { title }),
                    statPriority: tCollections("cardStats.priority"),
                    statCreated: tCollections("cardStats.created"),
                    statItems: tCollections("cardStats.items"),
                  }}
                />
              ))}
            </div>
          ) : (
            <Card className="border-white/10 bg-neutral-950/70">
              <CardHeader>
                <CardTitle className="text-lg text-white">{tCollections("empty.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-neutral-300">
                <p>{tCollections("empty.description")}</p>
                <Button asChild variant="secondary" className="w-fit">
                  <Link href={`/${locale}`}>{tCollections("empty.cta")}</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </AppShell>
  );
}
