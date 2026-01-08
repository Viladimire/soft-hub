import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";

import { SoftwareCard } from "@/components/SoftwareCard";
import {
  firstNonEmpty,
  getCategoryMap,
  getSettings,
  getSoftwareBySlug,
  getSoftwareSlugs,
  getVendorMap,
  resolveCategoryNames,
} from "@/lib/data";
import type { Software } from "@/lib/schemas";

export const fetchCache = "force-cache";
export const dynamicParams = false;

async function RelatedSoftware({ software }: { software: Software }) {
  if (!software.related?.length) {
    return null;
  }

  const categoryMap = await getCategoryMap();
  const vendorMap = await getVendorMap();

  const relatedEntries = await Promise.all(
    software.related.map(async (slug) => ({ slug, entry: await getSoftwareBySlug(slug) })),
  );

  const validEntries = relatedEntries.filter((entry) => entry.entry !== null) as Array<{
    slug: string;
    entry: Software;
  }>;

  if (!validEntries.length) {
    return null;
  }

  return (
    <aside className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">برامج ذات صلة</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {validEntries.map(({ slug, entry }) => (
          <SoftwareCard
            key={slug}
            software={entry}
            categories={categoryMap}
            vendor={vendorMap.get(entry.vendor_id) ?? undefined}
          />
        ))}
      </div>
    </aside>
  );
}

export async function generateStaticParams() {
  const slugs = await getSoftwareSlugs();
  return slugs.map((slug) => ({ slug }));
}

interface SoftwarePageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: SoftwarePageProps): Promise<Metadata> {
  const { slug } = params;
  const [software, settings] = await Promise.all([getSoftwareBySlug(slug), getSettings()]);

  if (!software) {
    return {};
  }

  const title = firstNonEmpty(software.meta?.title, `${software.name} | ${settings.siteName}`) ?? software.name;
  const description = firstNonEmpty(software.meta?.description, software.short_description, software.description);
  const canonical = software.meta?.canonical;

  return {
    title,
    description: description ?? undefined,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title,
      description: description ?? undefined,
      url: canonical,
      siteName: settings.siteName,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: description ?? undefined,
    },
  } satisfies Metadata;
}

export default async function SoftwarePage({ params }: SoftwarePageProps) {
  const { slug } = params;
  const software = await getSoftwareBySlug(slug);

  if (!software) {
    notFound();
  }

  const [categoryMap, vendorMap, settings] = await Promise.all([
    getCategoryMap(),
    getVendorMap(),
    getSettings(),
  ]);

  const vendor = vendorMap.get(software.vendor_id);
  const categoryNames = resolveCategoryNames(software.category_ids, categoryMap);

  return (
    <div className="space-y-10">
      <header className="space-y-4 rounded-3xl bg-white p-8 shadow-lg dark:bg-zinc-900">
        <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400">
          {categoryNames.length ? categoryNames.map((name) => <span key={name}>{name}</span>) : <span>Uncategorized</span>}
          {software.trial && <span className="rounded-full bg-zinc-900 px-3 py-1 text-white dark:bg-white dark:text-zinc-900">Free trial</span>}
        </div>
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100 md:text-4xl">
          {software.name}
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-300">{software.short_description}</p>
        <div className="flex flex-wrap gap-4 text-sm text-zinc-500 dark:text-zinc-400">
          {vendor && (
            <span>
              <strong className="text-zinc-700 dark:text-zinc-200">Vendor:</strong> {vendor.name}
            </span>
          )}
          {software.platforms.length > 0 && (
            <span>
              <strong className="text-zinc-700 dark:text-zinc-200">Platforms:</strong> {software.platforms.join(" · ")}
            </span>
          )}
          {software.pricing && (
            <span>
              <strong className="text-zinc-700 dark:text-zinc-200">Pricing:</strong> {software.pricing.model}
              {software.pricing.startingPrice ? ` · ${software.pricing.startingPrice}` : ""}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href={software.official_url}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-white dark:hover:text-white"
          >
            الموقع الرسمي
          </a>
          <a
            href={software.download_url}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            تنزيل البرنامج
          </a>
        </div>
      </header>

      <section className="grid gap-10 lg:grid-cols-3">
        <article className="prose prose-zinc max-w-none rounded-3xl bg-white p-8 shadow-lg dark:prose-invert dark:bg-zinc-900 lg:col-span-2">
          <h2>نبذة تفصيلية</h2>
          <p>{software.description}</p>

          {software.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {software.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-zinc-300 px-3 py-1 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:text-zinc-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </article>

        <aside className="space-y-6 rounded-3xl bg-white p-8 shadow-lg dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">معلومات إضافية</h2>
          <dl className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
            <div>
              <dt className="font-semibold text-zinc-700 dark:text-zinc-200">آخر تحديث</dt>
              <dd>{new Date(software.updated_at).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="font-semibold text-zinc-700 dark:text-zinc-200">الحالة</dt>
              <dd>{software.status}</dd>
            </div>
            <div>
              <dt className="font-semibold text-zinc-700 dark:text-zinc-200">النشر</dt>
              <dd>{software.visibility}</dd>
            </div>
          </dl>
        </aside>
      </section>

      <Suspense>
        <RelatedSoftware software={software} />
      </Suspense>

      {software.schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(software.schema) }}
          suppressHydrationWarning
        />
      )}
    </div>
  );
}
