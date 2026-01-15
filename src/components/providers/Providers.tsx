"use client";

import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";

import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

type ProvidersProps = {
  children: React.ReactNode;
  locale: string;
  messages: AbstractIntlMessages;
};

export const Providers = ({ children, locale, messages }: ProvidersProps) => (
  <ThemeProvider>
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <QueryProvider>{children}</QueryProvider>
    </NextIntlClientProvider>
  </ThemeProvider>
);
