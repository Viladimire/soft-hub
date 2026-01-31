"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { useFilters } from "@/lib/hooks/useFilters";

import { AppShell } from "@/components/layouts/app-shell";
import { SideBar } from "@/components/layouts/sidebar";
import { FiltersPanel } from "@/components/organisms/filters-panel";
import { SoftwareGrid } from "@/components/organisms/software-grid";

type CategoryPageProps = {
  category: string | null;
  translationKey: string;
};

export const CategoryPage = ({ category, translationKey }: CategoryPageProps) => {
  const { snapshot, setCategory } = useFilters();
  const t = useTranslations("pages.categories");

  useEffect(() => {
    if (snapshot.selectedCategory !== category) {
      setCategory(category);
    }
  }, [category, setCategory, snapshot.selectedCategory]);

  const titleKey = `${translationKey}.title` as Parameters<typeof t>[0];
  const subtitleKey = `${translationKey}.subtitle` as Parameters<typeof t>[0];
  const title = t(titleKey);
  const subtitle = t(subtitleKey);

  return (
    <AppShell sidebar={<SideBar />} className="pt-10">
      <section className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-neutral-950 sm:text-3xl dark:text-white">{title}</h1>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">{subtitle}</p>
        </header>

        <FiltersPanel />
        <SoftwareGrid />
      </section>
    </AppShell>
  );
};
