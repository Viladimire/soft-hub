import { NextResponse, type NextRequest } from "next/server";

import { z } from "zod";

import { getAdminSecretOrThrow, isAdminRequestAuthorized } from "@/lib/auth/admin-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toSoftware, type SoftwareRow } from "@/lib/services/softwareService";

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

  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from("software")
      .select("*")
      .order("release_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(2000);

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as SoftwareRow[];
    const items = rows.map(toSoftware);

    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation failed", errors: error.flatten() }, { status: 400 });
    }

    console.error("Failed to fetch software from Supabase for admin", error);
    return NextResponse.json({ message: "Failed to fetch software" }, { status: 500 });
  }
};
