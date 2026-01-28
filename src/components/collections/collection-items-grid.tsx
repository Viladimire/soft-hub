import Link from "next/link";

import type { TranslationValues } from "next-intl";

import type { Collection, CollectionItem } from "@/lib/types/collection";
import { cn } from "@/lib/utils/cn";
import { formatReleaseDate } from "@/lib/utils/format";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type CollectionItemsGridProps = {
  collection: Collection;
  locale: string;
  t: CollectionTranslate;
};

type CollectionTranslate = (key: string, values?: TranslationValues) => string;

const buildSoftwareLink = (item: CollectionItem, locale: string) => {
  if (item.software?.slug) {
    return `/${locale}/software/${item.software.slug}`;
  }

  if (item.softwareSlug) {
    return `/${locale}/software/${item.softwareSlug}`;
  }

  return null;
};

const buildHighlight = (item: CollectionItem, t: CollectionTranslate): string => {
  if (item.highlight) {
    return item.highlight;
  }

  if (item.software?.summary) {
    return item.software.summary;
  }

  return t("missingSoftware");
};

export const CollectionItemsGrid = ({ collection, locale, t }: CollectionItemsGridProps) => {
  if (!collection.items.length) {
    return null;
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-white sm:text-3xl">{t("programsHeading")}</h2>
        <p className="text-sm text-neutral-400">
          {t("description")}
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {collection.items
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((item) => {
            const software = item.software;
            const href = buildSoftwareLink(item, locale);
            const highlight = buildHighlight(item, t);
            const releaseDate = software ? formatReleaseDate(software.updatedAt ?? software.releaseDate, locale) : null;
            const developerRecord = software?.developer as Record<string, unknown> | undefined;
            const developerName = typeof developerRecord?.name === "string" ? (developerRecord.name as string) : null;
            const rawFeatures = Array.isArray(software?.features) ? (software?.features as unknown[]) : [];
            const featureBadges = rawFeatures
              .filter((feature): feature is string => typeof feature === "string" && feature.trim().length > 0)
              .slice(0, 3);

            return (
              <Card
                key={`${collection.id}-${item.softwareId}-${item.position}`}
                className={cn(
                  "h-full overflow-hidden border-white/10 bg-neutral-950/70 backdrop-blur-xl",
                  "shadow-[0_24px_60px_rgba(8,15,35,0.45)]",
                )}
              >
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg text-white">
                      {software?.name ?? item.softwareSlug ?? item.softwareId}
                    </CardTitle>
                    {developerName ? (
                      <p className="text-xs text-neutral-400">{developerName}</p>
                    ) : null}
                  </div>
                  <Badge className="rounded-full border border-white/15 bg-white/12 text-[11px]">
                    #{item.position + 1}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-neutral-300">
                  <p className="line-clamp-3 leading-6 text-neutral-200">{highlight}</p>

                  {software ? (
                    <dl className="grid grid-cols-2 gap-3 text-xs text-neutral-400">
                      <div>
                        <dt className="uppercase tracking-wide text-neutral-500">{t("platformsLabel")}</dt>
                        <dd className="text-neutral-200">
                          {software.platforms.length ? software.platforms.join("، ") : t("missingSoftware")}
                        </dd>
                      </div>
                      <div>
                        <dt className="uppercase tracking-wide text-neutral-500">{t("updatedLabel")}</dt>
                        <dd className="text-neutral-200">{releaseDate ?? ""}</dd>
                      </div>
                    </dl>
                  ) : null}

                  {featureBadges.length ? (
                    <div className="flex flex-wrap gap-2 text-xs text-neutral-300">
                      {featureBadges.map((feature) => (
                        <Badge key={feature} variant="outline" className="border-white/15 bg-white/5 text-white/80">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    {href ? (
                      <Button asChild variant="primary" className="text-sm">
                        <Link href={href} prefetch>
                          {t("exploreButton")}
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="ghost" className="text-sm" disabled>
                        {t("backLink")}
                      </Button>
                    )}
                    {software?.downloadUrl ? (
                      <Button asChild variant="ghost" className="text-sm">
                        <Link href={software.downloadUrl} target="_blank" rel="noopener">
                          {t("downloadButton")}
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>
    </section>
  );
};
