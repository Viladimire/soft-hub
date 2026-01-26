import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { rateLimit } from "@/lib/utils/rate-limit";
import type { SoftwareRequest } from "@/lib/types/software-request";
import { saveRequestToGitHub, GitHubConfigError } from "@/lib/services/github/requestsDataStore";

const bodySchema = z.object({
  name: z.string().min(2).max(120),
  websiteUrl: z.string().url().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const POST = async (request: NextRequest) => {
  const limit = rateLimit(request, { keyPrefix: "requests:create", limit: 12, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json(
      { message: "Too many requests" },
      {
        status: 429,
        headers: {
          "x-ratelimit-limit": String(limit.limit),
          "x-ratelimit-remaining": String(limit.remaining),
          "x-ratelimit-reset": String(limit.resetAt),
        },
      },
    );
  }

  try {
    const payload = bodySchema.parse(await request.json());
    const now = new Date().toISOString();

    const item: SoftwareRequest = {
      id: crypto.randomUUID(),
      name: payload.name,
      websiteUrl: payload.websiteUrl ?? null,
      notes: payload.notes ?? null,
      status: "new",
      createdAt: now,
      updatedAt: now,
    };

    const saved = await saveRequestToGitHub(item);
    return NextResponse.json({ item: saved }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation failed", errors: error.flatten() }, { status: 400 });
    }

    if (error instanceof GitHubConfigError) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    console.error("POST /api/requests failed", error);
    return NextResponse.json({ message: "Request submission failed" }, { status: 500 });
  }
};
