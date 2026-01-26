import { NextResponse, type NextRequest } from "next/server";

import { isAdminRequestAuthorized } from "@/lib/auth/admin-session";
import { readLocalAdminConfig } from "@/lib/services/local-admin-config";

type VercelDeployment = {
  url: string;
  createdAt: number;
  state?: string;
  meta?: Record<string, unknown>;
};

export const GET = async (request: NextRequest) => {
  if (!isAdminRequestAuthorized(request)) {
    return NextResponse.json({ message: "غير مصرح" }, { status: 401 });
  }

  const config = await readLocalAdminConfig();
  const token = process.env.VERCEL_TOKEN ?? config.vercel?.token;
  const projectId = process.env.VERCEL_PROJECT_ID ?? config.vercel?.projectId;
  const teamId = process.env.VERCEL_TEAM_ID ?? config.vercel?.teamId;

  if (!token || !projectId) {
    return NextResponse.json(
      { message: "إعدادات Vercel ناقصة (VERCEL_TOKEN / VERCEL_PROJECT_ID)" },
      { status: 400 },
    );
  }

  const qs = new URLSearchParams({ projectId });
  if (teamId) qs.set("teamId", teamId);

  const url = `https://api.vercel.com/v6/deployments?${qs.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as any;
    if (!response.ok) {
      return NextResponse.json(
        {
          message: `فشل جلب Deployments من Vercel (${response.status})`,
          vercelStatus: response.status,
          details: payload,
        },
        { status: 502 },
      );
    }

    const deployments = (payload?.deployments ?? []) as VercelDeployment[];
    const latest = deployments[0];

    if (!latest?.url) {
      return NextResponse.json({ message: "لم يتم العثور على deployments" }, { status: 404 });
    }

    const httpsUrl = latest.url.startsWith("http") ? latest.url : `https://${latest.url}`;

    return NextResponse.json({
      ok: true,
      latest: {
        url: httpsUrl,
        state: latest.state ?? null,
        createdAt: latest.createdAt,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/vercel failed", error);
    return NextResponse.json({ message: "تعذر الاتصال بـ Vercel" }, { status: 500 });
  }
};
