import { NextResponse } from "next/server";

export const runtime = "nodejs";

export const GET = async () => {
  return NextResponse.json({
    serverTime: new Date().toISOString(),
    vercel: {
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? null,
      url: process.env.VERCEL_URL ?? null,
    },
  });
};
