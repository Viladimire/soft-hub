import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { isAdminRequestAuthorized } from "@/lib/auth/admin-session";
import { getLocalAdminConfigPath, mergeLocalAdminConfig, readLocalAdminConfig } from "@/lib/services/local-admin-config";

const payloadSchema = z.object({
  github: z
    .object({
      owner: z.string().optional(),
      repo: z.string().optional(),
      token: z.string().optional(),
      branch: z.string().optional(),
      repoUrl: z.string().optional(),
    })
    .optional(),
  supabase: z
    .object({
      url: z.string().optional(),
      anonKey: z.string().optional(),
      serviceRoleKey: z.string().optional(),
    })
    .optional(),
  vercel: z
    .object({
      token: z.string().optional(),
      projectId: z.string().optional(),
      teamId: z.string().optional(),
      deployHookUrl: z.string().optional(),
    })
    .optional(),
});

export const GET = async (request: NextRequest) => {
  if (!isAdminRequestAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const config = await readLocalAdminConfig();
  const path = process.env.VERCEL ? "supabase:public.admin_config" : getLocalAdminConfigPath();
  return NextResponse.json({ config, path });
};

export const PUT = async (request: NextRequest) => {
  if (!isAdminRequestAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = payloadSchema.parse(await request.json());
    const config = await mergeLocalAdminConfig(body);
    return NextResponse.json({ config });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "");

    if (process.env.VERCEL) {
      if (message.includes("Supabase URL is missing") || message.includes("Supabase service role key") || message.includes("anon key")) {
        return NextResponse.json(
          {
            message:
              "Supabase is not configured on the server. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (and preferably SUPABASE_SERVICE_ROLE_KEY) are set in Vercel env, then redeploy.",
          },
          { status: 501 },
        );
      }

      if (message.includes("admin_config") || message.includes("42P01") || message.includes("does not exist")) {
        return NextResponse.json(
          {
            message:
              "Admin config storage on Supabase is not enabled yet. Run migrations: 005_admin_config.sql, then refresh the page.",
          },
          { status: 503 },
        );
      }
    }

    if (error instanceof Error && error.message === "LOCAL_ADMIN_CONFIG_NOT_WRITABLE") {
      return NextResponse.json(
        {
          message:
            "Cannot persist settings on Vercel because serverless file systems are not writable. Set values via Vercel Environment Variables instead.",
        },
        { status: 501 },
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }

    console.error("Failed to write local admin config", error);
    return NextResponse.json({ message: "Failed to save settings" }, { status: 500 });
  }
};
