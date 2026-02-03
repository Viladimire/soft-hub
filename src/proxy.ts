import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, supportedLocales } from "./i18n/locales";

const intlMiddleware = createMiddleware({
  locales: supportedLocales,
  defaultLocale,
  localePrefix: "always",
});

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const match = pathname.match(/^\/([a-z]{2})(?:-[A-Z]{2})?\/trends\/?$/);
  if (match) {
    const locale = match[1];
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/insights/trends`;
    return NextResponse.redirect(url);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
