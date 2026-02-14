import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { rateLimit } from "@/lib/utils/rate-limit";

export const runtime = "nodejs";

const paramsSchema = z.object({
  locale: z.string().min(2).max(10),
  slug: z.string().min(1).max(200),
});

const isLikelyBot = (userAgent: string) => {
  const ua = (userAgent || "").toLowerCase();
  if (!ua) return true;
  return /(bot|crawler|spider|scrape|headless|phantom|selenium|playwright|puppeteer|curl|wget|python|httpclient)/i.test(ua);
};

const getTurnstileSiteKey = () => {
  const siteKey = process.env.TURNSTILE_SITE_KEY;
  return typeof siteKey === "string" && siteKey.trim() ? siteKey.trim() : "";
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

  const siteKey = getTurnstileSiteKey();
  if (!siteKey) {
    return NextResponse.json({ message: "TURNSTILE_SITE_KEY is not configured" }, { status: 501 });
  }

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Verify</title>
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
    <style>
      body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#070a12;color:#e5e7eb;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial}
      .card{width:min(520px,92vw);border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);border-radius:18px;padding:22px}
      .title{font-size:16px;font-weight:700;margin:0 0 8px}
      .desc{font-size:13px;opacity:.8;margin:0 0 16px;line-height:1.5}
      .row{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
      .status{font-size:12px;opacity:.85}
      .err{color:#fca5a5}
    </style>
  </head>
  <body>
    <div class="card">
      <p class="title">Security check</p>
      <p class="desc">Please confirm you are a human to continue your download.</p>
      <div class="row">
        <div class="cf-turnstile" data-sitekey="${siteKey}" data-callback="onTurnstile" data-theme="dark"></div>
        <div id="status" class="status">Waiting for verification…</div>
      </div>
    </div>

    <script>
      const statusEl = document.getElementById('status');
      const setStatus = (txt, isErr) => { statusEl.textContent = txt; statusEl.className = 'status' + (isErr ? ' err' : ''); };

      async function onTurnstile(token){
        try{
          setStatus('Verifying…');
          const vr = await fetch('/api/turnstile/verify', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ token })
          });
          if(!vr.ok){
            const p = await vr.json().catch(()=>({}));
            setStatus(p && p.message ? String(p.message) : ('Verification failed ('+vr.status+')'), true);
            return;
          }

          const tokenUrl = new URL('/api/download-token', window.location.origin);
          tokenUrl.searchParams.set('slug', ${JSON.stringify(slug)});
          tokenUrl.searchParams.set('locale', ${JSON.stringify(locale)});
          const dr = await fetch(tokenUrl.toString(), { cache: 'no-store' });
          if(!dr.ok){
            setStatus('Failed to start download ('+dr.status+')', true);
            return;
          }
          const payload = await dr.json().catch(()=>({}));
          if(!payload || !payload.token){
            setStatus('Failed to start download', true);
            return;
          }

          setStatus('Redirecting…');
          window.location.href = ${JSON.stringify(`/${locale}/download/${slug}`)} + '?t=' + encodeURIComponent(payload.token);
        }catch(e){
          setStatus('Verification failed', true);
        }
      }
      window.onTurnstile = onTurnstile;
    </script>
  </body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
};
