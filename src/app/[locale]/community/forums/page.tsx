import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { AppShell } from "@/components/layouts/app-shell";
import { SideBar } from "@/components/layouts/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ComingSoonHero, type ComingSoonFeature, type ComingSoonInfoCard } from "@/components/templates/coming-soon-hero";

export default async function ForumsPage() {
  const locale = await getLocale();
  const t = await getTranslations("pages.communityForums");

  const heroFeatures: ComingSoonFeature[] = [
    {
      title: t("hero.features.works.title"),
      items: [t("hero.features.works.items.0"), t("hero.features.works.items.1"), t("hero.features.works.items.2")],
    },
    {
      title: t("hero.features.perks.title"),
      items: [t("hero.features.perks.items.0"), t("hero.features.perks.items.1"), t("hero.features.perks.items.2")],
    },
  ];

  const infoCards: ComingSoonInfoCard[] = [
    {
      title: t("infoCards.moderators.title"),
      description: t("infoCards.moderators.description"),
      badge: t("infoCards.moderators.badge"),
    },
    {
      title: t("infoCards.feedback.title"),
      description: t("infoCards.feedback.description"),
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
          overlayClassName="bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.28),transparent_65%),radial-gradient(circle_at_bottom_right,rgba(236,72,153,0.24),transparent_60%)]"
          features={heroFeatures}
          actions={[
            {
              label: t("hero.actions.primary"),
              href: `/${locale}/trends`,
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
              <p className="text-sm font-semibold text-white">{t("checklist.items.templates.title")}</p>
              <p className="mt-1 text-sm text-neutral-300">{t("checklist.items.templates.description")}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">{t("checklist.items.moderation.title")}</p>
              <p className="mt-1 text-sm text-neutral-300">{t("checklist.items.moderation.description")}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">{t("checklist.items.localization.title")}</p>
              <p className="mt-1 text-sm text-neutral-300">{t("checklist.items.localization.description")}</p>
            </div>
            <Button asChild variant="outline" className="rounded-full border-white/20 px-6 text-sm text-neutral-100 hover:border-white/40 hover:bg-white/10">
              <Link href={`/${locale}/collections`}>{t("checklist.cta")}</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
