import { getRequestConfig } from "next-intl/server";

import { defaultLocale } from "./locales";
import { loadMessages } from "./messages";

export default getRequestConfig(async ({ locale }) => {
  const resolvedLocale = typeof locale === "string" && locale.length > 0 ? locale : defaultLocale;
  const messages = await loadMessages(resolvedLocale);

  return {
    locale: resolvedLocale,
    messages,
  };
});
