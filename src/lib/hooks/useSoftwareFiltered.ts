'use client';

import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { fetchFilteredSoftware, type FilteredSoftwareOptions, type SoftwareListResponse } from "@/lib/services/softwareService";
import { queryStaticSoftware } from "@/lib/services/staticSoftwareRepository";

import { useSupabase } from "@/lib/hooks/useSupabase";
import { useFilters } from "@/lib/hooks/useFilters";

type SoftwareQueryPage = SoftwareListResponse & {
  usedFallback: boolean;
  source: "supabase" | "fallback";
  originError?: string;
};

const sanitizeFilters = (snapshot: ReturnType<typeof useFilters>["snapshot"]): Omit<FilteredSoftwareOptions, "page"> => {
  const platforms = [...snapshot.selectedPlatforms].sort();

  return {
    query: snapshot.searchQuery || undefined,
    category: snapshot.selectedCategory || undefined,
    platforms: platforms.length ? platforms : undefined,
    types: undefined,
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
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    queryFn: async ({ pageParam }) => {
      const page = typeof pageParam === "number" && pageParam > 0 ? pageParam : 1;
      const perPage = filters.perPage ?? 24;

      if (!isSupabaseConfigured()) {
        const response = await queryStaticSoftware({ ...filters, page, perPage });

        return {
          ...response,
          usedFallback: true,
          source: "fallback",
        } satisfies SoftwareQueryPage;
      }

      if (!supabase) {
        const response = await queryStaticSoftware({ ...filters, page, perPage });

        return {
          ...response,
          usedFallback: true,
          source: "fallback",
          originError: "Supabase client not ready. Using fallback dataset.",
        } satisfies SoftwareQueryPage;
      }

      try {
        const response = await fetchFilteredSoftware({ ...filters, page }, supabase);

        return {
          ...response,
          usedFallback: false,
          source: "supabase",
        } satisfies SoftwareQueryPage;
      } catch (error) {
        throw error instanceof Error ? error : new Error(String(error));
      }
    },
  });

  const pages = useMemo(() => query.data?.pages ?? [], [query.data?.pages]);
  const combinedItems = pages.flatMap((page) => page.items);
  const total = pages.at(0)?.total ?? 0;
  const usedFallback = pages.some((page) => page.usedFallback);
  const lastError = useMemo(() => {
    for (let index = pages.length - 1; index >= 0; index -= 1) {
      const message = pages[index]?.originError;
      if (message) {
        return message;
      }
    }
    return undefined;
  }, [pages]);

  return {
    ...query,
    items: combinedItems,
    total,
    usedFallback,
    filters,
    filtersState,
    lastError,
  } as const;
};
