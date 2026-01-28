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
  version?: string;
  releaseDate?: string;
  downloads?: number;
  sizeInMb?: number;
  developer?: string;
  requirements?: {
    minimum: string[];
    recommended: string[];
  };
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

const isFaviconUrl = (raw: string) => {
  try {
    const url = new URL(raw);
    const path = url.pathname.toLowerCase();
    if (path.includes("favicon")) return true;
    if (path === "/favicon.ico") return true;
    if (path === "/favicon.png") return true;
    return false;
  } catch {
    return raw.toLowerCase().includes("favicon");
  }
};

const stripTags = (value: string) => value.replace(/<[^>]*>/g, " ");

const htmlToTextLines = (html: string) => {
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h\d)\s*>/gi, "\n")
    .replace(/<\/(td|th)\s*>/gi, "\n")
    .replace(/<\/(table)\s*>/gi, "\n");

  return normalizeText(stripTags(withBreaks))
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
};

const pickValueAfterLabel = (lines: string[], label: string) => {
  const labelLower = label.toLowerCase();
  for (let i = 0; i < lines.length; i += 1) {
    const current = lines[i];
    if (current.toLowerCase() === labelLower) {
      return lines[i + 1] ?? "";
    }
    if (current.toLowerCase().startsWith(`${labelLower}:`)) {
      return current.slice(label.length + 1).trim();
    }
  }
  return "";
};

const pickNumberAfterLabels = (lines: string[], labels: string[]) => {
  for (const label of labels) {
    const raw = pickValueAfterLabel(lines, label);
    if (!raw) continue;
    const parsed = Number(String(raw).replace(/[^0-9]/g, ""));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
};

const parseSizeToMb = (raw: string) => {
  const match = raw.match(/(\d+(?:\.\d+)?)\s*(kb|mb|gb|tb)\b/i);
  if (!match) return 0;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return 0;
  const unit = match[2].toLowerCase();
  if (unit === "kb") return value / 1024;
  if (unit === "mb") return value;
  if (unit === "gb") return value * 1024;
  if (unit === "tb") return value * 1024 * 1024;
  return 0;
};

const pickSizeInMb = (lines: string[]) => {
  const direct = pickValueAfterLabel(lines, "File size") || pickValueAfterLabel(lines, "File Size");
  const directMb = direct ? parseSizeToMb(direct) : 0;
  if (directMb > 0) return directMb;

  for (const line of lines) {
    if (/\bfile\s*size\b/i.test(line)) {
      const mb = parseSizeToMb(line);
      if (mb > 0) return mb;
    }
  }
  return 0;
};

const extractRequirementsBlock = (lines: string[]) => {
  const anchors = [
    "technical details and system requirements",
    "system requirements",
    "technical details",
  ];
  const startIndex = lines.findIndex((line) => anchors.some((a) => line.toLowerCase().includes(a)));
  if (startIndex < 0) {
    return { minimum: [], recommended: [] };
  }

  const slice = lines.slice(startIndex + 1, startIndex + 40);
  const stopIndex = slice.findIndex((line) => /^(download|related|more|screenshots?)\b/i.test(line));
  const block = (stopIndex >= 0 ? slice.slice(0, stopIndex) : slice)
    .map((line) => line.replace(/^[-•\u2022\s]+/, "").trim())
    .filter((line) => line.length >= 3);

  const minimum: string[] = [];
  const recommended: string[] = [];
  for (const line of block) {
    if (/recommended/i.test(line)) {
      recommended.push(line);
    } else {
      minimum.push(line);
    }
  }

  return {
    minimum: uniqueUrls(minimum).slice(0, 16),
    recommended: uniqueUrls(recommended).slice(0, 16),
  };
};

const extractFirstParagraph = (html: string) => {
  const match = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (!match) return "";
  return normalizeText(stripTags(match[1]));
};

const looksLikeImageUrl = (url: string) => {
  const lower = url.toLowerCase();
  if (lower.startsWith("data:")) return false;
  if (lower.startsWith("blob:")) return false;
  if (lower.includes("/_next/image")) return false;
  if (lower.includes("sprite")) return false;
  if (lower.includes("placeholder")) return false;
  if (lower.includes("favicon")) return true;
  if (/\.(png|jpe?g|webp|gif|svg|avif)(\?|#|$)/i.test(lower)) return true;

  // Allow CDN-style URLs without extensions if query hints a raster format.
  if (/(\?|&)(format|fm)=(png|jpg|jpeg|webp|gif|avif|svg)(\b|&|$)/i.test(lower)) return true;
  if (/(\?|&)(ext)=(png|jpg|jpeg|webp|gif|avif|svg)(\b|&|$)/i.test(lower)) return true;
  return false;
};

const isLikelyImage = (url: string) => {
  if (!url) return false;
  if (!looksLikeImageUrl(url)) return false;
  return true;
};

const scoreLogoCandidate = (url: string) => {
  const lower = url.toLowerCase();
  let score = 0;
  if (lower.includes("logo")) score += 8;
  if (lower.includes("icon")) score += 5;
  if (lower.includes("apple-touch-icon")) score += 6;
  if (lower.includes("favicon")) score += 3;
  if (lower.endsWith(".svg") || lower.includes(".svg?")) score += 6;
  if (lower.endsWith(".png") || lower.includes(".png?")) score += 4;
  if (lower.endsWith(".webp") || lower.includes(".webp?")) score += 2;
  if (lower.includes("banner") || lower.includes("hero") || lower.includes("cover")) score -= 6;
  if (lower.includes("screenshot") || lower.includes("screen")) score -= 4;
  return score;
};

const scoreHeroCandidate = (url: string) => {
  const lower = url.toLowerCase();
  let score = 0;
  if (lower.includes("hero") || lower.includes("banner") || lower.includes("cover")) score += 6;
  if (lower.includes("og")) score += 2;
  if (lower.includes("logo") || lower.includes("icon") || lower.includes("favicon")) score -= 6;
  return score;
};

const scoreScreenshotCandidate = (url: string) => {
  const lower = url.toLowerCase();
  let score = 0;
  if (lower.includes("screenshot") || lower.includes("screen")) score += 8;
  if (lower.includes("gallery")) score += 4;
  if (lower.includes("flickr")) score += 2;
  if (lower.includes("spacer") || lower.includes("placeholder")) score -= 10;
  if (lower.includes("logo") || lower.includes("icon") || lower.includes("favicon")) score -= 6;
  return score;
};

const pickBest = (items: string[], scorer: (url: string) => number) => {
  let best = "";
  let bestScore = -Infinity;
  for (const item of items) {
    const score = scorer(item);
    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }
  return best;
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
  const rx = /<img\s+[^>]*>/gi;
  const urls: string[] = [];
  let match: RegExpExecArray | null;

  const pickAttr = (tag: string, attr: string) => {
    const escaped = attr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rxAttr = new RegExp(`${escaped}=["']([^"']+)["']`, "i");
    const found = tag.match(rxAttr);
    return found ? found[1].trim() : "";
  };

  const parseSrcSet = (srcset: string) => {
    // Take the first candidate URL (usually the smallest). We only need a few.
    const first = srcset.split(",")[0]?.trim() ?? "";
    return first.split(/\s+/)[0]?.trim() ?? "";
  };

  while ((match = rx.exec(html))) {
    const tag = match[0];
    const src = pickAttr(tag, "src");
    const srcset = pickAttr(tag, "srcset");
    if (src) urls.push(src);
    if (srcset) {
      const candidate = parseSrcSet(srcset);
      if (candidate) urls.push(candidate);
    }
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
  const lines = htmlToTextLines(html);

  const ogTitle = extractMeta(html, { attr: "property", value: "og:title" });
  const ogDesc = extractMeta(html, { attr: "property", value: "og:description" });
  const ogImage =
    extractMeta(html, { attr: "property", value: "og:image:secure_url" }) ||
    extractMeta(html, { attr: "property", value: "og:image:url" }) ||
    extractMeta(html, { attr: "property", value: "og:image" });

  const twTitle = extractMeta(html, { attr: "name", value: "twitter:title" });
  const twDesc = extractMeta(html, { attr: "name", value: "twitter:description" });
  const twImage = extractMeta(html, { attr: "name", value: "twitter:image" });

  const metaDesc = extractMeta(html, { attr: "name", value: "description" });

  const jsonLd = extractJsonLdBlocks(html);
  const jsonLdData = extractFromJsonLd(jsonLd);

  const title = extractTitle(html);
  const h1 = extractH1(html);

  const name = clampText(ogTitle || twTitle || jsonLdData.name || h1 || title, 120);

  const paragraph = extractFirstParagraph(html);
  const resolvedDescription = ogDesc || twDesc || jsonLdData.description || metaDesc || paragraph;
  const description = clampText(resolvedDescription, 1200);
  const summary = clampText(description || resolvedDescription, 220);

  const iconHref = extractLinkIcon(html);

  const iconCandidates = uniqueUrls([
    resolveUrl(baseUrl, iconHref),
    resolveUrl(baseUrl, extractMeta(html, { attr: "property", value: "og:logo" })),
  ])
    .filter(isLikelyImage)
    .filter((url) => !isFaviconUrl(url));

  const logoCandidates = uniqueUrls([
    ...iconCandidates,
    resolveUrl(baseUrl, twImage),
    resolveUrl(baseUrl, ogImage),
    ...jsonLdData.images.map((u) => resolveUrl(baseUrl, u)),
  ])
    .filter(isLikelyImage)
    .filter((url) => !isFaviconUrl(url));

  const heroCandidates = uniqueUrls([
    resolveUrl(baseUrl, ogImage),
    resolveUrl(baseUrl, twImage),
    ...jsonLdData.images.map((u) => resolveUrl(baseUrl, u)),
  ]).filter(isLikelyImage);

  const imgCandidates = extractImgSources(html).map((u) => resolveUrl(baseUrl, u));

  const screenshotPool = uniqueUrls([
    ...heroCandidates,
    ...imgCandidates,
  ])
    .filter(Boolean)
    .filter(isLikelyImage)
    .filter((url) => !isFaviconUrl(url));

  const scoredScreenshots = screenshotPool
    .map((url) => ({ url, score: scoreScreenshotCandidate(url) }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.url);

  const screenshots = uniqueUrls([
    ...scoredScreenshots,
  ]).slice(0, 6);

  const version = pickValueAfterLabel(lines, "Version") || pickValueAfterLabel(lines, "File name");
  const releaseDate = pickValueAfterLabel(lines, "Release Date");
  const developer = pickValueAfterLabel(lines, "Created by");
  const downloads = pickNumberAfterLabels(lines, ["Total Downloads", "Downloads", "Total Download"]);

  const sizeInMb = pickSizeInMb(lines);

  const requirements = extractRequirementsBlock(lines);

  return {
    name,
    summary,
    description,
    websiteUrl: baseUrl.toString(),
    version: clampText(version, 40) || undefined,
    releaseDate: clampText(releaseDate, 40) || undefined,
    downloads: downloads > 0 ? downloads : undefined,
    sizeInMb: sizeInMb > 0 ? sizeInMb : undefined,
    developer: clampText(developer, 80) || undefined,
    requirements:
      requirements.minimum.length || requirements.recommended.length ? requirements : undefined,
    logoUrl: pickBest(logoCandidates, scoreLogoCandidate) || pickFirst(logoCandidates),
    heroImage: pickBest(heroCandidates, scoreHeroCandidate) || pickFirst(heroCandidates),
    screenshots: uniqueUrls([
      pickBest(heroCandidates, scoreHeroCandidate),
      ...screenshots,
    ])
      .filter(Boolean)
      .slice(0, 6),
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
