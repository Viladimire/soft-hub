import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { rateLimit } from "@/lib/utils/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  token: z.string().min(1),
});

const getSecret = () => {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  return typeof secret === "string" && secret.trim() ? secret.trim() : "";
};

export const POST = async (request: NextRequest) => {
  const limit = rateLimit(request, { keyPrefix: "turnstile-verify", limit: 120, windowMs: 60_000 });
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

  const secret = getSecret();
  if (!secret) {
    return NextResponse.json({ message: "TURNSTILE_SECRET_KEY is not configured" }, { status: 501 });
  }

  try {
    const parsed = bodySchema.parse(await request.json().catch(() => ({})));

    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "";

    const form = new FormData();
    form.append("secret", secret);
    form.append("response", parsed.token);
    if (ip) form.append("remoteip", ip);

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          success?: boolean;
          "error-codes"?: string[];
        }
      | null;

    if (!response.ok || !payload?.success) {
      return NextResponse.json(
        {
          message: "Verification failed",
          errors: payload && Array.isArray(payload["error-codes"]) ? payload["error-codes"] : undefined,
        },
        { status: 403 },
      );
    }

    const out = NextResponse.json({ ok: true });
    out.cookies.set({
      name: "dl_verified",
      value: String(Date.now()),
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60,
    });

    return out;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation failed", errors: error.flatten() }, { status: 400 });
    }

    console.error("POST /api/turnstile/verify failed", error);
    return NextResponse.json({ message: "Verification failed" }, { status: 500 });
  }
};
