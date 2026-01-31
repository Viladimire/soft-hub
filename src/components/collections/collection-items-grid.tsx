import Link from "next/link";

import type { TranslationValues } from "next-intl";

import type { Collection, CollectionItem } from "@/lib/types/collection";
import { cn } from "@/lib/utils/cn";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SoftwareCard } from "@/components/molecules/software-card";

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

      <div className="grid auto-rows-fr items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
        {collection.items
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((item) => {
            const software = item.software;
            const href = buildSoftwareLink(item, locale);
            const highlight = buildHighlight(item, t);

            if (software) {
              return (
                <div key={`${collection.id}-${item.softwareId}-${item.position}`} className="h-full">
                  <SoftwareCard software={software} />
                </div>
              );
            }

            return (
              <Card
                key={`${collection.id}-${item.softwareId}-${item.position}`}
                className={cn(
                  "flex h-full min-h-[280px] flex-col overflow-hidden border-white/10 bg-neutral-950/70 backdrop-blur-xl",
                  "shadow-[0_24px_60px_rgba(8,15,35,0.45)]",
                )}
              >
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg text-white">
                      {item.softwareSlug ?? item.softwareId}
                    </CardTitle>
                  </div>
                  <Badge className="rounded-full border border-white/15 bg-white/12 text-[11px]">
                    #{item.position + 1}
                  </Badge>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4 text-sm text-neutral-300">
                  <p className="line-clamp-3 leading-6 text-neutral-200">{highlight}</p>

                  <div className="mt-auto flex flex-wrap gap-3">
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
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>
    </section>
  );
};
