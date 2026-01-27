import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  deleteSoftwareFromGitHub,
  fetchSoftwareDatasetFromGitHub,
  GitHubConfigError,
  saveSoftwareToGitHub,
} from "@/lib/services/github/softwareDataStore";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Platform, Software, SoftwareCategory } from "@/lib/types/software";
import { softwareSchema } from "@/lib/validations/software.schema";
import { getAdminSecretOrThrow, isAdminRequestAuthorized } from "@/lib/auth/admin-session";

const platformValues = ["windows", "mac", "linux"] as const satisfies readonly Platform[];
const categoryValues = ["software", "games"] as const satisfies readonly SoftwareCategory[];

const adminSoftwareSchema = softwareSchema.safeExtend({
  id: z.string().uuid().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  platforms: z
    .array(z.enum(platformValues))
    .min(1, "اختر منصة واحدة على الأقل")
    .transform((value) => value as Platform[]),
  categories: z
    .array(z.enum(categoryValues))
    .min(1, "اختر فئة واحدة على الأقل")
    .transform((value) => value as SoftwareCategory[]),
  developer: z.record(z.string(), z.unknown()).optional(),
  features: z.array(z.string()).optional(),
});

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

const handleError = (error: unknown, fallbackMessage: string) => {
  if (error instanceof GitHubConfigError) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json({ message: "Validation failed", errors: error.flatten() }, { status: 400 });
  }

  console.error(fallbackMessage, error);
  return NextResponse.json({ message: fallbackMessage }, { status: 500 });
};

type AdminSoftwareInput = z.infer<typeof adminSoftwareSchema>;

const toSoftwareRecord = (payload: AdminSoftwareInput): Software => {
  const now = new Date().toISOString();

  return {
    ...payload,
    id: payload.id ?? randomUUID(),
    createdAt: payload.createdAt ?? now,
    updatedAt: now,
    websiteUrl: payload.websiteUrl ? payload.websiteUrl : null,
    requirements: payload.requirements ?? {},
    changelog: payload.changelog ?? [],
    isTrending: payload.isTrending ?? false,
    developer: payload.developer ?? {},
    features: payload.features ?? [],
  } satisfies Software;
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

  if (error) {
    throw error;
  }
};

const deleteSoftwareFromSupabase = async (slug: string) => {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("software").delete().eq("slug", slug);
  if (error) {
    throw error;
  }
};

const syncGitHubDatasetToSupabase = async () => {
  const { items } = await fetchSoftwareDatasetFromGitHub();
  const supabase = createSupabaseServerClient();

  const before = await supabase.from("software").select("slug", { count: "exact" });
  const beforeCount = before.count ?? 0;

  for (const item of items) {
    await upsertSoftwareToSupabase(item);
  }

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

  return {
    beforeCount,
    githubCount: items.length,
    afterCount,
    deleted: toDelete.length,
  };
};

export const GET = async (request: NextRequest) => {
  const unauthorized = ensureAuthorized(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const dataset = await fetchSoftwareDatasetFromGitHub();
    return NextResponse.json(dataset);
  } catch (error) {
    return handleError(error, "Failed to fetch dataset from GitHub");
  }
};

export const POST = async (request: NextRequest) => {
  const unauthorized = ensureAuthorized(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const payload = await request.json();
    const software = adminSoftwareSchema.parse(payload);
    const record = toSoftwareRecord(software);
    const result = await saveSoftwareToGitHub(record);

    try {
      const sync = await syncGitHubDatasetToSupabase();
      return NextResponse.json({ item: result, sync }, { status: 201 });
    } catch (syncError) {
      console.error("Supabase sync failed after GitHub save", syncError);
      return NextResponse.json(
        {
          message:
            "تم حفظ التعديل على GitHub لكن فشل مزامنته إلى Supabase. هذا قد يسبب اختلافًا في العدد مؤقتًا بين الموقع والأدمن.",
          item: result,
        },
        { status: 502 },
      );
    }
  } catch (error) {
    return handleError(error, "Failed to create or update software entry");
  }
};

const deleteSchema = z.object({
  slug: z.string().min(1),
});

export const DELETE = async (request: NextRequest) => {
  const unauthorized = ensureAuthorized(request);
  if (unauthorized) {
    return unauthorized;
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  try {
    const { slug: validatedSlug } = deleteSchema.parse({ slug });
    const removed = await deleteSoftwareFromGitHub(validatedSlug);

    try {
      await deleteSoftwareFromSupabase(validatedSlug);
    } catch (syncError) {
      console.error("Supabase delete failed after GitHub delete", syncError);
    }

    try {
      const sync = await syncGitHubDatasetToSupabase();
      return NextResponse.json({ item: removed, sync });
    } catch (syncError) {
      console.error("Supabase full sync failed after GitHub delete", syncError);
      return NextResponse.json(
        {
          message:
            "تم حذف العنصر من GitHub لكن فشل مزامنته إلى Supabase. هذا قد يسبب اختلافًا في العدد مؤقتًا بين الموقع والأدمن.",
          item: removed,
        },
        { status: 502 },
      );
    }
  } catch (error) {
    return handleError(error, "Failed to delete software entry");
  }
};
