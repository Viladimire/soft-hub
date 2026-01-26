"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Flame, FolderGit2, MessageCircle, PlusCircle, TrendingUp } from "lucide-react";

import { useEffect, useState } from "react";
import type { Software } from "@/lib/types/software";
import { formatCompactNumber } from "@/lib/utils/format";
import { getStaticTrendingSoftware } from "@/lib/services/staticSoftwareRepository";
import { fetchTrendingSoftware } from "@/lib/services/softwareService";
import { useSupabase } from "@/lib/hooks/useSupabase";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const communityLinkIcons = {
  forums: MessageCircle,
  alternatives: FolderGit2,
  trends: TrendingUp,
} as const;

export const SideBar = () => {
  const locale = useLocale();
  const t = useTranslations("sidebar");
  const supabase = useSupabase();
  const [trending, setTrending] = useState<Software[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(false);

  useEffect(() => {
    let active = true;

    const apply = (items: Software[]) => {
      if (active) {
        setTrending(items);
      }
    };

    const loadFallback = async () => {
      try {
        const fallback = await getStaticTrendingSoftware(3);
        apply(fallback);
      } catch {
        apply([]);
      }
    };

    const run = async () => {
      setLoadingTrending(true);
      if (!supabase) {
        await loadFallback();
        if (active) setLoadingTrending(false);
        return;
      }

      try {
        const live = await fetchTrendingSoftware(3, supabase);
        if (live.length > 0) {
          apply(live);
        } else {
          await loadFallback();
        }
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to load trending software from Supabase", error);
        }
        await loadFallback();
      } finally {
        if (active) {
          setLoadingTrending(false);
        }
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [supabase]);

  const community = t.raw("community.links") as Record<
    keyof typeof communityLinkIcons,
    { label: string; description: string }
  >;

  const trendingEmptyMessage = t("trending.empty");

  return (
    <aside className="space-y-6">
      <Card className="glass-card border-white/10 bg-neutral-950/70">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-neutral-50">
            {t("trending.title")}
          </CardTitle>
          <Badge variant="soft" className="gap-1 text-[10px] uppercase">
            <Flame className="h-3 w-3" />
            {t("trending.badge")}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingTrending ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-xl" />
            ))
          ) : trending.length > 0 ? (
            trending.map((software, index) => (
              <Link
                key={software.id}
                href={`/${locale}/software/${software.slug}`}
                className="group block rounded-xl border border-white/10 bg-neutral-900/60 p-4 transition hover:border-primary-400/60 hover:bg-primary-500/10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sm font-semibold text-neutral-100">
                      {index + 1}
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-neutral-50">{software.name}</p>
                      <p className="text-xs text-neutral-400 line-clamp-1">{software.summary}</p>
                    </div>
                  </div>
                  <span className="text-xs text-primary-200">
                    {formatCompactNumber(software.stats.downloads, locale)}+
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <p className="text-xs text-neutral-400">{trendingEmptyMessage}</p>
          )}
          <Button variant="ghost" className="w-full text-sm text-neutral-300" asChild>
            <Link href={`/${locale}/software?sort=popular`}>{t("trending.viewAll")}</Link>
          </Button>
        </CardContent>
      </Card>
      <Card className="glass-card border-dashed border-white/15 bg-neutral-950/50 text-center">
        <CardContent className="space-y-4 py-6">
          <h3 className="text-sm font-semibold text-neutral-50">{t("request.title")}</h3>
          <p className="text-xs text-neutral-400">{t("request.description")}</p>
          <Button variant="primary" className="w-full gap-2" asChild>
            <Link href={`/${locale}/request`}>
              <PlusCircle className="h-4 w-4" />
              {t("request.cta")}
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card border-white/10 bg-neutral-950/70">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-neutral-50">
            {t("community.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(Object.keys(community) as Array<keyof typeof communityLinkIcons>).map((key) => {
            const Icon = communityLinkIcons[key];
            const copy = community[key];

            return (
              <Link
                key={key}
                href={`/${locale}${key === "trends" ? "/insights/trends" : `/community/${key}`}`}
                className="flex items-start gap-3 rounded-lg border border-white/10 bg-neutral-900/50 px-4 py-3 transition hover:border-primary-400/60 hover:bg-primary-500/10"
              >
                <Icon className="mt-0.5 h-4 w-4 text-primary-300" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-neutral-50">{copy.label}</p>
                  <p className="text-xs text-neutral-400">{copy.description}</p>
                </div>
              </Link>
            );
          })}
          {loadingTrending ? <Skeleton className="h-12" shimmer={false} /> : null}
        </CardContent>
      </Card>
    </aside>
  );
};
