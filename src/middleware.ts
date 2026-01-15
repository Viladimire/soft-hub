import createMiddleware from "next-intl/middleware";

import { defaultLocale, supportedLocales } from "./i18n/locales";

export default createMiddleware({
  locales: supportedLocales,
  defaultLocale,
  localePrefix: "always",
});

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
