"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { useFilters } from "@/lib/hooks/useFilters";

import { AppShell } from "@/components/layouts/app-shell";
import { SideBar } from "@/components/layouts/sidebar";
import { SearchBar } from "@/components/molecules/search-bar";
import { FiltersPanel } from "@/components/organisms/filters-panel";
import { SoftwareGrid } from "@/components/organisms/software-grid";

type CategoryPageProps = {
  category: string | null;
  translationKey: string;
};

export const CategoryPage = ({ category, translationKey }: CategoryPageProps) => {
  const { snapshot, setCategory } = useFilters();
  const t = useTranslations("pages.categories");
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    if (snapshot.selectedCategory !== category) {
      setCategory(category);
    }
  }, [category, setCategory, snapshot.selectedCategory]);

  useEffect(() => {
    const handleScroll = () => {
      setIsCompact(window.scrollY > 80);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const titleKey = `${translationKey}.title` as Parameters<typeof t>[0];
  const subtitleKey = `${translationKey}.subtitle` as Parameters<typeof t>[0];
  const title = t(titleKey);
  const subtitle = t(subtitleKey);

  return (
    <AppShell sidebar={<SideBar />} className="pt-10">
      <section className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">{title}</h1>
          <p className="text-sm text-neutral-300">{subtitle}</p>
        </header>

        <div className="sticky top-24 z-30">
          <div className="mx-auto w-full max-w-3xl px-1">
            <div
              className={
                "rounded-3xl border border-white/10 bg-neutral-950/55 backdrop-blur-2xl transition-all " +
                (isCompact ? "px-3 py-3 shadow-[0_24px_70px_rgba(8,15,35,0.6)]" : "px-4 py-4")
              }
            >
              <SearchBar />
            </div>
          </div>
        </div>

        <FiltersPanel />
        <SoftwareGrid />
      </section>
    </AppShell>
  );
};
