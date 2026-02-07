import { NextResponse, type NextRequest } from "next/server";

import { fetchSoftwareDatasetFromGitHub, GitHubConfigError } from "@/lib/services/github/softwareDataStore";
import { getAdminSecretOrThrow, isAdminRequestAuthorized } from "@/lib/auth/admin-session";
import type { Json } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Software } from "@/lib/types/software";

const getSlugFromRow = (row: unknown): string | null => {
  if (!row || typeof row !== "object") return null;
  if (!("slug" in row)) return null;
  const slug = (row as { slug?: unknown }).slug;
  return typeof slug === "string" && slug.trim() ? slug : null;
};

const ensureAuthorized = (request: NextRequest) => {
  try {
    getAdminSecretOrThrow();
  } catch (error) {
    throw new GitHubConfigError(error instanceof Error ? error.message : "ADMIN_API_SECRET is not configured");
  }

  if (!isAdminRequestAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return null;
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
  const unauthorized = ensureAuthorized(request);
  if (unauthorized) return unauthorized;

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
      message: "Sync completed",
      beforeCount,
      githubCount: items.length,
      afterCount,
      deleted: toDelete.length,
    });
  } catch (error) {
    if (error instanceof GitHubConfigError) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    console.error("Failed to sync GitHub dataset to Supabase", error);
    return NextResponse.json({ message: "Failed to sync dataset" }, { status: 500 });
  }
};
