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
import type { Json } from "@/lib/supabase/database.types";
import type { Platform, Software, SoftwareCategory } from "@/lib/types/software";
import { softwareSchema } from "@/lib/validations/software.schema";
import { getAdminSecretOrThrow, isAdminRequestAuthorized } from "@/lib/auth/admin-session";
import { supabaseConfig } from "@/lib/supabase/config";

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
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json({ message: "Validation failed", errors: error.flatten() }, { status: 400 });
  }

  if (!supabaseConfig.serviceRoleKey) {
    return NextResponse.json(
      {
        message:
          "Supabase service role key is missing. Set SUPABASE_SERVICE_ROLE_KEY on the server (Vercel env) to allow admin writes.",
      },
      { status: 501 },
    );
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
    const record = toSoftwareRecord(software);
    const previousSlug = software.previousSlug?.trim();

    const warnings: string[] = [];

    if (previousSlug && previousSlug !== record.slug) {
      try {
        await deleteSoftwareFromSupabase(previousSlug);
      } catch (error) {
        console.error("Failed to remove previous slug from Supabase", error);
      }
    }

    await upsertSoftwareToSupabase(record);

    try {
      if (previousSlug && previousSlug !== record.slug) {
        try {
          await deleteSoftwareFromGitHub(previousSlug);
        } catch (error) {
          console.error("GitHub delete for previous slug failed", error);
        }
      }

      await saveSoftwareToGitHub(record);
    } catch (error) {
      console.error("GitHub save failed (best effort)", error);
      warnings.push("Failed to update GitHub automatically, but the change was saved in the database.");
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
    await deleteSoftwareFromSupabase(validatedSlug);

    const warnings: string[] = [];

    try {
      await deleteSoftwareFromGitHub(validatedSlug);
    } catch (error) {
      console.error("GitHub delete failed (best effort)", error);
      warnings.push("Deleted from the database, but failed to update GitHub automatically.");
    }

    return NextResponse.json({ slug: validatedSlug, warnings });
  } catch (error) {
    return handleError(error, "Failed to delete software entry");
  }
};
