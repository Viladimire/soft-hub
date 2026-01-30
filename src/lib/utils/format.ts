import { defaultLocale } from "@/i18n/locales";

const compactFormatters = new Map<string, Intl.NumberFormat>();
const decimalFormatters = new Map<string, Intl.NumberFormat>();

const getCompactFormatter = (locale: string) => {
  if (!compactFormatters.has(locale)) {
    compactFormatters.set(
      locale,
      new Intl.NumberFormat(locale, {
        notation: "compact",
        maximumFractionDigits: 1,
      }),
    );
  }

  return compactFormatters.get(locale)!;
};

const getDecimalFormatter = (locale: string) => {
  if (!decimalFormatters.has(locale)) {
    decimalFormatters.set(
      locale,
      new Intl.NumberFormat(locale, {
        maximumFractionDigits: 2,
      }),
    );
  }

  return decimalFormatters.get(locale)!;
};

export const formatCompactNumber = (
  value: number | null | undefined,
  locale: string = defaultLocale,
) => {
  if (value == null || Number.isNaN(value)) {
    return "-";
  }

  return getCompactFormatter(locale).format(value);
};

export const formatDecimalNumber = (
  value: number | null | undefined,
  locale: string = defaultLocale,
) => {
  if (value == null || Number.isNaN(value)) {
    return "0";
  }

  return getDecimalFormatter(locale).format(value);
};

export const formatBytes = (bytes: number | null | undefined, decimals = 1) => {
  if (!bytes) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;

  return `${value.toFixed(decimals)} ${units[exponent]}`;
};

const resolveFallback = () => "Not available";

export const formatReleaseDate = (
  value: string | Date | null | undefined,
  locale = defaultLocale,
  fallback?: string,
) => {
  if (!value) {
    return fallback ?? resolveFallback();
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback ?? resolveFallback();
  }

  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatDuration = (minutes: number | null | undefined) => {
  if (!minutes || minutes < 1) {
    return "<1 min";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (!hours) {
    return `${remainingMinutes} min`;
  }

  return `${hours} hr${remainingMinutes ? ` ${remainingMinutes} min` : ""}`;
};

export const formatVersion = (version: string | null | undefined) =>
  version?.trim() || "Unknown";
