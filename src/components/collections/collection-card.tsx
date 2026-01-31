import type { CSSProperties } from "react";

import Image from "next/image";
import Link from "next/link";

import type { Collection } from "@/lib/types/collection";
import { cn } from "@/lib/utils/cn";

import { Badge } from "@/components/ui/badge";

const FALLBACK_COVER = "/images/software/atlas-utilities/hero.jpg";

export type CollectionCardLabels = {
  featured: string;
  explore: string;
  items: (count: number) => string;
  ariaLabel: (title: string) => string;
  statPriority: string;
  statCreated: string;
  statItems: string;
};

export type CollectionCardProps = {
  collection: Collection;
  locale: string;
  labels: CollectionCardLabels;
  className?: string;
};

const buildThemeStyle = (collection: Collection): CSSProperties => {
  const style: CSSProperties = {};

  if (collection.theme?.background) {
    style.background = collection.theme.background;
  } else if (collection.accentColor) {
    style.background = `linear-gradient(140deg, ${collection.accentColor}26, rgba(8,12,22,0.88))`;
  }

  if (collection.theme?.foreground) {
    style.color = collection.theme.foreground;
  }

  return style;
};

const buildOverlay = (collection: Collection) => {
  if (collection.theme?.gradientStart && collection.theme?.gradientEnd) {
    return `linear-gradient(135deg, ${collection.theme.gradientStart}, ${collection.theme.gradientEnd})`;
  }

  if (collection.accentColor) {
    return `linear-gradient(135deg, ${collection.accentColor}40, rgba(10,10,25,0.92))`;
  }

  return "linear-gradient(135deg, rgba(118,75,255,0.25), rgba(5,10,25,0.85))";
};

const formatPublishedDate = (collection: Collection, locale: string) => {
  const value = collection.publishedAt ?? collection.createdAt;

  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return value.slice(0, 10);
  }
};

export const CollectionCard = ({ collection, locale, labels, className }: CollectionCardProps) => {
  const previewItems = collection.items.slice(0, 3);
  const extraCount = Math.max(collection.items.length - previewItems.length, 0);
  const href = `/${locale}/collections/${collection.slug}`;

  return (
    <article
      className={cn(
        "group relative flex h-full min-h-[440px] overflow-hidden rounded-[28px] border border-white/12 bg-neutral-950/70 backdrop-blur-xl",
        "shadow-[0_42px_120px_rgba(8,15,35,0.55)] transition-all duration-500 hover:-translate-y-1.5",
        className,
      )}
      style={buildThemeStyle(collection)}
    >
      <div className="absolute inset-0 opacity-80" style={{ background: buildOverlay(collection) }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_57%)]" />

      <Link href={href} className="absolute inset-0 z-20" aria-label={labels.ariaLabel(collection.title)} prefetch>
        <span className="sr-only">{labels.explore}</span>
      </Link>

      <div className="relative z-10 grid h-full gap-6 p-6 md:grid-cols-[minmax(0,1fr)_240px] md:p-8">
        <div className="flex min-w-0 flex-col gap-5 text-white">
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide text-white/85">
            {collection.isFeatured ? (
              <Badge className="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[11px]">
                {labels.featured}
              </Badge>
            ) : null}
            <Badge className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px]">
              {formatPublishedDate(collection, locale)}
            </Badge>
          </div>

          <div className="space-y-2 min-w-0">
            <h2 className="text-2xl font-semibold sm:text-3xl md:text-[32px] line-clamp-2">{collection.title}</h2>
            {collection.subtitle ? <p className="text-sm text-white/85">{collection.subtitle}</p> : null}
            {collection.description ? (
              <p className="text-sm leading-6 text-white/75 line-clamp-3">{collection.description}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-white/70">
            <span className="rounded-full border border-white/18 bg-white/12 px-3 py-1">
              {labels.items(collection.items.length)}
            </span>
            {collection.accentColor ? (
              <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1" style={{ color: collection.accentColor }}>
                {collection.accentColor}
              </span>
            ) : null}
          </div>

          <div className="mt-auto">
            <span className="relative z-30 inline-flex w-fit items-center justify-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-neutral-900 shadow-lg">
              {labels.explore}
            </span>
          </div>
        </div>

        <div className="relative flex flex-col gap-4">
          <div className="relative h-40 overflow-hidden rounded-2xl border border-white/12 bg-black/30">
            <Image
              src={collection.coverImageUrl || FALLBACK_COVER}
              alt={collection.title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 240px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />

            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-2 p-4">
              {previewItems.map((item) => (
                <Badge
                  key={`${collection.id}-${item.softwareId}-${item.position}`}
                  className="rounded-full border border-white/20 bg-white/15 text-[11px] text-white"
                >
                  {item.software?.name ?? item.softwareSlug ?? item.softwareId}
                </Badge>
              ))}
              {extraCount > 0 ? (
                <Badge className="rounded-full border border-white/20 bg-white/10 text-[11px] text-white/80">+{extraCount}</Badge>
              ) : null}
            </div>
          </div>

          <div className="mt-auto grid grid-cols-3 gap-3 text-center text-xs text-white/70">
            <div className="rounded-2xl border border-white/12 bg-white/10 p-3">
              <p className="text-2xl font-semibold text-white">{collection.displayOrder}</p>
              <p>{labels.statPriority}</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/10 p-3">
              <p className="text-2xl font-semibold text-white">{new Date(collection.createdAt).getFullYear()}</p>
              <p>{labels.statCreated}</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/10 p-3">
              <p className="text-2xl font-semibold text-white">{collection.items.length}</p>
              <p>{labels.statItems}</p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};
