import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchFilteredSoftware } from "@/lib/services/softwareService";
import { searchStaticSoftwareViaChunks } from "@/lib/services/staticSoftwareRepository";
import { rateLimit } from "@/lib/utils/rate-limit";

const querySchema = z.object({
  q: z.string().min(1).optional(),
  query: z.string().min(1).optional(),
  category: z.string().optional(),
  platforms: z.string().optional(),
  types: z.string().optional(),
  sortBy: z.enum(["latest", "popular", "name"]).optional(),
  sort: z.enum(["latest", "popular", "name"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  perPage: z.coerce.number().int().min(1).max(50).optional(),
});

const splitCsv = (value: string | undefined) =>
  value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const GET = async (request: NextRequest) => {
  try {
    const limit = rateLimit(request, { keyPrefix: "search", limit: 60, windowMs: 60_000 });
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

    const url = new URL(request.url);
    const parsed = querySchema.parse({
      q: url.searchParams.get("q") ?? undefined,
      query: url.searchParams.get("query") ?? undefined,
      category: url.searchParams.get("category") ?? undefined,
      platforms: url.searchParams.get("platforms") ?? undefined,
      types: url.searchParams.get("types") ?? undefined,
      sortBy: (url.searchParams.get("sortBy") ?? undefined) as
        | "latest"
        | "popular"
        | "name"
        | undefined,
      sort: (url.searchParams.get("sort") ?? undefined) as
        | "latest"
        | "popular"
        | "name"
        | undefined,
      page: url.searchParams.get("page") ?? undefined,
      perPage: url.searchParams.get("perPage") ?? undefined,
    });

    const supabase = createSupabaseServerClient();

    const query = parsed.query ?? parsed.q ?? "";
    const page = parsed.page ?? 1;
    const perPage = parsed.perPage ?? 20;

    try {
      const result = await fetchFilteredSoftware(
        {
          query,
          category: parsed.category ?? null,
          platforms: splitCsv(parsed.platforms),
          types: splitCsv(parsed.types),
          sortBy: parsed.sort ?? parsed.sortBy,
          page,
          perPage,
        },
        supabase,
      );

      return NextResponse.json(result);
    } catch {
      const fallback = await searchStaticSoftwareViaChunks({ query, page, perPage, maxChunksToScan: 25 });
      return NextResponse.json(fallback);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation failed", errors: error.flatten() }, { status: 400 });
    }

    console.error("GET /api/search failed", error);
    return NextResponse.json({ message: "Search failed" }, { status: 500 });
  }
};
