"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { supportedLocales } from "@/i18n/locales";

import ThemeToggle from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils/cn";

type NavLink = {
  href: string;
  label: string;
};

const getLocaleLabel = (locale: string) => {
  switch (locale) {
    case "ar":
      return "العربية";
    case "fr":
      return "Français";
    case "es":
      return "Español";
    case "de":
      return "Deutsch";
    case "tr":
      return "Türkçe";
    case "ru":
      return "Русский";
    case "zh":
      return "中文";
    case "ja":
      return "日本語";
    case "hi":
      return "हिन्दी";
    default:
      return "English";
  }
};

const LanguageSwitcher = ({ locale, onChange }: { locale: string; onChange: (nextLocale: string) => void }) => {
  const options = useMemo(
    () =>
      supportedLocales.map((value) => ({
        value,
        label: getLocaleLabel(value),
      })),
    [],
  );

  return (
    <label className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-neutral-100 transition hover:border-white/25 hover:bg-white/15 lg:flex">
      <Globe className="h-3.5 w-3.5 text-primary-200" />
      <select
        value={locale}
        onChange={(event) => onChange(event.target.value)}
        className="w-[110px] bg-transparent text-xs outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-neutral-950 text-neutral-100">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
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
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [brandMarkErrored, setBrandMarkErrored] = useState(false);

  const navLinks = useMemo<NavLink[]>(
    () => [
      { href: `/${locale}`, label: dictionary("links.home") },
      { href: `/${locale}/software`, label: dictionary("links.software") },
      { href: `/${locale}/collections`, label: dictionary("links.collections") },
      { href: `/${locale}/insights`, label: dictionary("links.insights") },
    ],
    [dictionary, locale],
  );

  const handleLocaleChange = (nextLocale: string) => {
    if (!nextLocale || nextLocale === locale) return;

    const segments = pathname.split("/");
    if (segments.length < 2) {
      router.replace(`/${nextLocale}`);
      return;
    }

    const currentLocale = segments[1];
    if (supportedLocales.includes(currentLocale as (typeof supportedLocales)[number])) {
      segments[1] = nextLocale;
    } else {
      segments.splice(1, 0, nextLocale);
    }

    const nextPath = segments.join("/") || `/${nextLocale}`;
    const query = searchParams.toString();
    router.replace(`${nextPath}${query ? `?${query}` : ""}`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6">
        <Link href={`/${locale}`} className="group inline-flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-3xl border border-white/15 bg-white/5 shadow-[0_14px_36px_rgba(59,130,246,0.38)] transition duration-300 group-hover:shadow-[0_24px_60px_rgba(99,102,241,0.5)]">
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
          <LanguageSwitcher locale={locale} onChange={handleLocaleChange} />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
