import Link from "next/link";

import { defaultLocale, supportedLocales } from "@/i18n/locales";

import { AppShell } from "@/components/layouts/app-shell";
import { SideBar } from "@/components/layouts/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function TrendsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale ?? defaultLocale;

  if (!supportedLocales.includes(locale as (typeof supportedLocales)[number])) {
    const { notFound } = await import("next/navigation");
    notFound();
  }

  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations({ locale, namespace: "pages.insightsTrends" });

  return (
    <AppShell sidebar={<SideBar />} className="pt-10">
      <section className="space-y-6">
        <Card className="border-white/10 bg-neutral-950/60">
          <CardHeader>
            <CardTitle className="text-base">{t("title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-neutral-300">{t("description")}</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary" className="w-fit">
                <Link href="../../software?sort=popular">{t("actions.popular")}</Link>
              </Button>
              <Button asChild variant="ghost" className="w-fit">
                <Link href="../">{t("actions.back")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
