export type AutoFillResult = {
  success: true;
  data: AutoFillData;
} | {
  success: false;
  error: string;
};

export type AutoFillData = {
  summary: string;
  description: string;
  version: string;
  sizeInMb: string;
  downloads: number;
  websiteUrl: string;
  logoUrl: string;
  heroImage: string;
  screenshots: string[];
  features: string[];
  requirements: {
    minimum: string[];
    recommended: string[];
  };
  developer: Record<string, unknown>;
  categories: string[];
  platforms: Array<"windows" | "mac" | "linux" | "android" | "ios" | "web">;
  changelog?: Array<{
    version: string;
    date: string;
    highlights: string[];
  }>;
  debugSearch?: {
    queries: string[];
    rankedUrls: string[];
    attemptedUrls: string[];
    extracted: {
      version: string;
      sizeInMb: number;
      downloads: number;
    };
  };
};

type AutoFillOptions = {
  version?: string;
  debug?: boolean;
};

type WikiResult = {
  description: string;
  summary: string;
  websiteUrl: string;
  pageUrl: string;
  title: string;
  thumbnailUrl: string;
} | null;

type GitHubResult = {
  description: string;
  version: string;
  sizeInMb: string;
  downloads: number;
  websiteUrl: string;
  developer: Record<string, unknown>;
  repoFullName?: string;
  images: {
    heroImage: string;
    logoUrl: string;
  };
} | null;

type UnsplashResult = {
  logoUrl: string;
  heroImage: string;
  screenshots: string[];
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const toText = (value: unknown) => (typeof value === "string" ? value : "");

const clampText = (value: string, max: number) => value.trim().slice(0, max);

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

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
    if (urls.length >= 20) break;
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
        "user-agent": "soft-hub-auto-fill/1.0",
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

const fetchHtmlLight = async (url: string) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7_000);
  try {
    const res = await fetch(url, {
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
    return text.length > 450_000 ? text.slice(0, 450_000) : text;
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
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

const parseVersionFromString = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/\b(?:v)?(\d+\.\d+(?:\.\d+){0,3})\b/i);
  return match ? match[1] : "";
};

const parseHumanNumber = (raw: string) => {
  const normalized = String(raw ?? "").trim();
  if (!normalized) return 0;

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

const isRequirementsContext = (ctx: string) =>
  /\b(?:system\s+requirements?|requirements?|minimum|recommended|ram|memory|vram|gpu|cpu|processor|disk|storage|space|hdd|ssd|directx|opengl|vulkan)\b/i.test(
    ctx,
  );

const isDownloadContext = (ctx: string) =>
  /\b(?:download|installer|installation|setup|file\s*size|filesize|download\s*size|offline\s*installer|direct\s*download|portable|mirror|exe|msi|dmg|pkg|zip|rar|7z|apk|appimage)\b/i.test(
    ctx,
  );

const tryExtractDownloadsFromText = (text: string) => {
  const normalized = String(text ?? "").replace(/\u00a0/g, " ");
  const rx = /\b(?:total\s+downloads?|downloads?)\b\s*[:\-]?\s*([0-9][0-9,\s.]*\s*[kmb]?)/i;
  const m = normalized.match(rx);
  if (!m) return 0;
  return parseHumanNumber(m[1] ?? "");
};

const tryExtractSizeAndVersionFromText = (text: string) => {
  const normalized = String(text ?? "").replace(/\u00a0/g, " ");
  const version = parseVersionFromString(normalized);

  const sizeCandidates: number[] = [];
  const rx = /\b(\d+(?:\.\d+)?)\s*(kb|mb|gb|tb)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(normalized))) {
    const start = Math.max(0, m.index - 50);
    const ctx = normalized.slice(start, m.index + m[0].length + 50);
    if (isRequirementsContext(ctx)) continue;
    if (!isDownloadContext(ctx)) continue;
    const mb = parseSizeToMb(`${m[1]} ${m[2]}`);
    if (Number.isFinite(mb) && mb > 0) sizeCandidates.push(mb);
    if (sizeCandidates.length >= 40) break;
  }

  // Prefer plausible installer sizes.
  const sizeInMb = sizeCandidates.filter((v) => v >= 5 && v <= 250_000).sort((a, b) => b - a)[0] ?? 0;

  return {
    version,
    sizeInMb,
  };
};

const scoreResultUrl = (url: string, officialDomain?: string) => {
  const host = tryGetDomain(url).toLowerCase();
  if (!host) return 0;
  const official = (officialDomain ?? "").toLowerCase();
  if (official && (host === official || host.endsWith(`.${official}`))) return 100;
  if (host === "github.com" || host.endsWith(".github.com")) return 90;
  if (host.endsWith(".microsoft.com") || host === "microsoft.com") return 85;
  if (host.endsWith(".adobe.com") || host === "adobe.com") return 85;
  if (/(sourceforge\.net|fosshub\.com|ninite\.com|snapcraft\.io|flathub\.org)/i.test(host)) return 70;
  if (/(softonic|filehippo|uptodown|filecr|getintopc|crack|torrent)/i.test(host)) return 10;
  return 40;
};

const buildSearchQueries = (params: { name: string; hintVersion?: string }) => {
  const name = params.name.trim();
  const v = (params.hintVersion ?? "").trim();
  const hasV = v && /\d/.test(v);
  const base = hasV ? `${name} ${v}` : name;
  return Array.from(
    new Set([
      `${base} file size`,
      `${base} download size`,
      `${base} offline installer size`,
      `${base} installer size`,
      `${base} total downloads`,
    ]),
  );
};

const fetchSizeVersionAndDownloadsViaSearch = async (params: {
  name: string;
  hintVersion?: string;
  officialDomain?: string;
  debug?: boolean;
}) => {
  const queries = buildSearchQueries({ name: params.name, hintVersion: params.hintVersion });

  const seen = new Set<string>();
  const ranked: Array<{ url: string; score: number }> = [];
  for (const q of queries) {
    const urls = await fetchSearchResultsByName(q);
    for (const url of urls) {
      if (seen.has(url)) continue;
      seen.add(url);
      ranked.push({ url, score: scoreResultUrl(url, params.officialDomain) });
    }
  }

  ranked.sort((a, b) => b.score - a.score);

  const attemptedUrls: string[] = [];

  let bestSize = 0;
  let bestVersion = "";
  let bestDownloads = 0;

  for (const item of ranked.slice(0, 10)) {
    attemptedUrls.push(item.url);
    const html = await fetchHtmlLight(item.url);
    if (!html) continue;
    const text = stripHtml(html);
    const extracted = tryExtractSizeAndVersionFromText(text);
    const downloads = tryExtractDownloadsFromText(text);

    if (!bestVersion && extracted.version) bestVersion = extracted.version;
    if (downloads > bestDownloads) bestDownloads = downloads;
    if (extracted.sizeInMb > bestSize) bestSize = extracted.sizeInMb;

    if (bestSize > 0 && bestDownloads > 0 && bestVersion) break;
  }

  return {
    version: bestVersion,
    sizeInMb: bestSize,
    downloads: bestDownloads,
    ...(params.debug
      ? {
          debugSearch: {
            queries,
            rankedUrls: ranked.slice(0, 30).map((r) => r.url),
            attemptedUrls,
            extracted: { version: bestVersion, sizeInMb: bestSize, downloads: bestDownloads },
          },
        }
      : null),
  };
};

const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const pickFirstValidUrl = (candidates: string[]) => {
  for (const candidate of candidates) {
    if (candidate && isValidUrl(candidate)) {
      return candidate;
    }
  }
  return "";
};

const uniqueUrls = (items: string[]) => Array.from(new Set(items.filter(Boolean)));

const tryGetDomain = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
};

const buildClearbitLogoUrl = (websiteUrl: string) => {
  const domain = tryGetDomain(websiteUrl);
  if (!domain) return "";
  return `https://logo.clearbit.com/${domain}`;
};

const buildFaviconUrl = (websiteUrl: string) => {
  const domain = tryGetDomain(websiteUrl);
  if (!domain) return "";
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=256`;
};

const extractFirstWebsiteUrlFromText = (text: string) => {
  const matches = text.match(/https?:\/\/[^\s<>"']+/g);
  if (!matches) return "";

  const filtered = matches
    .map((url) => url.replace(/[),.]+$/g, ""))
    .filter((url) => isValidUrl(url))
    .filter((url) => !url.includes("wikipedia.org"));

  return filtered[0] ?? "";
};

const generateFeaturesFromDescription = (description: string): string[] => {
  const sentences = description.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const keywords = ["support", "include", "feature", "allow", "enable", "provide", "offers", "lets"];

  const features = sentences
    .filter((sentence) => {
      const lower = sentence.toLowerCase();
      return keywords.some((keyword) => lower.includes(keyword));
    })
    .map((sentence) => clampText(sentence, 110))
    .filter((sentence) => sentence.length >= 10);

  if (features.length > 0) {
    return Array.from(new Set(features)).slice(0, 6);
  }

  return [
    "Easy to use interface",
    "Regular updates and improvements",
    "Fast and lightweight performance",
    "Wide compatibility across platforms",
  ];
};

const generateGenericRequirements = () => ({
  minimum: [
    "OS: Windows 10 or later / macOS 10.14 or later",
    "Processor: 1 GHz or faster",
    "RAM: 2 GB",
    "Storage: 500 MB available space",
  ],
  recommended: [
    "OS: Windows 11 / macOS 12 or later",
    "Processor: Multi-core 2 GHz or faster",
    "RAM: 4 GB or more",
    "Storage: 1 GB available space",
  ],
});

export const autoDetectCategory = (name: string) => {
  const lower = name.toLowerCase();

  if (/(game|gamer|gaming|steam|epic\s*games|playstation|xbox|nintendo|fps|rpg|moba|battle\s*royale|multiplayer|single\s*player|fortnite|minecraft|valorant|league|apex)/i.test(lower)) {
    return "games";
  }

  if (/(windows|linux|ubuntu|macos|operating system|os)/i.test(lower)) {
    return "operating-systems";
  }

  if (/(player|video|audio|vlc|media|spotify)/i.test(lower)) {
    return "multimedia";
  }

  if (/(antivirus|security|firewall|vpn)/i.test(lower)) {
    return "security";
  }

  if (/(code|ide|compiler|github|visual studio|vscode)/i.test(lower)) {
    return "development";
  }

  if (/(utility|tool|cleaner|optimizer|winrar|7zip|zip)/i.test(lower)) {
    return "utilities";
  }

  if (/(todo|notes|notion|calendar|task|pomodoro)/i.test(lower)) {
    return "productivity";
  }

  if (/(learn|education|course|flashcard|quiz)/i.test(lower)) {
    return "education";
  }

  return "software";
};

type DetectedPlatform = "windows" | "mac" | "linux" | "android" | "ios" | "web";

const uniquePlatforms = (items: DetectedPlatform[]) => {
  const out: DetectedPlatform[] = [];
  for (const item of items) {
    if (!out.includes(item)) out.push(item);
  }
  return out;
};

const autoDetectPlatforms = (seed: string): DetectedPlatform[] => {
  const lower = seed.toLowerCase();
  const platforms: DetectedPlatform[] = [];

  if (/(windows|win\s*10|win\s*11|\.exe\b|msi\b|directx)/i.test(lower)) platforms.push("windows");
  if (/(mac\s*os|macos|os\s*x|apple\s*silicon|\.dmg\b|\.pkg\b)/i.test(lower)) platforms.push("mac");
  if (/(linux|ubuntu|debian|fedora|arch\b|appimage\b|\.appimage\b|snap\b|flatpak\b)/i.test(lower)) platforms.push("linux");
  if (/(android|apk\b|google\s*play)/i.test(lower)) platforms.push("android");
  if (/(ios|iphone|ipad|app\s*store)/i.test(lower)) platforms.push("ios");
  if (/(web\b|browser\b|chrome\s*extension|firefox\s*addon|safari\s*extension|saas)/i.test(lower)) platforms.push("web");

  return platforms.length ? uniquePlatforms(platforms) : ["windows"];
};

const fetchFromWikipedia = async (name: string): Promise<WikiResult> => {
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    `${name} software`,
  )}&format=json&origin=*`;

  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) {
    return null;
  }

  const searchJson: unknown = await searchRes.json();
  if (!isPlainRecord(searchJson)) return null;
  const query = isPlainRecord(searchJson.query) ? searchJson.query : null;
  const search = query && Array.isArray(query.search) ? query.search : [];

  const first = search[0];
  if (!isPlainRecord(first) || typeof first.title !== "string") {
    return null;
  }

  const pageTitle = first.title;
  const pageUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
    pageTitle,
  )}&prop=extracts|pageimages|info&exintro=1&explaintext=1&pithumbsize=1200&inprop=url&format=json&origin=*`;

  const pageRes = await fetch(pageUrl);
  if (!pageRes.ok) {
    return null;
  }

  const pageJson: unknown = await pageRes.json();
  if (!isPlainRecord(pageJson)) return null;
  const pageQuery = isPlainRecord(pageJson.query) ? pageJson.query : null;
  const pages = pageQuery && isPlainRecord(pageQuery.pages) ? pageQuery.pages : null;
  if (!pages) return null;

  const page = Object.values(pages)[0];
  if (!isPlainRecord(page)) return null;

  const extract = toText(page.extract);
  const description = clampText(stripHtml(extract), 1200);

  const resolvedPageUrl = toText(page.fullurl);
  const websiteUrl = extractFirstWebsiteUrlFromText(extract);
  const thumbnailUrl =
    isPlainRecord(page.thumbnail) && typeof page.thumbnail.source === "string" ? page.thumbnail.source : "";

  const summary = clampText(description, 220);

  return {
    description,
    summary,
    websiteUrl,
    pageUrl: resolvedPageUrl,
    title: pageTitle,
    thumbnailUrl: thumbnailUrl && isValidUrl(thumbnailUrl) ? thumbnailUrl : "",
  };
};

const fetchFromGitHub = async (name: string): Promise<GitHubResult> => {
  const searchQuery = `${name} in:name,description`;
  const searchUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(
    searchQuery,
  )}&sort=stars&order=desc&per_page=1`;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };

  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `token ${token}`;
  }

  const res = await fetch(searchUrl, { headers });
  if (!res.ok) {
    return null;
  }

  const json: unknown = await res.json();
  if (!isPlainRecord(json) || !Array.isArray(json.items) || !isPlainRecord(json.items[0])) {
    return null;
  }

  const repo = json.items[0];
  const description = toText(repo.description);
  const homepage = toText(repo.homepage);
  const htmlUrl = toText(repo.html_url);
  const apiUrl = toText(repo.url);
  const fullName = toText(repo.full_name);
  const ogImageUrl = toText(repo.open_graph_image_url);
  const ownerAvatarUrl =
    isPlainRecord(repo.owner) && typeof repo.owner.avatar_url === "string" ? repo.owner.avatar_url : "";

  let version = "";
  let sizeInMb = "";
  let downloads = 0;

  const scoreAssetName = (assetName: string) => {
    const lower = assetName.toLowerCase();
    let score = 0;
    if (/(setup|installer)/i.test(lower)) score += 3;
    if (/\.(exe|msi)$/i.test(lower)) score += 6;
    if (/\.(dmg|pkg)$/i.test(lower)) score += 5;
    if (/\.(appimage|deb|rpm)$/i.test(lower)) score += 4;
    if (/\.(zip|7z|rar|tar\.gz)$/i.test(lower)) score += 2;
    if (/(arm|aarch64)/i.test(lower)) score -= 1;
    if (/(src|source)/i.test(lower)) score -= 6;
    if (/(symbols|debug)/i.test(lower)) score -= 6;
    return score;
  };

  if (apiUrl) {
    try {
      const releaseRes = await fetch(`${apiUrl}/releases/latest`, { headers: { Accept: "application/vnd.github+json" } });
      if (releaseRes.ok) {
        const releaseJson: unknown = await releaseRes.json();
        if (isPlainRecord(releaseJson)) {
          const tag = toText(releaseJson.tag_name);
          const releaseName = toText(releaseJson.name);
          if (tag) {
            version = tag;
          } else if (releaseName) {
            const parsedFromName = clampText(releaseName, 40);
            version = parsedFromName;
          }

          const assets = Array.isArray(releaseJson.assets) ? releaseJson.assets : [];
          const downloadCount = assets
            .filter(isPlainRecord)
            .map((asset) => asset.download_count)
            .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
            .reduce((sum, v) => sum + v, 0);

          if (downloadCount > 0) {
            downloads = downloadCount;
          }

          const bestAsset = assets
            .filter(isPlainRecord)
            .map((asset) => {
              const name = toText(asset.name);
              const size = asset.size;
              return {
                name,
                size: typeof size === "number" && Number.isFinite(size) ? size : 0,
                score: name ? scoreAssetName(name) : -999,
              };
            })
            .filter((asset) => asset.size > 0)
            .sort((a, b) => (b.score - a.score) || (b.size - a.size))[0];

          if (bestAsset?.size) {
            sizeInMb = (bestAsset.size / (1024 * 1024)).toFixed(1);
          }
        }
      }
    } catch {
      // ignore
    }
  }

  const websiteUrl = pickFirstValidUrl([homepage, htmlUrl]);

  const developer: Record<string, unknown> = {
    source: "github",
    repo: fullName || undefined,
    stars: typeof repo.stargazers_count === "number" ? repo.stargazers_count : undefined,
  };

  return {
    description: clampText(description, 1200),
    version,
    sizeInMb,
    downloads,
    websiteUrl,
    developer,
    repoFullName: fullName || undefined,
    images: {
      heroImage: ogImageUrl && isValidUrl(ogImageUrl) ? ogImageUrl : "",
      logoUrl: ownerAvatarUrl && isValidUrl(ownerAvatarUrl) ? ownerAvatarUrl : "",
    },
  };
};

const normalizeGitHubVersion = (raw: string) => {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";
  return trimmed.replace(/^v/i, "");
};

const toChangelogHighlights = (raw: string) => {
  const text = String(raw ?? "").replace(/\r/g, "\n");
  const lines = text
    .split("\n")
    .map((line) => line.replace(/^[-*\s]+/, "").trim())
    .filter(Boolean);

  if (!lines.length) return [] as string[];

  const nonTrivial = lines.filter((line) => line.length >= 3);
  return (nonTrivial.length ? nonTrivial : lines).slice(0, 8);
};

const fetchGitHubChangelog = async (repoFullName: string) => {
  const match = repoFullName.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (!match) return [] as AutoFillData["changelog"];

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };

  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `token ${token}`;
  }

  try {
    const url = `https://api.github.com/repos/${match[1]}/${match[2]}/releases?per_page=6`;
    const res = await fetch(url, { headers });
    if (!res.ok) return [] as AutoFillData["changelog"];

    const json: unknown = await res.json();
    if (!Array.isArray(json)) return [] as AutoFillData["changelog"];

    const entries = json
      .filter(isPlainRecord)
      .map((release) => {
        const tag = normalizeGitHubVersion(toText(release.tag_name));
        const name = normalizeGitHubVersion(toText(release.name));
        const version = tag || name;
        if (!version) return null;

        const publishedAtRaw = toText(release.published_at) || toText(release.created_at);
        const parsed = Date.parse(publishedAtRaw);
        const date = Number.isNaN(parsed) ? "" : new Date(parsed).toISOString();
        if (!date) return null;

        const body = toText(release.body);
        const highlights = toChangelogHighlights(body);
        if (!highlights.length) return null;

        return { version, date, highlights };
      })
      .filter((v): v is NonNullable<typeof v> => Boolean(v));

    return entries.slice(0, 5);
  } catch {
    return [] as AutoFillData["changelog"];
  }
};

const fetchImagesFromUnsplash = async (name: string): Promise<UnsplashResult> => {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) {
    return { logoUrl: "", heroImage: "", screenshots: [] };
  }

  const query = `${name} software`;
  const searchUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
    query,
  )}&per_page=6&client_id=${encodeURIComponent(key)}`;

  const res = await fetch(searchUrl);
  if (!res.ok) {
    return { logoUrl: "", heroImage: "", screenshots: [] };
  }

  const json: unknown = await res.json();
  if (!isPlainRecord(json) || !Array.isArray(json.results)) {
    return { logoUrl: "", heroImage: "", screenshots: [] };
  }

  const urls = json.results
    .filter(isPlainRecord)
    .map((item) => item.urls)
    .filter(isPlainRecord)
    .map((urlsObj) => toText(urlsObj.regular))
    .filter((url) => url && isValidUrl(url));

  const logoUrl = urls[0] ?? "";
  const heroImage = urls[1] ?? "";
  const screenshots = urls.slice(2, 5);

  return { logoUrl, heroImage, screenshots };
};

const mergeData = (params: {
  name: string;
  wiki: WikiResult | null;
  github: GitHubResult | null;
  images: UnsplashResult | null;
}): AutoFillData => {
  const { name, wiki, github, images } = params;

  const safeImages: UnsplashResult = images ?? { logoUrl: "", heroImage: "", screenshots: [] };

  const description = clampText(
    wiki?.description || github?.description || "",
    1200,
  );

  const summary = clampText(
    wiki?.summary || (description ? description : ""),
    220,
  );

  const websiteUrl = pickFirstValidUrl([
    wiki?.websiteUrl ?? "",
    github?.websiteUrl ?? "",
  ]);

  const clearbitLogo = buildClearbitLogoUrl(websiteUrl);
  const faviconLogo = buildFaviconUrl(websiteUrl);

  const logoCandidates = uniqueUrls([
    safeImages.logoUrl,
    wiki?.thumbnailUrl ?? "",
    github?.images.logoUrl ?? "",
    clearbitLogo,
    faviconLogo,
  ]);

  const heroCandidates = uniqueUrls([
    safeImages.heroImage,
    github?.images.heroImage ?? "",
    wiki?.thumbnailUrl ?? "",
  ]);

  const screenshots = uniqueUrls([
    ...safeImages.screenshots,
    github?.images.heroImage ?? "",
    wiki?.thumbnailUrl ?? "",
  ]).filter((url) => isValidUrl(url));

  const version = clampText(github?.version || "", 40);
  const sizeInMb = clampText(github?.sizeInMb || "", 12);
  const downloads = typeof github?.downloads === "number" && Number.isFinite(github.downloads) ? github.downloads : 0;

  const requirements = generateGenericRequirements();

  const features = generateFeaturesFromDescription(description);

  const developer: Record<string, unknown> = {
    name: name,
    ...(github?.developer ?? {}),
    ...(wiki ? { source: "wikipedia", wikiTitle: wiki.title, wikiUrl: wiki.pageUrl } : {}),
  };

  const categorySeed = `${name}\n${wiki?.summary ?? ""}\n${wiki?.description ?? ""}\n${github?.description ?? ""}`.toLowerCase();

  const categories = [autoDetectCategory(categorySeed)];

  const platformSeed = `${name}\n${wiki?.summary ?? ""}\n${wiki?.description ?? ""}\n${github?.description ?? ""}\n${github?.websiteUrl ?? ""}\n${wiki?.websiteUrl ?? ""}`;
  const platforms = autoDetectPlatforms(platformSeed);

  return {
    summary,
    description,
    version,
    sizeInMb,
    downloads,
    websiteUrl,
    logoUrl: pickFirstValidUrl(logoCandidates),
    heroImage: pickFirstValidUrl(heroCandidates),
    screenshots,
    features,
    requirements,
    developer,
    categories,
    platforms,
    changelog: [],
  };
};

export const autoFillSoftwareData = async (softwareName: string, options: AutoFillOptions = {}): Promise<AutoFillResult> => {
  try {
    const name = softwareName.trim();
    if (!name) {
      return { success: false, error: "Software name is required" };
    }

    const [wikiResult, githubResult, imagesResult] = await Promise.allSettled([
      fetchFromWikipedia(name),
      fetchFromGitHub(name),
      fetchImagesFromUnsplash(name),
    ]);

    const wiki = wikiResult.status === "fulfilled" ? wikiResult.value : null;
    const github = githubResult.status === "fulfilled" ? githubResult.value : null;
    const images = imagesResult.status === "fulfilled" ? imagesResult.value : null;

    const merged = mergeData({ name, wiki, github, images });

    const needsVersion = !(merged.version ?? "").trim();
    const needsSize = !(merged.sizeInMb ?? "").trim();
    const officialDomain = (() => {
      const url = (merged.websiteUrl ?? "").trim();
      if (!url) return "";
      return tryGetDomain(url);
    })();

    const fallback = (needsVersion || needsSize)
      ? await fetchSizeVersionAndDownloadsViaSearch({
          name,
          hintVersion: options.version || merged.version,
          officialDomain,
          debug: options.debug === true,
        })
      : { version: "", sizeInMb: 0, downloads: 0 };

    const data: AutoFillData = {
      ...merged,
      version: merged.version || fallback.version || "",
      sizeInMb: merged.sizeInMb || (fallback.sizeInMb > 0 ? fallback.sizeInMb.toFixed(1) : ""),
      downloads:
        merged.downloads > 0
          ? merged.downloads
          : typeof fallback.downloads === "number" && Number.isFinite(fallback.downloads) && fallback.downloads > 0
            ? fallback.downloads
            : merged.downloads,
      ...(options.debug === true && (fallback as { debugSearch?: AutoFillData["debugSearch"] }).debugSearch
        ? { debugSearch: (fallback as { debugSearch: AutoFillData["debugSearch"] }).debugSearch }
        : null),
    };

    const repoFullName = (github?.repoFullName ?? "").trim();
    const changelog = repoFullName ? await fetchGitHubChangelog(repoFullName) : [];
    const fallbackVersion = (data.version ?? "").trim() || (options.version ?? "").trim() || "latest";
    const fallbackChangelog = ([
      {
        version: fallbackVersion,
        date: new Date().toISOString(),
        highlights: ["Latest release"],
      },
    ] satisfies NonNullable<AutoFillData["changelog"]>);

    return {
      success: true,
      data: {
        ...data,
        changelog: changelog?.length ? changelog : fallbackChangelog,
        summary: clampText(data.summary, 220),
        description: clampText(data.description, 1200),
        version: clampText(data.version || "", 40),
        sizeInMb: clampText(data.sizeInMb || "", 12),
        websiteUrl: data.websiteUrl && isValidUrl(data.websiteUrl) ? data.websiteUrl : "",
        logoUrl: data.logoUrl && isValidUrl(data.logoUrl) ? data.logoUrl : "",
        heroImage: data.heroImage && isValidUrl(data.heroImage) ? data.heroImage : "",
        screenshots: data.screenshots.filter((url) => isValidUrl(url)),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to auto-fill",
    };
  }
};
