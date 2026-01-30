import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";

import { defaultLocale, rtlLocales } from "@/i18n/locales";

import "./globals.css";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const headerLocale = headersList.get("x-next-intl-locale") ?? defaultLocale;
  const direction = rtlLocales.has(headerLocale) ? "rtl" : "ltr";

  return (
    <html lang={headerLocale} dir={direction} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
