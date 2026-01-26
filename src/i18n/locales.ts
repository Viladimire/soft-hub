export const supportedLocales = ["en", "ar", "fr", "es", "de", "tr", "ru", "zh", "ja", "hi"] as const;

export const defaultLocale = "en";

export const rtlLocales = new Set<string>(["ar"]);

export type SupportedLocale = (typeof supportedLocales)[number];
