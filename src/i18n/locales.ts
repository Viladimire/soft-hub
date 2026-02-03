export const supportedLocales = ["en", "ar"] as const;

export const defaultLocale = "en";

export const rtlLocales = new Set<string>(["ar"]);

export type SupportedLocale = (typeof supportedLocales)[number];
