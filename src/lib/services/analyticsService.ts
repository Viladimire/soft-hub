import type { FiltersSnapshot } from "@/lib/hooks/useFilters";

type SearchFilterSummary = {
  category: string | null;
  platforms: string[];
  types: string[];
  sortBy: FiltersSnapshot["sortBy"];
  page: number;
};

type ViewMetadata = {
  slug?: string;
  locale?: string;
  ref?: string | null;
  source?: string;
};

type DownloadMetadata = ViewMetadata;

type TrackSearchPayload = {
  query: string;
  filters: SearchFilterSummary;
  resultsCount: number;
  durationMs?: number;
  locale?: string;
  source?: string;
};

type TrackResponse<T extends string> = {
  status: "ok";
  event: T;
} | {
  status: "error";
  message: string;
};

const postJson = async <TData, TResult>(url: string, body: TData): Promise<TResult | null> => {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`Analytics request failed: ${response.status}`);
      }
      return null;
    }

    return (await response.json()) as TResult;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Analytics request error", error);
    }
    return null;
  }
};

export const trackView = async (softwareId: string, metadata?: ViewMetadata) => {
  await postJson<{ id: string } & ViewMetadata, TrackResponse<"view">>("/api/analytics/view", {
    id: softwareId,
    ...(metadata ?? {}),
  });
};

export const trackDownload = async (softwareId: string, metadata?: DownloadMetadata) => {
  await postJson<{ id: string } & DownloadMetadata, TrackResponse<"download">>("/api/analytics/download", {
    id: softwareId,
    ...(metadata ?? {}),
  });
};

export const trackSearch = async (
  payload: TrackSearchPayload,
) => {
  const { query } = payload;
  const trimmed = query.trim();
  if (!trimmed) return;

  await postJson<TrackSearchPayload, TrackResponse<"search">>("/api/analytics/search", {
    ...payload,
    query: trimmed,
  });
};
