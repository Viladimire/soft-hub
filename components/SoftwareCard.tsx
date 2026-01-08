import Link from "next/link";

import type { Category, Software, Vendor } from "@/lib/schemas";

interface SoftwareCardProps {
  software: Software;
  categories: Map<string, Category>;
  vendor?: Vendor;
}

export function SoftwareCard({ software, categories, vendor }: SoftwareCardProps) {
  const categoryNames = software.category_ids
    .map((id) => categories.get(id)?.name)
    .filter((name): name is string => Boolean(name));

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          <span>{categoryNames.join(" · ") || "Uncategorized"}</span>
          <span>{software.platforms.join(" · ") || "Multi-platform"}</span>
        </div>
        <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          <Link href={`/software/${software.slug}`}>{software.name}</Link>
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">{software.short_description}</p>
      </header>

      <dl className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-500 dark:text-zinc-400">
        {vendor && (
          <div>
            <dt className="font-semibold uppercase tracking-wide">Vendor</dt>
            <dd className="text-zinc-700 dark:text-zinc-200">{vendor.name}</dd>
          </div>
        )}
        {software.pricing?.model && (
          <div>
            <dt className="font-semibold uppercase tracking-wide">Pricing</dt>
            <dd className="text-zinc-700 dark:text-zinc-200">
              {software.pricing.model}
              {software.pricing.startingPrice ? ` · ${software.pricing.startingPrice}` : ""}
            </dd>
          </div>
        )}
      </dl>

      <footer className="mt-auto flex flex-wrap gap-3 text-sm">
        <Link
          href={software.official_url}
          className="rounded-full border border-zinc-300 px-4 py-2 font-medium text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-white dark:hover:text-white"
        >
          Official site
        </Link>
        <Link
          href={software.download_url}
          className="rounded-full bg-zinc-900 px-4 py-2 font-medium text-white transition hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Download
        </Link>
      </footer>
    </article>
  );
}

