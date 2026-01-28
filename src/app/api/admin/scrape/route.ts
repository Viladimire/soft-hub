import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isAdminRequestAuthorized, getAdminSecretOrThrow } from "@/lib/auth/admin-session";
import net from "node:net";

const payloadSchema = z.object({
  url: z.string().url(),
});

type ScrapeResult = {
  name: string;
  summary: string;
  description: string;
  websiteUrl: string;
  logoUrl: string;
  heroImage: string;
  screenshots: string[];
};

const MAX_HTML_BYTES = 1_500_000;
const FETCH_TIMEOUT_MS = 10_000;

const clampText = (value: string, max: number) => value.trim().replace(/\s+/g, " ").slice(0, max);

const normalizeText = (value: string) => value.replace(/\s+/g, " ").trim();

const isPrivateIp = (ip: string) => {
  const kind = net.isIP(ip);
  if (!kind) return false;

  if (kind === 4) {
    const parts = ip.split(".").map((v) => Number(v));
    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return true;

    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    return false;
  }

  // IPv6
  const lower = ip.toLowerCase();
  if (lower === "::1") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
  if (lower.startsWith("fe80")) return true; // link-local
  return false;
};

const assertUrlAllowed = (raw: string) => {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http/https URLs are allowed");
  }

  const host = url.hostname.toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".local")) {
    throw new Error("Localhost URLs are not allowed");
  }

  if (isPrivateIp(host)) {
    throw new Error("Private network URLs are not allowed");
  }

  return url;
};

const resolveUrl = (base: URL, candidate: string) => {
  const trimmed = candidate.trim();
  if (!trimmed) return "";
  try {
    return new URL(trimmed, base).toString();
  } catch {
    return "";
  }
};

const uniqueUrls = (items: string[]) => Array.from(new Set(items.map((v) => v.trim()).filter(Boolean)));

const isLikelyImage = (url: string) => {
  const lower = url.toLowerCase();
  if (lower.includes("/_next/image")) return false;
  return true;
};

const pickFirst = (items: string[]) => items.find(Boolean) ?? "";

const extractMeta = (html: string, key: { attr: "property" | "name"; value: string }) => {
  const escaped = key.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = new RegExp(
    `<meta\\s+[^>]*${key.attr}=["']${escaped}["'][^>]*content=["']([^"']+)["'][^>]*>`,
    "i",
  );
  const match = html.match(rx);
  return match ? match[1].trim() : "";
};

const extractTitle = (html: string) => {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? normalizeText(match[1]) : "";
};

const extractH1 = (html: string) => {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!match) return "";
  return normalizeText(match[1].replace(/<[^>]*>/g, " "));
};

const extractJsonLdBlocks = (html: string): unknown[] => {
  const blocks: unknown[] = [];
  const rx = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = rx.exec(html))) {
    const raw = match[1].trim();
    if (!raw) continue;
    try {
      blocks.push(JSON.parse(raw));
    } catch {
      // ignore
    }
  }
  return blocks;
};

const extractFromJsonLd = (blocks: unknown[]) => {
  const images: string[] = [];
  let name = "";
  let description = "";

  const scan = (node: unknown) => {
    if (!node || typeof node !== "object") return;

    if (Array.isArray(node)) {
      node.forEach(scan);
      return;
    }

    const obj = node as Record<string, unknown>;
    const objName = typeof obj.name === "string" ? obj.name : "";
    const objDesc = typeof obj.description === "string" ? obj.description : "";

    if (!name && objName) name = objName;
    if (!description && objDesc) description = objDesc;

    const image = obj.image;
    if (typeof image === "string") images.push(image);
    if (Array.isArray(image)) {
      for (const item of image) {
        if (typeof item === "string") images.push(item);
        if (item && typeof item === "object") {
          const maybeUrl = (item as Record<string, unknown>).url;
          if (typeof maybeUrl === "string") images.push(maybeUrl);
        }
      }
    }

    for (const value of Object.values(obj)) {
      scan(value);
    }
  };

  blocks.forEach(scan);

  return {
    name: name.trim(),
    description: description.trim(),
    images: uniqueUrls(images),
  };
};

const extractLinkIcon = (html: string) => {
  const rx = /<link\s+[^>]*rel=["']([^"']+)["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  const candidates: Array<{ rel: string; href: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = rx.exec(html))) {
    candidates.push({ rel: match[1].toLowerCase(), href: match[2].trim() });
  }

  const pick = (predicate: (rel: string) => boolean) => {
    const found = candidates.find((c) => predicate(c.rel));
    return found ? found.href : "";
  };

  return (
    pick((rel) => rel.includes("apple-touch-icon")) ||
    pick((rel) => rel.split(/\s+/).includes("icon")) ||
    pick((rel) => rel.includes("shortcut icon"))
  );
};

const extractImgSources = (html: string) => {
  const rx = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
  const urls: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = rx.exec(html))) {
    urls.push(match[1].trim());
    if (urls.length >= 12) break;
  }
  return uniqueUrls(urls);
};

const fetchHtml = async (url: URL) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      redirect: "follow",
      headers: {
        "user-agent": "soft-hub-scraper/1.0",
        accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Upstream responded with ${res.status}`);
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("text/html")) {
      // still allow if missing content-type
      if (contentType && !contentType.toLowerCase().includes("html")) {
        throw new Error("URL did not return HTML");
      }
    }

    const text = await res.text();
    const limited = text.length > MAX_HTML_BYTES ? text.slice(0, MAX_HTML_BYTES) : text;
    return limited;
  } finally {
    clearTimeout(timeout);
  }
};

const toScrapeResult = (baseUrl: URL, html: string): ScrapeResult => {
  const ogTitle = extractMeta(html, { attr: "property", value: "og:title" });
  const ogDesc = extractMeta(html, { attr: "property", value: "og:description" });
  const ogImage = extractMeta(html, { attr: "property", value: "og:image" });

  const twTitle = extractMeta(html, { attr: "name", value: "twitter:title" });
  const twDesc = extractMeta(html, { attr: "name", value: "twitter:description" });
  const twImage = extractMeta(html, { attr: "name", value: "twitter:image" });

  const metaDesc = extractMeta(html, { attr: "name", value: "description" });

  const jsonLd = extractJsonLdBlocks(html);
  const jsonLdData = extractFromJsonLd(jsonLd);

  const title = extractTitle(html);
  const h1 = extractH1(html);

  const name = clampText(ogTitle || twTitle || jsonLdData.name || h1 || title, 120);

  const description = clampText(ogDesc || twDesc || jsonLdData.description || metaDesc, 1200);
  const summary = clampText(description, 220);

  const iconHref = extractLinkIcon(html);

  const logoCandidates = uniqueUrls([
    resolveUrl(baseUrl, iconHref),
    resolveUrl(baseUrl, twImage),
    resolveUrl(baseUrl, ogImage),
    ...jsonLdData.images.map((u) => resolveUrl(baseUrl, u)),
  ]).filter(isLikelyImage);

  const heroCandidates = uniqueUrls([
    resolveUrl(baseUrl, ogImage),
    resolveUrl(baseUrl, twImage),
    ...jsonLdData.images.map((u) => resolveUrl(baseUrl, u)),
  ]).filter(isLikelyImage);

  const imgCandidates = extractImgSources(html).map((u) => resolveUrl(baseUrl, u));

  const screenshots = uniqueUrls([
    ...heroCandidates,
    ...imgCandidates,
  ])
    .filter(Boolean)
    .filter(isLikelyImage)
    .slice(0, 6);

  return {
    name,
    summary,
    description,
    websiteUrl: baseUrl.toString(),
    logoUrl: pickFirst(logoCandidates),
    heroImage: pickFirst(heroCandidates),
    screenshots,
  };
};

const ensureAuthorized = (request: NextRequest) => {
  try {
    getAdminSecretOrThrow();
  } catch (error) {
    const message = error instanceof Error ? error.message : "ADMIN_API_SECRET is not configured";
    return NextResponse.json({ message }, { status: 501 });
  }

  if (!isAdminRequestAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return null;
};

export const POST = async (request: NextRequest) => {
  const unauthorized = ensureAuthorized(request);
  if (unauthorized) return unauthorized;

  try {
    const payload = payloadSchema.parse(await request.json());
    const targetUrl = assertUrlAllowed(payload.url);

    const html = await fetchHtml(targetUrl);
    const data = toScrapeResult(targetUrl, html);

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation failed", errors: error.flatten() }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Failed to scrape";
    return NextResponse.json({ message }, { status: 500 });
  }
};
