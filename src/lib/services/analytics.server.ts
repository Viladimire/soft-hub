import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/supabase/database.types";

export type AnalyticsServerClient = SupabaseClient<Database>;

export type SoftwareIdentifier = {
  id?: string;
  slug?: string;
};

export type AnalyticsEventType = "view" | "download" | "share";

type ResolvedSoftware = Pick<Database["public"]["Tables"]["software"]["Row"], "id" | "slug" | "name" | "stats" | "download_url">;

export const resolveSoftware = async (
  client: AnalyticsServerClient,
  identifier: SoftwareIdentifier,
): Promise<ResolvedSoftware | null> => {
  const { id, slug } = identifier;

  if (!id && !slug) {
    throw new Error("Software identifier (id or slug) is required");
  }

  const query = client
    .from("software")
    .select("id, slug, name, stats, download_url")
    .limit(1);
  const matcher = id ? { id } : { slug };

  const { data, error } = await query.match(matcher).maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return data as ResolvedSoftware;
};

export const recordAnalyticsEvent = async (
  client: AnalyticsServerClient,
  params: {
    softwareId: string;
    eventType: AnalyticsEventType;
    metadata?: Record<string, string | number | boolean | null>;
  },
) => {
  const metadata = params.metadata ?? undefined;
  await client.from("analytics_events").insert({
    software_id: params.softwareId,
    event_type: params.eventType,
    metadata: metadata ? (metadata as unknown as Json) : null,
  });
};

export const incrementSoftwareStat = async (
  client: AnalyticsServerClient,
  params: {
    softwareId: string;
    field: "views" | "downloads";
    delta?: number;
  },
) => {
  const { error } = await client.rpc("increment_software_stat", {
    p_software_id: params.softwareId,
    p_field: params.field,
    p_delta: params.delta ?? 1,
  });

  if (error) {
    throw error;
  }
};

export const recordSearchEvent = async (
  client: AnalyticsServerClient,
  payload: {
    query: string;
    filters: Record<string, unknown> | null;
    resultsCount: number;
    durationMs?: number;
    locale?: string;
    source?: string;
  },
) => {
  const { error } = await client.from("analytics_search_events").insert({
    query: payload.query,
    filters: payload.filters ? (payload.filters as Json) : null,
    results_count: payload.resultsCount,
    duration_ms: payload.durationMs ?? null,
    locale: payload.locale ?? null,
    source: payload.source ?? "site",
  });

  if (error) {
    throw error;
  }
};

export const getPopularSoftware = async (
  client: AnalyticsServerClient,
  limit = 10,
) => {
  const { data, error } = await client.rpc("analytics_popular_software", {
    p_limit: limit,
  });

  if (error) {
    throw error;
  }

  return data ?? [];
};

export const getTrendingSoftware = async (
  client: AnalyticsServerClient,
  params: {
    limit?: number;
    windowDays?: number;
  } = {},
) => {
  const { limit = 10, windowDays = 7 } = params;
  const { data, error } = await client.rpc("analytics_trending_software", {
    p_limit: limit,
    p_window_days: windowDays,
  });

  if (error) {
    throw error;
  }

  return data ?? [];
};

export const getAnalyticsTotals = async (client: AnalyticsServerClient) => {
  const { data, error } = await client.rpc("analytics_totals");

  if (error) {
    throw error;
  }

  return data?.[0] ?? { total_views: 0, total_downloads: 0, total_software: 0 };
};
