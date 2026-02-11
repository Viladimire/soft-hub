"use client";

import { Download, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Software } from "@/lib/types/software";
import { formatBytes, formatReleaseDate } from "@/lib/utils/format";
import { trackDownload } from "@/lib/services/analyticsService";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const DownloadCard = ({ software, locale }: { software: Software; locale: string }) => {
  const t = useTranslations("pages.softwareDetail.downloadCard");
  const versionLabel = (software.version ?? "").trim() ? software.version : "-";
  const downloadHref = `/${locale}/download/${software.slug}`;

  return (
    <Card className="border-white/10 bg-white/5">
      <CardContent className="space-y-4 p-4 sm:p-6">
        <Button
          variant="primary"
          className="w-full gap-2 rounded-2xl py-5 text-sm sm:py-6"
          onClick={() => {
            void trackDownload(software.id, {
              slug: software.slug,
              source: "software-detail",
            });

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
          <Download className="h-4 w-4" />
          {t("primaryCta")}
        </Button>

        <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
          <div className="flex items-center justify-between text-neutral-200">
            <span className="text-xs text-neutral-400">{t("stats.version")}</span>
            <span className="font-semibold text-white">{versionLabel}</span>
          </div>
          <div className="flex items-center justify-between text-neutral-200">
            <span className="text-xs text-neutral-400">{t("stats.size")}</span>
            <span className="font-semibold text-white">{formatBytes(software.sizeInBytes)}</span>
          </div>
          <div className="flex items-center justify-between text-neutral-200">
            <span className="text-xs text-neutral-400">{t("stats.updated")}</span>
            <span className="font-semibold text-white">{formatReleaseDate(software.updatedAt, locale)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          <ShieldCheck className="h-4 w-4" />
          <span>{t("verified")}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {software.platforms.map((platform) => (
            <Badge key={platform} className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-wide text-white">
              {platform}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
