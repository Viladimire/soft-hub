import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { rateLimit } from "@/lib/utils/rate-limit";

const bodySchema = z.object({
  slug: z.string().min(1).optional(),
  id: z.string().uuid().optional(),
});

const isRecord = (value: Json | null): value is Record<string, Json> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const POST = async (request: NextRequest) => {
  try {
    const limit = rateLimit(request, { keyPrefix: "download", limit: 30, windowMs: 60_000 });
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

    const payload = bodySchema.parse(await request.json());

    if (!payload.slug && !payload.id) {
      return NextResponse.json({ message: "Either slug or id is required" }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();

    const { data: software, error: softwareError } = await supabase
      .from("software")
      .select("id, slug, download_url, stats")
      .match(payload.id ? { id: payload.id } : { slug: payload.slug })
      .maybeSingle();

    if (softwareError) {
      throw softwareError;
    }

    if (!software) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    await supabase.from("analytics_events").insert({
      software_id: software.id,
      event_type: "download",
      metadata: payload.slug ? ({ slug: payload.slug } as unknown as Json) : null,
    });

    const currentStats = isRecord(software.stats) ? software.stats : {};
    const currentDownloads = Number(currentStats.downloads ?? 0);
    const nextStats = { ...currentStats, downloads: currentDownloads + 1 } as unknown as Json;

    await supabase.from("software").update({ stats: nextStats }).eq("id", software.id);

    return NextResponse.json({ downloadUrl: software.download_url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation failed", errors: error.flatten() }, { status: 400 });
    }

    console.error("POST /api/download failed", error);
    return NextResponse.json({ message: "Download tracking failed" }, { status: 500 });
  }
};
