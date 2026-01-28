import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getAdminSecretOrThrow, isAdminRequestAuthorized } from "@/lib/auth/admin-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const querySchema = z.object({
  slug: z.string().min(1),
});

const ensureAuthorized = (request: NextRequest) => {
  try {
    getAdminSecretOrThrow();
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "ADMIN_API_SECRET is not configured" },
      { status: 501 },
    );
  }

  if (!isAdminRequestAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return null;
};

export const GET = async (request: NextRequest) => {
  const unauthorized = ensureAuthorized(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);

  try {
    const { slug } = querySchema.parse({ slug: searchParams.get("slug") });

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.from("software").select("slug").eq("slug", slug).limit(1);

    if (error) {
      throw error;
    }

    return NextResponse.json({ exists: (data ?? []).length > 0 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation failed", errors: error.flatten() }, { status: 400 });
    }

    console.error("Failed to check slug", error);
    return NextResponse.json({ message: "Failed to check slug" }, { status: 500 });
  }
};
