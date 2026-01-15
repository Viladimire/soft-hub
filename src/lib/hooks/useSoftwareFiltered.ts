'use client';

import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

import { mockSoftwares } from "@/lib/data/software";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { fetchFilteredSoftware, type FilteredSoftwareOptions, type SoftwareListResponse } from "@/lib/services/softwareService";

import { useSupabase } from "@/lib/hooks/useSupabase";
import { useFilters } from "@/lib/hooks/useFilters";

type SoftwareQueryPage = SoftwareListResponse & { usedFallback: boolean };

const sanitizeFilters = (snapshot: ReturnType<typeof useFilters>["snapshot"]): Omit<FilteredSoftwareOptions, "page"> => {
  const platforms = [...snapshot.selectedPlatforms].sort();
  const types = [...snapshot.selectedTypes].sort();

  return {
    query: snapshot.searchQuery || undefined,
    category: snapshot.selectedCategory || undefined,
    platforms: platforms.length ? platforms : undefined,
    types: types.length ? types : undefined,
    sortBy: snapshot.sortBy,
    perPage: 24,
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
  const supabase = useSupabase();
  const filtersState = useFilters();
  const filters = useMemo(() => sanitizeFilters(filtersState.snapshot), [filtersState.snapshot]);

  const queryKey = useMemo(() => buildQueryKey({ ...filters, page: 1 }), [filters]);

  const query = useInfiniteQuery<SoftwareQueryPage, Error>({
    queryKey,
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    queryFn: async ({ pageParam }) => {
      const page = typeof pageParam === "number" && pageParam > 0 ? pageParam : 1;
      const perPage = filters.perPage ?? 24;

      if (!isSupabaseConfigured()) {
        const start = (page - 1) * perPage;
        const slice = mockSoftwares.slice(start, start + perPage);
        const total = mockSoftwares.length;

        return {
          items: slice,
          total,
          page,
          perPage,
          hasMore: start + perPage < total,
          usedFallback: true,
        } satisfies SoftwareQueryPage;
      }

      if (!supabase) {
        throw new Error("Supabase client is not available in the browser context.");
      }

      const response = await fetchFilteredSoftware({ ...filters, page }, supabase);

      return {
        ...response,
        usedFallback: false,
      } satisfies SoftwareQueryPage;
    },
  });

  const pages = query.data?.pages ?? [];
  const combinedItems = pages.flatMap((page) => page.items);
  const total = pages.at(0)?.total ?? 0;
  const usedFallback = pages.some((page) => page.usedFallback);

  return {
    ...query,
    items: combinedItems,
    total,
    usedFallback,
    filters,
    filtersState,
  } as const;
};
