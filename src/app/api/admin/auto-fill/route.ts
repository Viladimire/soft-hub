import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getAdminSecretOrThrow, isAdminRequestAuthorized } from "@/lib/auth/admin-session";
import { autoFillSoftwareData } from "@/lib/services/autoFillService";

const payloadSchema = z.object({
  name: z.string().min(1),
  version: z.string().optional(),
  debug: z.boolean().optional(),
});

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

export const POST = async (request: NextRequest) => {
  const unauthorized = ensureAuthorized(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const payload = await request.json();
    const { name, version, debug } = payloadSchema.parse(payload);

    const result = await autoFillSoftwareData(name, { version });
    if (!result.success) {
      return NextResponse.json({ message: result.error }, { status: 500 });
    }

    const data = result.data;
    const debugInfo = debug
      ? {
          serverTime: new Date().toISOString(),
          vercel: {
            commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
            deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? null,
            url: process.env.VERCEL_URL ?? null,
          },
        }
      : undefined;
    const changelog = Array.isArray(data.changelog) ? data.changelog : [];
    if (changelog.length) {
      return NextResponse.json(debugInfo ? { ...data, debug: debugInfo } : data);
    }

    const fallbackVersion = (data.version ?? "").trim() || (version ?? "").trim() || "latest";
    return NextResponse.json({
      ...data,
      ...(debugInfo ? { debug: debugInfo } : null),
      changelog: [
        {
          version: fallbackVersion,
          date: new Date().toISOString(),
          highlights: ["Latest release"],
        },
      ],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation failed", errors: error.flatten() }, { status: 400 });
    }

    console.error("Auto-fill failed", error);
    return NextResponse.json({ message: "Failed to auto-fill" }, { status: 500 });
  }
};
