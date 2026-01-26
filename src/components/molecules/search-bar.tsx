'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

import { useDebounce } from "@/lib/hooks/useDebounce";
import { useFilters } from "@/lib/hooks/useFilters";
import { useSearch } from "@/lib/hooks/useSearch";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const PLACEHOLDER_ROTATION_INTERVAL = 4200;

const useRotatingPlaceholder = (placeholders: string[]) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!placeholders.length) return;

    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % placeholders.length);
    }, PLACEHOLDER_ROTATION_INTERVAL);

    return () => window.clearInterval(timer);
  }, [placeholders.length]);

  return placeholders[index] ?? "";
};

export const SearchBar = () => {
  const { snapshot, setSearch, isNavigating } = useFilters();
  const { query, results, isLoading, error, hasQuery } = useSearch();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("filters");
  const searchT = useTranslations("search");

  const searchQuery = snapshot.searchQuery;
  const searchChips = useMemo(() => Object.values(t.raw("search.chips") as Record<string, string>), [t]);
  const placeholders = useMemo(
    () => [t("search.placeholder"), ...searchChips],
    [searchChips, t],
  );

  const [inputValue, setInputValue] = useState(searchQuery);
  const debouncedValue = useDebounce(inputValue, 350);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedValue.trim() === searchQuery.trim()) return;
    setSearch(debouncedValue);
  }, [debouncedValue, searchQuery, setSearch]);

  const rotatingPlaceholder = useRotatingPlaceholder(placeholders);
  const showClear = Boolean(inputValue.length);
  const showDropdown = isFocused && hasQuery;
  const topResults = results?.items.slice(0, 5) ?? [];

  const handleClear = useCallback(() => {
    setInputValue("");
    setSearch("");
    inputRef.current?.focus();
  }, [setSearch]);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = inputValue.trim();
      if (!trimmed) return;
      setSearch(trimmed);
      setIsFocused(false);
      router.push(`/${locale}/search?query=${encodeURIComponent(trimmed)}`);
    },
    [inputValue, locale, router, setSearch],
  );

  return (
    <div className="relative" onFocus={() => setIsFocused(true)} onBlur={() => setTimeout(() => setIsFocused(false), 120)}>
      <form onSubmit={handleSubmit} className="relative flex w-full items-center gap-3 rounded-3xl border border-white/10 bg-white/10 px-5 py-3 backdrop-blur-2xl">
        <Search className="h-4 w-4 text-neutral-300" />
        <Input
          ref={inputRef}
          type="search"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder={rotatingPlaceholder}
          className="flex-1 bg-transparent text-sm text-white"
          disabled={isNavigating}
        />
        {isNavigating ? <LoadingSpinner size="sm" className="text-primary-200" /> : null}
        {showClear ? (
          <button
            type="button"
            onClick={handleClear}
            className="rounded-full p-1 text-neutral-400 transition hover:text-white"
            aria-label={t("search.clear")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </form>

      {showDropdown && (
        <div className="absolute left-0 right-0 z-20 mt-3 w-full overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/95 shadow-2xl backdrop-blur-xl">
          <div className="max-h-80 overflow-y-auto p-4 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="sm" />
              </div>
            ) : error ? (
              <p className="text-sm text-rose-200">{error}</p>
            ) : topResults.length ? (
              <ul className="space-y-2">
                {topResults.map((software) => (
                  <li key={software.id}>
                    <button
                      type="button"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-neutral-100 transition hover:border-white/20 hover:bg-white/10"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setIsFocused(false);
                        router.push(`/${locale}/software/${software.slug}`);
                      }}
                    >
                      <p className="font-semibold text-white line-clamp-1">{software.name}</p>
                      <p className="text-xs text-neutral-300 line-clamp-1">{software.summary}</p>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-300">{searchT("noResults")}</p>
            )}
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-neutral-200"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  const trimmed = (inputValue || query).trim();
                  if (!trimmed) return;
                  setIsFocused(false);
                  router.push(`/${locale}/search?query=${encodeURIComponent(trimmed)}`);
                }}
              >
                {searchT("viewAllResults")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
