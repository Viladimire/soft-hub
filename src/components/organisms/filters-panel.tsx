"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
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
  ShieldCheck,
  Terminal,
  Wrench,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { platformOptions } from "@/lib/data/software";
import { useFilters, type FilterSortOption } from "@/lib/hooks/useFilters";
import { cn } from "@/lib/utils/cn";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

type PillAccent = {
  active: string;
  inactive: string;
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

const CATEGORY_PILL_ACCENTS: Record<string, PillAccent> = {
  all: {
    active:
      "bg-gradient-to-r from-slate-700/60 via-slate-600/40 to-slate-500/40 ring-2 ring-white/20 shadow-[0_18px_50px_rgba(15,23,42,0.45)]",
    inactive: "bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/25",
  },
  software: {
    active:
      "bg-gradient-to-r from-blue-600/70 via-indigo-500/45 to-cyan-500/45 ring-2 ring-blue-400/40 shadow-[0_18px_50px_rgba(59,130,246,0.25)]",
    inactive: "bg-white/5 hover:bg-white/10 border-white/10 hover:border-blue-400/25",
  },
  games: {
    active:
      "bg-gradient-to-r from-fuchsia-600/70 via-purple-500/45 to-violet-500/45 ring-2 ring-fuchsia-300/35 shadow-[0_18px_50px_rgba(192,38,211,0.22)]",
    inactive: "bg-white/5 hover:bg-white/10 border-white/10 hover:border-fuchsia-300/25",
  },
  utilities: {
    active:
      "bg-gradient-to-r from-emerald-600/65 via-teal-500/40 to-lime-500/40 ring-2 ring-emerald-300/35 shadow-[0_18px_50px_rgba(16,185,129,0.18)]",
    inactive: "bg-white/5 hover:bg-white/10 border-white/10 hover:border-emerald-300/25",
  },
  "operating-systems": {
    active:
      "bg-gradient-to-r from-amber-500/70 via-orange-500/45 to-yellow-500/45 ring-2 ring-amber-200/35 shadow-[0_18px_50px_rgba(245,158,11,0.2)]",
    inactive: "bg-white/5 hover:bg-white/10 border-white/10 hover:border-amber-300/25",
  },
  multimedia: {
    active:
      "bg-gradient-to-r from-sky-600/65 via-cyan-500/40 to-blue-500/40 ring-2 ring-sky-300/30 shadow-[0_18px_50px_rgba(56,189,248,0.18)]",
    inactive: "bg-white/5 hover:bg-white/10 border-white/10 hover:border-sky-300/25",
  },
  development: {
    active:
      "bg-gradient-to-r from-indigo-600/70 via-blue-500/45 to-sky-500/45 ring-2 ring-indigo-300/35 shadow-[0_18px_50px_rgba(99,102,241,0.2)]",
    inactive: "bg-white/5 hover:bg-white/10 border-white/10 hover:border-indigo-300/25",
  },
  security: {
    active:
      "bg-gradient-to-r from-rose-600/65 via-pink-500/40 to-fuchsia-500/40 ring-2 ring-rose-200/30 shadow-[0_18px_50px_rgba(244,63,94,0.18)]",
    inactive: "bg-white/5 hover:bg-white/10 border-white/10 hover:border-rose-300/25",
  },
  productivity: {
    active:
      "bg-gradient-to-r from-purple-600/65 via-indigo-500/40 to-slate-500/35 ring-2 ring-purple-200/25 shadow-[0_18px_50px_rgba(124,58,237,0.18)]",
    inactive: "bg-white/5 hover:bg-white/10 border-white/10 hover:border-purple-300/25",
  },
  education: {
    active:
      "bg-gradient-to-r from-teal-600/60 via-emerald-500/40 to-cyan-500/35 ring-2 ring-emerald-200/25 shadow-[0_18px_50px_rgba(20,184,166,0.16)]",
    inactive: "bg-white/5 hover:bg-white/10 border-white/10 hover:border-emerald-300/25",
  },
};

const PLATFORM_PILL_ACCENTS: Record<string, PillAccent> = {
  windows: {
    active:
      "bg-gradient-to-r from-indigo-600/70 via-blue-500/45 to-sky-500/45 ring-2 ring-indigo-300/35 shadow-[0_18px_50px_rgba(99,102,241,0.2)]",
    inactive: "bg-white/5 hover:bg-white/10 border-white/10 hover:border-indigo-300/25",
  },
  mac: {
    active:
      "bg-gradient-to-r from-slate-700/60 via-zinc-600/40 to-slate-500/35 ring-2 ring-white/20 shadow-[0_18px_50px_rgba(15,23,42,0.4)]",
    inactive: "bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/25",
  },
  linux: {
    active:
      "bg-gradient-to-r from-emerald-600/60 via-teal-500/40 to-cyan-500/35 ring-2 ring-emerald-200/25 shadow-[0_18px_50px_rgba(16,185,129,0.16)]",
    inactive: "bg-white/5 hover:bg-white/10 border-white/10 hover:border-emerald-300/25",
  },
};

const SORT_PILL_ACCENTS: Record<string, PillAccent> = {
  latest: {
    active:
      "bg-gradient-to-r from-indigo-600/70 via-purple-500/45 to-rose-500/40 ring-2 ring-indigo-300/30 shadow-[0_18px_50px_rgba(99,102,241,0.2)]",
    inactive: "bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/25",
  },
  popular: {
    active:
      "bg-gradient-to-r from-amber-500/70 via-orange-500/45 to-rose-500/35 ring-2 ring-amber-200/25 shadow-[0_18px_50px_rgba(245,158,11,0.18)]",
    inactive: "bg-white/5 hover:bg-white/10 border-white/10 hover:border-amber-300/25",
  },
  name: {
    active:
      "bg-gradient-to-r from-sky-600/60 via-cyan-500/40 to-emerald-500/35 ring-2 ring-sky-200/25 shadow-[0_18px_50px_rgba(56,189,248,0.16)]",
    inactive: "bg-white/5 hover:bg-white/10 border-white/10 hover:border-sky-300/25",
  },
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
        <section className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-neutral-400">{t("categoriesLabel")}</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const isActive = category.value === snapshot.selectedCategory || (!category.value && !snapshot.selectedCategory);

              const accent = CATEGORY_PILL_ACCENTS[category.id] ?? CATEGORY_PILL_ACCENTS.all;

              return (
                <motion.button
                  key={category.id}
                  type="button"
                  whileHover={{ y: -3, scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setCategory(category.value)}
                  aria-pressed={isActive}
                  className={cn(
                    "group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white transition",
                    isActive ? accent.active : accent.inactive,
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-neutral-950/40 backdrop-blur-xl transition",
                      isActive ? "bg-white/15" : "bg-neutral-950/30 group-hover:bg-white/10",
                    )}
                  >
                    <category.icon className={cn("h-4 w-4 transition", isActive ? "text-white" : "text-white/85")} />
                  </span>
                  <span className="text-[11px]">{category.label}</span>
                </motion.button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-neutral-400">{t("platformLabel")}</p>
          <div className="flex flex-wrap gap-2">
            {platforms.map((platform) => {
              const isActive = snapshot.selectedPlatforms.includes(platform.id);

              const accent = PLATFORM_PILL_ACCENTS[platform.id] ?? PLATFORM_PILL_ACCENTS.windows;

              return (
                <motion.button
                  key={platform.id}
                  type="button"
                  whileHover={{ y: -3, scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => togglePlatform(platform.id)}
                  aria-pressed={isActive}
                  className={cn(
                    "group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white transition",
                    isActive ? accent.active : accent.inactive,
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-neutral-950/40 backdrop-blur-xl transition",
                      isActive ? "bg-white/15" : "bg-neutral-950/30 group-hover:bg-white/10",
                    )}
                  >
                    <platform.icon className={cn("h-4 w-4 transition", isActive ? "text-white" : "text-white/85")} />
                  </span>
                  <span className="text-[11px]">{platform.label}</span>
                  {isActive ? (
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  ) : (
                    <ChevronDown className="h-4 w-4 rotate-[-90deg] text-white/60" />
                  )}
                </motion.button>
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
          <div className="flex flex-wrap gap-2">
            {sortOptions.map((option) => {
              const isActive = snapshot.sortBy === option.value;

              const accent = SORT_PILL_ACCENTS[option.value] ?? SORT_PILL_ACCENTS.latest;

              return (
                <motion.button
                  key={option.value}
                  type="button"
                  whileHover={{ y: -3, scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setSortBy(option.value)}
                  aria-pressed={isActive}
                  className={cn(
                    "group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white transition",
                    isActive ? accent.active : accent.inactive,
                  )}
                >
                  <span className="text-[11px]">{option.label}</span>
                  {isActive ? (
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  ) : (
                    <ChevronDown className="h-4 w-4 rotate-[-90deg] text-white/60" />
                  )}
                </motion.button>
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
