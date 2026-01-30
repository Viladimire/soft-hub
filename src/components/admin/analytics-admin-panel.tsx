'use client';

import { useEffect, useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type AnalyticsTotals = {
  total_views: number;
  total_downloads: number;
  total_software: number;
};

type PopularRow = {
  software_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  downloads: number;
  views: number;
};

type TrendingRow = {
  software_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  total_events: number;
  views: number;
  downloads: number;
};

type AnalyticsResponse = {
  totals: AnalyticsTotals;
  popular: PopularRow[];
  trending: TrendingRow[];
};

export const AnalyticsAdminPanel = () => {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = data?.totals ?? null;

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/admin/analytics");
      if (response.status === 401) {
        setError("Your session has expired. Please refresh the page.");
        return;
      }

      if (response.status === 501) {
        setError("Supabase is not enabled. Configure environment variables and try again.");
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = typeof payload?.message === "string" ? payload.message : "Failed to load analytics";
        setError(message);
        return;
      }

      const payload = (await response.json()) as AnalyticsResponse;
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const popularRows = useMemo(() => data?.popular ?? [], [data]);
  const trendingRows = useMemo(() => data?.trending ?? [], [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Analytics</h2>
          <p className="text-sm text-neutral-400">Live summary from Supabase (views / downloads / events).</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void load()} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {error ? (
        <Card className="border-white/10 bg-neutral-950/60">
          <CardHeader>
            <CardTitle className="text-base text-white">Failed to load data</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-neutral-300">{error}</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-white/10 bg-neutral-950/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-neutral-400">Total software</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-white">{totals ? totals.total_software.toLocaleString("en-US") : "—"}</p>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-neutral-950/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-neutral-400">Total views</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-white">{totals ? totals.total_views.toLocaleString("en-US") : "—"}</p>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-neutral-950/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-neutral-400">Total downloads</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-white">{totals ? totals.total_downloads.toLocaleString("en-US") : "—"}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-white/10 bg-neutral-950/60">
          <CardHeader>
            <CardTitle className="text-base text-white">Most downloaded</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {popularRows.length ? (
              <div className="space-y-2">
                {popularRows.map((row, index) => (
                  <div key={row.software_id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">
                        {index + 1}. {row.name}
                      </p>
                      <p className="truncate text-xs text-neutral-400">/{row.slug}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-neutral-400">Downloads</p>
                      <p className="font-semibold text-white">{row.downloads.toLocaleString("en-US")}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-400">No data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-neutral-950/60">
          <CardHeader>
            <CardTitle className="text-base text-white">Most active (7 days)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {trendingRows.length ? (
              <div className="space-y-2">
                {trendingRows.map((row, index) => (
                  <div key={row.software_id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">
                        {index + 1}. {row.name}
                      </p>
                      <p className="truncate text-xs text-neutral-400">/{row.slug}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-neutral-400">Events</p>
                      <p className="font-semibold text-white">{row.total_events.toLocaleString("en-US")}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-400">No data yet.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
};
