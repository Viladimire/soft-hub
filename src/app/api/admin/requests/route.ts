import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  deleteRequestFromGitHub,
  fetchRequestsDatasetFromGitHub,
  GitHubConfigError,
  saveRequestToGitHub,
} from "@/lib/services/github/requestsDataStore";
import { getAdminSecretOrThrow, isAdminRequestAuthorized } from "@/lib/auth/admin-session";
import type { SoftwareRequest, SoftwareRequestStatus } from "@/lib/types/software-request";

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

const statusSchema = z.enum(["new", "reviewing", "accepted", "rejected"] satisfies readonly SoftwareRequestStatus[]);

const requestSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(120),
  websiteUrl: z.string().url().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  status: statusSchema.optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

type AdminRequestInput = z.infer<typeof requestSchema>;

const normalizeRequestPayload = (payload: AdminRequestInput): SoftwareRequest => {
  const now = new Date().toISOString();
  return {
    id: payload.id ?? crypto.randomUUID(),
    name: payload.name,
    websiteUrl: payload.websiteUrl ?? null,
    notes: payload.notes ?? null,
    status: payload.status ?? "new",
    createdAt: payload.createdAt ?? now,
    updatedAt: now,
  } satisfies SoftwareRequest;
};

export const GET = async (request: NextRequest) => {
  const unauthorized = ensureAuthorized(request);
  if (unauthorized) return unauthorized;

  try {
    const dataset = await fetchRequestsDatasetFromGitHub();
    return NextResponse.json(dataset);
  } catch (error) {
    return handleError(error, "Failed to fetch requests dataset from GitHub");
  }
};

export const POST = async (request: NextRequest) => {
  const unauthorized = ensureAuthorized(request);
  if (unauthorized) return unauthorized;

  try {
    const payload = await request.json();
    const parsed = requestSchema.parse(payload);
    const normalized = normalizeRequestPayload(parsed);
    const updated = await saveRequestToGitHub(normalized);
    return NextResponse.json({ item: updated }, { status: 201 });
  } catch (error) {
    return handleError(error, "Failed to create or update request");
  }
};

const deleteSchema = z.object({
  id: z.string().uuid(),
});

export const DELETE = async (request: NextRequest) => {
  const unauthorized = ensureAuthorized(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  try {
    const { id: validatedId } = deleteSchema.parse({ id });
    const removed = await deleteRequestFromGitHub(validatedId);
    return NextResponse.json({ item: removed });
  } catch (error) {
    return handleError(error, "Failed to delete request");
  }
};
