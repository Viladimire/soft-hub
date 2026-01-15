"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Apple,
  ArrowRight,
  Film,
  Gamepad2,
  Layers,
  Lock,
  Monitor,
  MonitorSmartphone,
  Search,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { featuredCategories, topPlatforms } from "@/lib/data/software";
import { formatCompactNumber } from "@/lib/utils/format";
import { useCountUp } from "@/lib/hooks/useCountUp";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const textContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
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

type StatDefinition = {
  value: number;
  label: string;
  Icon: LucideIcon;
  accentClass: string;
};

type AnimatedStatProps = StatDefinition & { locale: string };

const AnimatedStat = ({ value, label, Icon, accentClass, locale }: AnimatedStatProps) => {
  const statRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(statRef, { once: true, amount: 0.45 });
  const currentValue = useCountUp(value, {
    start: 0,
    duration: 1400,
    active: inView,
  });

  const formatted = useMemo(() => formatCompactNumber(Math.round(currentValue), locale), [currentValue, locale]);

  return (
    <motion.div
      ref={statRef}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.65, ease: "easeOut" }}
      whileHover={{ y: -10, boxShadow: "0 30px 60px rgba(0, 102, 255, 0.18)" }}
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
        className="mt-4 bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-500 bg-clip-text text-3xl font-semibold text-transparent"
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

  const stats: StatDefinition[] = [
    {
      label: t("stats.programs"),
      value: 1240,
      Icon: Sparkles,
      accentClass:
        "bg-[radial-gradient(circle_at_top,rgba(0,102,255,0.75),rgba(0,102,255,0.1))]",
    },
    {
      label: t("stats.experts"),
      value: 86,
      Icon: Layers,
      accentClass:
        "bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.7),rgba(124,58,237,0.1))]",
    },
    {
      label: t("stats.platforms"),
      value: 12,
      Icon: MonitorSmartphone,
      accentClass:
        "bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.7),rgba(16,185,129,0.1))]",
    },
  ];

  const searchChips = Object.values(t.raw("search.chips") as Record<string, string>);
  const placeholderOptions = useMemo(() => [t("search.placeholder"), ...searchChips], [searchChips, t]);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholderVisible, setPlaceholderVisible] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!placeholderOptions.length) return;

    const interval = window.setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholderOptions.length);
    }, 3600);

    return () => window.clearInterval(interval);
  }, [placeholderOptions.length]);

  useEffect(() => {
    const hideRaf = window.requestAnimationFrame(() => setPlaceholderVisible(false));
    const timeout = window.setTimeout(() => setPlaceholderVisible(true), 150);

    return () => {
      window.cancelAnimationFrame(hideRaf);
      window.clearTimeout(timeout);
    };
  }, [placeholderIndex]);

  const currentPlaceholder = placeholderOptions[placeholderIndex] ?? "";

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
  const categoryLabels = t.raw("categories.labels") as Record<string, string>;
  const gamesT = t.raw("games") as {
    title: string;
    subtitle: string;
    cta: string;
    badges: Record<string, string>;
    items: Record<string, { title: string; description: string; platforms: Record<string, string> }>;
  };
  const gameMessages = gamesT.items;

  const featuredGames = useMemo(
    () =>
      [
        { key: "aurora", gradient: "from-sky-500/35 via-indigo-500/20 to-cyan-500/30" },
        { key: "skyforge", gradient: "from-fuchsia-500/35 via-purple-500/20 to-rose-500/25" },
        { key: "echo", gradient: "from-emerald-400/35 via-teal-400/20 to-blue-500/25" },
      ].map((entry) => ({
        ...entry,
        ...(gameMessages[entry.key] ?? { title: entry.key, description: "", platforms: {} }),
      })),
    [gameMessages],
  );

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

  const gamesHref = useMemo(() => `/${locale}/software?category=multimedia`, [locale]);

  return (
    <section ref={sectionRef} className="relative overflow-hidden py-20">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -inset-[30%] animate-mesh rounded-[45%] bg-[conic-gradient(from_120deg_at_50%_50%,rgba(0,102,255,0.45),rgba(124,58,237,0.35),rgba(16,185,129,0.4),rgba(0,102,255,0.45))] opacity-70 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(148,163,255,0.18),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.16),transparent_60%)]" />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-20 mix-blend-screen [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:140px_140px] [mask-image:radial-gradient(circle_at_center,white,transparent_68%)]"
        />

        <motion.div style={{ y: blueParallax }} className="absolute left-[10%] top-[16%] h-48 w-48">
          <motion.div
            animate={{ x: [0, 26, -26, 0], y: [0, -20, 16, 0], rotate: [0, 6, -4, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
            className="h-full w-full rounded-full bg-[radial-gradient(circle_at_top,rgba(0,102,255,0.55),rgba(0,102,255,0))] blur-3xl"
          />
        </motion.div>

        <motion.div style={{ y: purpleParallax }} className="absolute right-[12%] top-[26%] h-40 w-40">
          <motion.div
            animate={{ x: [0, -24, 24, 0], scale: [1, 1.08, 1], rotate: [0, -10, 10, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            className="h-full w-full rounded-full bg-[radial-gradient(circle_at_bottom,rgba(124,58,237,0.55),rgba(124,58,237,0))] blur-3xl"
          />
        </motion.div>

        <motion.div style={{ y: greenParallax }} className="absolute bottom-[18%] left-1/2 h-44 w-44 -translate-x-1/2">
          <motion.div
            animate={{ x: [0, 20, 36, 0], y: [0, 18, -14, 0], rotate: [0, 8, -6, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            className="h-full w-full rounded-full bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.5),rgba(16,185,129,0))] blur-3xl"
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
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-primary-200"
            >
              <Sparkles className="h-3.5 w-3.5" />
            </motion.span>
            <span>{t("badge")}</span>
          </motion.div>

          <motion.div variants={fadeUpVariants} className="space-y-6">
            <motion.h1
              className="max-w-3xl text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl"
            >
              <span className="bg-gradient-to-r from-[#0066FF] via-[#4F46E5] to-[#7C3AED] bg-clip-text text-transparent">
                {t("title.highlight")}
              </span>
              <br />
              {t("title.trailing")}
            </motion.h1>
            <motion.p className="max-w-2xl text-base text-neutral-200/90 sm:text-lg">{t("description")}</motion.p>
          </motion.div>

          <motion.form variants={fadeUpVariants} className="space-y-4">
            <div className="group relative isolate flex h-14 items-center gap-4 overflow-hidden rounded-3xl border border-white/20 bg-white/10 px-5 backdrop-blur-2xl transition duration-300 focus-within:border-[#0066FF]/60 focus-within:shadow-[0_0_40px_rgba(0,102,255,0.25)] focus-within:ring-4 focus-within:ring-[#0066FF]/30 sm:h-16 sm:px-6">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-[-2px] -z-10 rounded-[inherit] opacity-0 transition duration-500 group-hover:opacity-80 group-focus-within:opacity-100 animate-border-gradient bg-[conic-gradient(from_130deg_at_50%_50%,rgba(0,102,255,0.55),rgba(124,58,237,0.45),rgba(16,185,129,0.45),rgba(0,102,255,0.55))]"
              />
              <motion.span
                animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-[#80A4FF] sm:h-12 sm:w-12"
              >
                <Search className="h-5 w-5" />
              </motion.span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-full flex-1 border-none bg-transparent text-sm text-white placeholder:text-transparent focus:outline-none sm:text-base"
                aria-label={t("search.placeholder")}
              />
              <motion.span
                key={placeholderIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{
                  opacity: placeholderVisible && !query ? 0.7 : 0,
                  y: placeholderVisible && !query ? 0 : -4,
                }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="pointer-events-none absolute left-[4.25rem] top-1/2 -translate-y-1/2 text-xs text-neutral-200 sm:left-[5.5rem] sm:text-sm"
              >
                {currentPlaceholder}
              </motion.span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              {searchChips.map((chip, index) => (
                <motion.span
                  key={chip}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 * index, ease: "easeOut" }}
                  className="rounded-full bg-white/15 px-3 py-1 text-xs text-neutral-100 backdrop-blur-md transition-colors duration-300 hover:bg-white/25"
                >
                  #{chip}
                </motion.span>
              ))}
            </div>
          </motion.form>

          <motion.div variants={fadeUpVariants} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <Button
              variant="primary"
              asChild
              className="group relative w-full overflow-hidden rounded-full border border-white/10 bg-gradient-to-r from-[#0066FF] via-[#4C6FFF] to-[#7C3AED] px-8 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-[0_0_22px_rgba(0,102,255,0.45)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(0,102,255,0.6)] sm:w-auto"
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
            <Button
              variant="ghost"
              className="w-full rounded-full border border-white/25 px-8 py-3 text-sm text-neutral-100 transition-all duration-300 hover:border-white/60 hover:bg-white/10 sm:w-auto"
              asChild
            >
              <Link href={`/${locale}/collections`} className="flex items-center justify-center gap-2">
                {t("cta.secondary")}
              </Link>
            </Button>
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
            <Card
              id="films"
              className="scroll-mt-28 relative overflow-hidden border border-white/12 bg-[#0b1324]/70 p-0 backdrop-blur-2xl"
            >
              <motion.div
                className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.18),transparent_62%),radial-gradient(circle_at_bottom_right,rgba(196,181,253,0.15),transparent_72%)]"
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
              className="scroll-mt-28 relative overflow-hidden border border-white/12 bg-gradient-to-br from-[#101c2f]/75 via-[#111827]/70 to-[#1e293b]/75 p-0 backdrop-blur-2xl"
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
                      key={game.key}
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
                          {(Array.isArray(game.platforms)
                            ? game.platforms
                            : Object.keys(game.platforms ?? {})
                          ).map((platform) => {
                            const meta = gamePlatformMeta[platform as keyof typeof gamePlatformMeta];
                            if (!meta) return null;
                            return (
                              <span
                                key={`${game.key}-${platform}`}
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

            <Card className="relative overflow-hidden border border-white/12 bg-white/8 p-0 backdrop-blur-2xl">
              <motion.div
                className="absolute inset-x-0 -top-20 h-40 rounded-full bg-gradient-to-r from-primary-500/25 via-accent-500/20 to-emerald-400/20 blur-3xl"
                animate={{ opacity: [0.2, 0.45, 0.2] }}
                transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <CardContent className="relative space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{t("platforms.title")}</p>
                    <p className="text-xs text-neutral-300">{t("platforms.badge")}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {topPlatforms.map((platform) => {
                    const copy = platformMessages[platform.id] ?? {
                      label: platform.label,
                      description: platform.description,
                    };

                    return (
                      <Link
                        key={platform.id}
                        href={`/${locale}/software?platform=${platform.id}`}
                        className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-white/25 hover:bg-white/10"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white">
                          {platform.id.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{copy.label}</p>
                          <p className="truncate text-xs text-neutral-300">{copy.description}</p>
                        </div>
                        <span className="text-xs text-neutral-400 transition group-hover:text-neutral-200">→</span>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.35 }}
            className="space-y-3"
          >
            <p className="text-sm text-neutral-300">{t("categories.title")}</p>
            <div className="flex flex-wrap gap-3">
              {featuredCategories.map((category, index) => (
                <motion.div
                  key={category.id}
                  className="group"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.25 + index * 0.06, ease: "easeOut" }}
                  whileHover={{ scale: 1.06, rotate: -1.5 }}
                >
                  <Badge
                    variant="solid"
                    className="relative gap-2 overflow-hidden rounded-full border border-white/10 bg-gradient-to-r from-[#0066FF]/25 via-[#7C3AED]/25 to-[#10B981]/25 px-5 py-2 text-xs text-white transition duration-300 transform-gpu hover:shadow-[0_0_25px_rgba(124,58,237,0.25)]"
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition duration-300 group-hover:opacity-80 group-hover:animate-shimmer bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.45),transparent_55%)]"
                    />
                    <span className="relative uppercase tracking-wide">
                      {categoryLabels[category.id] ?? category.label}
                    </span>
                  </Badge>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
