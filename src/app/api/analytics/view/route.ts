import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/utils/rate-limit";
import {
  incrementSoftwareStat,
  recordAnalyticsEvent,
  resolveSoftware,
} from "@/lib/services/analytics.server";

const bodySchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1).optional(),
  locale: z.string().min(2).max(10).optional(),
  ref: z.string().max(120).optional(),
});

export const POST = async (request: NextRequest) => {
  const limit = rateLimit(request, { keyPrefix: "analytics:view", limit: 60, windowMs: 60_000 });
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

    if (!payload.id && !payload.slug) {
      return NextResponse.json({ message: "Either id or slug is required" }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();

    const software = await resolveSoftware(supabase, {
      id: payload.id,
      slug: payload.slug,
    });

    if (!software) {
      return NextResponse.json({ message: "Software not found" }, { status: 404 });
    }

    const metadata: Record<string, string> = {};
    if (payload.locale) metadata.locale = payload.locale;
    if (payload.ref) metadata.ref = payload.ref;
    if (payload.slug) metadata.slug = payload.slug;

    await recordAnalyticsEvent(supabase, {
      softwareId: software.id,
      eventType: "view",
      metadata,
    });

    await incrementSoftwareStat(supabase, {
      softwareId: software.id,
      field: "views",
    });

    return NextResponse.json({ status: "ok", event: "view" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation failed", errors: error.flatten() }, { status: 400 });
    }

    console.error("POST /api/analytics/view failed", error);
    return NextResponse.json({ message: "Analytics tracking failed" }, { status: 500 });
  }
};
