import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  deleteSoftwareFromGitHub,
  fetchSoftwareDatasetFromGitHub,
  GitHubConfigError,
  saveSoftwareToGitHub,
} from "@/lib/services/github/softwareDataStore";
import type { Platform, Software, SoftwareCategory } from "@/lib/types/software";
import { softwareSchema } from "@/lib/validations/software.schema";

const adminSecret = process.env.ADMIN_API_SECRET;

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
});

const ensureAuthorized = (request: NextRequest) => {
  if (!adminSecret) {
    throw new GitHubConfigError("ADMIN_API_SECRET is not configured");
  }

  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : header?.trim();

  if (!token || token !== adminSecret) {
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
  } satisfies Software;
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
    const result = await saveSoftwareToGitHub(toSoftwareRecord(software));
    return NextResponse.json({ item: result }, { status: 201 });
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
    return NextResponse.json({ item: removed });
  } catch (error) {
    return handleError(error, "Failed to delete software entry");
  }
};
