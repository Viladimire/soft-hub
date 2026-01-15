"use client";

import { useEffect } from "react";

import { incrementViews } from "@/lib/services/analyticsService";

export const AnalyticsTracker = ({ softwareId }: { softwareId: string }) => {
  useEffect(() => {
    void incrementViews(softwareId);
  }, [softwareId]);

  return null;
};
