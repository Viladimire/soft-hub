import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMessages } from "next-intl/server";

import { Providers } from "@/components/providers/Providers";
import { PageTransition } from "@/components/animations/PageTransition";
import { defaultLocale, supportedLocales } from "@/i18n/locales";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = rawLocale ?? defaultLocale;

  const languages = Object.fromEntries(
    supportedLocales.map((value) => [value, new URL(`/${value}`, SITE_URL).toString()]),
  );

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: "SOFT-HUB",
      template: "%s | SOFT-HUB",
    },
    description:
      "SOFT-HUB is a global platform for discovering, evaluating, and downloading professional software across platforms.",
    alternates: {
      canonical: new URL(`/${locale}`, SITE_URL).toString(),
      languages,
    },
    openGraph: {
      type: "website",
      siteName: "SOFT-HUB",
      url: new URL(`/${locale}`, SITE_URL).toString(),
      locale,
      title: "SOFT-HUB",
      description:
        "SOFT-HUB is a global platform for discovering, evaluating, and downloading professional software across platforms.",
      images: [
        {
          url: new URL("/branding/soft-hub-logomark.svg", SITE_URL).toString(),
          width: 176,
          height: 176,
          alt: "SOFT-HUB",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "SOFT-HUB",
      description:
        "SOFT-HUB is a global platform for discovering, evaluating, and downloading professional software across platforms.",
      images: [new URL("/branding/soft-hub-logomark.svg", SITE_URL).toString()],
    },
  } satisfies Metadata;
}

export function generateStaticParams() {
  return supportedLocales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale ?? defaultLocale;

  if (!supportedLocales.includes(locale as (typeof supportedLocales)[number])) {
    notFound();
  }

  const messages = await getMessages({ locale });

  return (
    <Providers locale={locale} messages={messages}>
      <PageTransition>{children}</PageTransition>
    </Providers>
  );
}
