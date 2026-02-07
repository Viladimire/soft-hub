import { NextResponse, type NextRequest } from "next/server";

import { readLocalAdminConfig } from "@/lib/services/local-admin-config";
import { fetchCollectionsDatasetFromGitHub } from "@/lib/services/github/collectionsDataStore";
import { fetchRequestsDatasetFromGitHub } from "@/lib/services/github/requestsDataStore";
import { fetchSoftwareDatasetFromGitHub, publishLatestSoftwarePagesToGitHub } from "@/lib/services/github/softwareDataStore";

const isAuthorizedCronRequest = (request: NextRequest) => {
  const secret = process.env.CRON_SECRET;
  const isVercelCron = Boolean(request.headers.get("x-vercel-cron"));
  if (isVercelCron) return true;

  if (!secret) return false;
  const provided =
    request.headers.get("x-cron-secret") ||
    new URL(request.url).searchParams.get("secret") ||
    "";
  return provided === secret;
};

export const POST = async (request: NextRequest) => {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const config = await readLocalAdminConfig();
  const deployHookUrl = process.env.VERCEL_DEPLOY_HOOK_URL ?? config.vercel?.deployHookUrl;

  const steps: Array<{ step: string; ok: boolean; details?: string }> = [];

  try {
    await fetchSoftwareDatasetFromGitHub();
    steps.push({ step: "GitHub: software dataset", ok: true });

    const publishResult = await publishLatestSoftwarePagesToGitHub();
    steps.push({ step: `GitHub: software latest pages (${publishResult.pages} pages)`, ok: true });

    await fetchCollectionsDatasetFromGitHub();
    steps.push({ step: "GitHub: collections dataset", ok: true });

    await fetchRequestsDatasetFromGitHub();
    steps.push({ step: "GitHub: requests dataset", ok: true });

    if (deployHookUrl) {
      const deployResponse = await fetch(deployHookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: "soft-hub-cron", action: "publish" }),
        cache: "no-store",
      });

      if (!deployResponse.ok) {
        const text = await deployResponse.text().catch(() => "");
        steps.push({ step: "Vercel: deploy hook", ok: false, details: text.slice(0, 2000) });
        return NextResponse.json(
          { message: `Failed to trigger Vercel deploy (${deployResponse.status})`, steps },
          { status: 502 },
        );
      }

      steps.push({ step: "Vercel: deploy hook", ok: true });
      const text = await deployResponse.text().catch(() => "");
      return NextResponse.json({ ok: true, message: "Cron publish completed", steps, details: text.slice(0, 2000) });
    }

    steps.push({ step: "Vercel: deploy hook", ok: false, details: "Missing VERCEL_DEPLOY_HOOK_URL" });
    return NextResponse.json({ ok: true, message: "Cron publish completed (no deploy hook)", steps });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron publish failed";
    steps.push({ step: "Cron publish", ok: false, details: message.slice(0, 2000) });
    console.error("POST /api/cron/publish failed", error);
    return NextResponse.json({ message, steps }, { status: 500 });
  }
};
