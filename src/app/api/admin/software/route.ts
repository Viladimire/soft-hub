import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  deleteSoftwareFromGitHub,
  fetchSoftwareDatasetFromGitHub,
  GitHubConfigError,
  publishLatestSoftwarePagesToGitHub,
  saveSoftwareToGitHub,
} from "@/lib/services/github/softwareDataStore";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import type { Platform, Software, SoftwareCategory } from "@/lib/types/software";
import { softwareSchema } from "@/lib/validations/software.schema";
import { getAdminSecretOrThrow, isAdminRequestAuthorized } from "@/lib/auth/admin-session";

const platformValues = ["windows", "mac", "linux", "android", "ios", "web"] as const satisfies readonly Platform[];
const categoryValues = [
  "software",
  "games",
  "operating-systems",
  "multimedia",
  "utilities",
  "development",
  "security",
  "productivity",
  "education",
] as const satisfies readonly SoftwareCategory[];

const adminSoftwareSchema = softwareSchema.safeExtend({
  id: z.string().uuid().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  previousSlug: z.string().min(1).optional(),
  platforms: z
    .array(z.enum(platformValues))
    .min(1, "Select at least one platform")
    .transform((value) => value as Platform[]),
  categories: z
    .array(z.enum(categoryValues))
    .min(1, "Select at least one category")
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
    const message = error.message || fallbackMessage;
    const status =
      message.includes("Missing GitHub configuration values") ||
      message.includes("ADMIN_API_SECRET is not configured") ||
      message.includes("Supabase URL is missing") ||
      message.includes("service role")
        ? 501
        : 500;
    return NextResponse.json({ message }, { status });
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json({ message: "Validation failed", errors: error.flatten() }, { status: 400 });
  }

  const maybe = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
  const message = typeof maybe?.message === "string" ? maybe.message : "";
  const details = typeof maybe?.details === "string" ? maybe.details : "";
  const hint = typeof maybe?.hint === "string" ? maybe.hint : "";
  const code = typeof maybe?.code === "string" ? maybe.code : "";
  const extra = [code && `code=${code}`, details && `details=${details}`, hint && `hint=${hint}`]
    .filter(Boolean)
    .join(" | ");
  const stack = error instanceof Error ? error.stack ?? "" : "";
  const debug = {
    code: code || undefined,
    details: details || undefined,
    hint: hint || undefined,
    stack: stack || undefined,
  };

  if (message || extra || stack) {
    const combined = message
      ? `${fallbackMessage}: ${message}${extra ? ` (${extra})` : ""}`
      : `${fallbackMessage}${extra ? ` (${extra})` : ""}`;
    return NextResponse.json(
      {
        message: combined,
        debug,
      },
      { status: 500 },
    );
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
        developer: (software.developer ?? {}) as unknown as Json,
        features: software.features ?? [],
        is_featured: software.isFeatured ?? false,
        is_trending: software.isTrending ?? false,
        release_date: releaseDate,
        stats: (software.stats ?? {}) as unknown as Json,
        media: (software.media ?? {}) as unknown as Json,
        requirements: (software.requirements ?? null) as unknown as Json,
        changelog: (software.changelog ?? null) as unknown as Json,
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
    let record = toSoftwareRecord(software);
    const previousSlug = software.previousSlug?.trim();

    const warnings: string[] = [];

    // If the client didn't send an id (or lost it), but the slug already exists in Supabase,
    // reuse the existing identity to avoid accidental duplicates.
    if (!software.id) {
      try {
        const supabase = createSupabaseServerClient();
        const { data } = await supabase
          .from("software")
          .select("id, created_at")
          .eq("slug", record.slug)
          .maybeSingle();

        if (data?.id) {
          record = {
            ...record,
            id: data.id,
            createdAt: typeof data.created_at === "string" && data.created_at.trim() ? data.created_at : record.createdAt,
          };
        }
      } catch {
        // Best effort only.
      }
    }

    // GitHub is the source of truth (DB-free scaling)
    if (previousSlug && previousSlug !== record.slug) {
      try {
        await deleteSoftwareFromGitHub(previousSlug);
      } catch (error) {
        console.error("GitHub delete for previous slug failed", error);
      }
    }

    await saveSoftwareToGitHub(record);

    try {
      await publishLatestSoftwarePagesToGitHub();
    } catch (error) {
      console.error("Failed to publish latest software pages (best effort)", error);
      warnings.push("Saved to GitHub, but failed to publish latest pages.");
    }

    // Supabase sync is optional (best-effort)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      if (previousSlug && previousSlug !== record.slug) {
        try {
          await deleteSoftwareFromSupabase(previousSlug);
        } catch (error) {
          console.error("Failed to remove previous slug from Supabase", error);
        }
      }

      try {
        await upsertSoftwareToSupabase(record);
      } catch (error) {
        console.error("Supabase upsert failed (best effort)", error);
        warnings.push("Saved to GitHub, but failed to sync Supabase.");
      }
    }

    return NextResponse.json({ item: record, warnings }, { status: 201 });
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
    const warnings: string[] = [];

    // GitHub is the source of truth
    await deleteSoftwareFromGitHub(validatedSlug);

    try {
      await publishLatestSoftwarePagesToGitHub();
    } catch (error) {
      console.error("Failed to publish latest software pages after delete (best effort)", error);
      warnings.push("Deleted from GitHub, but failed to publish latest pages.");
    }

    // Supabase delete is optional (best-effort)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        await deleteSoftwareFromSupabase(validatedSlug);
      } catch (error) {
        console.error("Supabase delete failed (best effort)", error);
        warnings.push("Deleted from GitHub, but failed to sync Supabase.");
      }
    }

    return NextResponse.json({ slug: validatedSlug, warnings });
  } catch (error) {
    return handleError(error, "Failed to delete software entry");
  }
};
