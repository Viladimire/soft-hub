"use client";

import { useLocale } from "next-intl";

import type { Software } from "@/lib/types/software";
import { formatReleaseDate } from "@/lib/utils/format";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const SoftwareDetailsTabs = ({ software }: { software: Software }) => {
  const locale = useLocale();

  return (
    <Tabs defaultValue="about" className="space-y-4">
      <TabsList className="bg-white/5">
        <TabsTrigger value="about">About</TabsTrigger>
        <TabsTrigger value="requirements">Requirements</TabsTrigger>
        <TabsTrigger value="changelog">Changelog</TabsTrigger>
      </TabsList>

      <TabsContent value="about">
        <Card className="border-white/10 bg-white/5">
          <CardContent className="space-y-3 p-6 text-sm leading-7 text-neutral-200">
            <p>{software.description}</p>
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
    </Tabs>
  );
};
