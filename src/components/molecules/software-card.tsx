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
  <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] text-white/90">
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
  <div className="relative h-28 w-full overflow-hidden">
    {heroImage ? (
      <Image
        src={heroImage}
        alt={alt}
        fill
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        sizes="(max-width: 768px) 100vw, 33vw"
        loading="lazy"
        unoptimized
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
  const platformLabels = filtersT.raw("platformOptions") as Record<string, string>;

  const platforms = useMemo(() => {
    const visible = software.platforms.slice(0, MAX_VISIBLE_PLATFORMS);
    const remaining = Math.max(software.platforms.length - MAX_VISIBLE_PLATFORMS, 0);

    return {
      visible: visible.map((platform) => platformLabels[platform] ?? platform),
      remaining,
    };
  }, [platformLabels, software.platforms]);

  const features = useMemo(
    () =>
      software.features
        .filter((feature) => feature.trim().length > 0)
        .slice(0, MAX_FEATURES),
    [software.features],
  );

  const detailHref = `/${locale}/software/${software.slug}`;
  const downloadHref = `/${locale}/download/${software.slug}`;
  const heroImage = !heroErrored ? software.media.heroImage ?? software.media.gallery[0] ?? null : null;
  const logoImage = !logoErrored ? software.media.logoUrl : null;

  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "group relative flex h-full min-h-[270px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-neutral-950/35 backdrop-blur-xl",
        "shadow-[0_18px_45px_rgba(3,7,18,0.45)] transition-all duration-300 hover:border-white/20 hover:bg-neutral-950/45 hover:shadow-[0_28px_80px_rgba(59,130,246,0.18)]",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition duration-300 group-hover:opacity-100"
      >
        <span className="absolute inset-[-2px] rounded-3xl bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.35),transparent_60%),radial-gradient(circle_at_bottom_right,rgba(167,139,250,0.22),transparent_55%)] blur-[14px]" />
        <span className="absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_60%),radial-gradient(circle_at_bottom_right,rgba(167,139,250,0.14),transparent_55%)]" />
      </span>

      <SoftwareCardImage
        heroImage={heroImage}
        alt={software.name}
        fallbackIcon={<Monitor className="h-10 w-10 text-white/70" />}
        onError={() => setHeroErrored(true)}
      />

      <div className="flex flex-1 flex-col gap-3 p-3">
        <header className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-white/8">
              {logoImage ? (
                <Image
                  src={logoImage}
                  alt={`${software.name} logo`}
                  fill
                  className="object-cover"
                  sizes="36px"
                  unoptimized
                  onError={() => setLogoErrored(true)}
                />
              ) : (
                <Monitor className="absolute inset-0 m-auto h-6 w-6 text-white/70" />
              )}
            </div>
            <h3 className="min-w-0 truncate text-sm font-semibold text-white">{software.name}</h3>
          </div>

          <p className="text-[12px] leading-5 text-neutral-300 line-clamp-2">{software.summary}</p>

          <div className="flex flex-wrap items-center gap-2">
            <RatingBadge rating={software.stats.rating} reviewsLabel={t("reviewsLabel", { count: software.stats.votes })} />
          </div>
        </header>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase text-white/85">
            {platforms.visible.map((platform) => (
              <span key={platform} className="rounded-full bg-white/12 px-2.5 py-1">
                {platform}
              </span>
            ))}
            {platforms.remaining > 0 ? (
              <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-white/70">
                +{platforms.remaining}
              </span>
            ) : null}
            {software.sizeInBytes ? (
              <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-white/70">
                {formatBytes(software.sizeInBytes)}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-[11px] text-white/70">
            <span className="inline-flex items-center gap-2">
              <Download className="h-3.5 w-3.5 text-indigo-200" />
              <span className="font-semibold text-white/85">{downloads}</span>
              <span>{t("downloadsLabel")}</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="font-semibold text-white/85">{releaseDate}</span>
              <span>{t("updatedLabel")}</span>
            </span>
          </div>
        </section>

        {showActions ? (
          <footer className="mt-auto flex flex-col gap-3">
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
                className="group/button rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-[0_18px_40px_rgba(59,130,246,0.28)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(167,139,250,0.24)]"
              >
                <Link href={downloadHref}>
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
