import { createHmac, createHash } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/utils/rate-limit";
import { incrementSoftwareStat, recordAnalyticsEvent, resolveSoftware } from "@/lib/services/analytics.server";

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

const isValidToken = (params: { secret: string; token: string; slug: string; locale: string; userAgent: string }) => {
  const parts = params.token.split(".");
  if (parts.length !== 3) return false;
  const exp = Number(parts[0]);
  const uaHash = parts[1] ?? "";
  const sig = parts[2] ?? "";
  if (!Number.isFinite(exp) || exp <= Date.now()) return false;
  if (!uaHash || !sig) return false;

  const expectedUaHash = hashUa(params.userAgent);
  if (uaHash !== expectedUaHash) return false;

  const message = `${params.slug}.${params.locale}.${exp}.${uaHash}`;
  const expectedSig = sign(params.secret, message);
  return sig === expectedSig;
};

const isLikelyBot = (userAgent: string) => {
  const ua = (userAgent || "").toLowerCase();
  if (!ua) return true;
  return /(bot|crawler|spider|scrape|headless|phantom|selenium|playwright|puppeteer|curl|wget|python|httpclient)/i.test(ua);
};

export const GET = async (
  request: NextRequest,
  ctx: { params: Promise<{ locale: string; slug: string }> },
) => {
  const limit = rateLimit(request, { keyPrefix: "download-redirect", limit: 20, windowMs: 60_000 });
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

  const url = new URL(request.url);
  const token = url.searchParams.get("t") || url.searchParams.get("token") || "";
  if (!token) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (!isValidToken({ secret, token, slug, locale, userAgent })) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const supabase = createSupabaseServerClient();

  const software = await resolveSoftware(supabase, { slug });
  if (!software) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const metadata: Record<string, string> = {
    slug,
    locale,
    source: "download-redirect",
  };

  const vercelCountry = request.headers.get("x-vercel-ip-country");
  const vercelRegion = request.headers.get("x-vercel-ip-country-region");
  const vercelCity = request.headers.get("x-vercel-ip-city");
  if (vercelCountry) metadata.country = vercelCountry;
  if (vercelRegion) metadata.region = vercelRegion;
  if (vercelCity) metadata.city = vercelCity;

  try {
    await recordAnalyticsEvent(supabase, {
      softwareId: software.id,
      eventType: "download",
      metadata,
    });
    await incrementSoftwareStat(supabase, {
      softwareId: software.id,
      field: "downloads",
    });
  } catch {
    // best-effort
  }

  if (!software.download_url) {
    return NextResponse.json({ message: "Missing download url" }, { status: 422 });
  }

  return NextResponse.redirect(software.download_url, 302);
};
