import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isAdminRequestAuthorized, getAdminSecretOrThrow } from "@/lib/auth/admin-session";
import net from "node:net";

export const runtime = "nodejs";

const extractAnchorHrefs = (html: string) => {
  const rx = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
  const urls: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = rx.exec(html))) {
    urls.push(match[1].trim());
    if (urls.length >= 80) break;
  }
  return Array.from(new Set(urls.map((v) => v.trim()).filter(Boolean)));
};

const parseDownloadsFromText = (text: string) => {
  // Accept formats like:
  // "Total Downloads 10 280 359" | "Downloads: 10,280,359" | "Total downloads: 10.2M"
  const rx = /\b(total\s+downloads?|downloads?)\b\s*[:\-]?\s*([0-9][0-9,\s.]*\s*[kmb]?)/i;
  const match = String(text ?? "").match(rx);
  if (!match) return 0;
  return parseDownloadsValue(match[2] ?? "");
};

const classifyFromText = (text: string) => {
  const lower = (text || "").toLowerCase();
  const platforms = new Set<string>();
  if (/\bwindows\b|\bwin\s*10\b|\bwin\s*11\b/.test(lower)) platforms.add("windows");
  if (/\bmac\b|\bmacos\b|\bosx\b/.test(lower)) platforms.add("mac");
  if (/\blinux\b|\bubuntu\b|\bdebian\b|\bfedora\b/.test(lower)) platforms.add("linux");
  if (/\bandroid\b/.test(lower)) platforms.add("android");
  if (/\bios\b|\bipad\b|\biphone\b/.test(lower)) platforms.add("ios");
  if (/\bweb\b|\bbrowser\b|\bsaaS\b|\bcloud\b/.test(lower)) platforms.add("web");
  if (platforms.size === 0) platforms.add("windows");

  const categories = new Set<string>();
  const add = (cat: string, rx: RegExp) => {
    if (rx.test(lower)) categories.add(cat);
  };
  add("development", /\b(ide|sdk|developer|devops|kubernetes|docker|api|git|compiler|programming|code)\b/);
  add("security", /\b(security|antivirus|vpn|firewall|malware|ransomware|encryption|pentest|zero[-\s]?trust)\b/);
  add("productivity", /\b(productivity|notes|calendar|tasks|project|crm|email|workspace|collaboration)\b/);
  add("multimedia", /\b(video|audio|music|photo|camera|editor|editing|render|stream|youtube|mp3|mp4)\b/);
  add("utilities", /\b(utility|cleanup|driver|backup|restore|recovery|optimizer|system\s*care|winpe|tools?)\b/);
  add("education", /\b(education|learn|course|students?|training|tutorial)\b/);
  add("games", /\b(game|launcher|fps|rpg|steam)\b/);
  add("operating-systems", /\b(os|operating\s*system|distro|linux\s*distro)\b/);
  if (categories.size === 0) categories.add("software");

  const type = (() => {
    if (/\bopen\s*source\b|\bgpl\b|\bmit\b|\bapache\b/.test(lower)) return "open-source";
    if (/\bfreeware\b|\bfree\b/.test(lower) && !/\btrial\b/.test(lower)) return "free";
    if (/\bfremium\b/.test(lower)) return "freemium";
    if (/\btrial\b|\bevaluation\b/.test(lower)) return "freemium";
    if (/\bpaid\b|\bprice\b|\bsubscription\b|\blicense\b/.test(lower)) return "standard";
    return "standard";
  })();

  return {
    platforms: Array.from(platforms),
    categories: Array.from(categories),
    type,
  };
};

const extractDownloadCandidateUrls = (html: string) => {
  const urls: string[] = [];
  urls.push(...extractAnchorHrefs(html));

  // data-href / data-url
  {
    const rx = /\bdata-(?:href|url)=["']([^"']+)["']/gi;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(html))) {
      urls.push(m[1].trim());
      if (urls.length >= 140) break;
    }
  }

  // onclick navigation patterns
  {
    const rx = /\bonclick=["'][^"']*(?:location\.href|window\.location)\s*=\s*["']([^"']+)["'][^"']*["']/gi;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(html))) {
      urls.push(m[1].trim());
      if (urls.length >= 200) break;
    }
  }

  // form actions
  {
    const rx = /<form\s+[^>]*action=["']([^"']+)["'][^>]*>/gi;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(html))) {
      urls.push(m[1].trim());
      if (urls.length >= 240) break;
    }
  }

  // URLs embedded in script tags (common for download redirects)
  {
    const scripts: string[] = [];
    const scriptRx = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    let m: RegExpExecArray | null;
    while ((m = scriptRx.exec(html))) {
      const body = m[1];
      if (!body) continue;
      // Only keep scripts that are likely to contain download URLs.
      if (!/\b(download|dl|mirror|file)\b/i.test(body)) continue;
      scripts.push(body);
      if (scripts.length >= 12) break;
    }

    const urlRx = /https?:\/\/[^\s"'<>]+/gi;
    for (const script of scripts) {
      let hit: RegExpExecArray | null;
      while ((hit = urlRx.exec(script))) {
        const raw = (hit[0] ?? "").trim();
        if (!raw) continue;
        urls.push(raw);
        if (urls.length >= 340) break;
      }
      if (urls.length >= 340) break;
    }
  }

  return uniqueUrls(urls);
};

const isLikelyDownloadUrl = (raw: string) => {
  const lower = raw.toLowerCase();
  if (!lower) return false;
  if (lower.startsWith("javascript:")) return false;
  if (lower.startsWith("mailto:")) return false;
  if (lower.startsWith("tel:")) return false;

  // direct file extensions
  if (/\.(exe|msi|dmg|pkg|zip|7z|rar|tar|gz|tgz|apk|appimage)(\?|#|$)/i.test(lower)) return true;

  // generic download pages
  if (/\bdownload\b/i.test(lower)) return true;

  return false;
};

const scoreDownloadUrl = (raw: string) => {
  const lower = raw.toLowerCase();
  let score = 0;
  if (/\.(exe|msi|dmg|pkg|zip|7z|rar|tar|gz|tgz|apk|appimage)(\?|#|$)/i.test(lower)) score += 50;
  if (/\b(download|dl)\b/i.test(lower)) score += 10;
  if (/\b(setup|installer|install|release|latest|stable)\b/i.test(lower)) score += 10;
  if (/\b(beta|trial)\b/i.test(lower)) score -= 5;
  if (/\b(pricing|plans|checkout|login|register|account|blog|news)\b/i.test(lower)) score -= 30;
  return score;
};

const resolveSizeViaHead = async (candidate: URL) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6_000);
  try {
    const head = await fetch(candidate.toString(), {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "accept-language": "en-US,en;q=0.9",
        accept: "*/*",
      },
    });

    const headType = (head.headers.get("content-type") ?? "").toLowerCase();
    const headDisp = (head.headers.get("content-disposition") ?? "").toLowerCase();
    const headLen = Number(head.headers.get("content-length") ?? 0);

    if (!(headType.startsWith("text/html") && !headDisp.includes("attachment"))) {
      if (head.ok && Number.isFinite(headLen) && headLen > 0) {
        const mb = headLen / (1024 * 1024);
        if (isReasonableSizeInMb(mb) && mb >= 1) return mb;
      }
    }

    const ranged = await fetch(candidate.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "accept-language": "en-US,en;q=0.9",
        range: "bytes=0-0",
        accept: "*/*",
      },
    });

    const rangedType = (ranged.headers.get("content-type") ?? "").toLowerCase();
    const rangedDisp = (ranged.headers.get("content-disposition") ?? "").toLowerCase();
    if (rangedType.startsWith("text/html") && !rangedDisp.includes("attachment")) return 0;

    const contentRange = ranged.headers.get("content-range") ?? "";
    const m = contentRange.match(/\/(\d+)\s*$/);
    if (m) {
      const total = Number(m[1]);
      if (Number.isFinite(total) && total > 0) {
        const mb = total / (1024 * 1024);
        if (isReasonableSizeInMb(mb) && mb >= 1) return mb;
      }
    }

    const contentLength = Number(ranged.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > 0) {
      const mb = contentLength / (1024 * 1024);
      if (isReasonableSizeInMb(mb) && mb >= 1) return mb;
    }

    return 0;
  } catch {
    return 0;
  } finally {
    clearTimeout(timeout);
  }
};

const fetchHtmlLight = async (url: URL) => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_LIGHT_TIMEOUT_MS);
    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        redirect: "follow",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "accept-language": "en-US,en;q=0.9",
          accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        },
        signal: controller.signal,
      });

      if (!res.ok) return "";
      const ct = (res.headers.get("content-type") ?? "").toLowerCase();
      if (ct && !ct.includes("html")) return "";
      const text = await res.text();
      return text.length > 600_000 ? text.slice(0, 600_000) : text;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      const isTimeout =
        error instanceof Error &&
        (error.name === "AbortError" || /aborted|abort|timeout|timed\s*out|etimedout/i.test(msg));
      if (isTimeout && attempt === 0) continue;
      return "";
    } finally {
      clearTimeout(timeout);
    }
  }

  return "";
};

const resolveDownloadSizeFromHtml = async (baseUrl: URL, html: string) => {
  const visited = new Set<string>();

  const resolveRecursive = async (currentBase: URL, currentHtml: string, depth: number): Promise<number> => {
    const hrefs = extractDownloadCandidateUrls(currentHtml)
      .map((href) => resolveUrl(currentBase, href))
      .filter(Boolean)
      .filter(isLikelyDownloadUrl)
      .sort((a, b) => scoreDownloadUrl(b) - scoreDownloadUrl(a));

    for (const href of hrefs.slice(0, 12)) {
      if (visited.has(href)) continue;
      visited.add(href);

      try {
        const allowed = assertUrlAllowed(href);
        const mb = await resolveSizeViaHead(allowed);
        if (isReasonableSizeInMb(mb)) return mb;

        if (depth < 2) {
          const nextHtml = await fetchHtmlLight(allowed);
          if (nextHtml) {
            const extracted = extractSizeInMbFromHtml(nextHtml);
            if (isReasonableSizeInMb(extracted)) return extracted;

            const nested = await resolveRecursive(allowed, nextHtml, depth + 1);
            if (isReasonableSizeInMb(nested)) return nested;
          }
        }
      } catch {
        // ignore
      }
    }

    return 0;
  };

  return resolveRecursive(baseUrl, html, 0);
};

const payloadSchema = z.object({
  url: z.string().min(1),
  englishMode: z.enum(["off", "soft", "strict"]).optional(),
  searchByName: z.boolean().optional(),
  debug: z.boolean().optional(),
});

type ScrapeResult = {
  name: string;
  summary: string;
  description: string;
  websiteUrl: string;
  platforms?: string[];
  categories?: string[];
  type?: string;
  version?: string;
  releaseDate?: string;
  downloads?: number;
  sizeInMb?: number;
  rating?: number;
  votes?: number;
  developer?: string;
  requirements?: {
    minimum: string[];
    recommended: string[];
  };
  features?: string[];
  logoUrl: string;
  heroImage: string;
  screenshots: string[];
};

const MAX_HTML_BYTES = 1_500_000;
const FETCH_TIMEOUT_MS = (() => {
  const raw = process.env.SCRAPE_FETCH_TIMEOUT_MS;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed >= 3_000 ? parsed : 20_000;
})();

const FETCH_LIGHT_TIMEOUT_MS = (() => {
  const raw = process.env.SCRAPE_FETCH_LIGHT_TIMEOUT_MS;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed >= 3_000 ? parsed : 12_000;
})();

const clampText = (value: string, max: number) => value.trim().replace(/\s+/g, " ").slice(0, max);

const normalizeText = (value: string) => value.replace(/\s+/g, " ").trim();

const countMatches = (value: string, rx: RegExp) => {
  const matches = value.match(rx);
  return matches ? matches.length : 0;
};

const isMostlyEnglish = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const arabicCount = countMatches(trimmed, /[\u0600-\u06FF]/g);
  if (arabicCount > 0) {
    const latinLetters = countMatches(trimmed, /[A-Za-z]/g);
    return latinLetters >= arabicCount * 2;
  }
  return true;
};

const stripNonEnglishChars = (value: string) => {
  return value
    .replace(/[\u0600-\u06FF]/g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const applyEnglishModeToText = (value: string, mode: "off" | "soft" | "strict") => {
  if (mode === "off") return value;
  const cleaned = stripNonEnglishChars(value);
  if (!cleaned) return "";
  if (mode === "strict") {
    return isMostlyEnglish(cleaned) ? cleaned : "";
  }
  return cleaned;
};

const applyEnglishModeToLines = (lines: string[], mode: "off" | "soft" | "strict") => {
  if (mode === "off") return lines;
  const out: string[] = [];
  for (const line of lines) {
    const cleaned = applyEnglishModeToText(line, mode);
    if (!cleaned) continue;
    if (mode === "soft" && cleaned.length < 2) continue;
    out.push(cleaned);
  }
  return out;
};

const stripBranding = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed
    .replace(/\s*[-|–—]\s*filecr\b/gi, "")
    .replace(/\bfilecr\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
};

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

const decodeDuckDuckGoRedirect = (href: string) => {
  try {
    const url = new URL(href);
    const uddg = url.searchParams.get("uddg");
    if (uddg) return decodeURIComponent(uddg);
    return "";
  } catch {
    return "";
  }
};

const extractDuckDuckGoResultUrls = (html: string) => {
  const urls: string[] = [];
  const rx = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(html))) {
    const href = (m[1] ?? "").trim();
    if (!href) continue;
    if (href.startsWith("/")) continue;
    if (!href.startsWith("http")) continue;

    const decoded = decodeDuckDuckGoRedirect(href);
    const candidate = decoded || href;
    if (!candidate.startsWith("http")) continue;
    urls.push(candidate);
    if (urls.length >= 25) break;
  }

  return uniqueUrls(urls)
    .filter((u) => {
      try {
        const host = new URL(u).hostname.toLowerCase();
        if (!host) return false;
        if (host.includes("duckduckgo.com")) return false;
        if (host.includes("google.com")) return false;
        if (host.includes("bing.com")) return false;
        return true;
      } catch {
        return false;
      }
    })
    .slice(0, 6);
};

const fetchSearchResultsByName = async (query: string) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6_000);
  try {
    const searchUrl = new URL("https://duckduckgo.com/html/");
    searchUrl.searchParams.set("q", query);
    const res = await fetch(searchUrl.toString(), {
      method: "GET",
      redirect: "follow",
      headers: {
        "user-agent": "soft-hub-scraper/1.0",
        accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    });
    if (!res.ok) return [] as string[];
    const html = await res.text();
    return extractDuckDuckGoResultUrls(html);
  } catch {
    return [] as string[];
  } finally {
    clearTimeout(timeout);
  }
};

const extractSupplementalTextFromHtml = (html: string) => {
  const contentHtml = extractMainContentHtml(html) || html;
  const lines = htmlToTextLines(contentHtml);
  const overview = extractOverviewText(lines);
  const features = extractFeaturesList(lines);
  return {
    overview,
    features,
  };
};

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

  return stripTags(withBreaks)
    .split(/\n+/)
    .map((line) => normalizeText(line))
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

const parseSizeFromText = (text: string) => {
  const candidates = extractSizeCandidatesFromText(text);
  const best = pickBestSizeCandidate(candidates);
  return isReasonableSizeInMb(best) ? best : 0;
};

const pickDownloadsFallback = (lines: string[]) => {
  const text = lines.join("\n");
  const parsed = parseDownloadsFromText(text);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const parseHumanNumber = (raw: string) => {
  const normalized = String(raw).trim();
  if (!normalized) return 0;

  // Prefer the first number token in the string to avoid concatenating unrelated numbers.
  // Supports: 1,234 | 1234 | 1.2M | 500k
  const tokenMatch = normalized.match(/\b(\d{1,3}(?:[\s,]\d{3})+|\d+(?:\.\d+)?)\s*([kmb])?\b/i);
  if (!tokenMatch) return 0;

  const num = Number(String(tokenMatch[1]).replace(/[\s,]/g, ""));
  if (!Number.isFinite(num)) return 0;

  const suffix = (tokenMatch[2] ?? "").toLowerCase();
  if (suffix === "k") return Math.round(num * 1_000);
  if (suffix === "m") return Math.round(num * 1_000_000);
  if (suffix === "b") return Math.round(num * 1_000_000_000);
  return Math.round(num);
};

const parseVersionFromString = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/\b(?:v)?(\d+\.\d+(?:\.\d+){0,3})\b/i);
  return match ? match[1] : "";
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

const isReasonableSizeInMb = (mb: number) => Number.isFinite(mb) && mb >= 1 && mb <= 200_000;

const isRequirementsContext = (ctx: string) => {
  const normalized = ctx.toLowerCase();
  // Common system requirements signals that frequently contain numbers/sizes.
  return /\b(?:system\s+requirements?|requirements?|minimum|recommended|min\.|rec\.|ram|memory|vram|gpu|cpu|processor|disk|storage|space|hdd|ssd|directx|opengl|vulkan|windows|mac|linux|android|ios)\b/i.test(
    normalized,
  );
};

const isDownloadContext = (ctx: string) => {
  const normalized = ctx.toLowerCase();
  return /\b(?:download|installer|installation|setup|file\s*size|filesize|download\s*size|package|portable|mirror|direct\s*download|apk|exe|msi|dmg|pkg|zip|rar|7z|iso)\b/i.test(
    normalized,
  );
};

const extractSizeCandidatesFromText = (text: string) => {
  const candidates: number[] = [];
  const normalized = String(text || "");
  if (!normalized) return candidates;

  const labelRx = /\b(?:file\s*size|filesize|download\s*size)\b[^\n\r]{0,80}?(\d+(?:\.\d+)?)\s*(kb|mb|gb|tb)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = labelRx.exec(normalized))) {
    const hit = m[0] ?? "";
    if (isRequirementsContext(hit)) continue;
    const mb = parseSizeToMb(`${m[1]} ${m[2]}`);
    if (isReasonableSizeInMb(mb)) candidates.push(mb);
  }

  // Loose scan: find size patterns and validate their surrounding context.
  // Helps with text blocks like "Download size: 1.2 GB".
  const looseRx = /\b(\d{1,6}(?:\.\d+)?)\s*(kb|mb|gb|tb)\b/gi;
  while ((m = looseRx.exec(normalized))) {
    const start = Math.max(0, m.index - 40);
    const ctx = normalized.slice(start, m.index + m[0].length + 40);
    if (isRequirementsContext(ctx)) continue;
    const hasExplicitSizeLabel = /\b(?:file\s*size|filesize|download\s*size)\b/i.test(ctx);
    if (!isDownloadContext(ctx) && !hasExplicitSizeLabel) continue;
    const mb = parseSizeToMb(`${m[1]} ${m[2]}`);
    if (isReasonableSizeInMb(mb)) candidates.push(mb);
  }

  // Bytes patterns: "fileSize": 585157376 | download size: 585157376 bytes
  const bytesLabelRx = /\b(?:file\s*size|filesize|download\s*size)\b[^\n\r]{0,80}?(\d{6,})(?:\s*bytes\b)?/gi;
  while ((m = bytesLabelRx.exec(normalized))) {
    const hit = m[0] ?? "";
    if (isRequirementsContext(hit)) continue;
    const bytes = Number(String(m[1]).replace(/,/g, ""));
    if (!Number.isFinite(bytes) || bytes <= 0) continue;
    const mb = bytes / (1024 * 1024);
    if (isReasonableSizeInMb(mb)) candidates.push(mb);
  }

  const jsonBytesRx = /\b(?:fileSize|filesize|downloadSize|sizeInBytes|bytes)\b\s*[:=]\s*([0-9]{6,})\b/gi;
  while ((m = jsonBytesRx.exec(normalized))) {
    const bytes = Number(m[1]);
    if (!Number.isFinite(bytes) || bytes <= 0) continue;
    const mb = bytes / (1024 * 1024);
    if (isReasonableSizeInMb(mb)) candidates.push(mb);
  }

  // Generic bytes without label (common in inline JSON): 585157376 bytes
  const genericBytesRx = /\b([0-9]{6,})\s*bytes\b/gi;
  while ((m = genericBytesRx.exec(normalized))) {
    const bytes = Number(m[1]);
    if (!Number.isFinite(bytes) || bytes <= 0) continue;
    const mb = bytes / (1024 * 1024);
    if (isReasonableSizeInMb(mb)) candidates.push(mb);
  }

  // Other common size keys.
  const moreKeysRx = /\b(?:contentLength|content_length|downloadBytes|packageSize)\b\s*[:=]\s*([0-9]{6,})\b/gi;
  while ((m = moreKeysRx.exec(normalized))) {
    const bytes = Number(m[1]);
    if (!Number.isFinite(bytes) || bytes <= 0) continue;
    const mb = bytes / (1024 * 1024);
    if (isReasonableSizeInMb(mb)) candidates.push(mb);
  }

  return candidates;
};

const pickBestSizeCandidate = (candidates: number[]) => {
  if (!candidates.length) return 0;
  // When multiple size candidates exist (common on FileCR), the largest value is
  // not always correct (can be a different mirror/variant). Prefer the most
  // frequent (mode). If tied, prefer the largest.
  const freq = new Map<string, { mb: number; count: number }>();
  for (const mbRaw of candidates) {
    if (!Number.isFinite(mbRaw) || mbRaw <= 0) continue;
    const mb = Math.round(mbRaw * 10) / 10;
    const key = String(mb);
    const current = freq.get(key);
    if (current) {
      current.count += 1;
    } else {
      freq.set(key, { mb, count: 1 });
    }
  }

  const best = Array.from(freq.values()).sort((a, b) => b.count - a.count || b.mb - a.mb)[0];
  return best?.mb ?? 0;
};

const extractPlainNumberSizeMbFromHtml = (html: string) => {
  {
    const directRx = /<[^>]*\bclass\s*=\s*(["'])[^"']*\bdownload-size\b[^"']*\1[^>]*>\s*([0-9]{1,6}(?:\.[0-9]+)?)\s*(?:<[^>]*>\s*)*(kb|mb|gb|tb)\b/gi;
    const directCandidates: number[] = [];
    let match: RegExpExecArray | null;
    while ((match = directRx.exec(html))) {
      const mb = parseSizeToMb(`${match[2]} ${match[3]}`);
      if (isReasonableSizeInMb(mb)) directCandidates.push(mb);
      if (directCandidates.length >= 6) break;
    }

    if (directCandidates.length) {
      // FileCR sometimes contains multiple download-size elements.
      // The largest value is not always correct (can be a different mirror/variant).
      // Prefer the most frequent value (mode). If tied, prefer the largest.
      const freq = new Map<string, { mb: number; count: number }>();
      for (const mb of directCandidates) {
        const key = String(Math.round(mb * 10) / 10);
        const current = freq.get(key);
        if (current) {
          current.count += 1;
        } else {
          freq.set(key, { mb: Math.round(mb * 10) / 10, count: 1 });
        }
      }

      const best = Array.from(freq.values()).sort((a, b) => b.count - a.count || b.mb - a.mb)[0];
      return best?.mb ?? 0;
    }
  }

  const candidates: number[] = [];

  const pushCandidate = (value: number) => {
    if (!Number.isFinite(value)) return;
    if (value < 5 || value > 200_000) return;
    candidates.push(value);
  };

  // Many sites render download size as a plain number inside a specific element.
  // Examples:
  // <div class="download-size">632</div>
  // <span id="file-size">1200</span>
  const elementRx = /<(?:div|span|p|strong|b|small)\b[^>]*(?:class|id)\s*=\s*(["'])[^"']*(?:download[-_\s]*size|file[-_\s]*size|filesize|size[-_\s]*mb|mb[-_\s]*size)[^"']*\1[^>]*>([\s\S]*?)<\/(?:div|span|p|strong|b|small)>/gi;
  let m: RegExpExecArray | null;
  while ((m = elementRx.exec(html))) {
    const inner = stripTags(m[2] ?? "")
      .replace(/&nbsp;/gi, " ")
      .replace(/\u00a0/g, " ")
      .replace(/["']/g, "")
      .trim();
    if (!inner) continue;

    // Allow: 632 | 632 mb | 1.40 gb
    const unitMatch = inner.match(/\b(\d+(?:\.\d+)?)\s*(kb|mb|gb|tb)\b/i);
    if (unitMatch) {
      const mb = parseSizeToMb(`${unitMatch[1]} ${unitMatch[2]}`);
      if (isReasonableSizeInMb(mb)) {
        candidates.push(mb);
      }
      continue;
    }

    const numMatch = inner.match(/^\s*(\d{1,6}(?:\.\d+)?)\s*$/i);
    if (!numMatch) continue;
    const value = Number(numMatch[1]);
    if (!Number.isFinite(value) || value <= 0) continue;
    pushCandidate(value);
  }

  // Also support patterns where "download-size" is used nearby without being on the element itself.
  // This is a conservative windowed scan to avoid confusing with downloads counters.
  const nearbyRx = /download[-_\s]*size[\s\S]{0,120}?(\d{1,6}(?:\.\d+)?)\b/gi;
  while ((m = nearbyRx.exec(html))) {
    const window = (m[0] ?? "").toLowerCase();
    if (isRequirementsContext(window)) continue;
    if (!isDownloadContext(window) && !/download[-_\s]*size/i.test(window)) continue;
    const value = Number(m[1]);
    if (!Number.isFinite(value) || value <= 0) continue;
    pushCandidate(value);
  }

  const best = pickBestSizeCandidate(candidates);
  return isReasonableSizeInMb(best) ? best : 0;
};

const extractSizeInMbFromHtml = (html: string) => {
  const text = stripTags(html);
  const fromText = extractSizeCandidatesFromText(text);

  const plainNumberMb = extractPlainNumberSizeMbFromHtml(html);

  const scripts: string[] = [];
  const scriptRx = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = scriptRx.exec(html))) {
    const body = m[1];
    if (!body) continue;
    // Only keep scripts that are likely to contain metadata.
    if (!/(file\s*size|filesize|download\s*size|"size"\s*:|size\s*:)/i.test(body)) continue;
    scripts.push(body);
    if (scripts.length >= 10) break;
  }

  const fromScripts = extractSizeCandidatesFromText(scripts.join("\n"));
  const best = pickBestSizeCandidate([...fromText, ...fromScripts, ...(plainNumberMb > 0 ? [plainNumberMb] : [])]);
  return isReasonableSizeInMb(best) ? best : 0;
};

const extractDeveloperCtaSizeMbFromHtml = (html: string) => {
  // FileCR-style pages sometimes show an accurate size next to the "Download from developer" CTA.
  // Prefer this marker when present to avoid wrong HEAD/Range-derived sizes.
  const normalizedText = stripTags(html).replace(/\s+/g, " ").trim();
  const rxText = /(download\s+from\s+developer)[\s\S]{0,120}?(\d{1,6}(?:\.\d+)?)\s*(kb|mb|gb|tb)\b/i;
  const rxDownload = /(download)[\s\S]{0,80}?(\d{1,6}(?:\.\d+)?)\s*(kb|mb|gb|tb)\b/i;

  const match = normalizedText.match(rxText) ?? normalizedText.match(rxDownload) ?? html.match(rxText) ?? html.match(rxDownload);
  if (!match) return 0;
  const mb = parseSizeToMb(`${match[2]} ${match[3]}`);
  return isReasonableSizeInMb(mb) ? mb : 0;
};

const extractSection = (
  lines: string[],
  startMatchers: Array<(line: string) => boolean>,
  stopMatchers: Array<(line: string) => boolean>,
  maxLines = 80,
) => {
  const startIndex = lines.findIndex((line) => startMatchers.some((fn) => fn(line)));
  if (startIndex < 0) return [] as string[];

  const slice = lines.slice(startIndex + 1, startIndex + 1 + maxLines);
  const stopIndex = slice.findIndex((line) => stopMatchers.some((fn) => fn(line)));
  const block = (stopIndex >= 0 ? slice.slice(0, stopIndex) : slice)
    .map((line) => line.replace(/^[-•\u2022\s]+/, "").trim())
    .filter(Boolean);

  return block;
};

const sliceAfterTitle = (lines: string[], titleHint: string) => {
  const hint = titleHint.trim().toLowerCase();
  if (!hint) return lines;

  const normalizedHint = normalizeText(hint);
  const exactIndex = lines.findIndex((line) => normalizeText(line.toLowerCase()) === normalizedHint);
  if (exactIndex >= 0) {
    return lines.slice(exactIndex);
  }

  const token = normalizedHint.split(/\s+/).filter(Boolean).slice(0, 4).join(" ");
  if (!token) return lines;

  const index = lines.findIndex((line) => line.toLowerCase().includes(token));
  if (index < 0) return lines;
  return lines.slice(index);
};

const extractOverviewText = (lines: string[]) => {
  const block = extractSection(
    lines,
    [
      (line) => /\boverview\b/i.test(line),
      (line) => /\bdescription\b/i.test(line),
    ],
    [
      (line) => /\bfeatures\b/i.test(line),
      (line) => /\bsystem requirements\b/i.test(line),
      (line) => /\btechnical details\b/i.test(line),
      (line) => /\bproduct information\b/i.test(line),
      (line) => /\bdownload\b/i.test(line),
    ],
    60,
  );

  const paragraph = block
    .filter((line) => line.length >= 20)
    .filter((line) => !/^features\b/i.test(line))
    .slice(0, 6)
    .join(" ");

  return normalizeText(paragraph);
};

const extractFeaturesList = (lines: string[]) => {
  const block = extractSection(
    lines,
    [
      (line) => /^features\b/i.test(line),
      (line) => /\bfeatures of\b/i.test(line),
      (line) => /\bkey\s+features\b/i.test(line),
      (line) => /\bhighlights\b/i.test(line),
      (line) => /\bwhat['’]?s\s+new\b/i.test(line),
    ],
    [
      (line) => /\bsystem requirements\b/i.test(line),
      (line) => /\btechnical details\b/i.test(line),
      (line) => /\bproduct information\b/i.test(line),
      (line) => /\bdownload\b/i.test(line),
      (line) => /\bprevious\s+version\b/i.test(line),
      (line) => /\badditional\s+info\b/i.test(line),
      (line) => /^\s*(?:file\s*name|version|date|downloads?)\b/i.test(line),
    ],
    80,
  );

  const features = block
    .map((line) => line.replace(/^[-•\u2022\s]+/, "").trim())
    .filter((line) => line.length >= 3)
    .filter((line) => !/^(features|feature)\b/i.test(line))
    .filter((line) => !/^adobe\b/i.test(line))
    .filter((line) => !/\b(?:previous\s+version|additional\s+info|file\s*name|downloads?|multilingual|mirror)\b/i.test(line))
    .slice(0, 30);

  return uniqueUrls(features);
};

const extractMainContentHtml = (html: string) => {
  const candidates: string[] = [];
  const mainMatch = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch?.[1]) candidates.push(mainMatch[1]);
  const articleMatch = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch?.[1]) candidates.push(articleMatch[1]);

  const best = candidates.sort((a, b) => b.length - a.length)[0] ?? "";
  return best && best.length > 800 ? best : "";
};

const normalizeReleaseDateToIso = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const direct = Date.parse(trimmed);
  if (!Number.isNaN(direct)) return new Date(direct).toISOString();
  return trimmed;
};

const extractProductInfoMap = (lines: string[]) => {
  const block = extractSection(
    lines,
    [(line) => /\bproduct information\b/i.test(line)],
    [
      // Stop only on section headings. We must not stop on lines like "Total Downloads".
      (line) => /^\s*download(?:\s+links?)?\b/i.test(line),
      (line) => /^\s*screenshots?\b/i.test(line),
      (line) => /^\s*related\b/i.test(line),
      (line) => /^\s*(?:previous\s+versions?|versions?)\b/i.test(line),
    ],
    80,
  );

  const map = new Map<string, string>();
  const knownInlineKeys = [
    "version",
    "file size",
    "filesize",
    "total downloads",
    "file name",
    "release date",
    "created by",
  ];

  const tryParseKnownInline = (line: string) => {
    const lower = line.toLowerCase();
    for (const key of knownInlineKeys) {
      if (!lower.startsWith(key)) continue;
      const remainder = line.slice(key.length).trim();
      if (!remainder) continue;
      // Ensure the remainder looks like a value (usually contains digits or letters beyond just punctuation).
      if (!/[a-z0-9]/i.test(remainder)) continue;
      return { key, value: remainder };
    }
    return null;
  };

  for (let i = 0; i < block.length; i += 1) {
    const current = block[i].trim();
    const next = (block[i + 1] ?? "").trim();
    if (!current) continue;

    const m = current.match(/^([^:]{2,40})\s*:\s*(.+)$/);
    if (m) {
      map.set(m[1].toLowerCase(), m[2].trim());
      continue;
    }

    // Support FileCR inline rows rendered with a single space between label and value
    // e.g. "Total Downloads 10 280 359" or "File size 5.7 GB"
    const knownInline = tryParseKnownInline(current);
    if (knownInline && !map.has(knownInline.key)) {
      map.set(knownInline.key, knownInline.value);
      continue;
    }

    // Support inline table rows rendered as: "Label    Value"
    // e.g. "Total Downloads 10280359" or "Version 2026 (v27.3.1.4)"
    const inline = current.match(/^([a-z][a-z\s]{1,30})\s{2,}(.{1,120})$/i);
    if (inline) {
      const key = inline[1].trim().toLowerCase();
      const value = inline[2].trim();
      if (key && value && !map.has(key)) {
        map.set(key, value);
        continue;
      }
    }

    if (next && /^[a-z][a-z\s]{1,30}$/i.test(current) && !map.has(current.toLowerCase())) {
      map.set(current.toLowerCase(), next);
      i += 1;
    }
  }

  return map;
};

const parseDownloadsValue = (raw: string) => {
  const normalized = String(raw ?? "").trim();
  if (!normalized) return 0;

  // Accept human forms such as: 12,345 | 120K | 5.2M
  const parsed = parseHumanNumber(normalized);
  if (!Number.isFinite(parsed)) return 0;
  if (parsed < 1) return 0;
  if (parsed > 2_000_000_000) return 0;
  return parsed;
};

const pickDownloads = (lines: string[], productInfo: Map<string, string>) => {
  const fromProductInfo = parseDownloadsValue(productInfo.get("total downloads") || "");
  if (fromProductInfo) return fromProductInfo;

  const labeled = parseDownloadsValue(pickValueAfterLabel(lines, "Total Downloads"));
  if (labeled) return labeled;

  const fallback = pickDownloadsFallback(lines);
  return fallback >= 1 && fallback <= 2_000_000_000 ? fallback : 0;
};

const pickSizeInMb = (lines: string[]) => {
  const direct = pickValueAfterLabel(lines, "File size") || pickValueAfterLabel(lines, "File Size");
  const directMb = direct ? parseSizeToMb(direct) : 0;
  if (directMb > 0) return directMb;

  for (const line of lines) {
    if (!/\bfile\s*size\b/i.test(line)) continue;
    if (isRequirementsContext(line)) continue;
    const mb = parseSizeToMb(line);
    if (mb > 0) return mb;
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
  const stopIndex = slice.findIndex((line) =>
    /^(download|related|more|screenshots?|previous\s+version|versions?|changelog|release\s+notes)\b/i.test(line),
  );
  const block = (stopIndex >= 0 ? slice.slice(0, stopIndex) : slice)
    .map((line) => line.replace(/^[-•\u2022\s]+/, "").trim())
    .filter((line) => line.length >= 3);

  const isRequirementLine = (line: string) => {
    const lower = line.toLowerCase();
    if (!lower) return false;
    if (/\b(?:previous\s+version|additional\s+info|downloads?|file\s*name|multilingual|language|mirror|crack|serial|patch)\b/i.test(lower)) {
      return false;
    }
    if (/^\s*(?:date|version)\s*[:\-]/i.test(line)) return false;
    if (/\b(?:system\s+requirements?|requirements?)\b/i.test(lower)) return false;
    return /\b(?:supported\s+os|os|windows|mac|linux|android|ios|cpu|processor|intel|amd|ram|memory|vram|gpu|graphics|directx|opengl|disk|storage|space|free\s+hard\s+disk)\b/i.test(
      lower,
    );
  };

  const cleanedBlock = block
    .filter(isRequirementLine)
    .map((line) => line.replace(/\s*[-|–|—]\s*$/g, "").trim())
    .filter(Boolean);

  const minimum: string[] = [];
  const recommended: string[] = [];
  for (const line of cleanedBlock) {
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

const extractAggregateRatingFromJsonLd = (blocks: unknown[]) => {
  let rating = 0;
  let votes = 0;

  const scan = (node: unknown) => {
    if (!node || typeof node !== "object") return;

    if (Array.isArray(node)) {
      node.forEach(scan);
      return;
    }

    const obj = node as Record<string, unknown>;
    const aggregate = obj.aggregateRating;

    const readAgg = (aggNode: unknown) => {
      if (!aggNode || typeof aggNode !== "object") return;
      const agg = aggNode as Record<string, unknown>;

      const ratingValueRaw = agg.ratingValue;
      const ratingValue =
        typeof ratingValueRaw === "number"
          ? ratingValueRaw
          : typeof ratingValueRaw === "string"
            ? Number(ratingValueRaw)
            : 0;

      const ratingCountRaw = agg.ratingCount ?? agg.reviewCount;
      const ratingCount =
        typeof ratingCountRaw === "number"
          ? ratingCountRaw
          : typeof ratingCountRaw === "string"
            ? Number(String(ratingCountRaw).replace(/,/g, ""))
            : 0;

      if (Number.isFinite(ratingValue) && ratingValue > 0 && ratingValue <= 5 && ratingValue > rating) {
        rating = ratingValue;
      }
      if (Number.isFinite(ratingCount) && ratingCount > votes) {
        votes = ratingCount;
      }
    };

    if (Array.isArray(aggregate)) {
      aggregate.forEach(readAgg);
    } else if (aggregate) {
      readAgg(aggregate);
    }

    for (const value of Object.values(obj)) {
      scan(value);
    }
  };

  blocks.forEach(scan);

  const cleanRating = Number.isFinite(rating) ? Math.round(rating * 10) / 10 : 0;
  const cleanVotes = Number.isFinite(votes) ? Math.floor(votes) : 0;

  return {
    rating: cleanRating >= 0 && cleanRating <= 5 ? cleanRating : 0,
    votes: cleanVotes >= 0 ? cleanVotes : 0,
  };
};

const extractAggregateRatingFromHtml = (html: string) => {
  // Lightweight fallbacks for sites that render rating as plain text.
  // Examples: "Rating 4.6" or "4.6/5" and "(123 reviews)".
  const text = normalizeText(stripTags(html));

  // Prefer matches that contain the word rating/stars nearby.
  const strongRatingMatch = text.match(/\brating\b[^\n\r]{0,40}?(\d(?:\.\d)?)\s*\/?\s*5\b/i);
  const ratingMatch = strongRatingMatch ?? text.match(/\b(\d(?:\.\d)?)\s*\/?\s*5\b/);
  const rating = ratingMatch ? Number(ratingMatch[1]) : 0;

  const votesMatch = text.match(/\b(\d{1,3}(?:,\d{3})+|\d+)\s*(?:reviews?|ratings?|votes?)\b/i);
  const votes = votesMatch ? Number(String(votesMatch[1]).replace(/,/g, "")) : 0;

  return {
    rating: Number.isFinite(rating) && rating > 0 && rating <= 5 ? Math.round(rating * 10) / 10 : 0,
    votes: Number.isFinite(votes) && votes > 0 ? Math.floor(votes) : 0,
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
  return Array.from(new Set(urls.map((v) => v.trim()).filter(Boolean)));
};

const fetchHtml = async (url: URL) => {
  let lastTimeoutError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        redirect: "follow",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "accept-language": "en-US,en;q=0.9",
          accept: "text/html,application/xhtml+xml",
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = new Error(`Upstream responded with ${res.status}`) as Error & { status?: number };
        err.status = res.status;
        throw err;
      }

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.toLowerCase().includes("text/html")) {
        // still allow if missing content-type
        if (contentType && !contentType.toLowerCase().includes("html")) {
          const err = new Error("URL did not return HTML") as Error & { status?: number };
          err.status = 415;
          throw err;
        }
      }

      const text = await res.text();
      const limited = text.length > MAX_HTML_BYTES ? text.slice(0, MAX_HTML_BYTES) : text;
      return limited;
    } catch (error) {
      if (error instanceof Error) {
        const msg = error.message || "Failed to fetch HTML";
        const isTimeout =
          error.name === "AbortError" ||
          /aborted|abort|timeout|timed\s*out|etimedout/i.test(msg);

        if (isTimeout) {
          lastTimeoutError = error;
          if (attempt === 0) continue;
          const err = new Error("Upstream timeout") as Error & { status?: number };
          err.status = 504;
          throw err;
        }

        throw error;
      }

      throw new Error("Failed to fetch HTML");
    } finally {
      clearTimeout(timeout);
    }
  }

  const err = new Error(lastTimeoutError?.message || "Upstream timeout") as Error & { status?: number };
  err.status = 504;
  throw err;
};

const toScrapeResult = async (baseUrl: URL, html: string, englishMode: "off" | "soft" | "strict"): Promise<ScrapeResult> => {
  const contentHtml = extractMainContentHtml(html) || html;
  const rawLines = htmlToTextLines(contentHtml);

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
  const ratingFromJsonLd = extractAggregateRatingFromJsonLd(jsonLd);
  const ratingFromHtml = extractAggregateRatingFromHtml(contentHtml);

  const title = extractTitle(html);
  const h1 = extractH1(html);

  const name = clampText(stripBranding(ogTitle || twTitle || jsonLdData.name || h1 || title), 120);

  const lines = sliceAfterTitle(rawLines, h1 || title || name);

  const paragraph = extractFirstParagraph(html);
  const resolvedSummary = ogDesc || twDesc || metaDesc || jsonLdData.description || paragraph;
  const resolvedDescription = jsonLdData.description || paragraph || metaDesc || ogDesc || twDesc;

  const overviewText = extractOverviewText(lines);
  const descriptionSource = overviewText || resolvedDescription || resolvedSummary;
  const summarySource = resolvedSummary || overviewText || resolvedDescription;

  const descriptionEnglish = applyEnglishModeToText(descriptionSource, englishMode) || descriptionSource;
  const summaryEnglish = applyEnglishModeToText(summarySource, englishMode) || summarySource;

  const description = clampText(stripBranding(descriptionEnglish), 1200);
  const summary = clampText(stripBranding(summaryEnglish), 220);

  const classification = classifyFromText([name, summary, description, rawLines.slice(0, 80).join(" ")].join(" \n"));

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

  const productInfo = extractProductInfoMap(lines);
  const versionRaw =
    productInfo.get("version") ||
    pickValueAfterLabel(lines, "Version") ||
    productInfo.get("file name") ||
    pickValueAfterLabel(lines, "File name");

  const versionFallback =
    parseVersionFromString(versionRaw ?? "") ||
    parseVersionFromString(name) ||
    parseVersionFromString(title) ||
    parseVersionFromString(h1);

  const releaseDateRaw = productInfo.get("release date") || pickValueAfterLabel(lines, "Release Date");
  const developerRaw = productInfo.get("created by") || pickValueAfterLabel(lines, "Created by");

  const downloads = pickDownloads(lines, productInfo);

  const sizeCandidate = (() => {
    const fromDeveloperCta = extractDeveloperCtaSizeMbFromHtml(html);
    if (fromDeveloperCta > 0) return { mb: fromDeveloperCta, confidence: "high" as const };

    // Prefer explicit HTML size markers (e.g. <div class="download-size">632</div>) over line heuristics.
    // These often omit units and are more reliable than generic "file size" text inside requirements sections.
    const fromHtml = extractSizeInMbFromHtml(html);
    if (fromHtml > 0) return { mb: fromHtml, confidence: "high" as const };

    const fromProductInfo = productInfo.get("file size") || productInfo.get("filesize") || "";
    if (fromProductInfo) {
      const suspicious = /\b(?:ram|vram|memory|disk|storage|space|hdd|ssd|directx|opengl|vulkan)\b/i.test(fromProductInfo);
      const parsed = suspicious ? 0 : parseSizeToMb(fromProductInfo);
      if (parsed > 0) return { mb: parsed, confidence: "medium" as const };
    }

    const picked = pickSizeInMb(lines);
    if (picked > 0) return { mb: picked, confidence: "medium" as const };

    const fromLines = parseSizeFromText(lines.join("\n"));
    if (fromLines > 0) return { mb: fromLines, confidence: "low" as const };

    return { mb: 0, confidence: "none" as const };
  })();

  const resolvedSizeInMb = await (async () => {
    const resolved = await resolveDownloadSizeFromHtml(baseUrl, html);
    if (resolved <= 0) return sizeCandidate.mb;

    if (sizeCandidate.confidence === "high" && sizeCandidate.mb > 0) {
      const ratio = resolved / sizeCandidate.mb;
      // Only trust network-derived size when it is close to explicit HTML size markers.
      // Some sites redirect HEAD/Range to HTML landing pages or CDN stubs with incorrect lengths.
      if (ratio >= 0.9 && ratio <= 1.1) return resolved;
      return sizeCandidate.mb;
    }

    return resolved;
  })();

  const requirements = extractRequirementsBlock(lines);
  const requirementsEnglish = {
    minimum: applyEnglishModeToLines(requirements.minimum, englishMode),
    recommended: applyEnglishModeToLines(requirements.recommended, englishMode),
  };

  const features = applyEnglishModeToLines(extractFeaturesList(lines), englishMode);

  const rating = ratingFromJsonLd.rating || ratingFromHtml.rating;
  const votes = ratingFromJsonLd.votes || ratingFromHtml.votes;

  return {
    name,
    summary,
    description,
    websiteUrl: baseUrl.toString(),
    platforms: classification.platforms,
    categories: classification.categories,
    type: classification.type,
    version: clampText(versionFallback, 60) || undefined,
    releaseDate: normalizeReleaseDateToIso(clampText(releaseDateRaw ?? "", 80)) || undefined,
    downloads: downloads > 0 ? downloads : undefined,
    sizeInMb: resolvedSizeInMb > 0 ? resolvedSizeInMb : undefined,
    rating: rating > 0 ? rating : undefined,
    votes: votes > 0 ? votes : undefined,
    developer: clampText(developerRaw ?? "", 80) || undefined,
    ...(features.length ? { features } : {}),
    requirements:
      requirementsEnglish.minimum.length || requirementsEnglish.recommended.length ? requirementsEnglish : undefined,
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
    const mode = payload.englishMode ?? "soft";
    const data = await toScrapeResult(targetUrl, html, mode);

    const debug = payload.debug === true;
    const debugInfo = debug
      ? (() => {
          const title = extractTitle(html);
          const h1 = extractH1(html);
          const rawLines = htmlToTextLines(html);
          const name = clampText(stripBranding(extractMeta(html, { attr: "property", value: "og:title" }) || h1 || title), 120);
          const lines = sliceAfterTitle(rawLines, h1 || title || name);
          const productInfo = extractProductInfoMap(lines);
          const downloadsPicked = pickDownloads(lines, productInfo);
          const fileSizeFromProductInfo = productInfo.get("file size") || productInfo.get("filesize") || "";
          const fileSizeFromLabel = pickValueAfterLabel(lines, "File size") || pickValueAfterLabel(lines, "File Size") || "";
          const versionRaw =
            productInfo.get("version") ||
            pickValueAfterLabel(lines, "Version") ||
            productInfo.get("file name") ||
            pickValueAfterLabel(lines, "File name");
          const versionFallback =
            parseVersionFromString(versionRaw ?? "") ||
            parseVersionFromString(name) ||
            parseVersionFromString(title) ||
            parseVersionFromString(h1);

          const extractedHtmlSizeMb = extractSizeInMbFromHtml(html);
          const hasDownloadSizeMarker = /\bdownload-size\b/i.test(html);

          return {
            upstream: {
              url: targetUrl.toString(),
              htmlLength: html.length,
              hasDownloadSizeMarker,
            },
            productInfo: {
              keys: Array.from(productInfo.keys()).slice(0, 30),
              version: productInfo.get("version") ?? "",
              fileName: productInfo.get("file name") ?? "",
              fileSize: fileSizeFromProductInfo,
              totalDownloads: productInfo.get("total downloads") ?? "",
            },
            version: {
              versionRaw: versionRaw ?? "",
              versionFallback,
              returned: data.version ?? "",
            },
            downloads: {
              picked: downloadsPicked,
              returned: data.downloads ?? 0,
            },
            size: {
              extractedHtmlSizeMb,
              productInfoRaw: fileSizeFromProductInfo,
              labelRaw: fileSizeFromLabel,
              returned: data.sizeInMb ?? 0,
            },
            rating: {
              returned: data.rating ?? 0,
              votes: data.votes ?? 0,
            },
          };
        })()
      : null;

    const shouldSearchByName = payload.searchByName !== false;
    const isWeakDescription = !data.description || data.description.length < 280;
    const isMissingFeatures = !data.features?.length;

    if (shouldSearchByName && (isWeakDescription || isMissingFeatures) && data.name) {
      const query = `${data.name} features overview`;
      const urls = await fetchSearchResultsByName(query);

      const supplementalOverviews: string[] = [];
      const supplementalFeatures: string[] = [];

      for (const raw of urls.slice(0, 3)) {
        try {
          const allowed = assertUrlAllowed(raw);
          const pageHtml = await fetchHtmlLight(allowed);
          if (!pageHtml) continue;

          const { overview, features } = extractSupplementalTextFromHtml(pageHtml);
          if (overview && overview.length >= 80) supplementalOverviews.push(overview);
          if (features.length) supplementalFeatures.push(...features);
        } catch {
          // ignore
        }
      }

      const bestOverview = supplementalOverviews.sort((a, b) => b.length - a.length)[0] ?? "";
      const mergedFeatures = uniqueUrls(supplementalFeatures)
        .map((line) => applyEnglishModeToText(line, mode) || line)
        .filter(Boolean)
        .slice(0, 30);

      if (isWeakDescription && bestOverview) {
        data.description = clampText(stripBranding(bestOverview), 1200);
      }

      if (isMissingFeatures && mergedFeatures.length) {
        data.features = mergedFeatures;
      }
    }

    return NextResponse.json(debugInfo ? { ...data, debug: debugInfo } : data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation failed", errors: error.flatten() }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Failed to scrape";
    const status =
      error && typeof error === "object" && "status" in error && typeof (error as { status?: unknown }).status === "number"
        ? Number((error as { status?: unknown }).status)
        : 500;

    const hint = (() => {
      if (status === 504) return "The target site took too long to respond. Try again or use a different source URL.";
      if (status === 415) return "The target URL did not return HTML. Use a page URL (not a direct file/CDN link).";
      if (status >= 500 && status < 600) return "The upstream site may be blocking requests or temporarily down.";
      if (status === 401 || status === 403) return "The target site blocked access. Try a different source URL.";
      return undefined;
    })();

    return NextResponse.json(
      {
        message,
        hint,
        debug: {
          status,
        },
      },
      { status: status >= 400 && status <= 599 ? status : 500 },
    );
  }
};





