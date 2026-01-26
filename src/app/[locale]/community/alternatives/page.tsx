import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AppShell } from "@/components/layouts/app-shell";
import { SideBar } from "@/components/layouts/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ComingSoonHero, type ComingSoonFeature, type ComingSoonInfoCard } from "@/components/templates/coming-soon-hero";

export default async function AlternativesPage() {
  const t = await getTranslations("pages.communityAlternatives");

  const heroFeatures: ComingSoonFeature[] = [
    {
      title: t("hero.features.analysis.title"),
      items: [t("hero.features.analysis.items.0"), t("hero.features.analysis.items.1"), t("hero.features.analysis.items.2")],
    },
    {
      title: t("hero.features.signals.title"),
      items: [t("hero.features.signals.items.0"), t("hero.features.signals.items.1"), t("hero.features.signals.items.2")],
    },
  ];

  const infoCards: ComingSoonInfoCard[] = [
    {
      title: t("infoCards.requestPipeline.title"),
      description: t("infoCards.requestPipeline.description"),
      badge: t("infoCards.requestPipeline.badge"),
    },
    {
      title: t("infoCards.exports.title"),
      description: t("infoCards.exports.description"),
    },
  ];

  return (
    <AppShell sidebar={<SideBar />} className="pt-10">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <ComingSoonHero
          badge={t("hero.badge")}
          title={t("hero.title")}
          description={t("hero.description")}
          gradientClassName="bg-gradient-to-br from-slate-900/70 via-neutral-950/75 to-slate-950/80"
          overlayClassName="bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.3),transparent_65%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.24),transparent_60%)]"
          features={heroFeatures}
          actions={[
            {
              label: t("hero.actions.primary"),
              href: "../../software",
              variant: "secondary",
            },
          ]}
          secondaryActions={[
            {
              label: t("hero.actions.secondary"),
              href: "../../",
              variant: "ghost",
            },
          ]}
          infoCards={infoCards}
        />

        <Card className="border-white/10 bg-neutral-950/60">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white">{t("checklist.title")}</CardTitle>
            <CardDescription className="text-sm text-neutral-300">
              {t("checklist.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">{t("checklist.items.taxonomy.title")}</p>
              <p className="mt-1 text-sm text-neutral-300">{t("checklist.items.taxonomy.description")}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">{t("checklist.items.migration.title")}</p>
              <p className="mt-1 text-sm text-neutral-300">{t("checklist.items.migration.description")}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">{t("checklist.items.reviews.title")}</p>
              <p className="mt-1 text-sm text-neutral-300">{t("checklist.items.reviews.description")}</p>
            </div>
            <Button asChild variant="outline" className="rounded-full border-white/20 px-6 text-sm text-neutral-100 hover:border-white/40 hover:bg-white/10">
              <Link href="../../community/forums">{t("checklist.cta")}</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
