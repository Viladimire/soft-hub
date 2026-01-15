'use client';

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils/cn";

import { useDebounce } from "@/lib/hooks/useDebounce";
import { useFilters } from "@/lib/hooks/useFilters";

import { Input } from "@/components/ui/input";

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
  const t = useTranslations("filters");

  const searchQuery = snapshot.searchQuery;
  const searchChips = useMemo(() => Object.values(t.raw("search.chips") as Record<string, string>), [t]);
  const placeholders = useMemo(
    () => [t("search.placeholder"), ...searchChips],
    [searchChips, t],
  );

  const [inputValue, setInputValue] = useState(searchQuery);
  const debouncedValue = useDebounce(inputValue, 500);

  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedValue === searchQuery) return;
    setSearch(debouncedValue);
  }, [debouncedValue, searchQuery, setSearch]);

  const rotatingPlaceholder = useRotatingPlaceholder(placeholders);

  const showClear = Boolean(inputValue.length);

  const handleClear = () => {
    setInputValue("");
    setSearch("");
  };

  return (
    <div
      className={cn(
        "relative flex w-full items-center gap-3 rounded-3xl border border-white/10 bg-white/10 px-5 py-3 backdrop-blur-2xl",
        isNavigating ? "opacity-70" : "opacity-100",
      )}
    >
      <Search className="h-4 w-4 text-neutral-300" />
      <Input
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        placeholder={rotatingPlaceholder}
        className="flex-1 bg-transparent text-sm text-white"
        disabled={isNavigating}
      />
      {isNavigating ? <Loader2 className="h-4 w-4 animate-spin text-primary-200" /> : null}
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
    </div>
  );
};
