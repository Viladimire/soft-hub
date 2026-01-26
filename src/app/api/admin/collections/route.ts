import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { deleteCollectionFromGitHub, fetchCollectionsDatasetFromGitHub, saveCollectionToGitHub } from "@/lib/services/github/collectionsDataStore";
import { getAdminSecretOrThrow, isAdminRequestAuthorized } from "@/lib/auth/admin-session";
import type { Collection } from "@/lib/types/collection";

const ensureAuthorized = (request: NextRequest) => {
  try {
    getAdminSecretOrThrow();
  } catch (error) {
    const message = error instanceof Error ? error.message : "ADMIN_API_SECRET is not configured";
    return NextResponse.json({ message }, { status: 500 });
  }

  if (!isAdminRequestAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return null;
};

const collectionItemSchema = z.object({
  softwareId: z.string().min(1).optional(),
  softwareSlug: z.string().min(1).optional(),
  position: z.number().int().nonnegative(),
  highlight: z.string().optional().nullable(),
});

const themeSchema = z.object({
  background: z.string().optional(),
  foreground: z.string().optional(),
  gradientStart: z.string().optional(),
  gradientEnd: z.string().optional(),
  pattern: z.string().optional(),
});

const collectionSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  coverImageUrl: z.string().url().optional().nullable(),
  accentColor: z.string().optional().nullable(),
  theme: themeSchema.optional(),
  isFeatured: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  publishedAt: z.string().datetime().optional().nullable(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  items: z.array(collectionItemSchema).min(1),
});

const buildErrorResponse = (error: unknown, fallback: string) => {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ message: "Validation failed", errors: error.flatten() }, { status: 400 });
  }

  console.error(fallback, error);
  return NextResponse.json({ message: fallback }, { status: 500 });
};

const normalizeCollectionPayload = (payload: z.infer<typeof collectionSchema>): Collection => {
  const now = new Date().toISOString();

  return {
    id: payload.id ?? crypto.randomUUID(),
    slug: payload.slug,
    title: payload.title,
    subtitle: payload.subtitle ?? null,
    description: payload.description ?? null,
    coverImageUrl: payload.coverImageUrl ?? null,
    accentColor: payload.accentColor ?? null,
    theme: payload.theme ?? {},
    isFeatured: payload.isFeatured ?? false,
    displayOrder: payload.displayOrder ?? 0,
    publishedAt: payload.publishedAt ?? null,
    createdAt: payload.createdAt ?? now,
    updatedAt: now,
    items: payload.items.map((item, index) => ({
      collectionId: payload.id ?? payload.slug,
      softwareId: item.softwareId ?? item.softwareSlug ?? "",
      softwareSlug: item.softwareSlug,
      position: item.position ?? index,
      highlight: item.highlight ?? null,
      createdAt: now,
      updatedAt: now,
    })),
  } satisfies Collection;
};

export const GET = async (request: NextRequest) => {
  const unauthorized = ensureAuthorized(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const dataset = await fetchCollectionsDatasetFromGitHub();
    return NextResponse.json(dataset);
  } catch (error) {
    return buildErrorResponse(error, "Failed to fetch collections dataset from GitHub");
  }
};

export const POST = async (request: NextRequest) => {
  const unauthorized = ensureAuthorized(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const payload = await request.json();
    const parsed = collectionSchema.parse(payload);
    const normalized = normalizeCollectionPayload(parsed);
    const updated = await saveCollectionToGitHub(normalized);

    return NextResponse.json({ item: updated }, { status: 201 });
  } catch (error) {
    return buildErrorResponse(error, "Failed to create or update collection");
  }
};

const deleteSchema = z.object({ slug: z.string().min(1) });

export const DELETE = async (request: NextRequest) => {
  const unauthorized = ensureAuthorized(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const parsed = deleteSchema.parse({ slug });

    const removed = await deleteCollectionFromGitHub(parsed.slug);
    return NextResponse.json({ item: removed });
  } catch (error) {
    return buildErrorResponse(error, "Failed to delete collection");
  }
};
