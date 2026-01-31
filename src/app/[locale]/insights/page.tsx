import { getTranslations } from "next-intl/server";

import { AppShell } from "@/components/layouts/app-shell";
import { SideBar } from "@/components/layouts/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ComingSoonHero, type ComingSoonFeature } from "@/components/templates/coming-soon-hero";
import { InsightsHeroVisual } from "@/components/insights/insights-hero-visual";

export default async function InsightsPage() {
  const t = await getTranslations("pages.insights");

  const heroFeatures: ComingSoonFeature[] = [
    {
      title: t("hero.features.coming.title"),
      items: [t("hero.features.coming.items.0"), t("hero.features.coming.items.1"), t("hero.features.coming.items.2")],
    },
    {
      title: t("hero.features.community.title"),
      items: [t("hero.features.community.items.0"), t("hero.features.community.items.1"), t("hero.features.community.items.2")],
    },
  ];

  return (
    <AppShell sidebar={<SideBar />} className="pt-10">
      <section className="grid gap-6">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <ComingSoonHero
            badge={t("hero.badge")}
            title={t("hero.title")}
            description={t("hero.description")}
            gradientClassName="bg-gradient-to-br from-slate-900/70 via-neutral-950/75 to-slate-950/80"
            overlayClassName="bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.25),transparent_65%),radial-gradient(circle_at_bottom_right,rgba(236,72,153,0.22),transparent_60%)]"
            features={heroFeatures}
            actions={[
              {
                label: t("ctas.trends"),
                href: "./trends",
                variant: "secondary",
              },
              {
                label: t("ctas.primary"),
                href: "../software?sort=popular",
                variant: "outline",
              },
            ]}
          />

          <Card className="border-white/10 bg-neutral-950/65">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">{t("backlog.title")}</CardTitle>
              <CardDescription className="text-sm text-neutral-300">
                {t("backlog.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">{t("backlog.items.weeklyReport.title")}</p>
                <p className="mt-1 text-sm text-neutral-300">{t("backlog.items.weeklyReport.description")}</p>
                <p className="mt-2 text-xs uppercase tracking-wide text-emerald-200">{t("backlog.items.weeklyReport.status")}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">{t("backlog.items.regionalInsights.title")}</p>
                <p className="mt-1 text-sm text-neutral-300">{t("backlog.items.regionalInsights.description")}</p>
                <p className="mt-2 text-xs uppercase tracking-wide text-amber-200">{t("backlog.items.regionalInsights.status")}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">{t("backlog.items.searchAnalytics.title")}</p>
                <p className="mt-1 text-sm text-neutral-300">{t("backlog.items.searchAnalytics.description")}</p>
                <p className="mt-2 text-xs uppercase tracking-wide text-rose-200">{t("backlog.items.searchAnalytics.status")}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <InsightsHeroVisual />
      </section>
    </AppShell>
  );
}
