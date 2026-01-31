"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { Search } from "lucide-react";

import ThemeToggle from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils/cn";
import { Input } from "@/components/ui/input";

import brandMark from "../../../Logo/logo.png";

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
  const [brandMarkErrored, setBrandMarkErrored] = useState(false);
  const [query, setQuery] = useState("");

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
    },
    [locale, query, router],
  );

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6">
        <Link href={`/${locale}`} className="group inline-flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-3xl border border-white/15 bg-white/5 shadow-[0_14px_36px_rgba(59,130,246,0.38)] transition duration-300 group-hover:shadow-[0_24px_60px_rgba(99,102,241,0.5)]">
            {brandMarkErrored ? (
              <span className="text-sm font-semibold text-white">SH</span>
            ) : (
              <Image
                src={brandMark}
                alt="SOFT-HUB logo"
                width={48}
                height={48}
                className="h-10 w-10 object-contain"
                priority
                onError={() => setBrandMarkErrored(true)}
              />
            )}
          </div>
          <div className="hidden flex-col sm:flex">
            <span className="text-lg font-semibold uppercase tracking-[0.22em] text-white">
              <span className="bg-gradient-to-r from-cyan-300 via-indigo-300 to-rose-300 bg-clip-text text-transparent">
                {dictionary("brandTitle")}
              </span>
            </span>
            <span className="mt-1 text-[12px] text-neutral-300 transition duration-300 group-hover:text-neutral-100">
              {dictionary("brandSubtitle")}
            </span>
          </div>
        </Link>

        <div className="hidden flex-1 justify-center xl:flex">
          <DesktopNavLinks pathname={pathname} links={navLinks} />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <form
            onSubmit={handleSubmit}
            className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/10 md:flex"
          >
            <Search className="h-4 w-4 text-neutral-300" />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={filtersT("search.placeholder")}
              className="h-6 w-56 border-0 bg-transparent p-0 text-sm text-white placeholder:text-neutral-400 focus-visible:ring-0"
            />
          </form>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
