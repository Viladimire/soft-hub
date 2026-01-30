import { CategoryPage } from "@/components/templates/category-page";

import { Suspense } from "react";

const LibraryPageFallback = () => {
  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-12">
      <div className="space-y-10">
        <div className="space-y-3">
          <div className="h-9 w-72 animate-pulse rounded-2xl bg-white/10" />
          <div className="h-4 w-[28rem] animate-pulse rounded-full bg-white/10" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="hidden space-y-4 lg:block">
            <div className="h-10 w-40 animate-pulse rounded-2xl bg-white/10" />
            <div className="h-64 w-full animate-pulse rounded-3xl bg-white/10" />
          </div>

          <div className="space-y-6">
            <div className="h-14 w-full animate-pulse rounded-3xl bg-white/10" />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 9 }).map((_, index) => (
                <div key={index} className="h-64 animate-pulse rounded-3xl bg-white/10" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function SoftwareIndexPage() {
  return (
    <Suspense fallback={<LibraryPageFallback />}>
      <CategoryPage category={"software"} translationKey="software" />
    </Suspense>
  );
}
