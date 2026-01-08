import { Suspense } from "react";

import { SoftwareCard } from "@/components/SoftwareCard";
import { getAllSoftware, getCategoryMap, getSettings, getVendorMap } from "@/lib/data";

export const fetchCache = "force-cache";

interface HomeSearchParams {
  search?: string;
  category?: string;
}

function normalize(text: string) {
  return text.toLowerCase();
}

function filterSoftware(software: Awaited<ReturnType<typeof getAllSoftware>>, query: string, category: string) {
  const normalizedQuery = query.trim().toLowerCase();
  return software.filter((item) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      normalize(item.name).includes(normalizedQuery) ||
      normalize(item.short_description).includes(normalizedQuery) ||
      item.tags.some((tag) => normalize(tag).includes(normalizedQuery));

    const matchesCategory = category === "all" || category.length === 0 || item.category_ids.includes(category);

    return matchesQuery && matchesCategory;
  });
}

function Filters({
  search,
  category,
  categories,
}: {
  search: string;
  category: string;
  categories: Array<{ id: string; name: string }>;
}) {
  return (
    <form
      method="get"
      className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60 sm:flex-row sm:items-center sm:gap-6"
      aria-label="خيارات البحث والتصفية"
    >
      <label className="flex flex-1 flex-col text-sm text-zinc-600 dark:text-zinc-300">
        <span className="mb-1 font-medium">بحث سريع</span>
        <input
          type="search"
          name="search"
          defaultValue={search}
          placeholder="ابحث عن برنامج أو نوع ترخيص أو كلمة مفتاحية..."
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-base text-zinc-900 shadow-sm transition focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />
      </label>
      <label className="flex w-full flex-col text-sm text-zinc-600 dark:text-zinc-300 sm:w-64">
        <span className="mb-1 font-medium">الفئة</span>
        <select
          name="category"
          defaultValue={category}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-base text-zinc-900 shadow-sm transition focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        >
          <option value="all">كل الفئات</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        تحديث النتائج
      </button>
    </form>
  );
}

async function SoftwareList({ search = "", category = "all" }: HomeSearchParams) {
  const [software, categoryMap, vendorMap] = await Promise.all([
    getAllSoftware(),
    getCategoryMap(),
    getVendorMap(),
  ]);

  const filtered = filterSoftware(software, search, category);
  const categories = Array.from(categoryMap.values()).map((item) => ({ id: item.id, name: item.name }));

  return (
    <div className="flex flex-col gap-6">
      <Filters search={search} category={category} categories={categories} />
      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          لا توجد نتائج مطابقة حالياً. جرّب كلمات مفتاحية أو فئة مختلفة.
        </p>
      ) : (
        <div
          id="catalog"
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3"
          aria-live="polite"
        >
          {filtered.map((item) => (
            <SoftwareCard
              key={item.slug}
              software={item}
              categories={categoryMap}
              vendor={vendorMap.get(item.vendor_id) ?? undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default async function Home({ searchParams }: { searchParams?: HomeSearchParams }) {
  const settings = await getSettings();
  const hero = settings.hero;
  const search = typeof searchParams?.search === "string" ? searchParams.search : "";
  const category = typeof searchParams?.category === "string" ? searchParams.category : "all";

  return (
    <div className="space-y-12">
      <section className="flex flex-col gap-6 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 px-8 py-12 text-white shadow-xl">
        <div className="flex flex-col gap-4">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-300">SoftHub</p>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
            {hero?.title ?? settings.siteName}
          </h1>
          <p className="max-w-3xl text-lg text-zinc-200">
            {hero?.subtitle ?? settings.tagline}
          </p>
        </div>
        {hero?.cta && (
          <a
            className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-zinc-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-zinc-100"
            href={hero.cta.href}
          >
            {hero.cta.label}
          </a>
        )}
      </section>

      <Suspense fallback={<p className="text-sm text-zinc-500">جاري تحميل البرامج...</p>}>
        <SoftwareList search={search} category={category} />
      </Suspense>
    </div>
  );
}
