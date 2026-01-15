'use client';

import { useCallback, useMemo, useTransition } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { rtlLocales } from "@/i18n/locales";

export type FilterSortOption = "latest" | "popular" | "name";

export type FiltersSnapshot = {
  searchQuery: string;
  selectedCategory: string | null;
  selectedPlatforms: string[];
  selectedTypes: string[];
  sortBy: FilterSortOption;
};

const DEFAULT_SORT: FilterSortOption = "latest";

const parseCommaSeparated = (value: string | null) => {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item, index, array) => item.length > 0 && array.indexOf(item) === index);
};

const serializeCommaSeparated = (values: string[]) => values.join(",");

const parseSort = (value: string | null): FilterSortOption => {
  if (value === "popular" || value === "name" || value === "latest") {
    return value;
  }

  return DEFAULT_SORT;
};

const computeSnapshotFromParams = (params: URLSearchParams): FiltersSnapshot => {
  const searchQuery = params.get("query")?.trim() ?? "";
  const selectedCategory = params.get("category")?.trim() || null;
  const selectedPlatforms = parseCommaSeparated(params.get("platforms"));
  const selectedTypes = parseCommaSeparated(params.get("types"));
  const sortBy = parseSort(params.get("sort"));

  return {
    searchQuery,
    selectedCategory,
    selectedPlatforms,
    selectedTypes,
    sortBy,
  };
};

export const useFilters = () => {
  const locale = useLocale();
  const isRTL = rtlLocales.has(locale);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, startTransition] = useTransition();

  const snapshot = useMemo(() => {
    const currentParams = new URLSearchParams(searchParams.toString());
    return computeSnapshotFromParams(currentParams);
  }, [searchParams]);

  const activeFilters = useMemo(() => {
    const queryCount = snapshot.searchQuery ? 1 : 0;
    const categoryCount = snapshot.selectedCategory ? 1 : 0;

    return (
      queryCount +
      categoryCount +
      snapshot.selectedPlatforms.length +
      snapshot.selectedTypes.length +
      (snapshot.sortBy !== DEFAULT_SORT ? 1 : 0)
    );
  }, [snapshot]);

  const updateParams = useCallback(
    (mutator: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutator(params);

      const query = params.toString();
      const destination = query ? `${pathname}?${query}` : pathname;

      startTransition(() => {
        router.replace(destination, { scroll: false });
      });
    },
    [pathname, router, searchParams, startTransition],
  );

  const setCategory = useCallback(
    (category: string | null) => {
      updateParams((params) => {
        if (!category) {
          params.delete("category");
        } else {
          params.set("category", category);
        }
      });
    },
    [updateParams],
  );

  const togglePlatform = useCallback(
    (platform: string) => {
      updateParams((params) => {
        const current = parseCommaSeparated(params.get("platforms"));
        const exists = current.includes(platform);
        const next = exists ? current.filter((item) => item !== platform) : [...current, platform];

        if (next.length === 0) {
          params.delete("platforms");
        } else {
          params.set("platforms", serializeCommaSeparated(next));
        }
      });
    },
    [updateParams],
  );

  const toggleType = useCallback(
    (type: string) => {
      updateParams((params) => {
        const current = parseCommaSeparated(params.get("types"));
        const exists = current.includes(type);
        const next = exists ? current.filter((item) => item !== type) : [...current, type];

        if (next.length === 0) {
          params.delete("types");
        } else {
          params.set("types", serializeCommaSeparated(next));
        }
      });
    },
    [updateParams],
  );

  const setSearch = useCallback(
    (query: string) => {
      updateParams((params) => {
        const trimmed = query.trim();

        if (!trimmed.length) {
          params.delete("query");
          return;
        }

        params.set("query", trimmed);
      });
    },
    [updateParams],
  );

  const setSortBy = useCallback(
    (sort: FilterSortOption) => {
      updateParams((params) => {
        if (sort === DEFAULT_SORT) {
          params.delete("sort");
          return;
        }

        params.set("sort", sort);
      });
    },
    [updateParams],
  );

  const resetFilters = useCallback(() => {
    updateParams((params) => {
      params.delete("query");
      params.delete("category");
      params.delete("platforms");
      params.delete("types");
      params.delete("sort");
    });
  }, [updateParams]);

  return {
    snapshot,
    setCategory,
    togglePlatform,
    toggleType,
    setSearch,
    setSortBy,
    resetFilters,
    activeFilters,
    hasActiveFilters: activeFilters > 0,
    isRTL,
    direction: isRTL ? "rtl" : "ltr",
    isNavigating,
  } as const;
};
