import { defaultLocale, supportedLocales } from "./src/i18n/locales";

const nextIntlConfig = {
  locales: supportedLocales,
  defaultLocale,
  localePrefix: "always",
};

export default nextIntlConfig;
