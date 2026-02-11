import { createHmac, createHash } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { rateLimit } from "@/lib/utils/rate-limit";

export const runtime = "nodejs";

const paramsSchema = z.object({
  locale: z.string().min(2).max(10),
  slug: z.string().min(1).max(200),
});

const getTokenSecret = () => {
  const secret = process.env.DOWNLOAD_TOKEN_SECRET || process.env.ADMIN_API_SECRET;
  return typeof secret === "string" && secret.trim().length >= 16 ? secret : "";
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

const isLikelyBot = (userAgent: string) => {
  const ua = (userAgent || "").toLowerCase();
  if (!ua) return true;
  return /(bot|crawler|spider|scrape|headless|phantom|selenium|playwright|puppeteer|curl|wget|python|httpclient)/i.test(ua);
};

export const GET = async (
  request: NextRequest,
  ctx: { params: Promise<{ locale: string; slug: string }> },
) => {
  const limit = rateLimit(request, { keyPrefix: "download-start", limit: 60, windowMs: 60_000 });
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

  const userAgent = request.headers.get("user-agent") || "";
  if (isLikelyBot(userAgent)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const rawParams = await ctx.params;
  const { locale, slug } = paramsSchema.parse(rawParams);

  const secret = getTokenSecret();
  if (!secret) {
    return NextResponse.json({ message: "Download token secret is not configured" }, { status: 501 });
  }

  const uaHash = hashUa(userAgent);
  const exp = Date.now() + 2 * 60_000;
  const message = `${slug}.${locale}.${exp}.${uaHash}`;
  const sig = sign(secret, message);
  const token = `${exp}.${uaHash}.${sig}`;

  const target = new URL(`/${locale}/download/${slug}`, request.url);
  target.searchParams.set("t", token);

  return NextResponse.redirect(target, 307);
};
