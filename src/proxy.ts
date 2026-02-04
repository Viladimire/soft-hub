import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, supportedLocales } from "./i18n/locales";

const PRIMARY_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";
const REDIRECT_TO_PRIMARY = process.env.REDIRECT_TO_PRIMARY === "1";

const intlMiddleware = createMiddleware({
  locales: supportedLocales,
  defaultLocale,
  localePrefix: "always",
});

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (REDIRECT_TO_PRIMARY && PRIMARY_SITE_URL) {
    try {
      const primary = new URL(PRIMARY_SITE_URL);
      const currentHost = request.nextUrl.host;
      const primaryHost = primary.host;

      if (primaryHost && currentHost && currentHost !== primaryHost) {
        const url = request.nextUrl.clone();
        url.protocol = primary.protocol;
        url.host = primaryHost;
        return NextResponse.redirect(url, 308);
      }
    } catch {
      // ignore invalid PRIMARY_SITE_URL
    }
  }

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
