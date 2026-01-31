"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Search, X } from "lucide-react";

import { GalaxyLogo } from "@/components/branding/galaxy-logo";
import { Starfield } from "@/components/backgrounds/starfield";
import ThemeToggle from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils/cn";
import { Input } from "@/components/ui/input";

type NavLink = {
  href: string;
  label: string;
};

const DesktopNavLinks = ({ pathname, links }: { pathname: string; links: NavLink[] }) => (
  <nav className="hidden items-center gap-1 xl:flex">
    {links.map((link) => {
      const isActive = pathname === link.href;
      return (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "rounded-full px-4 py-2 text-sm transition-colors",
            "hover:bg-white/10 hover:text-white",
            isActive ? "bg-white/15 text-white" : "text-neutral-300",
          )}
        >
          {link.label}
        </Link>
      );
    })}
  </nav>
);

export const Navbar = () => {
  const dictionary = useTranslations("nav");
  const filtersT = useTranslations("filters");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const navLinks = useMemo<NavLink[]>(
    () => [
      { href: `/${locale}`, label: dictionary("links.home") },
      { href: `/${locale}/software`, label: dictionary("links.software") },
      { href: `/${locale}/collections`, label: dictionary("links.collections") },
      { href: `/${locale}/insights`, label: dictionary("links.insights") },
    ],
    [dictionary, locale],
  );

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) return;
      router.push(`/${locale}/search?query=${encodeURIComponent(trimmed)}`);
      setIsSearchOpen(false);
    },
    [locale, query, router],
  );

  useEffect(() => {
    if (!isSearchOpen) return;
    searchInputRef.current?.focus();
  }, [isSearchOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsSearchOpen(true);
        return;
      }

      if (event.key === "Escape") {
        setIsSearchOpen(false);
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="relative sticky top-0 z-40 overflow-hidden border-b border-black/10 bg-white/70 text-neutral-900 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/70 dark:text-neutral-50">
        <Starfield className="z-0 opacity-40" intensity="soft" />
        <div className="relative z-10 mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6">
        <Link href={`/${locale}`} className="group inline-flex items-center gap-3">
          <GalaxyLogo className="transition duration-300 group-hover:scale-[1.03]" size={48} />
          <div className="hidden flex-col sm:flex">
            <span className="text-lg font-semibold uppercase tracking-[0.22em] text-neutral-950 dark:text-white">
              <span className="bg-gradient-to-r from-cyan-300 via-indigo-300 to-rose-300 bg-clip-text text-transparent">
                {dictionary("brandTitle")}
              </span>
            </span>
            <span className="mt-1 text-[12px] text-neutral-600 transition duration-300 group-hover:text-neutral-900 dark:text-neutral-300 dark:group-hover:text-neutral-100">
              {dictionary("brandSubtitle")}
            </span>
          </div>
        </Link>

        <div className="hidden flex-1 justify-center xl:flex">
          <DesktopNavLinks pathname={pathname} links={navLinks} />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="hidden items-center gap-2 rounded-full border border-black/10 bg-black/5 px-4 py-2 backdrop-blur-xl transition hover:border-black/20 hover:bg-black/10 md:flex dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20 dark:hover:bg-white/10"
          >
            <Search className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">{filtersT("search.placeholder")}</span>
            <kbd className="ml-2 hidden items-center gap-1 rounded-md border border-black/10 bg-black/5 px-2 py-1 text-[11px] text-neutral-500 lg:inline-flex dark:border-white/10 dark:bg-white/5 dark:text-neutral-400">
              <span>Ctrl</span>
              <span>+</span>
              <span>K</span>
            </kbd>
          </button>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-full border border-black/10 bg-black/5 p-2 text-neutral-800 transition hover:border-black/20 hover:bg-black/10 xl:hidden dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:border-white/20 dark:hover:bg-white/10"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <ThemeToggle />
        </div>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-black/10 bg-white/85 backdrop-blur-xl xl:hidden dark:border-white/10 dark:bg-neutral-950/80"
            >
              <nav className="mx-auto max-w-7xl space-y-1 px-4 py-4 sm:px-6">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "block rounded-2xl px-4 py-3 text-sm transition",
                        isActive
                          ? "bg-black/5 text-neutral-950 dark:bg-white/10 dark:text-white"
                          : "text-neutral-700 hover:bg-black/5 hover:text-neutral-950 dark:text-neutral-300 dark:hover:bg-white/5 dark:hover:text-white",
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      <AnimatePresence>
        {isSearchOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close search"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSearchOpen(false)}
              className="fixed inset-0 z-50 cursor-default bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: -16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -16 }}
              className="fixed left-1/2 top-24 z-[60] w-full max-w-2xl -translate-x-1/2 px-4"
            >
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-950/80 shadow-2xl backdrop-blur-2xl">
                <div className="pointer-events-none absolute -inset-1 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.24),transparent_60%),radial-gradient(circle_at_bottom_right,rgba(167,139,250,0.18),transparent_55%)] blur-xl" />

                <div className="relative">
                  <form onSubmit={handleSubmit} className="relative">
                    <Search className="absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
                    <Input
                      ref={searchInputRef}
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={filtersT("search.placeholder")}
                      className="h-14 w-full border-0 bg-transparent px-14 text-base text-white placeholder:text-white/40 focus-visible:ring-0"
                    />
                    {query ? (
                      <button
                        type="button"
                        onClick={() => setQuery("")}
                        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-xl p-2 text-white/40 transition hover:bg-white/10 hover:text-white"
                        aria-label={filtersT("search.clear")}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </form>

                  {!query ? (
                    <div className="border-t border-white/10 p-4">
                      <p className="mb-3 px-2 text-xs text-white/40">Popular searches</p>
                      <div className="flex flex-wrap gap-2">
                        {["Chrome", "WinRAR", "VS Code", "Photoshop", "Games"].map((term) => (
                          <button
                            key={term}
                            type="button"
                            onClick={() => {
                              setQuery(term);
                              searchInputRef.current?.focus();
                            }}
                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between border-t border-white/10 bg-white/5 px-6 py-3 text-xs text-white/40">
                    <span className="inline-flex items-center gap-2">
                      <kbd className="rounded-md border border-white/15 bg-white/10 px-2 py-1">↵</kbd>
                      to search
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <kbd className="rounded-md border border-white/15 bg-white/10 px-2 py-1">esc</kbd>
                      to close
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
};
