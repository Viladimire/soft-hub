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
    return NextResponse.json({ message: "غير مصرح" }, { status: 401 });
  }

  const config = await readLocalAdminConfig();
  return NextResponse.json({ config, path: getLocalAdminConfigPath() });
};

export const PUT = async (request: NextRequest) => {
  if (!isAdminRequestAuthorized(request)) {
    return NextResponse.json({ message: "غير مصرح" }, { status: 401 });
  }

  try {
    const body = payloadSchema.parse(await request.json());
    const config = await mergeLocalAdminConfig(body);
    return NextResponse.json({ config });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "صيغة غير صالحة" }, { status: 400 });
    }

    console.error("Failed to write local admin config", error);
    return NextResponse.json({ message: "تعذر حفظ الإعدادات" }, { status: 500 });
  }
};
