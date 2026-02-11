"use client";

import Link from "next/link";
import { ArrowUpRight, Download, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import type { Software } from "@/lib/types/software";
import { formatBytes, formatCompactNumber, formatReleaseDate } from "@/lib/utils/format";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const SoftwareHeader = ({ software }: { software: Software }) => {
  const t = useTranslations("pages.softwareDetail.header");
  const locale = useLocale();
  const releaseDate = formatReleaseDate(software.updatedAt, locale);
  const versionLabel = (software.version ?? "").trim() ? software.version : "-";
  const downloadHref = `/${locale}/download/${software.slug}`;

  return (
    <header className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {software.isFeatured ? (
          <Badge className="gap-1 rounded-full border border-amber-300/30 bg-amber-400/15 text-[11px] uppercase tracking-wide text-amber-100">
            <Sparkles className="h-3.5 w-3.5" />
            {t("badges.featured")}
          </Badge>
        ) : null}
        {software.categories.map((category) => (
          <Badge key={category} variant="soft" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-wide">
            {category}
          </Badge>
        ))}
        <Badge className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-wide text-white">
          {software.type}
        </Badge>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-neutral-50 sm:text-4xl">{software.name}</h1>
          <p className="hidden max-w-2xl text-sm leading-6 text-neutral-300 sm:block">{software.summary}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            className="gap-2"
            onClick={() => {
              void (async () => {
                if (typeof window === "undefined") return;

                const tokenUrl = new URL("/api/download-token", window.location.origin);
                tokenUrl.searchParams.set("slug", software.slug);
                tokenUrl.searchParams.set("locale", locale);

                const response = await fetch(tokenUrl.toString(), { cache: "no-store" });
                if (!response.ok) return;
                const payload = (await response.json()) as { token?: string };
                if (!payload.token) return;

                window.location.href = `${downloadHref}?t=${encodeURIComponent(payload.token)}`;
              })();
            }}
          >
            {t("actions.download")}
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-white/10 bg-white/5">
          <CardContent className="space-y-1 p-4">
            <p className="text-xs text-neutral-400">{t("stats.version")}</p>
            <p className="text-lg font-semibold text-white">{versionLabel}</p>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-white/5">
          <CardContent className="space-y-1 p-4">
            <p className="text-xs text-neutral-400">{t("stats.size")}</p>
            <p className="text-lg font-semibold text-white">{formatBytes(software.sizeInBytes)}</p>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-white/5">
          <CardContent className="space-y-1 p-4">
            <p className="text-xs text-neutral-400">{t("stats.downloads")}</p>
            <p className="text-lg font-semibold text-white">{formatCompactNumber(software.stats.downloads, locale)}</p>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-white/5">
          <CardContent className="space-y-1 p-4">
            <p className="text-xs text-neutral-400">{t("stats.updated")}</p>
            <p className="text-lg font-semibold text-white">{releaseDate}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
        <span>{t("platforms.label")}</span>
        {software.platforms.map((platform) => (
          <span key={platform} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 uppercase text-neutral-200">
            {platform}
          </span>
        ))}
        <Link href={`/${locale}/software`} className="ml-auto inline-flex items-center gap-2 text-neutral-300 hover:text-neutral-100">
          {t("back")}
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
};
