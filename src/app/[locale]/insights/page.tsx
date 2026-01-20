import Link from "next/link";

import { AppShell } from "@/components/layouts/app-shell";
import { SideBar } from "@/components/layouts/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function InsightsPage() {
  return (
    <AppShell sidebar={<SideBar />} className="pt-10">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="relative overflow-hidden border-white/10 bg-gradient-to-br from-slate-900/70 via-neutral-950/75 to-slate-950/80">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.25),transparent_65%),radial-gradient(circle_at_bottom_right,rgba(236,72,153,0.22),transparent_60%)]" />
          <CardHeader className="relative space-y-3">
            <Badge className="w-fit rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/80">
              Analytics in progress
            </Badge>
            <CardTitle className="text-2xl font-bold text-white">SOFT-HUB Insights</CardTitle>
            <CardDescription className="max-w-2xl text-sm leading-relaxed text-neutral-200">
              We are building a data layer that tracks downloads, engagement, and emerging trends across software, games, and upcoming film content. Full analytics dashboards launch soon.
            </CardDescription>
          </CardHeader>
          <CardContent className="relative space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-200">
                <p className="text-xs uppercase tracking-wide text-neutral-400">What&apos;s coming</p>
                <ul className="mt-2 space-y-2">
                  <li>• Download spikes and software velocity</li>
                  <li>• Category heatmaps with regional filters</li>
                  <li>• Weekly digest for publisher partners</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-200">
                <p className="text-xs uppercase tracking-wide text-neutral-400">For the community</p>
                <ul className="mt-2 space-y-2">
                  <li>• Snapshot dashboards embedded in collections</li>
                  <li>• Public API for open-source mashups</li>
                  <li>• Alerts about trending tools & new drops</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="secondary" className="rounded-full border-white/20 px-6">
                <Link href="./trends">Open Trends preview</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-white/20 px-6 text-neutral-100 hover:border-white/40 hover:bg-white/10">
                <Link href="../software?sort=popular">View most downloaded</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-neutral-950/65">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white">Launch backlog</CardTitle>
            <CardDescription className="text-sm text-neutral-300">
              A timeline of analytics modules under construction.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">Weekly download report</p>
              <p className="mt-1 text-sm text-neutral-300">Exportable CSV and charts for the top 500 titles across software and games.</p>
              <p className="mt-2 text-xs uppercase tracking-wide text-emerald-200">Status: Final QA · ETA Q2 2026</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">Region-specific insights</p>
              <p className="mt-1 text-sm text-neutral-300">Breakdowns by locale with filters for OS, pricing model, and release window.</p>
              <p className="mt-2 text-xs uppercase tracking-wide text-amber-200">Status: In development · ETA Q3 2026</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">Real-time search analytics</p>
              <p className="mt-1 text-sm text-neutral-300">Live feed of top search terms and click-through rates surfaced in the library.</p>
              <p className="mt-2 text-xs uppercase tracking-wide text-rose-200">Status: Design review · ETA Q4 2026</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
