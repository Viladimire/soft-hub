"use client";

import { useEffect } from "react";

import { trackView } from "@/lib/services/analyticsService";

type AnalyticsTrackerProps = {
  softwareId: string;
  slug?: string;
  locale?: string;
  referrer?: string | null;
  source?: string;
};

export const AnalyticsTracker = ({ softwareId, slug, locale, referrer, source }: AnalyticsTrackerProps) => {
  useEffect(() => {
    void trackView(softwareId, {
      slug,
      locale,
      ref: referrer ?? (typeof document !== "undefined" ? document.referrer || null : null),
      source,
    });
  }, [locale, referrer, slug, softwareId, source]);

  return null;
};
