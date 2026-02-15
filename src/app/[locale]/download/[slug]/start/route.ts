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

const shouldBypassTurnstile = () => {
  if (process.env.NODE_ENV === "production") return false;
  const vercelEnv = (process.env.VERCEL_ENV || "").toLowerCase();
  if (vercelEnv && vercelEnv !== "production") return true;
  const url = (process.env.VERCEL_URL || "").toLowerCase();
  if (url.includes("alpha")) return true;
  return false;
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
    if (!shouldBypassTurnstile()) {
      const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Download verification unavailable</title>
    <style>
      body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#070a12;color:#e5e7eb;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial}
      .card{width:min(720px,92vw);border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);border-radius:18px;padding:22px}
      .title{font-size:16px;font-weight:800;margin:0 0 10px}
      .desc{font-size:13px;opacity:.85;margin:0 0 14px;line-height:1.55}
      code{background:rgba(255,255,255,.06);padding:2px 6px;border-radius:8px}
      .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace}
      .hint{font-size:12px;opacity:.8;margin:12px 0 0}
      .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;margin-top:14px;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#e5e7eb;text-decoration:none;font-size:13px}
    </style>
  </head>
  <body>
    <div class="card">
      <p class="title">Download verification is not configured</p>
      <p class="desc">This download flow requires a Cloudflare Turnstile challenge to verify you are human, but the server is missing the required environment variables.</p>
      <p class="desc mono">Missing: <code>TURNSTILE_SITE_KEY</code></p>
      <p class="desc">Fix on Vercel: add <code>TURNSTILE_SITE_KEY</code> and <code>TURNSTILE_SECRET_KEY</code> (Production) then redeploy.</p>
      <p class="hint">Requested path: <span class="mono">/${locale}/download/${slug}/start</span></p>
      <a class="btn" href="/">Go back home</a>
    </div>
  </body>
</html>`;

      return new NextResponse(html, {
        status: 501,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Starting download</title>
    <style>
      body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#070a12;color:#e5e7eb;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial}
      .card{width:min(520px,92vw);border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);border-radius:18px;padding:22px}
      .title{font-size:16px;font-weight:700;margin:0 0 8px}
      .desc{font-size:13px;opacity:.8;margin:0 0 16px;line-height:1.5}
      .status{font-size:12px;opacity:.85}
      .err{color:#fca5a5}
    </style>
  </head>
  <body>
    <div class="card">
      <p class="title">Starting download</p>
      <p class="desc">Security check is disabled on this environment.</p>
      <div id="status" class="status">Preparing…</div>
    </div>

    <script>
      const statusEl = document.getElementById('status');
      const setStatus = (txt, isErr) => { statusEl.textContent = txt; statusEl.className = 'status' + (isErr ? ' err' : ''); };

      async function start(){
        try{
          const tokenUrl = new URL('/api/download-token', window.location.origin);
          tokenUrl.searchParams.set('slug', ${JSON.stringify(slug)});
          tokenUrl.searchParams.set('locale', ${JSON.stringify(locale)});
          const dr = await fetch(tokenUrl.toString(), { cache: 'no-store' });
          if(!dr.ok){
            const p = await dr.json().catch(()=>({}));
            setStatus(p && p.message ? String(p.message) : ('Failed to start download ('+dr.status+')'), true);
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
          setStatus('Failed to start download', true);
        }
      }

      start();
    </script>
  </body>
</html>`;

    const out = new NextResponse(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
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
