"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Download,
  Eye,
  Heart,
  MonitorSmartphone,
  Share2,
  Star,
  Tag,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import type { Software } from "@/lib/types/software";
import { formatBytes, formatCompactNumber, formatReleaseDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type SoftwareCardProps = {
  software: Software;
  className?: string;
  showActions?: boolean;
};

const RatingStars = ({ rating }: { rating: number }) => {
  const rounded = Math.round(rating * 2) / 2;

  return (
    <div className="flex items-center gap-1 text-xs text-primary-100">
      {Array.from({ length: 5 }, (_, index) => {
        const isFull = index + 1 <= rounded;
        const isHalf = !isFull && index + 0.5 === rounded;

        return (
          <Star
            key={index}
            className={cn(
              "h-3.5 w-3.5",
              isFull || isHalf ? "fill-primary-400 text-primary-200" : "text-neutral-500/60",
            )}
          />
        );
      })}
      <span className="ml-1 text-neutral-300">{rating.toFixed(1)}</span>
    </div>
  );
};

const typeBadgeStyles: Record<string, string> = {
  free: "bg-gradient-to-r from-emerald-400/25 via-emerald-300/20 to-emerald-500/25 text-emerald-100",
  freemium: "bg-gradient-to-r from-amber-400/25 via-amber-300/20 to-amber-500/25 text-amber-100",
  "open-source": "bg-gradient-to-r from-violet-500/30 via-indigo-400/20 to-violet-500/25 text-violet-100",
};

const clampPlatforms = (platforms: string[]): [string[], number] => {
  if (platforms.length <= 3) return [platforms, 0];
  return [platforms.slice(0, 3), platforms.length - 3];
};

const FAVORITES_STORAGE_KEY = "soft-hub:favorites";

export const SoftwareCard = ({ software, className, showActions = true }: SoftwareCardProps) => {
  const t = useTranslations("softwareCard");
  const filtersT = useTranslations("filters");
  const locale = useLocale();

  const cardRef = useRef<HTMLDivElement | null>(null);
  const shareTimeoutRef = useRef<number | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isPointerFine, setIsPointerFine] = useState(true);
  const readFavoriteFromStorage = useCallback(() => {
    if (typeof window === "undefined") {
      return false;
    }

    try {
      const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (!raw) return false;

      const favorites = JSON.parse(raw) as string[];
      return favorites.includes(software.id);
    } catch {
      return false;
    }
  }, [software.id]);

  const [isFavorited, setIsFavorited] = useState<boolean>(() => readFavoriteFromStorage());
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(pointer: fine)");
    const updatePointerType = () => setIsPointerFine(mediaQuery.matches);

    updatePointerType();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", updatePointerType);
      return () => mediaQuery.removeEventListener("change", updatePointerType);
    }

    mediaQuery.addListener(updatePointerType);
    return () => mediaQuery.removeListener(updatePointerType);
  }, []);

  useEffect(() => {
    if (!isPointerFine) {
      setTilt({ x: 0, y: 0 });
    }
  }, [isPointerFine]);

  const primaryCategory = software.categories[0];
  const releaseDate = formatReleaseDate(software.releaseDate, locale, t("notAvailable"));
  const downloads = formatCompactNumber(software.stats.downloads, locale);
  const views = formatCompactNumber(software.stats.views, locale);
  const platformLabels = filtersT.raw("platformOptions") as Record<string, string>;
  const categoryLabels = filtersT.raw("categoryLabels") as Record<string, string>;
  const pricingLabels = filtersT.raw("pricingOptions") as Record<string, string>;

  const localizedCategory = categoryLabels[primaryCategory] ?? primaryCategory;
  const localizedType = pricingLabels[software.type] ?? software.type;

  const [visiblePlatforms, hiddenPlatformsCount] = useMemo(
    () => clampPlatforms(software.platforms),
    [software.platforms],
  );

  const platformsChips = useMemo(
    () =>
      visiblePlatforms.map((platform: string) => platformLabels[platform] ?? platform),
    [visiblePlatforms, platformLabels],
  );

  const stats = useMemo(
    () => [
      { label: t("downloadsLabel"), value: downloads },
      { label: t("viewsLabel"), value: views },
      { label: t("updatedLabel"), value: releaseDate },
    ],
    [downloads, releaseDate, t, views],
  );

  const heroImage = software.media.heroImage ?? software.media.gallery[0] ?? null;
  const typeBadgeClass = typeBadgeStyles[software.type] ?? "bg-white/10 text-neutral-100";
  const detailHref = `/${locale}/software/${software.slug}`;

  const ensureTranslation = useCallback(
    (key: string, fallbackAr: string, fallbackEn: string) => {
      try {
        const value = t(key);
        if (value) return value;
      } catch {
        /* noop */
      }

      return locale.startsWith("ar") ? fallbackAr : fallbackEn;
    },
    [locale, t],
  );

  const featuredLabel = ensureTranslation("featuredBadge", "مميز", "Featured");
  const quickViewLabel = ensureTranslation("quickView", "معاينة", "Quick view");
  const shareLabel = ensureTranslation("share", "مشاركة", "Share");
  const favoriteLabel = ensureTranslation("favorite", "مفضلة", "Favorite");
  const downloadsLabel = t("downloadCount", { count: software.stats.downloads });
  const shareCopiedMessage = t("shareCopied");
  const shareFailedMessage = t("shareFailed");
  const quickViewTitle = t("quickViewTitle", { name: software.name });
  const quickViewSubtitle = t("quickViewSubtitle");

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const node = cardRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    const x = ((offsetX / rect.width) * 2 - 1) * 10;
    const y = ((offsetY / rect.height) * -2 + 1) * 10;
    setTilt({ x, y });
  }, []);

  const resetTilt = useCallback(() => setTilt({ x: 0, y: 0 }), []);
  const updateFavoriteStorage = useCallback(
    (nextValue: boolean) => {
      if (typeof window === "undefined") return;

      const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
      let favorites: string[] = [];

      if (raw) {
        try {
          favorites = JSON.parse(raw) as string[];
        } catch {
          favorites = [];
        }
      }

      if (nextValue) {
        if (!favorites.includes(software.id)) {
          favorites.push(software.id);
        }
      } else {
        favorites = favorites.filter((entry) => entry !== software.id);
      }

      window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    },
    [software.id],
  );

  const toggleFavorite = useCallback(() => {
    setIsFavorited((previous) => {
      const next = !previous;
      updateFavoriteStorage(next);
      return next;
    });
  }, [updateFavoriteStorage]);

  const handleShare = useCallback(async () => {
    if (typeof window === "undefined") return;

    const shareUrl = new URL(detailHref, window.location.origin).toString();

    try {
      if (navigator.share) {
        await navigator.share({
          title: software.name,
          text: software.summary,
          url: shareUrl,
        });
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        setShareStatus("error");
        return;
      }

      setShareStatus("copied");
      if (shareTimeoutRef.current) {
        window.clearTimeout(shareTimeoutRef.current);
      }
      shareTimeoutRef.current = window.setTimeout(() => setShareStatus("idle"), 2600);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error(error);
      }
      setShareStatus("error");
      if (shareTimeoutRef.current) {
        window.clearTimeout(shareTimeoutRef.current);
      }
      shareTimeoutRef.current = window.setTimeout(() => setShareStatus("idle"), 2600);
    }
  }, [detailHref, shareTimeoutRef, software.name, software.summary]);

  useEffect(
    () => () => {
      if (typeof window !== "undefined" && shareTimeoutRef.current) {
        window.clearTimeout(shareTimeoutRef.current);
      }
    },
    [],
  );

  const shareMessage = shareStatus === "copied" ? shareCopiedMessage : shareStatus === "error" ? shareFailedMessage : null;

  const shouldTilt = isPointerFine;
  const cardTransformStyle = shouldTilt
    ? { transform: `perspective(1100px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)` }
    : undefined;

  return (
    <div
      ref={cardRef}
      onMouseMove={shouldTilt ? handleMouseMove : undefined}
      onMouseLeave={shouldTilt ? resetTilt : undefined}
      className={cn(
        "group/card relative overflow-hidden rounded-3xl border border-white/10 bg-white/8 p-5",
        "backdrop-blur-xl shadow-[0_24px_60px_rgba(15,23,42,0.45)] transition-all duration-300",
        "md:hover:-translate-y-2",
        className,
      )}
      style={cardTransformStyle}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition duration-500 group-hover/card:opacity-100">
        <div className="absolute inset-[-1px] rounded-[inherit] bg-[conic-gradient(from_120deg,var(--tw-gradient-stops))] from-primary-500/0 via-primary-500/55 to-accent-400/45 blur-[30px]" />
        <div className="absolute inset-0 rounded-[inherit] border border-white/10" />
      </div>

      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 z-10 flex items-start justify-between p-4">
          <div className="flex items-center gap-2">
            {software.isFeatured ? (
              <Badge className="rounded-full border border-yellow-300/40 bg-yellow-400/20 text-[10px] font-semibold uppercase tracking-wide text-yellow-100 shadow-[0_0_20px_rgba(252,211,77,0.35)]">
                {featuredLabel}
              </Badge>
            ) : null}
            <Badge className={cn("rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide", typeBadgeClass)}>
              <Tag className="mr-1 inline h-3 w-3" />
              {localizedType}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="rounded-full border border-white/15 bg-white/15 px-3 py-1 text-[10px] uppercase text-white/90">
              {localizedCategory}
            </Badge>
          </div>
        </div>

        <div className="relative h-52 w-full overflow-hidden">
          {heroImage ? (
            <Image
              src={heroImage}
              alt={software.name}
              fill
              className="object-cover transition-transform duration-500 group-hover/card:scale-105"
              sizes="(max-width: 768px) 100vw, 33vw"
              priority={false}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-500/35 via-accent-500/30 to-emerald-400/35 text-white">
              <MonitorSmartphone className="h-12 w-12" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/95 via-neutral-950/40 to-transparent" />

          <div className="absolute inset-0 z-20 flex flex-col justify-end p-5">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-white/15 bg-neutral-950/40 shadow-[0_12px_24px_rgba(15,23,42,0.45)]">
                {software.media.logoUrl ? (
                  <Image src={software.media.logoUrl} alt={`${software.name} logo`} fill className="object-cover" />
                ) : (
                  <MonitorSmartphone className="absolute inset-0 m-auto h-6 w-6 text-white/70" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{software.name}</h3>
                <p className="text-xs text-neutral-200/80 line-clamp-2">{software.summary}</p>
                <div className="mt-1 flex items-center gap-2">
                  <RatingStars rating={software.stats.rating} />
                  <span className="text-[11px] text-neutral-300/80">{t("reviewsLabel", { count: software.stats.votes })}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.25),transparent_55%)] opacity-0 transition duration-500 group-hover/card:opacity-100" />

          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-gradient-to-t from-neutral-950/70 via-neutral-950/30 to-transparent p-4 text-center opacity-100 md:opacity-0 md:transition md:duration-300 md:group-hover/card:opacity-100">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Dialog open={isQuickViewOpen} onOpenChange={setIsQuickViewOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/20 px-4 py-2 text-xs font-medium text-white backdrop-blur-md transition hover:-translate-y-1 hover:bg-white/30"
                    aria-label={quickViewLabel}
                  >
                    <Eye className="h-4 w-4" />
                    {quickViewLabel}
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl space-y-6 bg-neutral-950/90">
                  <div className="relative h-56 overflow-hidden rounded-2xl">
                    {heroImage ? (
                      <Image
                        src={heroImage}
                        alt={software.name}
                        fill
                        className="object-cover"
                        sizes="(min-width: 1024px) 50vw, 100vw"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-500/35 via-accent-500/30 to-emerald-400/35 text-white">
                        <MonitorSmartphone className="h-12 w-12" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/85 via-neutral-950/20 to-transparent" />
                  </div>
                  <div className="space-y-3">
                    <DialogTitle className="text-2xl font-bold text-white">{quickViewTitle}</DialogTitle>
                    <DialogDescription className="text-sm leading-6 text-neutral-300">
                      {quickViewSubtitle}
                    </DialogDescription>
                    <p className="text-sm leading-6 text-neutral-200/90">{software.summary}</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-200">
                      <p className="text-xs uppercase tracking-wide text-neutral-400">{t("downloadsLabel")}</p>
                      <p className="mt-1 text-lg font-semibold text-white">{downloads}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-200">
                      <p className="text-xs uppercase tracking-wide text-neutral-400">{t("viewsLabel")}</p>
                      <p className="mt-1 text-lg font-semibold text-white">{views}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-200">
                      <p className="text-xs uppercase tracking-wide text-neutral-400">{t("versionLabel")}</p>
                      <p className="mt-1 text-lg font-semibold text-white">{software.version ?? t("notAvailable")}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-200">
                      <p className="text-xs uppercase tracking-wide text-neutral-400">{t("updatedLabel")}</p>
                      <p className="mt-1 text-lg font-semibold text-white">{releaseDate}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      variant="primary"
                      asChild
                      className="rounded-full bg-gradient-to-r from-primary-500 via-indigo-500 to-accent-500 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white"
                    >
                      <Link href={detailHref}>{t("viewDetails")}</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      asChild
                      className="rounded-full border border-white/15 bg-white/10 px-5 py-2 text-xs uppercase tracking-wide text-white"
                    >
                      <Link href={software.downloadUrl}>{t("downloadNow")}</Link>
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-4 py-2 text-xs font-medium text-white backdrop-blur-md transition hover:-translate-y-1 hover:bg-white/25"
                aria-label={shareLabel}
              >
                <Share2 className="h-4 w-4" />
                {shareLabel}
              </button>
              <button
                type="button"
                onClick={toggleFavorite}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium backdrop-blur-md transition hover:-translate-y-1",
                  isFavorited
                    ? "border-rose-300/60 bg-rose-500/20 text-rose-100"
                    : "border-white/20 bg-white/10 text-white hover:bg-white/20",
                )}
                aria-pressed={isFavorited}
                aria-label={favoriteLabel}
              >
                <Heart className={cn("h-4 w-4", isFavorited ? "fill-current" : "")} />
                {favoriteLabel}
              </button>
            </div>
            {shareMessage ? (
              <span
                className={cn(
                  "mt-2 text-[11px]",
                  shareStatus === "error" ? "text-rose-200" : "text-emerald-200",
                )}
              >
                {shareMessage}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          {platformsChips.map((platform: string) => (
            <span
              key={platform}
              className="rounded-full bg-neutral-900/60 px-3 py-1 text-[11px] uppercase tracking-wide text-neutral-200"
            >
              {platform}
            </span>
          ))}
          {hiddenPlatformsCount > 0 ? (
            <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] text-neutral-200">
              +{hiddenPlatformsCount}
            </span>
          ) : null}
          <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] text-neutral-100">
            {formatBytes(software.sizeInBytes)}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex h-24 w-full min-w-0 flex-col items-stretch justify-center gap-1 rounded-2xl border border-white/10 bg-white/10 px-3 text-center shadow-[0_12px_26px_rgba(15,23,42,0.2)]"
            >
              <p className="w-full min-w-0 truncate text-[9px] font-medium uppercase tracking-normal text-neutral-400">{stat.label}</p>
              <p className="w-full min-w-0 truncate text-sm font-semibold leading-tight text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {showActions ? (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <div className="flex items-center gap-2 text-xs text-neutral-300">
            <Download className="h-4 w-4 text-primary-200" />
            {downloadsLabel}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-start">
            <Button
              variant="ghost"
              asChild
              className="group/button relative overflow-hidden rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-wide text-white transition hover:-translate-y-1"
            >
              <Link href={detailHref}>
                {t("viewDetails")}
                <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/25 bg-white/15 transition group-hover/button:translate-x-1">
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </Link>
            </Button>
            <Button
              variant="primary"
              asChild
              className="relative overflow-hidden rounded-full bg-gradient-to-r from-primary-500 via-indigo-500 to-accent-500 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-[0_18px_40px_rgba(56,189,248,0.35)] transition hover:-translate-y-1"
            >
              <Link href={software.downloadUrl}>
                {t("downloadNow")}
                <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                  <Download className="h-3.5 w-3.5" />
                </span>
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
