"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Lock } from "lucide-react";

import { AppShell } from "@/components/layouts/app-shell";
import { SideBar } from "@/components/layouts/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ComingSoonHero, type ComingSoonFeature } from "@/components/templates/coming-soon-hero";

type FilmPreview = {
  title: string;
  synopsis: string;
  releaseWindow: string;
  genres: string[];
  rating: string;
};

type EditorialHighlight = {
  label: string;
  description: string;
};

export default function FilmsComingSoonPage() {
  const locale = useLocale();
  const t = useTranslations("pages.films");

  const upcomingFilms: FilmPreview[] = useMemo(
    () => [
      {
        title: t("upcoming.items.neonOrbit.title"),
        synopsis: t("upcoming.items.neonOrbit.synopsis"),
        releaseWindow: t("upcoming.items.neonOrbit.releaseWindow"),
        genres: [t("upcoming.items.neonOrbit.genres.0"), t("upcoming.items.neonOrbit.genres.1")],
        rating: t("upcoming.items.neonOrbit.rating"),
      },
      {
        title: t("upcoming.items.lastTransmission.title"),
        synopsis: t("upcoming.items.lastTransmission.synopsis"),
        releaseWindow: t("upcoming.items.lastTransmission.releaseWindow"),
        genres: [t("upcoming.items.lastTransmission.genres.0"), t("upcoming.items.lastTransmission.genres.1")],
        rating: t("upcoming.items.lastTransmission.rating"),
      },
      {
        title: t("upcoming.items.skylineClub.title"),
        synopsis: t("upcoming.items.skylineClub.synopsis"),
        releaseWindow: t("upcoming.items.skylineClub.releaseWindow"),
        genres: [t("upcoming.items.skylineClub.genres.0"), t("upcoming.items.skylineClub.genres.1")],
        rating: t("upcoming.items.skylineClub.rating"),
      },
    ],
    [t],
  );

  const heroFeatures: ComingSoonFeature[] = useMemo(
    () => [
      {
        title: t("hero.features.expect.title"),
        items: [t("hero.features.expect.items.0"), t("hero.features.expect.items.1"), t("hero.features.expect.items.2")],
      },
      {
        title: t("hero.features.timeline.title"),
        items: [t("hero.features.timeline.items.0"), t("hero.features.timeline.items.1"), t("hero.features.timeline.items.2")],
      },
    ],
    [t],
  );

  const editorialThemes: EditorialHighlight[] = useMemo(
    () => [
      {
        label: t("pillars.items.curation.label"),
        description: t("pillars.items.curation.description"),
      },
      {
        label: t("pillars.items.partnerships.label"),
        description: t("pillars.items.partnerships.description"),
      },
      {
        label: t("pillars.items.premieres.label"),
        description: t("pillars.items.premieres.description"),
      },
    ],
    [t],
  );

  const sortedFilms = useMemo(
    () =>
      [...upcomingFilms].sort((a, b) => a.releaseWindow.localeCompare(b.releaseWindow, undefined, { numeric: true })),
    [upcomingFilms],
  );

  return (
    <AppShell sidebar={<SideBar />} className="pt-10">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <ComingSoonHero
          badge={t("hero.badge")}
          title={t("hero.title")}
          description={t("hero.description")}
          gradientClassName="bg-gradient-to-br from-indigo-900/50 via-neutral-950/70 to-slate-950/75"
          overlayClassName="bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.35),transparent_65%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.25),transparent_60%)]"
          features={heroFeatures}
          actions={[
            {
              label: t("hero.actions.primary"),
              href: `/${locale}/software`,
              variant: "secondary",
            },
          ]}
          secondaryActions={[
            {
              label: t("hero.actions.secondary"),
              href: `/${locale}`,
              variant: "ghost",
            },
          ]}
        />

        <div className="space-y-6">
          <Card className="border-white/10 bg-neutral-950/60">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-lg font-semibold text-white">{t("notify.title")}</CardTitle>
                <Badge className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                  {t("hero.badge")}
                </Badge>
              </div>
              <CardDescription className="text-sm text-neutral-300">
                {t("notify.status.disabled")}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                <Lock className="h-5 w-5 text-neutral-200" />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-neutral-200">{t("notify.placeholder")}</p>
                <p className="text-xs text-neutral-400">{t("notify.status.disabled")}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-neutral-950/60">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">{t("upcoming.title")}</CardTitle>
              <CardDescription className="text-sm text-neutral-300">
                {t("upcoming.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sortedFilms.map((film) => (
                <div
                  key={film.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-white/30 hover:bg-white/10"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-white">{film.title}</h3>
                    <Badge className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                      {film.releaseWindow}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-neutral-300">{film.synopsis}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-200">
                    {film.genres.map((genre) => (
                      <span key={`${film.title}-${genre}`} className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
                        {genre}
                      </span>
                    ))}
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-emerald-200">
                      {t("upcoming.rating", { rating: film.rating })}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-neutral-950/60">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">{t("pillars.title")}</CardTitle>
              <CardDescription className="text-sm text-neutral-300">
                {t("pillars.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {editorialThemes.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-semibold text-white">{item.label}</p>
                  <p className="mt-1 text-sm text-neutral-300">{item.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-neutral-950/60">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">{t("loop.title")}</CardTitle>
              <CardDescription className="text-sm text-neutral-300">
                {t("loop.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild variant="outline" className="rounded-full border-white/20 text-sm text-neutral-100 hover:border-white/40 hover:bg-white/10">
                <Link href={`/${locale}/collections`}>{t("loop.actions.collections")}</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-white/20 text-sm text-neutral-100 hover:border-white/40 hover:bg-white/10">
                <Link href={`/${locale}/insights`}>{t("loop.actions.insights")}</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-white/20 text-sm text-neutral-100 hover:border-white/40 hover:bg-white/10">
                <Link href={`/${locale}/community/forums`}>{t("loop.actions.forums")}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </AppShell>
  );
}
