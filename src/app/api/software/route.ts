import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchFilteredSoftware } from "@/lib/services/softwareService";

const querySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  platforms: z.string().optional(),
  types: z.string().optional(),
  sortBy: z.enum(["latest", "popular", "name"]).optional(),
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
      category: url.searchParams.get("category") ?? undefined,
      platforms: url.searchParams.get("platforms") ?? undefined,
      types: url.searchParams.get("types") ?? undefined,
      sortBy: (url.searchParams.get("sortBy") ?? undefined) as
        | "latest"
        | "popular"
        | "name"
        | undefined,
      page: url.searchParams.get("page") ?? undefined,
      perPage: url.searchParams.get("perPage") ?? undefined,
    });

    const supabase = createSupabaseServerClient();

    const result = await fetchFilteredSoftware(
      {
        query: parsed.q,
        category: parsed.category ?? null,
        platforms: splitCsv(parsed.platforms),
        types: splitCsv(parsed.types),
        sortBy: parsed.sortBy,
        page: parsed.page,
        perPage: parsed.perPage,
      },
      supabase,
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation failed", errors: error.flatten() }, { status: 400 });
    }

    console.error("GET /api/software failed", error);
    return NextResponse.json({ message: "Failed to fetch software" }, { status: 500 });
  }
};
