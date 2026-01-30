'use client';

import { useCallback, useMemo, useSyncExternalStore, useTransition } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";

import { rtlLocales } from "@/i18n/locales";

export type FilterSortOption = "latest" | "popular" | "name";

export type FiltersSnapshot = {
  searchQuery: string;
  selectedCategory: string | null;
  selectedPlatforms: string[];
  sortBy: FilterSortOption;
  totalFilters: number;
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

const canonicalizeSearchParamsString = (value: string) => {
  if (!value) return "";
  const params = new URLSearchParams(value);
  const entries = Array.from(params.entries()).sort(([aKey, aValue], [bKey, bValue]) => {
    if (aKey === bKey) return aValue.localeCompare(bValue);
    return aKey.localeCompare(bKey);
  });
  return new URLSearchParams(entries).toString();
};

let historyPatched = false;

const subscribeToUrlChanges = (callback: () => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  if (!historyPatched) {
    historyPatched = true;
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function patchedPushState(
      this: History,
      ...args: Parameters<History["pushState"]>
    ) {
      const result = originalPushState.apply(this, args);
      window.dispatchEvent(new Event("soft-hub:navigation"));
      return result;
    } as typeof window.history.pushState;

    window.history.replaceState = function patchedReplaceState(
      this: History,
      ...args: Parameters<History["replaceState"]>
    ) {
      const result = originalReplaceState.apply(this, args);
      window.dispatchEvent(new Event("soft-hub:navigation"));
      return result;
    } as typeof window.history.replaceState;
  }

  window.addEventListener("popstate", callback);
  window.addEventListener("soft-hub:navigation", callback);

  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener("soft-hub:navigation", callback);
  };
};

const getUrlSearchString = () => {
  if (typeof window === "undefined") return "";
  return window.location.search.startsWith("?")
    ? window.location.search.slice(1)
    : window.location.search;
};

const useUrlSearchParamsKey = () => {
  const raw = useSyncExternalStore(subscribeToUrlChanges, getUrlSearchString, () => "");
  return canonicalizeSearchParamsString(raw);
};

const parseSort = (value: string | null): FilterSortOption => {
  if (value === "popular" || value === "name" || value === "latest") {
    return value;
  }

  return DEFAULT_SORT;
};

const computeSnapshotFromParams = (params: URLSearchParams): FiltersSnapshot => {
  const searchQuery = params.get("query")?.trim() ?? "";
  const selectedCategory = params.get("category")?.trim() || null;
  const selectedPlatforms = parseCommaSeparated(params.get("platforms") ?? params.get("platform"));
  const sortBy = parseSort(params.get("sort"));

  return {
    searchQuery,
    selectedCategory,
    selectedPlatforms,
    sortBy,
    totalFilters: 0,
  };
};

export const useFilters = () => {
  const locale = useLocale();
  const isRTL = rtlLocales.has(locale);

  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, startTransition] = useTransition();

  const searchParamsKey = useUrlSearchParamsKey();

  const snapshot = useMemo(() => {
    const currentParams = new URLSearchParams(searchParamsKey);
    return computeSnapshotFromParams(currentParams);
  }, [searchParamsKey]);

  const activeFilters = useMemo(() => {
    const queryCount = snapshot.searchQuery ? 1 : 0;
    const categoryCount = snapshot.selectedCategory ? 1 : 0;

    return (
      queryCount +
      categoryCount +
      snapshot.selectedPlatforms.length +
      (snapshot.sortBy !== DEFAULT_SORT ? 1 : 0)
    );
  }, [snapshot]);

  const updateParams = useCallback(
    (mutator: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParamsKey);
      mutator(params);

      const query = canonicalizeSearchParamsString(params.toString());
      const destination = query ? `${pathname}?${query}` : pathname;

      const currentDestination = searchParamsKey ? `${pathname}?${searchParamsKey}` : pathname;
      if (destination === currentDestination) {
        return;
      }

      startTransition(() => {
        router.replace(destination, { scroll: false });
      });
    },
    [pathname, router, searchParamsKey, startTransition],
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
    () => undefined,
    [],
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
      params.delete("sort");
    });
  }, [updateParams]);

  const snapshotWithTotals = useMemo(
    () => ({
      ...snapshot,
      totalFilters: activeFilters,
    }),
    [activeFilters, snapshot],
  );

  return {
    snapshot: snapshotWithTotals,
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
