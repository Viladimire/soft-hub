import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchFilteredSoftware } from "@/lib/services/softwareService";
import { filterStaticSoftwareViaChunks } from "@/lib/services/staticSoftwareRepository";

const querySchema = z.object({
  q: z.string().optional(),
  query: z.string().optional(),
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
    const platforms = splitCsv(parsed.platforms);
    const types = splitCsv(parsed.types);

    try {
      const result = await fetchFilteredSoftware(
        {
          query,
          category: parsed.category ?? null,
          platforms,
          types,
          sortBy: parsed.sort ?? parsed.sortBy,
          page,
          perPage,
        },
        supabase,
      );

      return NextResponse.json(result);
    } catch (error) {
      // Chunk fallback supports latest ordering. For non-latest sorts, still return latest-ordered matches.
      const fallback = await filterStaticSoftwareViaChunks({
        query,
        category: parsed.category ?? null,
        platforms,
        types,
        page,
        perPage,
        maxChunksToScan: 50,
      });
      return NextResponse.json(fallback);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation failed", errors: error.flatten() }, { status: 400 });
    }

    console.error("GET /api/software failed", error);
    return NextResponse.json({ message: "Failed to fetch software" }, { status: 500 });
  }
};
