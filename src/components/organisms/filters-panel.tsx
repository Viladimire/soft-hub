"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Apple, CheckCircle2, ChevronDown, Filter, Loader2, Monitor, Package, RefreshCw, Search, Terminal, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { platformOptions } from "@/lib/data/software";
import { cn } from "@/lib/utils/cn";

import { useDebounce } from "@/lib/hooks/useDebounce";
import { useFilters } from "@/lib/hooks/useFilters";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type RawLabelEntry = string | { label?: string; description?: string };

type CategoryConfig = {
  id: string;
  value: string | null;
  label: string;
  description?: string;
  icon: LucideIcon;
  gradientClass: string;
  ringClass: string;
};

type PlatformConfig = {
  id: string;
  label: string;
  icon: LucideIcon;
  gradientClass: string;
  delay: number;
};

const platformIconMap: Record<string, LucideIcon> = {
  windows: Monitor,
  mac: Apple,
  linux: Terminal,
};

const platformGradientMap: Record<string, string> = {
  windows: "bg-gradient-to-r from-blue-500/20 via-blue-400/15 to-blue-500/10",
  mac: "bg-gradient-to-r from-neutral-100/30 via-neutral-200/10 to-slate-200/10",
  linux: "bg-gradient-to-r from-emerald-400/20 via-lime-400/15 to-emerald-400/10",
};

const resolveLabel = (entry: RawLabelEntry | undefined, fallback: string) => {
  if (typeof entry === "string") return entry;
  if (entry?.label) return entry.label;
  return fallback;
};

const resolveDescription = (entry: RawLabelEntry | undefined, fallback?: string) => {
  if (typeof entry === "object" && entry?.description) return entry.description;
  return fallback;
};

export const FiltersPanel = () => {
  const t = useTranslations("filters");
  const {
    snapshot,
    setCategory,
    togglePlatform,
    toggleType,
    setSearch,
    resetFilters,
    activeFilters,
    hasActiveFilters,
    direction,
    isNavigating,
  } = useFilters();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const pendingTimeoutRef = useRef<number | null>(null);

  const { searchQuery, selectedCategory, selectedPlatforms } = snapshot;

  const [searchInput, setSearchInput] = useState(searchQuery);
  const debouncedSearch = useDebounce(searchInput, 500);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedSearch === searchQuery) return;
    setSearch(debouncedSearch);
  }, [debouncedSearch, searchQuery, setSearch]);

  useEffect(() => {
    return () => {
      if (pendingTimeoutRef.current) {
        window.clearTimeout(pendingTimeoutRef.current);
      }
    };
  }, []);

  const readRaw = <T,>(key: string, fallback: T): T => {
    try {
      return t.raw(key) as T;
    } catch {
      return fallback;
    }
  };

  const runWithPending = (key: string, updater: () => void) => {
    if (pendingTimeoutRef.current) {
      window.clearTimeout(pendingTimeoutRef.current);
    }

    setPendingKey(key);
    updater();

    pendingTimeoutRef.current = window.setTimeout(() => {
      setPendingKey(null);
    }, 420);
  };

  const isPending = (key: string) => pendingKey === key;

  const handleReset = () => {
    runWithPending("reset", () => {
      resetFilters();
    });
  };

  const rawCategoryEntries = readRaw<Record<string, RawLabelEntry>>("categoryPills", {});
  const rawPlatformEntries = readRaw<Record<string, RawLabelEntry>>("platformOptions", {});

  const categoryPills: CategoryConfig[] = useMemo(() => {
    const config: Array<Omit<CategoryConfig, "label" | "description"> & { fallbackLabel: string; fallbackDescription?: string }> = [
      {
        id: "all",
        value: null,
        icon: Package,
        gradientClass:
          "bg-gradient-to-br from-slate-500/25 via-slate-400/15 to-slate-600/25",
        ringClass: "ring-slate-300/70",
        fallbackLabel: "All software",
        fallbackDescription: "Show everything",
      },
      {
        id: "desktop",
        value: "desktop",
        icon: Monitor,
        gradientClass:
          "bg-gradient-to-br from-blue-500/30 via-blue-400/20 to-indigo-400/25",
        ringClass: "ring-blue-300/70",
        fallbackLabel: "Desktop",
        fallbackDescription: "Perfect for Windows & macOS",
      },
    ];

    return config.map((item) => {
      const entry = rawCategoryEntries[item.id];
      return {
        id: item.id,
        value: item.value,
        label: resolveLabel(entry, item.fallbackLabel),
        description: resolveDescription(entry, item.fallbackDescription),
        icon: item.icon,
        gradientClass: item.gradientClass,
        ringClass: item.ringClass,
      } satisfies CategoryConfig;
    });
  }, [rawCategoryEntries]);

  const platformPills: PlatformConfig[] = platformOptions.map((option, index) => {
    const entry = rawPlatformEntries[option.id];
    return {
      id: option.id,
      label: resolveLabel(entry, option.label),
      icon: platformIconMap[option.id] ?? Monitor,
      gradientClass: platformGradientMap[option.id] ?? "bg-gradient-to-r from-slate-500/20 via-slate-400/15 to-slate-500/10",
      delay: index * 0.04,
    } satisfies PlatformConfig;
  });

  return (
    <Card
      dir={direction}
      className="relative overflow-hidden border border-white/10 bg-neutral-950/70 text-sm shadow-[0_10px_40px_rgba(15,23,42,0.45)]"
    >
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-neutral-50">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-500/15 text-primary-100">
              <Filter className="h-4 w-4" />
            </span>
            {t("title")}
          </CardTitle>
          {hasActiveFilters ? (
            <Badge className="flex items-center gap-1 rounded-full border border-primary-400/30 bg-primary-500/15 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-primary-100">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("activeFilters", { count: activeFilters })}
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-9 w-9 rounded-full border border-white/10 text-neutral-300 transition duration-300 hover:border-white/40 hover:bg-white/10 hover:text-white active:scale-95"
            onClick={() => setIsCollapsed((prev) => !prev)}
            aria-label={isCollapsed ? t("expand") : t("collapse")}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-300",
                isCollapsed ? "-rotate-90" : "rotate-0",
              )}
            />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className={cn(
              "group h-9 w-9 rounded-full border border-white/10 text-neutral-300 transition duration-300 hover:border-rose-400/50 hover:bg-rose-500/10 hover:text-rose-200 active:scale-95",
              isPending("reset") && "animate-pulse border-rose-400/70 bg-rose-500/10 text-rose-100",
            )}
            onClick={handleReset}
            aria-label={t("reset")}
            disabled={!hasActiveFilters}
          >
            <X className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
          </Button>
        </div>
      </CardHeader>
      <CardContent
        className={cn(
          "space-y-8 transition-all duration-300",
          isCollapsed ? "pointer-events-none -translate-y-3 opacity-0" : "opacity-100",
        )}
      >
        <section className="space-y-2">
          <header className="flex items-center justify-between text-xs uppercase text-neutral-400">
            <span>{t("searchLabel")}</span>
            {searchQuery ? (
              <button
                type="button"
                className="text-[10px] font-medium uppercase text-primary-200 transition hover:text-primary-100"
                onClick={() => setSearch("")}
              >
                {t("clear")}
              </button>
            ) : null}
          </header>
          <Input
            placeholder={t("searchPlaceholder")}
            leadingIcon={<Search className="h-4 w-4" />}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="h-14 rounded-2xl border-white/15 bg-white/10 text-base text-neutral-100 placeholder:text-neutral-400 focus-visible:border-primary-400/60 focus-visible:ring-4 focus-visible:ring-primary-400/30"
            disabled={isNavigating}
          />
        </section>

        <section className="space-y-4">
          <header className="flex items-center justify-between text-xs uppercase tracking-wide text-neutral-400">
            <span>{t("categoriesLabel")}</span>
          </header>
          <div className="grid gap-3 sm:grid-cols-3">
            {categoryPills.map((pill, index) => {
              const isActive = pill.value === selectedCategory || (!pill.value && !selectedCategory);
              const key = `category-${pill.id}`;
              const pending = isPending(key);

              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() =>
                    runWithPending(key, () => {
                      setCategory(pill.value);
                    })
                  }
                  aria-pressed={isActive}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border border-white/12 px-4 py-4 text-left transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 active:scale-95",
                    "flex flex-col gap-3",
                    isActive
                      ? cn(
                          "bg-white/8 shadow-[0_18px_45px_rgba(59,130,246,0.22)]",
                          pill.ringClass,
                          "ring-2",
                        )
                      : "hover:border-white/40 hover:bg-white/10",
                  )}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none absolute inset-0 opacity-0 transition duration-300",
                      pill.gradientClass,
                      isActive ? "opacity-80" : "group-hover:opacity-70",
                    )}
                  />
                  <div className="relative z-10 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900/60 text-white shadow-[0_12px_25px_rgba(15,23,42,0.45)]">
                      <pill.icon className="h-5 w-5" />
                    </span>
                    <div className="flex flex-1 flex-col">
                      <span className="text-sm font-semibold text-white">{pill.label}</span>
                      {pill.description ? (
                        <span className="text-xs text-neutral-300">{pill.description}</span>
                      ) : null}
                    </div>
                    <span className="relative h-5 w-5">
                      <Loader2
                        className={cn(
                          "absolute inset-0 h-5 w-5 text-primary-100 transition-opacity duration-200",
                          pending ? "opacity-100 animate-spin" : "opacity-0",
                        )}
                      />
                      <CheckCircle2
                        className={cn(
                          "absolute inset-0 h-5 w-5 text-emerald-200 transition-all duration-300",
                          isActive && !pending ? "scale-100 opacity-100" : "scale-75 opacity-0",
                        )}
                      />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <header className="flex items-center justify-between text-xs uppercase tracking-wide text-neutral-400">
            <span>{t("platformLabel")}</span>
            <span className="rounded-full bg-primary-500/10 px-3 py-1 text-[11px] font-semibold text-primary-100">
              {selectedPlatforms.length}
            </span>
          </header>
          <div className="grid gap-3 sm:grid-cols-2">
            {platformPills.map((pill) => {
              const isActive = selectedPlatforms.includes(pill.id);
              const key = `platform-${pill.id}`;
              const pending = isPending(key);

              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() =>
                    runWithPending(key, () => {
                      togglePlatform(pill.id);
                    })
                  }
                  aria-pressed={isActive}
                  className={cn(
                    "group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-white/12 px-4 py-4 text-left transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 active:scale-95",
                    isActive
                      ? "bg-white/10 shadow-[0_18px_45px_rgba(59,130,246,0.22)] ring-2 ring-primary-300/70"
                      : "hover:border-white/35 hover:bg-white/10",
                    "animate-rise",
                  )}
                  style={{ animationDelay: `${pill.delay}s` }}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none absolute inset-0 opacity-0 transition duration-300",
                      pill.gradientClass,
                      isActive ? "opacity-80" : "group-hover:opacity-60",
                    )}
                  />
                  <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900/60 text-white">
                    <pill.icon className="h-5 w-5" />
                  </span>
                  <div className="relative z-10 flex flex-1 flex-col">
                    <span className="text-sm font-semibold text-white">{pill.label}</span>
                    <span className="text-xs text-neutral-300">{t("platformHint")}</span>
                  </div>
                  <span className="relative z-10 h-5 w-5">
                    <Loader2
                      className={cn(
                        "absolute inset-0 h-5 w-5 text-primary-100 transition-opacity duration-200",
                        pending ? "opacity-100 animate-spin" : "opacity-0",
                      )}
                    />
                    <CheckCircle2
                      className={cn(
                        "absolute inset-0 h-5 w-5 text-emerald-200 transition-all duration-300",
                        isActive && !pending ? "scale-100 opacity-100" : "scale-75 opacity-0",
                      )}
                    />
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {hasActiveFilters ? (
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-neutral-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary-200" />
              <span>{t("activeSummary", { count: activeFilters })}</span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs text-neutral-100 transition hover:border-white/40 hover:bg-white/20"
              onClick={handleReset}
            >
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
              {t("reset")}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
