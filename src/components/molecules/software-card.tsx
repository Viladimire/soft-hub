"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Download, Monitor, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import type { Software } from "@/lib/types/software";
import { formatBytes, formatCompactNumber, formatReleaseDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

import { Button } from "@/components/ui/button";

export type SoftwareCardProps = {
  software: Software;
  className?: string;
  showActions?: boolean;
};

const MAX_VISIBLE_PLATFORMS = 3;
const MAX_FEATURES = 3;

const RatingBadge = ({ rating, reviewsLabel }: { rating: number; reviewsLabel: string }) => (
  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/90">
    <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-200" />
    <span className="font-semibold">{rating.toFixed(1)}</span>
    <span className="text-[11px] text-white/70">{reviewsLabel}</span>
  </div>
);

const SoftwareCardImage = ({
  heroImage,
  fallbackIcon,
  onError,
  alt,
}: {
  heroImage: string | null;
  fallbackIcon: React.ReactNode;
  onError: () => void;
  alt: string;
}) => (
  <div className="relative h-48 w-full overflow-hidden">
    {heroImage ? (
      <Image
        src={heroImage}
        alt={alt}
        fill
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        sizes="(max-width: 768px) 100vw, 33vw"
        loading="lazy"
        onError={onError}
      />
    ) : (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-500/30 via-secondary-500/30 to-rose-500/30">
        {fallbackIcon}
      </div>
    )}
    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/20 to-transparent" />
  </div>
);

export const SoftwareCard = ({ software, className, showActions = true }: SoftwareCardProps) => {
  const t = useTranslations("softwareCard");
  const filtersT = useTranslations("filters");
  const locale = useLocale();

  const [heroErrored, setHeroErrored] = useState(false);
  const [logoErrored, setLogoErrored] = useState(false);

  const releaseDate = formatReleaseDate(software.releaseDate, locale, t("notAvailable"));
  const downloads = formatCompactNumber(software.stats.downloads, locale);
  const views = formatCompactNumber(software.stats.views, locale);
  const platformLabels = filtersT.raw("platformOptions") as Record<string, string>;

  const platforms = useMemo(() => {
    const visible = software.platforms.slice(0, MAX_VISIBLE_PLATFORMS);
    const remaining = Math.max(software.platforms.length - MAX_VISIBLE_PLATFORMS, 0);

    return {
      visible: visible.map((platform) => platformLabels[platform] ?? platform),
      remaining,
    };
  }, [platformLabels, software.platforms]);

  const stats = useMemo(
    () => [
      { label: t("downloadsLabel"), value: downloads },
      { label: t("viewsLabel"), value: views },
      { label: t("updatedLabel"), value: releaseDate },
    ],
    [downloads, releaseDate, t, views],
  );

  const features = useMemo(
    () =>
      software.features
        .filter((feature) => feature.trim().length > 0)
        .slice(0, MAX_FEATURES),
    [software.features],
  );

  const detailHref = `/${locale}/software/${software.slug}`;
  const heroImage = !heroErrored ? software.media.heroImage ?? software.media.gallery[0] ?? null : null;
  const logoImage = !logoErrored ? software.media.logoUrl : null;

  return (
    <motion.article
      whileHover={{ y: -12, rotateX: 3.5, rotateY: -3.5 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/0 backdrop-blur-xl",
        "shadow-[0_18px_45px_rgba(15,23,42,0.35)] transition-all duration-300 hover:border-white/20 hover:shadow-[0_28px_70px_rgba(79,70,229,0.28)]",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition duration-300 group-hover:opacity-100"
      >
        <span className="absolute inset-[-2px] rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 opacity-70 blur-[14px]" />
        <span className="absolute inset-0 rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 opacity-60 animate-border-gradient" />
      </span>

      <SoftwareCardImage
        heroImage={heroImage}
        alt={software.name}
        fallbackIcon={<Monitor className="h-10 w-10 text-white/70" />}
        onError={() => setHeroErrored(true)}
      />

      <div className="pointer-events-none absolute left-4 right-4 top-4 flex items-center justify-between gap-3 opacity-0 transition duration-300 group-hover:opacity-100">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-neutral-950/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-xl">
          <Download className="h-3.5 w-3.5 text-indigo-200" />
          {downloads}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-neutral-950/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-xl">
          <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-200" />
          {software.stats.rating.toFixed(1)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-6 p-6">
        <header className="flex items-start gap-4">
          <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-white/15 bg-white/8">
            {logoImage ? (
              <Image
                src={logoImage}
                alt={`${software.name} logo`}
                fill
                className="object-cover"
                sizes="56px"
                onError={() => setLogoErrored(true)}
              />
            ) : (
              <Monitor className="absolute inset-0 m-auto h-6 w-6 text-white/70" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-semibold text-white">{software.name}</h3>
            <p className="mt-1 text-sm text-neutral-300 line-clamp-2">{software.summary}</p>
            <div className="mt-3">
              <RatingBadge
                rating={software.stats.rating}
                reviewsLabel={t("reviewsLabel", { count: software.stats.votes })}
              />
            </div>
          </div>
        </header>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase text-white/85">
            {platforms.visible.map((platform) => (
              <span key={platform} className="rounded-full bg-white/12 px-3 py-1">
                {platform}
              </span>
            ))}
            {platforms.remaining > 0 ? (
              <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-white/70">
                +{platforms.remaining}
              </span>
            ) : null}
            {software.sizeInBytes ? (
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-white/70">
                {formatBytes(software.sizeInBytes)}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex h-20 flex-col justify-center rounded-2xl border border-white/10 bg-white/8 px-3 text-center"
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-white/60">{stat.label}</p>
                <p className="mt-1 truncate text-sm font-semibold text-white">{stat.value}</p>
              </div>
            ))}
          </div>

          {features.length ? (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-white/60">{t("featuresLabel")}</p>
              <div className="flex flex-wrap gap-2">
                {features.map((feature) => (
                  <span key={feature} className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/85">
                    {feature}
                  </span>
                ))}
                {software.features.length > features.length ? (
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/60">
                    {t("moreFeatures", { count: software.features.length - features.length })}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>

        {showActions ? (
          <footer className="mt-auto flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs text-white/70">
              <Download className="h-4 w-4 text-indigo-200" />
              {t("downloadCount", { count: software.stats.downloads })}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                asChild
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-wide text-white transition-all duration-200 hover:-translate-y-1 hover:bg-white/15"
              >
                <Link href={detailHref}>
                  {t("viewDetails")}
                  <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-white/10">
                    <ArrowUpRight className="h-3 w-3" />
                  </span>
                </Link>
              </Button>
              <Button
                variant="primary"
                asChild
                className="group/button rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-[0_18px_40px_rgba(79,70,229,0.45)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_22px_54px_rgba(236,72,153,0.35)]"
              >
                <Link href={software.downloadUrl}>
                  {t("downloadNow")}
                  <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                    <Download className="h-3.5 w-3.5 transition group-hover/button:animate-bounce" />
                  </span>
                </Link>
              </Button>
            </div>
          </footer>
        ) : null}
      </div>
    </motion.article>
  );
};
