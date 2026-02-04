"use client";

import { useEffect, useMemo, useState } from "react";

import { useDebounce } from "@/lib/hooks/useDebounce";
import { useFilters } from "@/lib/hooks/useFilters";
import type { Software } from "@/lib/types/software";

const DEFAULT_LIMIT = 12;
const CACHE_DURATION_MS = 60_000;

type SearchCacheEntry = {
  timestamp: number;
  result: SearchResult;
};

export type SearchResult = {
  items: Software[];
  total: number;
  hasMore: boolean;
};

const cache = new Map<string, SearchCacheEntry>();

const buildCacheKey = (query: string) => query.trim().toLowerCase();

const isCacheValid = (entry: SearchCacheEntry | undefined) => {
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_DURATION_MS;
};

export const useSearch = () => {
  const filters = useFilters();

  const [results, setResults] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const rawQuery = filters.snapshot.searchQuery;
  const debouncedQuery = useDebounce(rawQuery, 500);
  const cacheKey = useMemo(() => buildCacheKey(debouncedQuery), [debouncedQuery]);

  useEffect(() => {
    let isCancelled = false;

    const run = async () => {
      const trimmed = debouncedQuery.trim();

      if (!trimmed) {
        setResults(null);
        setError(null);
        return;
      }

      const cached = cache.get(cacheKey);
      if (isCacheValid(cached)) {
        setResults(cached!.result);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/search?query=${encodeURIComponent(trimmed)}&page=1&perPage=${DEFAULT_LIMIT}`,
          { cache: "no-store" },
        );
        if (isCancelled) return;
        if (!response.ok) {
          throw new Error(`Search request failed (${response.status})`);
        }

        const payload = (await response.json()) as unknown;
        const data = payload as { items?: unknown; total?: unknown; hasMore?: unknown };
        const items = Array.isArray(data.items) ? (data.items as Software[]) : [];
        const total = typeof data.total === "number" ? data.total : items.length;
        const hasMore = Boolean(data.hasMore);

        const next: SearchResult = { items, total, hasMore };
        cache.set(cacheKey, { timestamp: Date.now(), result: next });
        setResults(next);
      } catch (searchError) {
        if (isCancelled) return;

        if (process.env.NODE_ENV !== "production") {
          console.error("Search failed", searchError);
        }

        setError(searchError instanceof Error ? searchError.message : "Failed to load search results");
        setResults(null);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void run();

    return () => {
      isCancelled = true;
    };
  }, [cacheKey, debouncedQuery]);

  const hasQuery = Boolean(debouncedQuery.trim());
  const hasResults = Boolean(results && results.items.length);

  return {
    query: debouncedQuery,
    isLoading,
    error,
    results,
    hasQuery,
    hasResults,
  } as const;
};
