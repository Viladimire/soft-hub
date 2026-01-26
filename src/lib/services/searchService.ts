import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import type { Software } from "@/lib/types/software";
import { toSoftware, type SoftwareRow } from "./softwareService";

export type SoftwareSearchResponse = {
  items: Software[];
  total: number;
  hasMore: boolean;
};

export type SoftwareSearchOptions = {
  limit?: number;
  offset?: number;
};

type Supabase = SupabaseClient<Database>;

const DEFAULT_LIMIT = 24;

const escapeFullTextQuery = (value: string) => `'${value.replace(/'/g, "''")}'`;

const escapeLikePattern = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");

const isSoftwareRow = (value: unknown): value is SoftwareRow => {
  if (!value || typeof value !== "object") return false;
  if ((value as { error?: unknown }).error !== undefined) return false;
  const candidate = value as Partial<SoftwareRow>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.slug === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.description === "string"
  );
};

const isSoftwareRowWithRank = (value: unknown): value is SoftwareRow & { search_rank?: number } =>
  isSoftwareRow(value);

export const searchSoftware = async (
  rawQuery: string,
  client: Supabase,
  options: SoftwareSearchOptions = {},
): Promise<SoftwareSearchResponse> => {
  const trimmed = rawQuery.trim();

  if (!trimmed) {
    return { items: [], total: 0, hasMore: false };
  }

  const limit = Math.max(options.limit ?? DEFAULT_LIMIT, 1);
  const offset = Math.max(options.offset ?? 0, 0);
  const to = offset + limit - 1;

  const escapedFullText = escapeFullTextQuery(trimmed);
  const likePattern = `%${escapeLikePattern(trimmed)}%`;

  const selectColumns = `*, search_rank:ts_rank_cd(search_vector, websearch_to_tsquery('english', ${escapedFullText}))`;

  const query = client
    .from("software")
    .select(selectColumns, { count: "exact" })
    .textSearch("search_vector", trimmed, {
      config: "english",
      type: "websearch",
    })
    .or(`name.ilike.${likePattern},description.ilike.${likePattern},developer->>name.ilike.${likePattern}`)
    .order("search_rank", { ascending: false, nullsFirst: true })
    .order("downloads_count", { ascending: false, nullsFirst: false })
    .range(offset, to);

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  const rows = Array.isArray(data)
    ? (data as unknown[]).filter(isSoftwareRowWithRank)
    : [];
  const items = rows.map(toSoftware);
  const total = count ?? items.length;
  const hasMore = offset + items.length < total;

  if (items.length > 0 || trimmed.length < 3) {
    return { items, total, hasMore };
  }

  const ilikeFallback = await client
    .from("software")
    .select("*", { count: "exact" })
    .or(`name.ilike.${likePattern},description.ilike.${likePattern},developer->>name.ilike.${likePattern}`)
    .order("downloads_count", { ascending: false, nullsFirst: false })
    .range(offset, to);

  if (ilikeFallback.error) {
    throw ilikeFallback.error;
  }

  const fallbackRows = Array.isArray(ilikeFallback.data)
    ? (ilikeFallback.data as unknown[]).filter(isSoftwareRow)
    : [];
  const fallbackItems = fallbackRows.map(toSoftware);
  const fallbackTotal = ilikeFallback.count ?? fallbackItems.length;
  const fallbackHasMore = offset + fallbackItems.length < fallbackTotal;

  return {
    items: fallbackItems,
    total: fallbackTotal,
    hasMore: fallbackHasMore,
  };
};
