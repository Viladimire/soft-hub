import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import { getMessages } from "next-intl/server";

import { Providers } from "@/components/providers/Providers";
import { PageTransition } from "@/components/animations/PageTransition";
import { defaultLocale, rtlLocales, supportedLocales } from "@/i18n/locales";

import "@/app/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SOFT-HUB",
    template: "%s | SOFT-HUB",
  },
  description:
    "SOFT-HUB is a global platform for discovering, evaluating, and downloading professional software across platforms.",
};

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
  const dir = rtlLocales.has(locale) ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} bg-neutral-950 antialiased`}>
        <Providers locale={locale} messages={messages}>
          <PageTransition>{children}</PageTransition>
        </Providers>
      </body>
    </html>
  );
}
