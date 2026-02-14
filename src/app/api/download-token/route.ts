import { createHmac, createHash } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { rateLimit } from "@/lib/utils/rate-limit";

export const runtime = "nodejs";

const querySchema = z.object({
  slug: z.string().min(1).max(200),
  locale: z.string().min(2).max(10),
});

const getTokenSecret = () => {
  const secret = process.env.DOWNLOAD_TOKEN_SECRET || process.env.ADMIN_API_SECRET;
  return typeof secret === "string" && secret.trim().length >= 16 ? secret : "";
};

const isVerifiedCookieValid = (raw: string | undefined) => {
  if (!raw) return false;
  const ts = Number(raw);
  if (!Number.isFinite(ts) || ts <= 0) return false;
  return Date.now() - ts < 60 * 60_000;
};

const hashUa = (userAgent: string) =>
  createHash("sha256")
    .update(userAgent || "")
    .digest("hex")
    .slice(0, 16);

const sign = (secret: string, message: string) =>
  createHmac("sha256", secret)
    .update(message)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

export const GET = async (request: NextRequest) => {
  const limit = rateLimit(request, { keyPrefix: "download-token", limit: 120, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json(
      { message: "Too many requests" },
      {
        status: 429,
        headers: {
          "x-ratelimit-limit": String(limit.limit),
          "x-ratelimit-remaining": String(limit.remaining),
          "x-ratelimit-reset": String(limit.resetAt),
        },
      },
    );
  }

  const secret = getTokenSecret();
  if (!secret) {
    return NextResponse.json({ message: "Download token secret is not configured" }, { status: 501 });
  }

  const verified = request.cookies.get("dl_verified")?.value;
  if (!isVerifiedCookieValid(verified)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const parsed = querySchema.parse({
      slug: url.searchParams.get("slug") ?? "",
      locale: url.searchParams.get("locale") ?? "",
    });

    const userAgent = request.headers.get("user-agent") || "";
    const uaHash = hashUa(userAgent);
    const exp = Date.now() + 2 * 60_000;

    const message = `${parsed.slug}.${parsed.locale}.${exp}.${uaHash}`;
    const sig = sign(secret, message);

    return NextResponse.json({ token: `${exp}.${uaHash}.${sig}` });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation failed", errors: error.flatten() }, { status: 400 });
    }

    console.error("GET /api/download-token failed", error);
    return NextResponse.json({ message: "Failed to create download token" }, { status: 500 });
  }
};
