import { notFound } from "next/navigation";

import type { Metadata } from "next";

import { defaultLocale, supportedLocales } from "@/i18n/locales";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchSoftwareBySlug } from "@/lib/services/softwareService";
import { getStaticRelatedSoftware, getStaticSoftwareBySlug, listStaticSoftwareSlugs } from "@/lib/services/staticSoftwareRepository";

import { AppShell } from "@/components/layouts/app-shell";
import { SideBar } from "@/components/layouts/sidebar";
import { AnalyticsTracker } from "@/components/software/analytics-tracker";
import { DownloadCard } from "@/components/software/download-card";
import { RelatedSoftware } from "@/components/software/related-software";
import { SoftwareDetailsTabs } from "@/components/software/software-details-tabs";
import { SoftwareGallery } from "@/components/software/software-gallery";
import { SoftwareHeader } from "@/components/software/software-header";

export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = await listStaticSoftwareSlugs();

  return supportedLocales.flatMap((locale) =>
    slugs.map((slug) => ({
      locale,
      slug,
    })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = rawLocale ?? defaultLocale;

  const software = isSupabaseConfigured()
    ? await fetchSoftwareBySlug(slug, createSupabaseServerClient()).catch(() => null)
    : await getStaticSoftwareBySlug(slug);

  if (!software) {
    return {};
  }

  return {
    title: software.name,
    description: software.summary,
    openGraph: {
      title: software.name,
      description: software.summary,
      locale,
    },
  };
}

export default async function SoftwareDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale = rawLocale ?? defaultLocale;

  if (!supportedLocales.includes(locale as (typeof supportedLocales)[number])) {
    notFound();
  }

  const software = isSupabaseConfigured()
    ? await fetchSoftwareBySlug(slug, createSupabaseServerClient()).catch(() => null)
    : await getStaticSoftwareBySlug(slug);

  if (!software) {
    notFound();
  }

  const related = await getStaticRelatedSoftware(slug, 3);

  return (
    <AppShell sidebar={<SideBar />} className="pt-12">
      <article className="space-y-10">
        <AnalyticsTracker softwareId={software.id} />
        <SoftwareHeader software={software} />

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="space-y-6">
            <SoftwareGallery software={software} />
            <SoftwareDetailsTabs software={software} />
          </div>
          <DownloadCard software={software} locale={locale} />
        </section>

        <RelatedSoftware items={related} />
      </article>
    </AppShell>
  );
}
