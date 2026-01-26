import { NextResponse, type NextRequest } from "next/server";

import { isAdminRequestAuthorized } from "@/lib/auth/admin-session";
import { readLocalAdminConfig } from "@/lib/services/local-admin-config";
import { fetchCollectionsDatasetFromGitHub } from "@/lib/services/github/collectionsDataStore";
import { fetchRequestsDatasetFromGitHub } from "@/lib/services/github/requestsDataStore";
import { fetchSoftwareDatasetFromGitHub } from "@/lib/services/github/softwareDataStore";

export const POST = async (request: NextRequest) => {
  if (!isAdminRequestAuthorized(request)) {
    return NextResponse.json({ message: "غير مصرح" }, { status: 401 });
  }

  const config = await readLocalAdminConfig();
  const deployHookUrl = process.env.VERCEL_DEPLOY_HOOK_URL ?? config.vercel?.deployHookUrl;

  if (!deployHookUrl) {
    return NextResponse.json(
      { message: "لا يوجد VERCEL_DEPLOY_HOOK_URL. أنشئ Deploy Hook في Vercel ثم الصق الرابط في Settings واحفظ." },
      { status: 400 },
    );
  }

  const steps: Array<{ step: string; ok: boolean; details?: string }> = [];

  try {
    // Ensure datasets exist / can be fetched (collections/requests auto-create on 404)
    try {
      await fetchSoftwareDatasetFromGitHub();
      steps.push({ step: "GitHub: software dataset", ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      steps.push({ step: "GitHub: software dataset", ok: false, details: message.slice(0, 2000) });
      if (message.includes("(401)") || message.toLowerCase().includes("bad credentials")) {
        return NextResponse.json(
          {
            message:
              "فشل التحقق من GitHub: Bad credentials (401). التوكن غير صحيح/منتهي أو بدون صلاحيات. أنشئ GitHub token جديد بصلاحية Repo/Contents ثم احفظه في Settings وأعد المحاولة.",
            steps,
          },
          { status: 401 },
        );
      }
      return NextResponse.json({ message: "فشل التحقق من GitHub", steps }, { status: 500 });
    }

    try {
      await fetchCollectionsDatasetFromGitHub();
      steps.push({ step: "GitHub: collections dataset", ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      steps.push({ step: "GitHub: collections dataset", ok: false, details: message.slice(0, 2000) });
      if (message.includes("(401)") || message.toLowerCase().includes("bad credentials")) {
        return NextResponse.json(
          {
            message:
              "فشل التحقق من GitHub: Bad credentials (401). التوكن غير صحيح/منتهي أو بدون صلاحيات. أنشئ GitHub token جديد بصلاحية Repo/Contents ثم احفظه في Settings وأعد المحاولة.",
            steps,
          },
          { status: 401 },
        );
      }
      return NextResponse.json({ message: "فشل التحقق من GitHub", steps }, { status: 500 });
    }

    try {
      await fetchRequestsDatasetFromGitHub();
      steps.push({ step: "GitHub: requests dataset", ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      steps.push({ step: "GitHub: requests dataset", ok: false, details: message.slice(0, 2000) });
      if (message.includes("(401)") || message.toLowerCase().includes("bad credentials")) {
        return NextResponse.json(
          {
            message:
              "فشل التحقق من GitHub: Bad credentials (401). التوكن غير صحيح/منتهي أو بدون صلاحيات. أنشئ GitHub token جديد بصلاحية Repo/Contents ثم احفظه في Settings وأعد المحاولة.",
            steps,
          },
          { status: 401 },
        );
      }
      return NextResponse.json({ message: "فشل التحقق من GitHub", steps }, { status: 500 });
    }

    const deployResponse = await fetch(deployHookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "soft-hub-admin", action: "publish" }),
      cache: "no-store",
    });

    if (!deployResponse.ok) {
      const text = await deployResponse.text();
      steps.push({ step: "Vercel: deploy hook", ok: false, details: text.slice(0, 2000) });
      return NextResponse.json(
        { message: `فشل Trigger على Vercel (${deployResponse.status})`, steps },
        { status: 502 },
      );
    }

    steps.push({ step: "Vercel: deploy hook", ok: true });

    const text = await deployResponse.text().catch(() => "");
    return NextResponse.json({ ok: true, message: "تم بدء النشر (GitHub + Vercel)", steps, details: text.slice(0, 2000) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر إتمام عملية النشر";
    steps.push({ step: "Publish", ok: false, details: message });
    console.error("POST /api/admin/publish failed", error);
    return NextResponse.json({ message, steps }, { status: 500 });
  }
};
