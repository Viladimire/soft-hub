"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Apple,
  ArrowRight,
  Cpu,
  Flame,
  Film,
  Gamepad2,
  Layers,
  Lock,
  Monitor,
  MonitorSmartphone,
  Search,
  Sparkles,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { featuredCategories } from "@/lib/data/software";
import { fetchFilteredSoftware, fetchSoftwareStats } from "@/lib/services/softwareService";
import { getStaticFeaturedGames, getStaticSoftwareStats } from "@/lib/services/staticSoftwareRepository";
import { formatCompactNumber } from "@/lib/utils/format";
import { useSupabase } from "@/lib/hooks/useSupabase";
import { useCountUp } from "@/lib/hooks/useCountUp";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type CategoryAccent = {
  container: string;
  glow: string;
  iconBg: string;
  Icon: LucideIcon;
};

const CATEGORY_ACCENTS: Record<string, CategoryAccent> = {
  software: {
    container: "bg-gradient-to-br from-primary-500/18 via-blue-500/12 to-sky-500/18 border-primary-300/40",
    glow: "bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.35),transparent_62%)]",
    iconBg: "bg-gradient-to-br from-primary-500/45 via-blue-500/30 to-sky-400/30",
    Icon: Monitor,
  },
  games: {
    container: "bg-gradient-to-br from-fuchsia-500/24 via-purple-500/14 to-violet-500/20 border-fuchsia-300/45",
    glow: "bg-[radial-gradient(circle_at_top,rgba(192,38,211,0.35),transparent_62%)]",
    iconBg: "bg-gradient-to-br from-fuchsia-500/45 via-purple-500/30 to-violet-400/30",
    Icon: Gamepad2,
  },
  utilities: {
    container: "bg-gradient-to-br from-emerald-500/22 via-teal-500/14 to-lime-500/18 border-emerald-300/45",
    glow: "bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.35),transparent_62%)]",
    iconBg: "bg-gradient-to-br from-emerald-500/45 via-teal-500/30 to-lime-400/30",
    Icon: Wrench,
  },
  "operating-systems": {
    container: "bg-gradient-to-br from-amber-500/22 via-orange-500/14 to-yellow-500/18 border-amber-300/45",
    glow: "bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.32),transparent_62%)]",
    iconBg: "bg-gradient-to-br from-amber-500/45 via-orange-500/30 to-yellow-400/30",
    Icon: Cpu,
  },
  default: {
    container: "bg-white/8 border-white/15",
    glow: "bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.25),transparent_62%)]",
    iconBg: "bg-white/12",
    Icon: Sparkles,
  },
};

const textContainerVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.16,
      duration: 0.55,
      ease: "easeOut",
    },
  },
} as const;

const fadeUpVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: "easeOut" },
  },
} as const;

const buttonGroupVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut", staggerChildren: 0.08 },
  },
} as const;

type StatDefinition = {
  value: number | string;
  label: string;
  Icon: LucideIcon;
  accentClass: string;
};

type AnimatedStatProps = StatDefinition & { locale: string };

type StatsTotals = {
  totalPrograms: number;
  totalDownloads: number;
  totalPlatforms: number;
};

type FeaturedGame = {
  id: string;
  slug: string;
  title: string;
  description: string;
  platforms: string[];
  gradient: string;
};

const AnimatedStat = ({ value, label, Icon, accentClass, locale }: AnimatedStatProps) => {
  const statRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(statRef, { once: true, amount: 0.45 });
  const shouldCount = typeof value === "number";
  const currentValue = useCountUp(shouldCount ? value : 0, {
    start: 0,
    duration: 1400,
    active: inView,
  });

  const formatted = useMemo(() => {
    if (!shouldCount) return value;
    return formatCompactNumber(Math.round(currentValue), locale);
  }, [currentValue, locale, shouldCount, value]);

  return (
    <motion.div
      ref={statRef}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.65, ease: "easeOut" }}
      whileHover={{ y: -10, boxShadow: "0 26px 50px rgba(0, 102, 255, 0.22)" }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/10 p-6 backdrop-blur-xl"
    >
      <span
        className={`inline-flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-[0_0_25px_rgba(255,255,255,0.18)] ${accentClass}`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <motion.p
        key={formatted}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="mt-4 bg-gradient-to-r from-primary-200 via-primary-400 to-secondary-300 bg-clip-text text-3xl font-semibold text-transparent"
      >
        {formatted}
      </motion.p>
      <p className="mt-1 text-xs text-neutral-200/80">{label}</p>
    </motion.div>
  );
};

export const HeroSection = () => {
  const t = useTranslations("hero");
  const locale = useLocale();
  const supabase = useSupabase();
  const router = useRouter();
  const [homeSearch, setHomeSearch] = useState("");
  const [statsTotals, setStatsTotals] = useState<StatsTotals>({
    totalPrograms: 0,
    totalDownloads: 0,
    totalPlatforms: 0,
  });

  useEffect(() => {
    let active = true;
    const ZERO = { totalPrograms: 0, totalDownloads: 0, totalPlatforms: 0 };

    const applyStats = (next: StatsTotals) => {
      if (active) {
        setStatsTotals(next);
      }
    };

    const loadFallback = async () => {
      try {
        const fallbackStats = await getStaticSoftwareStats();
        applyStats({
          totalPrograms: fallbackStats.totalPrograms,
          totalDownloads: fallbackStats.totalDownloads,
          totalPlatforms: fallbackStats.totalPlatforms,
        });
      } catch {
        applyStats(ZERO);
      }
    };

    const run = async () => {
      if (!supabase) {
        await loadFallback();
        return;
      }

      try {
        const liveStats = await fetchSoftwareStats(supabase);
        if (liveStats.totalPrograms > 0) {
          applyStats({
            totalPrograms: liveStats.totalPrograms,
            totalDownloads: liveStats.totalDownloads,
            totalPlatforms: liveStats.totalPlatforms,
          });
        } else {
          await loadFallback();
        }
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to load Supabase stats, falling back to static dataset", error);
        }
        await loadFallback();
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [supabase]);

  const stats: StatDefinition[] = [
    {
      label: t("stats.programs"),
      value: statsTotals.totalPrograms,
      Icon: Sparkles,
      accentClass:
        "bg-[radial-gradient(circle_at_top,rgba(0,102,255,0.75),rgba(0,102,255,0.1))]",
    },
    {
      label: t("stats.downloads"),
      value: statsTotals.totalDownloads,
      Icon: Layers,
      accentClass:
        "bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.7),rgba(124,58,237,0.1))]",
    },
    {
      label: t("stats.platforms"),
      value: statsTotals.totalPlatforms,
      Icon: MonitorSmartphone,
      accentClass:
        "bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.7),rgba(16,185,129,0.1))]",
    },
  ];

  const sectionRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const blueParallax = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const purpleParallax = useTransform(scrollYProgress, [0, 1], [0, -160]);
  const greenParallax = useTransform(scrollYProgress, [0, 1], [0, 120]);

  const platformMessages = t.raw("platforms.items") as Record<
    string,
    { label: string; description: string }
  >;
  const gamesT = t.raw("games") as {
    title: string;
    subtitle: string;
    cta: string;
    badges: Record<string, string>;
  };

  const [featuredGames, setFeaturedGames] = useState<FeaturedGame[]>([]);

  useEffect(() => {
    let active = true;

    const gradients = [
      "from-sky-500/35 via-indigo-500/20 to-cyan-500/30",
      "from-fuchsia-500/35 via-purple-500/20 to-rose-500/25",
      "from-emerald-400/35 via-teal-400/20 to-blue-500/25",
    ];

    const toFeatured = (
      items: Array<{ id: string; slug: string; name: string; summary: string | null; description?: string | null; platforms: string[] }>,
    ) =>
      items.slice(0, 3).map((item, index) => ({
        id: item.id,
        slug: item.slug,
        title: item.name,
        description: item.summary ?? item.description ?? "",
        platforms: item.platforms,
        gradient: gradients[index % gradients.length],
      }));

    const run = async () => {
      try {
        if (supabase) {
          const response = await fetchFilteredSoftware(
            { category: "games", sortBy: "popular", page: 1, perPage: 3 },
            supabase,
          );

          if (active && response.items.length > 0) {
            setFeaturedGames(toFeatured(response.items));
            return;
          }
        }

        const fallback = await getStaticFeaturedGames(3);
        if (active) {
          setFeaturedGames(toFeatured(fallback));
        }
      } catch {
        if (active) {
          setFeaturedGames([]);
        }
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [supabase]);

  const gamePlatformMeta = useMemo(() => {
    const badgeMap = gamesT.badges;
    return {
      windows: {
        label: badgeMap.windows,
        icon: <Monitor className="h-3.5 w-3.5" />,
      },
      mac: {
        label: badgeMap.mac,
        icon: <Apple className="h-3.5 w-3.5" />,
      },
    };
  }, [gamesT.badges]);

  const readRaw = useCallback(
    <T,>(key: string, fallback: T): T => {
      try {
        return t.raw(key) as T;
      } catch {
        return fallback;
      }
    },
    [t],
  );

  const searchChips = useMemo(() => {
    const entries = readRaw<Record<string, string>>("search.chips", {});
    return Object.values(entries).filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 6);
  }, [readRaw]);

  const featuredHighlights = useMemo(() => {
    const preferredOrder = [
      "software",
      "games",
      "utilities",
      "operating-systems",
      "multimedia",
    ];

    const seen = new Set<string>();
    const prioritized = preferredOrder
      .map((categoryId) => featuredCategories.find((category) => category.id === categoryId))
      .filter((category): category is (typeof featuredCategories)[number] => Boolean(category));

    const extended = [...prioritized, ...featuredCategories];

    return extended.filter((category) => {
      if (seen.has(category.id)) return false;
      seen.add(category.id);
      return true;
    }).slice(0, 4);
  }, []);

  const submitSearch = useCallback(
    (value: string) => {
      const query = value.trim();
      const base = `/${locale}/software`;
      router.push(query ? `${base}?query=${encodeURIComponent(query)}` : base);
    },
    [locale, router],
  );

  const gamesHref = useMemo(() => `/${locale}/software?category=games`, [locale]);

  return (
    <section ref={sectionRef} className="relative overflow-hidden py-20" style={{ position: "relative" }}>
      <div className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          className="absolute inset-0"
          animate={{
            backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
            backgroundSize: ["120%", "150%", "120%"],
          }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          style={{
            backgroundImage:
              "radial-gradient(circle at top left, rgba(17,24,39,0.95), rgba(2,6,23,0.85)), " +
              "radial-gradient(120% 120% at 20% 20%, rgba(59,130,246,0.24), transparent), " +
              "radial-gradient(140% 140% at 80% 30%, rgba(45,212,191,0.18), transparent), " +
              "radial-gradient(110% 110% at 50% 80%, rgba(236,72,153,0.16), transparent)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-15 mix-blend-screen [background-image:linear-gradient(112deg,rgba(255,255,255,0.05)1px,transparent_1px),linear-gradient(-65deg,rgba(255,255,255,0.04)1px,transparent_1px)] [background-size:180px_140px]"
        />

        <motion.div style={{ y: blueParallax }} className="absolute left-[10%] top-[14%] h-64 w-64">
          <motion.div
            animate={{ x: [0, 28, -24, 0], y: [0, -24, 20, 0], rotate: [0, 8, -6, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
            className="h-full w-full rounded-full bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.5),rgba(37,99,235,0.05))] blur-3xl"
          />
        </motion.div>

        <motion.div style={{ y: purpleParallax }} className="absolute right-[12%] top-[40%] h-48 w-48">
          <motion.div
            animate={{ x: [0, -24, 26, 0], scale: [1, 1.08, 1], rotate: [0, -12, 10, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            className="h-full w-full rounded-full bg-[radial-gradient(circle_at_bottom,rgba(236,72,153,0.45),rgba(236,72,153,0.05))] blur-3xl"
          />
        </motion.div>

        <motion.div style={{ y: greenParallax }} className="absolute bottom-[16%] left-1/2 h-56 w-56 -translate-x-1/2">
          <motion.div
            animate={{ x: [0, 22, 38, 0], y: [0, 20, -16, 0], rotate: [0, 8, -6, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            className="h-full w-full rounded-full bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.5),rgba(34,197,94,0.05))] blur-3xl"
          />
        </motion.div>
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div
          variants={textContainerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center space-y-10 text-center sm:items-start sm:text-left"
        >
          <motion.div
            variants={fadeUpVariants}
            className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-2 text-sm text-neutral-100 backdrop-blur-xl"
          >
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-500/20 text-primary-100"
            >
              <Sparkles className="h-3.5 w-3.5" />
            </motion.span>
            <span>{t("badge")}</span>
          </motion.div>

          <motion.div variants={fadeUpVariants} className="space-y-6">
            <motion.h1
              className="max-w-3xl text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl"
            >
              <span className="bg-gradient-to-r from-primary-400 via-secondary-400 to-accent-400 bg-clip-text text-transparent">
                {t("title.highlight")}
              </span>
              <br />
              {t("title.trailing")}
            </motion.h1>
            <motion.p className="max-w-2xl text-base text-neutral-200/90 sm:text-lg">{t("description")}</motion.p>
          </motion.div>

          <motion.div variants={fadeUpVariants} className="w-full space-y-6">
            <div className="group relative isolate flex w-full items-center gap-3 overflow-hidden rounded-[30px] border border-white/12 bg-white/[0.08] px-8 py-6 text-base text-white shadow-[0_32px_82px_rgba(25,39,89,0.45)] backdrop-blur-2xl transition duration-300 focus-within:shadow-[0_48px_110px_rgba(79,70,229,0.6)] focus-within:ring-2 focus-within:ring-primary-300/60 sm:text-lg">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/25 via-purple-500/25 to-sky-400/25 text-indigo-100 shadow-[0_12px_32px_rgba(59,130,246,0.35)]">
                <Search className="h-5 w-5" />
              </span>
              <input
                value={homeSearch}
                onChange={(event) => setHomeSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    submitSearch(homeSearch);
                  }
                }}
                placeholder={t("search.placeholderDetailed") ?? t("search.placeholder")}
                className="h-full flex-1 rounded-none border-none bg-transparent text-base text-white/90 placeholder:text-neutral-300/80 focus:outline-none focus-visible:outline-none sm:text-lg"
                aria-label={t("search.placeholder")}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => submitSearch(homeSearch)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-indigo-400/40 bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-400 px-7 py-2.5 text-xs font-semibold uppercase tracking-wide text-white shadow-[0_20px_44px_rgba(76,29,149,0.35)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_62px_rgba(76,29,149,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-200"
              >
                {t("search.cta")}
                <ArrowRight className="h-4 w-4" />
              </button>
              <span className="pointer-events-none absolute inset-0 rounded-[30px] opacity-0 transition duration-300 group-hover:opacity-70" aria-hidden="true">
                <span className="absolute inset-0 rounded-[30px] bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.45),transparent_60%)]" />
              </span>
            </div>

            {searchChips.length ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut", delay: 0.12 }}
                className="flex flex-wrap items-center gap-2.5"
              >
                {searchChips.map((chip, index) => (
                  <motion.button
                    key={chip}
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      setHomeSearch(chip);
                      submitSearch(chip);
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/6 px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-100 transition hover:border-white/45 hover:bg-white/20"
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <Flame className="h-3.5 w-3.5 text-primary-200" />
                    {chip}
                  </motion.button>
                ))}
              </motion.div>
            ) : null}

            <motion.div
              variants={buttonGroupVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-5"
            >
              <motion.div variants={buttonGroupVariants}>
                <Button
                  variant="primary"
                  asChild
                  className="group relative w-full overflow-hidden rounded-full border border-white/15 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 px-8 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-[0_0_34px_rgba(67,56,202,0.55)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_52px_rgba(37,99,235,0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400 sm:w-auto"
                >
                  <Link href={`/${locale}/software`} className="relative flex items-center justify-center gap-3">
                    <span>{t("cta.primary")}</span>
                    <motion.span
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </motion.span>
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition duration-300 group-hover:opacity-60 group-hover:animate-glow-pulse"
                    >
                      <span className="absolute inset-0 rounded-full bg-[linear-gradient(120deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.55)_48%,rgba(255,255,255,0)_100%)] group-hover:animate-shimmer" />
                    </span>
                  </Link>
                </Button>
              </motion.div>
              <motion.div variants={buttonGroupVariants}>
                <Button
                  variant="ghost"
                  className="w-full rounded-full border border-white/20 px-8 py-3 text-sm text-neutral-100 transition-all duration-300 hover:border-white/40 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400 sm:w-auto"
                  asChild
                >
                  <Link href={`/${locale}/collections`} className="flex items-center justify-center gap-2">
                    {t("cta.secondary")}
                  </Link>
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
            className="grid gap-5 sm:grid-cols-3"
          >
            {stats.map((stat) => (
              <AnimatedStat
                key={stat.label}
                value={stat.value}
                label={stat.label}
                Icon={stat.Icon}
                accentClass={stat.accentClass}
                locale={locale}
              />
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
          className="relative space-y-6"
        >
          <div className="space-y-6">
            <Card id="films" className="scroll-mt-28 relative overflow-hidden border border-white/12 bg-neutral-950/70 p-0 backdrop-blur-2xl">
              <motion.div
                className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,102,255,0.22),transparent_62%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.18),transparent_72%)]"
                animate={{ opacity: [0.35, 0.6, 0.35] }}
                transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <CardContent className="relative flex flex-col gap-4 p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-white/85">
                    <Film className="h-3.5 w-3.5" />
                    {t("platforms.titleFilms")}
                  </div>
                  <Badge className="flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                    <Lock className="h-3.5 w-3.5" />
                    {t("platforms.comingSoon")}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-base font-semibold text-white">{t("platforms.lockedLibraryTitle")}</p>
                  <p className="text-xs leading-5 text-neutral-300 line-clamp-2">{t("platforms.lockedLibrarySubtitle")}</p>
                </div>
              </CardContent>
            </Card>

            <Card
              id="games"
              className="scroll-mt-28 relative overflow-hidden border border-white/12 bg-gradient-to-br from-[#111827]/80 via-[#141833]/75 to-[#1e1b4b]/80 p-0 backdrop-blur-2xl"
            >
              <motion.div
                className="absolute inset-x-0 -top-20 h-44 rounded-full bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.22),transparent_70%)] blur-3xl"
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 7.25, repeat: Infinity, ease: "easeInOut" }}
              />
              <CardContent className="relative space-y-5 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">{gamesT.title}</p>
                    <p className="text-xs leading-5 text-neutral-300 line-clamp-2">{gamesT.subtitle}</p>
                  </div>
                  <Button
                    variant="ghost"
                    asChild
                    className="shrink-0 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
                  >
                    <Link href={gamesHref}>{gamesT.cta}</Link>
                  </Button>
                </div>

                <div className="space-y-2">
                  {featuredGames.map((game, index) => (
                    <motion.div
                      key={game.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, ease: "easeOut", delay: 0.08 * index }}
                      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none absolute inset-0 -z-10 opacity-0 transition duration-300 group-hover:opacity-100 bg-gradient-to-r ${game.gradient}`}
                      />
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <p className="truncate text-sm font-semibold text-white">{game.title}</p>
                          <p className="text-xs text-neutral-300 line-clamp-1">{game.description}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                          {(Array.isArray(game.platforms) ? game.platforms : []).map((platform) => {
                            const meta = gamePlatformMeta[platform as keyof typeof gamePlatformMeta];
                            if (!meta) return null;
                            return (
                              <span
                                key={`${game.id}-${platform}`}
                                className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white"
                              >
                                <span className="text-neutral-200">{meta.icon}</span>
                                {meta.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border border-white/12 bg-neutral-950/75 p-0 backdrop-blur-2xl">
              <motion.div
                className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_60%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.16),transparent_65%)]"
                animate={{ opacity: [0.25, 0.48, 0.25] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              />
              <CardContent className="relative space-y-4 p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">{t("categories.title")}</p>
                    <p className="text-xs leading-5 text-neutral-300 line-clamp-2">{t("categories.subtitle")}</p>
                  </div>
                  <Badge className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                    {t("categories.badge")}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {featuredHighlights.map((category) => (
                    (() => {
                      const accent = CATEGORY_ACCENTS[category.id] ?? CATEGORY_ACCENTS.default;
                      const AccentIcon = accent.Icon;
                      return (
                      <motion.button
                        key={category.id}
                        type="button"
                        whileHover={{ y: -3 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          router.push(`/${locale}/software?category=${encodeURIComponent(category.id)}`);
                        }}
                        className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3 text-left transition duration-300 hover:-translate-y-1 hover:border-white/45 ${accent.container}`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100 ${accent.glow}`}
                        />
                        <motion.span
                          animate={{ scale: [1, 1.08, 1], rotate: [0, 3, -3, 0] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: Math.random() * 1.5 }}
                          className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-[0_12px_30px_rgba(15,23,42,0.45)] ${accent.iconBg}`}
                        >
                          <AccentIcon className="h-5 w-5" />
                        </motion.span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{category.label}</p>
                          <p className="text-xs text-neutral-300 line-clamp-1">{category.description}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-neutral-200 opacity-70 transition group-hover:translate-x-1" />
                      </motion.button>
                      );
                    })()
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border border-white/12 bg-white/8 p-0 backdrop-blur-2xl">
              <motion.div
                className="absolute inset-x-0 -top-20 h-40 rounded-full bg-gradient-to-r from-primary-500/25 via-accent-500/20 to-emerald-400/20 blur-3xl"
                animate={{ opacity: [0.2, 0.45, 0.2] }}
                transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <CardContent className="relative space-y-4 p-6">
                <header className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">{t("platforms.title")}</p>
                    <p className="text-xs leading-5 text-neutral-300 line-clamp-2">{t("platforms.subtitle")}</p>
                  </div>
                  <Badge className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/85">
                    {t("platforms.badge")}
                  </Badge>
                </header>
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(platformMessages).map(([platformKey, copy], index) => (
                    <Link
                      key={platformKey}
                      href={`/${locale}/software?platforms=${encodeURIComponent(platformKey)}`}
                      className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-left transition duration-300 hover:border-white/35 hover:bg-white/10"
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_top,rgba(14,116,144,0.28),transparent_65%)]"
                      />
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white shadow-[0_10px_30px_rgba(8,47,73,0.35)]">
                        {copy.label.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{copy.label}</p>
                        <p className="truncate text-xs text-neutral-300">{copy.description}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-neutral-200 opacity-70 transition group-hover:translate-x-1" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
