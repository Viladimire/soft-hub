"use client";

import { useLocale } from "next-intl";
import Link from "next/link";

import type { Software } from "@/lib/types/software";
import { formatBytes, formatReleaseDate } from "@/lib/utils/format";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const SoftwareDetailsTabs = ({ software }: { software: Software }) => {
  const locale = useLocale();
  const releases = software.releases ?? [];

  return (
    <Tabs defaultValue="about" className="space-y-4">
      <TabsList className="h-auto flex-wrap justify-start gap-2 bg-white/5 p-2">
        <TabsTrigger value="about" className="min-w-0 px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm">
          About
        </TabsTrigger>
        <TabsTrigger value="requirements" className="min-w-0 px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm">
          Requirements
        </TabsTrigger>
        <TabsTrigger value="changelog" className="min-w-0 px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm">
          Changelog
        </TabsTrigger>
        <TabsTrigger value="versions" className="min-w-0 px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm">
          Versions
        </TabsTrigger>
      </TabsList>

      <TabsContent value="about">
        <Card className="border-white/10 bg-white/5">
          <CardContent className="space-y-6 p-6 text-sm leading-7 text-neutral-200">
            {software.summary ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Description</p>
                <p className="text-neutral-200">{software.summary}</p>
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Details</p>
              <p className="text-neutral-200">{software.description}</p>
            </div>

            {software.features?.length ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Key features</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {software.features.slice(0, 10).map((feature) => (
                    <div key={feature} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6">
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="requirements">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-white/10 bg-white/5">
            <CardContent className="space-y-3 p-6">
              <p className="text-xs uppercase tracking-wide text-neutral-400">Minimum</p>
              <ul className="list-disc space-y-1 pl-6 text-sm text-neutral-200">
                {(software.requirements?.minimum ?? []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/5">
            <CardContent className="space-y-3 p-6">
              <p className="text-xs uppercase tracking-wide text-neutral-400">Recommended</p>
              <ul className="list-disc space-y-1 pl-6 text-sm text-neutral-200">
                {(software.requirements?.recommended ?? []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="changelog">
        <Card className="border-white/10 bg-white/5">
          <CardContent className="space-y-4 p-6">
            {(software.changelog ?? []).map((entry) => (
              <div key={`${entry.version}-${entry.date}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-white">v{entry.version}</span>
                  <span className="text-xs text-neutral-400">{formatReleaseDate(entry.date, locale)}</span>
                </div>
                <ul className="mt-3 list-disc space-y-1 pl-6 text-xs text-neutral-200">
                  {entry.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              </div>
            ))}
            {!software.changelog?.length ? (
              <p className="text-sm text-neutral-300">No changelog available yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="versions">
        <Card className="border-white/10 bg-white/5">
          <CardContent className="space-y-3 p-6">
            {releases.length ? (
              <div className="space-y-3">
                {releases.map((release) => (
                  <div
                    key={release.id}
                    className="grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-200"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-white">v{release.version}</span>
                      <span className="text-xs text-neutral-400">
                        {release.releaseDate ? formatReleaseDate(release.releaseDate, locale) : ""}
                      </span>
                    </div>
                    {release.fileName ? (
                      <div className="text-xs text-neutral-300">File Name: {release.fileName}</div>
                    ) : null}
                    {release.additionalInfo ? (
                      <div className="text-xs text-neutral-300">Additional info: {release.additionalInfo}</div>
                    ) : null}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-300">
                      <span>Size: {formatBytes(release.sizeInBytes)}</span>
                      <span>Downloads: {release.downloadsCount}</span>
                    </div>
                    <div>
                      <Link
                        href={release.downloadUrl}
                        className="text-xs font-semibold text-white underline decoration-white/20 underline-offset-4 hover:decoration-white/60"
                      >
                        Download this version
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-300">No previous versions available yet.</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
