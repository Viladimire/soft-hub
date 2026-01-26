import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/utils/rate-limit";
import { recordSearchEvent } from "@/lib/services/analytics.server";

const filtersSchema = z.object({
  category: z.string().max(80).nullable().optional(),
  platforms: z.array(z.string().max(40)).max(10).optional(),
  types: z.array(z.string().max(40)).max(10).optional(),
  sortBy: z.string().max(40).optional(),
  page: z.number().int().min(1).max(1000).optional(),
});

const bodySchema = z.object({
  query: z.string().min(1).max(200),
  filters: filtersSchema.optional(),
  resultsCount: z.number().int().min(0).max(10_000),
  durationMs: z.number().int().min(0).max(120_000).optional(),
  locale: z.string().min(2).max(10).optional(),
  source: z.string().max(60).optional(),
});

export const POST = async (request: NextRequest) => {
  const limit = rateLimit(request, { keyPrefix: "analytics:search", limit: 120, windowMs: 60_000 });
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

    const filters = payload.filters
      ? Object.fromEntries(
          Object.entries(payload.filters).filter(([, value]) =>
            Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null,
          ),
        )
      : null;

    const supabase = createSupabaseServerClient();

    await recordSearchEvent(supabase, {
      query: payload.query,
      filters,
      resultsCount: payload.resultsCount,
      durationMs: payload.durationMs,
      locale: payload.locale,
      source: payload.source,
    });

    return NextResponse.json({ status: "ok", event: "search" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation failed", errors: error.flatten() }, { status: 400 });
    }

    console.error("POST /api/analytics/search failed", error);
    return NextResponse.json({ message: "Analytics tracking failed" }, { status: 500 });
  }
};
