"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlignLeft, ArrowUpRight, Film, MonitorSmartphone, Moon, Search, Sun } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { cn } from "@/lib/utils/cn";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { SearchBar } from "@/components/molecules/search-bar";

export const NavBar = () => {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const [brandMarkErrored, setBrandMarkErrored] = useState(false);

  const gamesLabel = t("games.label");
  const filmsLabel = t("films.label");

  const navLinks = [
    { href: `/${locale}`, label: t("links.home") },
    { href: `/${locale}/software`, label: t("links.software") },
    { href: `/${locale}/collections`, label: t("links.collections") },
    { href: `/${locale}/insights`, label: t("links.insights") },
  ];

  const themeOptions = Object.entries(t.raw("themeOptions") as Record<string, string>);
  const recentKeywords = Object.values(t.raw("search.recentKeywords") as Record<string, string>);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/70 backdrop-blur-xl">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link href={`/${locale}`} className="group inline-flex items-center gap-3">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/5 shadow-[0_12px_30px_rgba(32,56,132,0.35)] transition duration-300 group-hover:shadow-[0_18px_40px_rgba(99,102,241,0.45)]">
              {brandMarkErrored ? (
                <span className="text-sm font-semibold text-white">SH</span>
              ) : (
                <Image
                  src="/branding/soft-hub-logomark.svg"
                  alt="SOFT-HUB logomark"
                  width={32}
                  height={32}
                  className="h-8 w-8"
                  priority
                  onError={() => setBrandMarkErrored(true)}
                />
              )}
            </span>
            <div className="flex flex-col">
              <span className="bg-gradient-to-r from-sky-200 via-indigo-200 to-rose-200 bg-clip-text text-sm font-semibold uppercase tracking-[0.2em] text-transparent">
                {t("brandTitle")}
              </span>
              <span className="text-[11px] text-neutral-400 transition duration-300 group-hover:text-neutral-200">
                {t("brandSubtitle")}
              </span>
            </div>
          </Link>
          <Tabs defaultValue="windows" className="hidden md:block">
            <TabsList className="bg-transparent">
              <TabsTrigger value="windows" startIcon={<MonitorSmartphone className="h-3.5 w-3.5" />}> {t("tabs.windows")} </TabsTrigger>
              <TabsTrigger value="mac" startIcon={<Moon className="h-3.5 w-3.5" />}> {t("tabs.mac")} </TabsTrigger>
              <TabsTrigger value="linux" startIcon={<MonitorSmartphone className="h-3.5 w-3.5 rotate-90" />}> {t("tabs.linux")} </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <nav className="hidden items-center gap-2 lg:flex">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  "hover:bg-neutral-900/70 hover:text-neutral-100",
                  isActive ? "bg-neutral-900/80 text-neutral-50" : "text-neutral-400",
                )}
              >
                {link.label}
              </Link>
            );
          })}

          <a
            href="#games"
            className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 transition-colors hover:bg-neutral-900/70 hover:text-neutral-100"
          >
            {gamesLabel}
          </a>

          <Link
            href={`/${locale}/films`}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 transition-colors hover:bg-neutral-900/70 hover:text-neutral-100"
          >
            <Film className="h-4 w-4" />
            {filmsLabel}
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Dialog>
            <div className="flex items-center gap-2">
              <DialogTrigger asChild>
                <Button variant="ghost" className="hidden items-center gap-2 px-3 py-2 text-sm text-neutral-300 lg:flex">
                  <Search className="h-4 w-4" />
                  {t("search.openButton")}
                </Button>
              </DialogTrigger>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full border border-white/10 text-neutral-200 hover:text-white lg:hidden"
                  aria-label={t("search.openButton")}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </DialogTrigger>
            </div>
            <DialogContent className="max-w-2xl space-y-4 border-white/5 bg-neutral-950/90">
              <DialogHeader className="text-start">
                <DialogTitle className="text-lg font-semibold text-white">{t("search.openButton")}</DialogTitle>
                <DialogDescription className="text-sm text-neutral-300">
                  {t("search.recentTitle")}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3">
                <SearchBar />
                <Select defaultValue="system">
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder={t("search.themePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {themeOptions.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2 text-sm text-neutral-300">
                <p className="text-xs uppercase text-neutral-500">{t("search.recentTitle")}</p>
                <div className="grid gap-2">
                  {recentKeywords.map((keyword) => (
                    <button
                      key={keyword}
                      type="button"
                      className="inline-flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-left text-sm text-neutral-200 transition hover:border-primary-400/60 hover:bg-primary-500/10"
                    >
                      <span>{keyword}</span>
                      <ArrowUpRight className="h-4 w-4 text-neutral-500" />
                    </button>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu">
                <AlignLeft className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm space-y-4 border-white/5 bg-neutral-950/90">
              <DialogHeader className="text-start">
                <DialogTitle className="text-sm font-semibold uppercase tracking-wide text-neutral-300">
                  Menu
                </DialogTitle>
                <DialogDescription className="text-xs text-neutral-500">
                  استعرض الروابط والاختصارات المتاحة في SOFT-HUB.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-neutral-100 transition hover:border-white/20 hover:bg-white/10"
                  >
                    {link.label}
                  </Link>
                ))}
                <a
                  href="#games"
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-neutral-100 transition hover:border-white/20 hover:bg-white/10"
                >
                  {gamesLabel}
                </a>
                <Link
                  href={`/${locale}/films`}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-neutral-100 transition hover:border-white/20 hover:bg-white/10"
                >
                  {filmsLabel}
                </Link>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="ghost" size="icon" className="hidden text-neutral-300 lg:inline-flex">
            <Sun className="h-4 w-4" />
          </Button>
          <Button variant="primary" className="hidden gap-2 lg:inline-flex" asChild>
            <Link href={`/${locale}/submit`}>{t("actions.submit")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
};
