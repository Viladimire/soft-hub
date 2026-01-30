export const supportedLocales = ["en"] as const;

export const defaultLocale = "en";

export const rtlLocales = new Set<string>([]);

export type SupportedLocale = (typeof supportedLocales)[number];
