import type { Collection } from "@/lib/types/collection";
import { cn } from "@/lib/utils/cn";
import Image from "next/image";

const FALLBACK_COVER = "/images/software/atlas-utilities/hero.jpg";

export type CollectionHeroProps = {
  collection: Collection;
  labels: {
    featuredBadge: string;
    itemsUnit: string;
    statItems: string;
    statYear: string;
    statOrder: string;
    featuredProgramsLabel: string;
  };
};

const buildHeroBackground = (collection: Collection) => {
  if (collection.theme?.background) {
    return collection.theme.background;
  }

  if (collection.coverImageUrl) {
    return `linear-gradient(140deg, rgba(8,10,22,0.95), rgba(8,10,22,0.6)), url(${collection.coverImageUrl})`;
  }

  if (collection.accentColor) {
    return `linear-gradient(140deg, ${collection.accentColor}33, rgba(8,10,22,0.9))`;
  }

  return "linear-gradient(140deg, rgba(45,65,130,0.35), rgba(4,8,18,0.95))";
};

export const CollectionHero = ({ collection, labels }: CollectionHeroProps) => {
  const background = buildHeroBackground(collection);
  const publishedLabel = collection.publishedAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" }).format(
        new Date(collection.publishedAt),
      )
    : null;

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-950/80 p-8 md:p-12",
        "shadow-[0_60px_120px_rgba(8,15,35,0.55)]",
      )}
      style={{ background }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_55%)] opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-transparent to-black/65" />

      <div className="relative z-10 grid gap-8 md:grid-cols-[minmax(0,1fr)_280px] md:items-start">
        <div className="space-y-6 text-white">
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide text-white/80">
            {collection.isFeatured ? (
              <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1">{labels.featuredBadge}</span>
            ) : null}
            {publishedLabel ? (
              <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1">
                {publishedLabel}
              </span>
            ) : null}
            <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1">
              {collection.items.length} {labels.itemsUnit}
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-bold sm:text-4xl md:text-5xl">{collection.title}</h1>
            {collection.subtitle ? <p className="text-lg text-white/90">{collection.subtitle}</p> : null}
            {collection.description ? (
              <p className="max-w-2xl text-sm leading-7 text-white/80 md:text-base">{collection.description}</p>
            ) : null}
          </div>

          <div className="grid gap-4 text-sm sm:grid-cols-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <p className="text-2xl font-semibold">{collection.items.length}</p>
              <p className="text-white/70">{labels.statItems}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <p className="text-2xl font-semibold">{new Date(collection.createdAt).getFullYear()}</p>
              <p className="text-white/70">{labels.statYear}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <p className="text-2xl font-semibold">{collection.displayOrder}</p>
              <p className="text-white/70">{labels.statOrder}</p>
            </div>
          </div>
        </div>

        <div className="relative h-60 overflow-hidden rounded-3xl border border-white/10 bg-black/20">
          <Image
            src={collection.coverImageUrl ?? FALLBACK_COVER}
            alt={collection.title}
            fill
            className="object-cover object-center"
            sizes="(max-width: 768px) 100vw, 280px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/40" />
          <div className="absolute inset-x-0 bottom-0 p-4 text-xs text-white/80">
            <p className="font-medium">{labels.featuredProgramsLabel}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {collection.items.slice(0, 5).map((item) => (
                <span key={`${collection.id}-${item.softwareId}`} className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
                  {item.software?.name ?? item.softwareSlug ?? item.softwareId}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
