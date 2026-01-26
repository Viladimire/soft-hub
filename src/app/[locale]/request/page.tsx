import type { Metadata } from "next";

import { defaultLocale, supportedLocales } from "@/i18n/locales";

import { AppShell } from "@/components/layouts/app-shell";
import { SideBar } from "@/components/layouts/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RequestForm } from "@/components/requests/request-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = rawLocale ?? defaultLocale;

  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations({ locale, namespace: "pages.request" });

  return {
    title: t("title"),
  } satisfies Metadata;
}

export default async function RequestPage({
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
  const t = await getTranslations({ locale, namespace: "pages.request" });

  return (
    <AppShell sidebar={<SideBar />} className="pt-10">
      <section className="space-y-6">
        <Card className="border-white/10 bg-neutral-950/60">
          <CardHeader>
            <CardTitle className="text-base">{t("title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-neutral-300">{t("description")}</p>
            <RequestForm />
            <p className="text-xs text-neutral-400">{t("hint")}</p>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
