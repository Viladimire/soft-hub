import { NextResponse, type NextRequest } from "next/server";

import type { Json } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchSoftwareDatasetFromGitHub } from "@/lib/services/github/softwareDataStore";
import type { Software } from "@/lib/types/software";

const isAuthorizedCronRequest = (request: NextRequest) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided =
    request.headers.get("x-cron-secret") ||
    new URL(request.url).searchParams.get("secret") ||
    "";
  return provided === secret;
};

const chunk = <T,>(items: T[], size: number) => {
  const out: T[][] = [];
  const safeSize = Math.max(size, 1);
  for (let i = 0; i < items.length; i += safeSize) {
    out.push(items.slice(i, i + safeSize));
  }
  return out;
};

const SOFTWARE_UPSERT_BATCH_SIZE = 200;
const SOFTWARE_DELETE_BATCH_SIZE = 500;

const getSlugFromRow = (row: unknown): string | null => {
  if (!row || typeof row !== "object") return null;
  if (!("slug" in row)) return null;
  const slug = (row as { slug?: unknown }).slug;
  return typeof slug === "string" && slug.trim() ? slug : null;
};

const toSupabaseSoftwareRow = (software: Software) => {
  const releaseDate = software.releaseDate ? software.releaseDate.slice(0, 10) : null;
  return {
    slug: software.slug,
    name: software.name,
    summary: software.summary ?? null,
    description: software.description,
    version: software.version,
    size_in_bytes: software.sizeInBytes ?? null,
    platforms: software.platforms,
    categories: software.categories,
    type: software.type,
    website_url: software.websiteUrl ?? null,
    download_url: software.downloadUrl,
    developer: (software.developer ?? {}) as unknown as Json,
    features: software.features ?? [],
    is_featured: software.isFeatured ?? false,
    is_trending: software.isTrending ?? false,
    release_date: releaseDate,
    stats: (software.stats ?? {}) as unknown as Json,
    media: (software.media ?? {}) as unknown as Json,
    requirements: (software.requirements ?? null) as unknown as Json,
    changelog: (software.changelog ?? null) as unknown as Json,
  };
};

const upsertBatchToSupabase = async (batch: Software[]) => {
  const supabase = createSupabaseServerClient();
  const rows = batch.map(toSupabaseSoftwareRow);
  const { error } = await supabase.from("software").upsert(rows, { onConflict: "slug" });
  if (error) throw error;
};

export const POST = async (request: NextRequest) => {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ message: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 501 });
  }

  try {
    const { items } = await fetchSoftwareDatasetFromGitHub();

    const supabase = createSupabaseServerClient();

    const before = await supabase.from("software").select("slug", { count: "exact" });
    const beforeCount = before.count ?? 0;

    const upsertBatches = chunk(items, SOFTWARE_UPSERT_BATCH_SIZE);
    for (const batch of upsertBatches) {
      await upsertBatchToSupabase(batch);
    }

    const slugs = items.map((item) => item.slug);
    const existing = await supabase.from("software").select("slug");
    const existingSlugs = (existing.data ?? []).map(getSlugFromRow).filter((slug): slug is string => Boolean(slug));

    const toDelete = existingSlugs.filter((slug) => !slugs.includes(slug));
    if (toDelete.length) {
      const deleteBatches = chunk(toDelete, SOFTWARE_DELETE_BATCH_SIZE);
      for (const batch of deleteBatches) {
        const { error } = await supabase.from("software").delete().in("slug", batch);
        if (error) throw error;
      }
    }

    const after = await supabase.from("software").select("slug", { count: "exact" });
    const afterCount = after.count ?? 0;

    return NextResponse.json({
      ok: true,
      message: "Cron sync completed",
      beforeCount,
      githubCount: items.length,
      afterCount,
      deleted: toDelete.length,
    });
  } catch (error) {
    console.error("POST /api/cron/sync-supabase failed", error);
    const message = error instanceof Error ? error.message : "Failed to sync dataset";
    return NextResponse.json({ message }, { status: 500 });
  }
};
