'use client';

import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

import type { FilteredSoftwareOptions, SoftwareListResponse } from "@/lib/services/softwareService";

import { useFilters } from "@/lib/hooks/useFilters";

type SoftwareQueryPage = SoftwareListResponse & {
  source: "api";
};

const sanitizeFilters = (snapshot: ReturnType<typeof useFilters>["snapshot"]): Omit<FilteredSoftwareOptions, "page"> => {
  const platforms = [...snapshot.selectedPlatforms].sort();

  return {
    query: snapshot.searchQuery || undefined,
    category: snapshot.selectedCategory || undefined,
    platforms: platforms.length ? platforms : undefined,
    types: undefined,
    sortBy: snapshot.sortBy,
    perPage: 20,
  };
};

const buildQueryKey = (filters: FilteredSoftwareOptions) => [
  "software",
  filters.query ?? "",
  filters.category ?? "",
  filters.platforms?.join(",") ?? "",
  filters.types?.join(",") ?? "",
  filters.sortBy ?? "latest",
  filters.perPage ?? 24,
];

export const useSoftwareFiltered = () => {
  const filtersState = useFilters();
  const filters = useMemo(() => sanitizeFilters(filtersState.snapshot), [filtersState.snapshot]);

  const queryKey = useMemo(() => buildQueryKey({ ...filters, page: 1 }), [filters]);

  const query = useInfiniteQuery<SoftwareQueryPage, Error>({
    queryKey,
    initialPageParam: 1,
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    queryFn: async ({ pageParam }) => {
      const page = typeof pageParam === "number" && pageParam > 0 ? pageParam : 1;
      const perPage = filters.perPage ?? 20;

      const url = new URL("/api/software", window.location.origin);
      if (filters.query) url.searchParams.set("query", filters.query);
      if (filters.category) url.searchParams.set("category", filters.category);
      if (filters.platforms?.length) url.searchParams.set("platforms", filters.platforms.join(","));
      if (filters.types?.length) url.searchParams.set("types", filters.types.join(","));
      if (filters.sortBy) url.searchParams.set("sort", filters.sortBy);
      url.searchParams.set("page", String(page));
      url.searchParams.set("perPage", String(perPage));

      const response = await fetch(url.toString(), { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Software request failed (${response.status})`);
      }

      const payload = (await response.json()) as SoftwareListResponse;
      return {
        ...payload,
        source: "api",
      } satisfies SoftwareQueryPage;
    },
  });

  const pages = useMemo(() => query.data?.pages ?? [], [query.data?.pages]);
  const combinedItems = pages.flatMap((page) => page.items);
  const total = pages.at(0)?.total ?? 0;
  return {
    ...query,
    items: combinedItems,
    total,
    filters,
    filtersState,
  } as const;
};
