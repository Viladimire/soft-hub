"use client";

import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Apple,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Code2,
  Cpu,
  Film,
  Filter,
  Gauge,
  Monitor,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Terminal,
  Wrench,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { platformOptions } from "@/lib/data/software";
import { useFilters, type FilterSortOption } from "@/lib/hooks/useFilters";
import { cn } from "@/lib/utils/cn";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type CategoryDefinition = {
  id: string;
  value: string | null;
  icon: LucideIcon;
  label: string;
};

type PlatformDefinition = {
  id: string;
  icon: LucideIcon;
  label: string;
};

const CATEGORY_DEFINITIONS: Array<{ id: string; value: string | null; icon: LucideIcon }> = [
  { id: "all", value: null, icon: Package },
  { id: "software", value: "software", icon: Package },
  { id: "games", value: "games", icon: Gauge },
  { id: "operating-systems", value: "operating-systems", icon: Cpu },
  { id: "multimedia", value: "multimedia", icon: Film },
  { id: "utilities", value: "utilities", icon: Wrench },
  { id: "development", value: "development", icon: Code2 },
  { id: "security", value: "security", icon: ShieldCheck },
  { id: "productivity", value: "productivity", icon: BarChart3 },
  { id: "education", value: "education", icon: BookOpen },
];

const PLATFORM_ICON_MAP: Record<string, LucideIcon> = {
  windows: Monitor,
  mac: Apple,
  linux: Terminal,
};

export const FiltersPanel = () => {
  const t = useTranslations("filters");
  const {
    snapshot,
    setCategory,
    togglePlatform,
    setSearch,
    resetFilters,
    setSortBy,
    activeFilters,
    hasActiveFilters,
    direction,
  } = useFilters();

  const categories = useMemo<CategoryDefinition[]>(() => {
    return CATEGORY_DEFINITIONS.map((definition) => {
      const rawLabel = t.raw(`categoryPills.${definition.id}`);
      return {
        ...definition,
        label: typeof rawLabel === "string" ? rawLabel : definition.id,
      };
    });
  }, [t]);

  const platforms = useMemo<PlatformDefinition[]>(() => {
    return platformOptions.map((option) => {
      const rawLabel = t.raw(`platformOptions.${option.id}`);
      return {
        id: option.id,
        icon: PLATFORM_ICON_MAP[option.id] ?? Monitor,
        label: typeof rawLabel === "string" ? rawLabel : option.label,
      };
    });
  }, [t]);

  const sortOptions = useMemo(
    () => [
      { value: "latest" as FilterSortOption, label: t("sortOptions.latest") },
      { value: "popular" as FilterSortOption, label: t("sortOptions.popular") },
      { value: "name" as FilterSortOption, label: t("sortOptions.name") },
    ],
    [t]
  );

  const platformSummary = snapshot.selectedPlatforms.length
    ? snapshot.selectedPlatforms
        .map((platform) => platforms.find((item) => item.id === platform)?.label ?? platform)
        .join(" · ")
    : t("platformAll");

  return (
    <Card dir={direction} className="border border-white/10 bg-neutral-950/70 text-sm">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-neutral-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-500/20 text-primary-100">
              <Filter className="h-4 w-4" />
            </span>
            {t("title")}
          </CardTitle>
          {hasActiveFilters ? (
            <Badge className="flex items-center gap-1 rounded-full border border-primary-400/30 bg-primary-500/15 px-3 py-1 text-[11px] uppercase tracking-wide text-primary-100">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("activeSummary", { count: activeFilters })}
            </Badge>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full border border-white/10 text-neutral-300 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
          onClick={() => {
            resetFilters();
          }}
          disabled={!hasActiveFilters && !snapshot.searchQuery}
          aria-label={t("reset")}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-8">
        <section className="space-y-2">
          <label htmlFor="filters-search" className="text-xs uppercase tracking-wide text-neutral-400">
            {t("searchLabel")}
          </label>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2">
            <Search className="h-4 w-4 text-neutral-400" />
            <Input
              id="filters-search"
              type="search"
              value={snapshot.searchQuery}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="border-0 bg-transparent text-sm text-white focus-visible:ring-0"
            />
            {snapshot.searchQuery ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 rounded-full border border-white/15 text-neutral-300 hover:border-white/35 hover:bg-white/10 hover:text-white"
                onClick={() => setSearch("")}
                aria-label={t("reset")}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-neutral-400">{t("categoriesLabel")}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {categories.map((category) => {
              const isActive = category.value === snapshot.selectedCategory || (!category.value && !snapshot.selectedCategory);

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategory(category.value)}
                  aria-pressed={isActive}
                  className={cn(
                    "flex flex-col gap-2 rounded-2xl border px-4 py-4 text-left transition",
                    isActive
                      ? "border-primary-400/60 bg-primary-500/10 text-white"
                      : "border-white/10 bg-white/5 text-neutral-200 hover:border-white/25 hover:bg-white/10",
                  )}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900/60 text-white">
                    <category.icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold text-white">{category.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-neutral-400">{t("platformLabel")}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {platforms.map((platform) => {
              const isActive = snapshot.selectedPlatforms.includes(platform.id);

              return (
                <button
                  key={platform.id}
                  type="button"
                  onClick={() => togglePlatform(platform.id)}
                  aria-pressed={isActive}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition",
                    isActive
                      ? "border-primary-400/60 bg-primary-500/10 text-white"
                      : "border-white/10 bg-white/5 text-neutral-200 hover:border-white/25 hover:bg-white/10",
                  )}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900/60 text-white">
                    <platform.icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-sm font-semibold text-white">{platform.label}</span>
                  {isActive ? <CheckCircle2 className="h-4 w-4 text-primary-200" /> : <ChevronDown className="h-4 w-4 rotate-[-90deg] text-neutral-400" />}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-neutral-400">
            <span className="font-semibold text-white/80">{t("platformLabel")}:</span> {platformSummary}
          </p>
        </section>

        <section className="space-y-4">
          <header className="flex items-center justify-between text-xs uppercase tracking-wide text-neutral-400">
            <span>{t("sortLabel")}</span>
          </header>
          <div className="grid gap-3 sm:grid-cols-3">
            {sortOptions.map((option) => {
              const isActive = snapshot.sortBy === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSortBy(option.value)}
                  aria-pressed={isActive}
                  className={cn(
                    "flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition",
                    isActive
                      ? "border-primary-400/40 bg-primary-500/10 text-white"
                      : "border-white/12 bg-white/5 text-neutral-300 hover:border-white/30",
                  )}
                >
                  <span>{option.label}</span>
                  {isActive ? <CheckCircle2 className="h-4 w-4 text-primary-200" /> : <ChevronDown className="h-4 w-4 rotate-[-90deg] text-neutral-400" />}
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
              onClick={() => {
                setSearch("");
                resetFilters();
              }}
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

export default FiltersPanel;
