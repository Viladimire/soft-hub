import { NextResponse, type NextRequest } from "next/server";

import { fetchSoftwareDatasetFromGitHub, GitHubConfigError } from "@/lib/services/github/softwareDataStore";
import { getAdminSecretOrThrow, isAdminRequestAuthorized } from "@/lib/auth/admin-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Software } from "@/lib/types/software";

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

const upsertSoftwareToSupabase = async (software: Software) => {
  const supabase = createSupabaseServerClient();

  const releaseDate = software.releaseDate ? software.releaseDate.slice(0, 10) : null;

  const { error } = await supabase
    .from("software")
    .upsert(
      {
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
        developer: (software.developer ?? {}) as any,
        features: software.features ?? [],
        is_featured: software.isFeatured ?? false,
        is_trending: software.isTrending ?? false,
        release_date: releaseDate,
        stats: (software.stats ?? {}) as any,
        media: (software.media ?? {}) as any,
        requirements: (software.requirements ?? null) as any,
        changelog: (software.changelog ?? null) as any,
      },
      { onConflict: "slug" },
    );

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

    for (const item of items) {
      await upsertSoftwareToSupabase(item);
    }

    // Mirror delete: remove rows not present in GitHub dataset
    const slugs = items.map((item) => item.slug);
    const existing = await supabase.from("software").select("slug");
    const existingSlugs = (existing.data ?? []).map((row) => (row as any).slug as string).filter(Boolean);

    const toDelete = existingSlugs.filter((slug) => !slugs.includes(slug));
    if (toDelete.length) {
      const { error } = await supabase.from("software").delete().in("slug", toDelete);
      if (error) throw error;
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
