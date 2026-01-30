import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AppShell } from "@/components/layouts/app-shell";
import { SideBar } from "@/components/layouts/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ComingSoonHero, type ComingSoonFeature, type ComingSoonInfoCard } from "@/components/templates/coming-soon-hero";

export default async function AlternativesPage() {
  const t = await getTranslations("pages.communityAlternatives");

  const HERO_FEATURES: ComingSoonFeature[] = [
    {
      title: "Curated analyses",
      items: [
        "Benchmarks for performance, memory, and footprint",
        "Migration playbooks between popular suites",
        "Side-by-side comparisons with platform coverage",
      ],
    },
    {
      title: "Data signals",
      items: [
        "Uptime and security advisories feed",
        "Release notes and change alerts",
        "AI-assisted recommendation summaries",
      ],
    },
  ];

  const INFO_CARDS: ComingSoonInfoCard[] = [
    {
      title: "Request pipeline",
      description: "Community members will be able to suggest alternatives with evidence-backed notes and change logs.",
      badge: "Planned",
    },
    {
      title: "Export formats",
      description: "CSV and JSON exports for IT teams rolling out internal catalogues.",
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
          features={HERO_FEATURES}
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
          infoCards={INFO_CARDS}
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
