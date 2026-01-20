import Link from "next/link";

import { AppShell } from "@/components/layouts/app-shell";
import { SideBar } from "@/components/layouts/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DraftCollection = {
  title: string;
  summary: string;
  entries: number;
  focus: string;
};

const UPCOMING_COLLECTIONS: DraftCollection[] = [
  {
    title: "Hyper-productivity toolkit",
    summary: "A curated stack for remote teams blending AI copilots, sync engines, and focus aides.",
    entries: 18,
    focus: "Productivity & collaboration",
  },
  {
    title: "Creator studio essentials",
    summary: "Video, audio, and graphics workflows optimised for solo creators with direct-download installers.",
    entries: 22,
    focus: "Multimedia & content",
  },
  {
    title: "Hardening your workstation",
    summary: "Security-first suite covering backups, firewalls, and privacy tooling ready for regulated environments.",
    entries: 15,
    focus: "Security & utilities",
  },
];

export default function CollectionsPage() {
  return (
    <AppShell sidebar={<SideBar />} className="pt-10">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="relative overflow-hidden border-white/10 bg-gradient-to-br from-slate-900/70 via-neutral-950/75 to-slate-950/80">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.28),transparent_65%),radial-gradient(circle_at_bottom_right,rgba(167,139,250,0.25),transparent_60%)]" />
          <CardHeader className="relative space-y-3">
            <Badge className="w-fit rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/80">
              Curated drops coming soon
            </Badge>
            <CardTitle className="text-2xl font-bold text-white">SOFT-HUB Collections</CardTitle>
            <CardDescription className="max-w-2xl text-sm leading-relaxed text-neutral-200">
              Collections will gather themed bundles of software, games, and learning material with editorial notes, compatibility badges, and quick download triggers.
            </CardDescription>
          </CardHeader>
          <CardContent className="relative space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-200">
                <p className="text-xs uppercase tracking-wide text-neutral-400">Launch playbook</p>
                <ul className="mt-2 space-y-2">
                  <li>• Editorial drops refreshed every two weeks</li>
                  <li>• Global filters by platform, licence, and region</li>
                  <li>• Offline JSON bundle for self-hosting mirrors</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-200">
                <p className="text-xs uppercase tracking-wide text-neutral-400">For contributors</p>
                <ul className="mt-2 space-y-2">
                  <li>• Submission flow with review SLAs</li>
                  <li>• Spotlight for verified publishers</li>
                  <li>• Analytics dashboard for collection performance</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="secondary" className="rounded-full border-white/20 px-6">
                <Link href="../software">Browse current library</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-white/20 px-6 text-neutral-100 hover:border-white/40 hover:bg-white/10">
                <Link href="../submit">Submit your software</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-neutral-950/65">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white">Draft collection line-up</CardTitle>
            <CardDescription className="text-sm text-neutral-300">
              Here is what the editorial team is sequencing right now.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {UPCOMING_COLLECTIONS.map((collection) => (
              <div
                key={collection.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-white/30 hover:bg-white/10"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-white">{collection.title}</h3>
                  <Badge className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                    {collection.entries} apps
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-neutral-300">{collection.summary}</p>
                <p className="mt-3 text-xs uppercase tracking-wide text-cyan-200">Focus: {collection.focus}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
