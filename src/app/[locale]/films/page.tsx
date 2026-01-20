"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useLocale } from "next-intl";

import { AppShell } from "@/components/layouts/app-shell";
import { SideBar } from "@/components/layouts/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type FilmPreview = {
  title: string;
  synopsis: string;
  releaseWindow: string;
  genres: string[];
  rating: string;
};

type EditorialHighlight = {
  label: string;
  description: string;
};

const UPCOMING_FILMS: FilmPreview[] = [
  {
    title: "Neon Orbit",
    synopsis: "Cyber-noir thriller following a data broker who uncovers a neural heist escalating into a city-wide blackout.",
    releaseWindow: "Q2 2026",
    genres: ["Sci-fi", "Thriller"],
    rating: "PG-13",
  },
  {
    title: "Last Transmission",
    synopsis: "Found-footage space drama about an isolated crew decoding a distress signal that predates humanity.",
    releaseWindow: "Q3 2026",
    genres: ["Drama", "Mystery"],
    rating: "PG",
  },
  {
    title: "Skyline Club",
    synopsis: "Stylised crime musical charting rival crews as they battle via underground VR showcase battles.",
    releaseWindow: "Holiday 2026",
    genres: ["Musical", "Crime"],
    rating: "PG-13",
  },
];

const EDITORIAL_THEMES: EditorialHighlight[] = [
  {
    label: "Curation-first",
    description: "Every drop is hand-picked with focus on cinematic storytelling across emerging markets and independent studios.",
  },
  {
    label: "Studio partnerships",
    description: "We are onboarding distributors to deliver day-one releases with transparent licensing for SOFT-HUB members.",
  },
  {
    label: "Community premieres",
    description: "Expect live watch parties, director AMAs, and synced subtitles across supported locales at launch.",
  },
];

export default function FilmsComingSoonPage() {
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "disabled" | "error">("idle");

  const sortedFilms = useMemo(
    () =>
      UPCOMING_FILMS.sort((a, b) => a.releaseWindow.localeCompare(b.releaseWindow, undefined, { numeric: true })),
    [],
  );

  const handleSubmit = useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed) return;

    try {
      setStatus("loading");
      const response = await fetch("/api/films/notify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: trimmed, locale }),
      });

      if (response.status === 501) {
        setStatus("disabled");
        return;
      }

      if (!response.ok) {
        setStatus("error");
        return;
      }

      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }, [email, locale]);

  return (
    <AppShell sidebar={<SideBar />} className="pt-10">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="relative overflow-hidden border-white/10 bg-gradient-to-br from-indigo-900/50 via-neutral-950/70 to-slate-950/75">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.35),transparent_65%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.25),transparent_60%)]" />
          <CardHeader className="relative space-y-3">
            <Badge className="w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/80">
              Coming soon
            </Badge>
            <CardTitle className="text-2xl font-bold text-white">SOFT-HUB Premier Films</CardTitle>
            <CardDescription className="max-w-2xl text-sm leading-relaxed text-neutral-200">
              Our film catalogue is in active production. Expect a launch line-up that blends independent gems, sci-fi epics, and limited series pilots with global subtitles.
            </CardDescription>
          </CardHeader>
          <CardContent className="relative space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-200">
                <p className="text-xs uppercase tracking-wide text-neutral-400">What to expect</p>
                <ul className="mt-2 space-y-2">
                  <li>• Native 4K encodes with HDR grading</li>
                  <li>• Multi-language subtitle packs at launch</li>
                  <li>• Secure direct downloads & adaptive streaming</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-200">
                <p className="text-xs uppercase tracking-wide text-neutral-400">Timeline</p>
                <ul className="mt-2 space-y-2">
                  <li><span className="font-medium text-white">Q2 2026:</span> Beta access for early adopters</li>
                  <li><span className="font-medium text-white">Q3 2026:</span> Public rollout with 50 curated titles</li>
                  <li><span className="font-medium text-white">Q4 2026:</span> Interactive watch parties & live chat</li>
                </ul>
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 sm:max-w-xl">
              <p className="text-sm font-semibold text-white">Be first to know when films go live</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="bg-neutral-900/60 text-neutral-100 placeholder:text-neutral-500"
                />
                <Button type="button" variant="primary" onClick={() => void handleSubmit()} disabled={status === "loading"}>
                  {status === "loading" ? "Sending..." : "Notify me"}
                </Button>
              </div>
              {status === "success" ? <p className="text-xs text-emerald-300">Thanks! You will receive launch updates.</p> : null}
              {status === "disabled" ? (
                <p className="text-xs text-neutral-300">Notifications are temporarily disabled while we finalise the roll-out.</p>
              ) : null}
              {status === "error" ? <p className="text-xs text-rose-300">Something went wrong. Please try again in a moment.</p> : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary" className="w-fit">
                <Link href={`/${locale}/software`}>Browse the library</Link>
              </Button>
              <Button asChild variant="ghost" className="w-fit">
                <Link href={`/${locale}`}>Back to home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-white/10 bg-neutral-950/60">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">Upcoming feature slate</CardTitle>
              <CardDescription className="text-sm text-neutral-300">
                A snapshot of titles currently in clearance and mastering.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sortedFilms.map((film) => (
                <div
                  key={film.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-white/30 hover:bg-white/10"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-white">{film.title}</h3>
                    <Badge className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                      {film.releaseWindow}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-neutral-300">{film.synopsis}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-200">
                    {film.genres.map((genre) => (
                      <span key={`${film.title}-${genre}`} className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
                        {genre}
                      </span>
                    ))}
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-emerald-200">
                      Rating {film.rating}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-neutral-950/60">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">Launch pillars</CardTitle>
              <CardDescription className="text-sm text-neutral-300">
                Our roadmap for the film experience inside SOFT-HUB.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {EDITORIAL_THEMES.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-semibold text-white">{item.label}</p>
                  <p className="mt-1 text-sm text-neutral-300">{item.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-neutral-950/60">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">Stay in the loop</CardTitle>
              <CardDescription className="text-sm text-neutral-300">
                Until launch, explore our active collections and insights.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild variant="outline" className="rounded-full border-white/20 text-sm text-neutral-100 hover:border-white/40 hover:bg-white/10">
                <Link href={`/${locale}/collections`}>Curated collections</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-white/20 text-sm text-neutral-100 hover:border-white/40 hover:bg-white/10">
                <Link href={`/${locale}/insights`}>Insights & reports</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-white/20 text-sm text-neutral-100 hover:border-white/40 hover:bg-white/10">
                <Link href={`/${locale}/community/forums`}>Community forums</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </AppShell>
  );
}
