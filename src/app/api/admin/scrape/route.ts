import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isAdminRequestAuthorized, getAdminSecretOrThrow } from "@/lib/auth/admin-session";
import net from "node:net";

const payloadSchema = z.object({
  url: z.string().url(),
  englishMode: z.enum(["soft", "strict"]).optional(),
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
  features?: string[];
  logoUrl: string;
  heroImage: string;
  screenshots: string[];
};

const MAX_HTML_BYTES = 1_500_000;
const FETCH_TIMEOUT_MS = 10_000;

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

const applyEnglishModeToText = (value: string, mode: "soft" | "strict") => {
  const cleaned = stripNonEnglishChars(value);
  if (!cleaned) return "";
  if (mode === "strict") {
    return isMostlyEnglish(cleaned) ? cleaned : "";
  }
  return cleaned;
};

const applyEnglishModeToLines = (lines: string[], mode: "soft" | "strict") => {
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
  const match = text.match(/\b(?:file\s*size|size)\b\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(kb|mb|gb|tb)\b/i);
  if (!match) return 0;
  return parseSizeToMb(`${match[1]} ${match[2]}`);
};

const pickDownloadsFallback = (lines: string[]) => {
  const text = lines.join("\n");
  const rx = /\b(total\s+downloads?|downloads?)\b\s*[:\-]?\s*([0-9][0-9,\s]*)/i;
  const match = text.match(rx);
  if (!match) return 0;
  const parsed = parseHumanNumber(match[2]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const parseHumanNumber = (raw: string) => {
  const normalized = String(raw).trim();
  if (!normalized) return 0;

  // Prefer the first number token in the string to avoid concatenating unrelated numbers.
  // Supports: 1,234 | 1234 | 1.2M | 500k
  const tokenMatch = normalized.match(/\b(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*([kmb])?\b/i);
  if (!tokenMatch) return 0;

  const num = Number(String(tokenMatch[1]).replace(/,/g, ""));
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
  return match ? match[1] : trimmed;
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

const extractSizeCandidatesFromText = (text: string) => {
  const candidates: number[] = [];
  const normalized = String(text || "");
  if (!normalized) return candidates;

  const labelRx = /\b(?:file\s*size|filesize|download\s*size|size)\b[^\n\r]{0,80}?(\d+(?:\.\d+)?)\s*(kb|mb|gb|tb)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = labelRx.exec(normalized))) {
    const mb = parseSizeToMb(`${m[1]} ${m[2]}`);
    if (isReasonableSizeInMb(mb)) candidates.push(mb);
  }

  const looseRx = /(\d+(?:\.\d+)?)\s*(kb|mb|gb|tb)\b/gi;
  while ((m = looseRx.exec(normalized))) {
    const start = Math.max(0, m.index - 40);
    const ctx = normalized.slice(start, m.index + m[0].length + 40);
    if (!/\b(?:file\s*size|filesize|download\s*size|size)\b/i.test(ctx)) continue;
    const mb = parseSizeToMb(`${m[1]} ${m[2]}`);
    if (isReasonableSizeInMb(mb)) candidates.push(mb);
  }

  // Bytes patterns: "fileSize": 585157376 | size: 585157376 bytes
  const bytesLabelRx = /\b(?:file\s*size|filesize|download\s*size|size)\b[^\n\r]{0,80}?(\d{6,})(?:\s*bytes\b)?/gi;
  while ((m = bytesLabelRx.exec(normalized))) {
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

  return candidates;
};

const pickBestSizeCandidate = (candidates: number[]) => {
  if (!candidates.length) return 0;
  const sorted = [...candidates].sort((a, b) => a - b);
  // Prefer typical installer sizes over tiny artifacts; pick the median-ish.
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

const extractSizeInMbFromHtml = (html: string) => {
  const text = stripTags(html);
  const fromText = extractSizeCandidatesFromText(text);

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
  const best = pickBestSizeCandidate([...fromText, ...fromScripts]);
  return isReasonableSizeInMb(best) ? best : 0;
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
    ],
    [
      (line) => /\bsystem requirements\b/i.test(line),
      (line) => /\btechnical details\b/i.test(line),
      (line) => /\bproduct information\b/i.test(line),
      (line) => /\bdownload\b/i.test(line),
    ],
    80,
  );

  const features = block
    .map((line) => line.replace(/^[-•\u2022\s]+/, "").trim())
    .filter((line) => line.length >= 3)
    .filter((line) => !/^(features|feature)\b/i.test(line))
    .filter((line) => !/^adobe\b/i.test(line))
    .slice(0, 30);

  return uniqueUrls(features);
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
      (line) => /\bdownload\b/i.test(line),
      (line) => /\bscreenshots?\b/i.test(line),
      (line) => /\brelated\b/i.test(line),
    ],
    40,
  );

  const map = new Map<string, string>();
  for (let i = 0; i < block.length; i += 1) {
    const current = block[i].trim();
    const next = (block[i + 1] ?? "").trim();
    if (!current) continue;

    const m = current.match(/^([^:]{2,40})\s*:\s*(.+)$/);
    if (m) {
      map.set(m[1].toLowerCase(), m[2].trim());
      continue;
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

const toScrapeResult = (baseUrl: URL, html: string, englishMode: "soft" | "strict"): ScrapeResult => {
  const rawLines = htmlToTextLines(html);

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

  const name = clampText(stripBranding(ogTitle || twTitle || jsonLdData.name || h1 || title), 120);

  const lines = sliceAfterTitle(rawLines, h1 || title || name);

  const paragraph = extractFirstParagraph(html);
  const resolvedDescription = ogDesc || twDesc || jsonLdData.description || metaDesc || paragraph;

  const overviewText = extractOverviewText(lines);
  const descriptionText = overviewText || resolvedDescription;
  const descriptionEnglish = applyEnglishModeToText(descriptionText, englishMode) || descriptionText;
  const summaryEnglish = applyEnglishModeToText(descriptionText || resolvedDescription, englishMode) || (descriptionText || resolvedDescription);
  const description = clampText(stripBranding(descriptionEnglish), 1200);
  const summary = clampText(stripBranding(summaryEnglish), 220);

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

  const sizeInMb = (() => {
    const fromProductInfo = productInfo.get("file size") || productInfo.get("filesize") || "";
    const parsed = fromProductInfo ? parseSizeToMb(fromProductInfo) : 0;
    if (parsed > 0) return parsed;
    const picked = pickSizeInMb(lines);
    if (picked > 0) return picked;
    const fromLines = parseSizeFromText(lines.join("\n"));
    if (fromLines > 0) return fromLines;
    return extractSizeInMbFromHtml(html);
  })();

  const requirements = extractRequirementsBlock(lines);
  const requirementsEnglish = {
    minimum: applyEnglishModeToLines(requirements.minimum, englishMode),
    recommended: applyEnglishModeToLines(requirements.recommended, englishMode),
  };

  const features = applyEnglishModeToLines(extractFeaturesList(lines), englishMode);

  return {
    name,
    summary,
    description,
    websiteUrl: baseUrl.toString(),
    version: clampText(versionFallback, 60) || undefined,
    releaseDate: normalizeReleaseDateToIso(clampText(releaseDateRaw ?? "", 80)) || undefined,
    downloads: downloads > 0 ? downloads : undefined,
    sizeInMb: sizeInMb > 0 ? sizeInMb : undefined,
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
    const data = toScrapeResult(targetUrl, html, mode);

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation failed", errors: error.flatten() }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Failed to scrape";
    return NextResponse.json({ message }, { status: 500 });
  }
};
