import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { getAdminSecretOrThrow, isAdminRequestAuthorized } from "@/lib/auth/admin-session";
import { getAnalyticsTotals, getPopularSoftware, getTrendingSoftware } from "@/lib/services/analytics.server";
import { readLocalAdminConfig } from "@/lib/services/local-admin-config";

const isErrorWithCode = (value: unknown): value is { code?: unknown; message?: unknown } =>
  value !== null && typeof value === "object" && ("code" in value || "message" in value);

const getErrorCode = (value: unknown): string | undefined => {
  if (!isErrorWithCode(value)) return undefined;
  return typeof value.code === "string" ? value.code : undefined;
};

const getErrorMessage = (value: unknown): string => {
  if (value instanceof Error && typeof value.message === "string") return value.message;
  if (isErrorWithCode(value) && typeof value.message === "string") return value.message;
  return String(value ?? "");
};

const ensureAuthorized = (request: NextRequest) => {
  try {
    getAdminSecretOrThrow();
  } catch (error) {
    const message = error instanceof Error ? error.message : "ADMIN_API_SECRET is not configured";
    return NextResponse.json({ message }, { status: 500 });
  }

  if (!isAdminRequestAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return null;
};

export const GET = async (request: NextRequest) => {
  const unauthorized = ensureAuthorized(request);
  if (unauthorized) {
    return unauthorized;
  }

  const local = await readLocalAdminConfig();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? local.supabase?.url ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? local.supabase?.anonKey ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? local.supabase?.serviceRoleKey ?? "";

  if (!url || !anonKey) {
    return NextResponse.json({ message: "Supabase is not configured" }, { status: 501 });
  }

  try {
    const serviceKey = serviceRoleKey || anonKey;
    const supabase = createClient<Database>(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    const [totalsResult, popularResult, trendingResult] = await Promise.allSettled([
      getAnalyticsTotals(supabase),
      getPopularSoftware(supabase, 10),
      getTrendingSoftware(supabase, { limit: 10, windowDays: 7 }),
    ]);

    if (totalsResult.status === "rejected" || popularResult.status === "rejected" || trendingResult.status === "rejected") {
      const rejected = [totalsResult, popularResult, trendingResult].find(
        (result): result is PromiseRejectedResult => result.status === "rejected",
      );

      const reason = (rejected as PromiseRejectedResult | undefined)?.reason;
      const code = getErrorCode(reason);
      const message = getErrorMessage(reason);

      if (code === "PGRST202" || message.includes("schema cache") || message.includes("Could not find the function")) {
        return NextResponse.json({ message: "Supabase analytics is not initialized" }, { status: 503 });
      }

      throw reason;
    }

    return NextResponse.json({
      totals: totalsResult.status === "fulfilled" ? totalsResult.value : null,
      popular: popularResult.status === "fulfilled" ? popularResult.value : [],
      trending: trendingResult.status === "fulfilled" ? trendingResult.value : [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load analytics";
    const code = getErrorCode(error);
    if (code === "PGRST202" || message.includes("schema cache") || message.includes("Could not find the function")) {
      return NextResponse.json({ message: "Supabase analytics is not initialized" }, { status: 503 });
    }
    console.error("GET /api/admin/analytics failed", error);
    return NextResponse.json({ message: "Failed to load analytics" }, { status: 500 });
  }
};
