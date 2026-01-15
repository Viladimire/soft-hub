"use client";

import Link from "next/link";
import { Download, ShieldCheck } from "lucide-react";

import type { Software } from "@/lib/types/software";
import { formatBytes, formatReleaseDate } from "@/lib/utils/format";
import { incrementDownloads } from "@/lib/services/analyticsService";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const DownloadCard = ({ software, locale }: { software: Software; locale: string }) => {
  return (
    <Card className="border-white/10 bg-white/5 lg:sticky lg:top-24">
      <CardContent className="space-y-4 p-4 sm:p-6">
        <Button asChild variant="primary" className="w-full gap-2 rounded-2xl py-5 text-sm sm:py-6">
          <Link
            href={software.downloadUrl}
            onClick={() => {
              void incrementDownloads(software.id);
            }}
          >
            <Download className="h-4 w-4" />
            Download now
          </Link>
        </Button>

        <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
          <div className="flex items-center justify-between text-neutral-200">
            <span className="text-xs text-neutral-400">Version</span>
            <span className="font-semibold text-white">{software.version}</span>
          </div>
          <div className="flex items-center justify-between text-neutral-200">
            <span className="text-xs text-neutral-400">Size</span>
            <span className="font-semibold text-white">{formatBytes(software.sizeInBytes)}</span>
          </div>
          <div className="flex items-center justify-between text-neutral-200">
            <span className="text-xs text-neutral-400">Updated</span>
            <span className="font-semibold text-white">{formatReleaseDate(software.updatedAt, locale)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          <ShieldCheck className="h-4 w-4" />
          <span>Verified download link</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {software.platforms.map((platform) => (
            <Badge key={platform} className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-wide text-white">
              {platform}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
