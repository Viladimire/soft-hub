import { NextResponse, type NextRequest } from "next/server";

import { isAdminRequestAuthorized } from "@/lib/auth/admin-session";
import { readLocalAdminConfig } from "@/lib/services/local-admin-config";

export const POST = async (request: NextRequest) => {
  if (!isAdminRequestAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const config = await readLocalAdminConfig();
  const deployHookUrl = process.env.VERCEL_DEPLOY_HOOK_URL ?? config.vercel?.deployHookUrl;

  if (!deployHookUrl) {
    return NextResponse.json(
      { message: "Missing VERCEL_DEPLOY_HOOK_URL. Create a Deploy Hook in Vercel, then paste it in Settings and save." },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(deployHookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "soft-hub-admin" }),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { message: `Failed to trigger Vercel deploy (${response.status})`, details: text.slice(0, 2000) },
        { status: 502 },
      );
    }

    const text = await response.text().catch(() => "");
    return NextResponse.json({ ok: true, message: "Deploy request sent to Vercel", details: text.slice(0, 2000) });
  } catch (error) {
    console.error("Deploy hook failed", error);
    return NextResponse.json({ message: "Failed to reach Vercel deploy hook" }, { status: 500 });
  }
};
