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
};

type AutoFillOptions = {
  version?: string;
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

const tryExtractSizeAndVersionFromText = (text: string) => {
  const normalized = String(text ?? "").replace(/\u00a0/g, " ");
  const version = parseVersionFromString(normalized);

  const sizeCandidates: number[] = [];
  const rx = /\b(\d+(?:\.\d+)?)\s*(kb|mb|gb|tb)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(normalized))) {
    const mb = parseSizeToMb(`${m[1]} ${m[2]}`);
    if (Number.isFinite(mb) && mb > 0) sizeCandidates.push(mb);
    if (sizeCandidates.length >= 40) break;
  }

  // Prefer larger plausible installer sizes.
  const sizeInMb = sizeCandidates
    .filter((v) => v >= 20 && v <= 250_000)
    .sort((a, b) => b - a)[0] ?? 0;

  return {
    version,
    sizeInMb,
  };
};

const fetchSizeAndVersionViaSearch = async (params: { name: string; hintVersion?: string }) => {
  const baseQuery = params.hintVersion && /\d/.test(params.hintVersion)
    ? `${params.name} ${params.hintVersion} file size`
    : `${params.name} file size`;

  const urls = await fetchSearchResultsByName(baseQuery);
  for (const url of urls.slice(0, 4)) {
    const html = await fetchHtmlLight(url);
    if (!html) continue;
    const text = stripHtml(html);
    const extracted = tryExtractSizeAndVersionFromText(text);
    if (extracted.sizeInMb > 0 || extracted.version) {
      return extracted;
    }
  }
  return { version: "", sizeInMb: 0 };
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
    images: {
      heroImage: ogImageUrl && isValidUrl(ogImageUrl) ? ogImageUrl : "",
      logoUrl: ownerAvatarUrl && isValidUrl(ownerAvatarUrl) ? ownerAvatarUrl : "",
    },
  };
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
  wiki: WikiResult;
  github: GitHubResult;
  images: UnsplashResult;
}): AutoFillData => {
  const { name, wiki, github, images } = params;

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
    images.logoUrl,
    wiki?.thumbnailUrl ?? "",
    github?.images.logoUrl ?? "",
    clearbitLogo,
    faviconLogo,
  ]);

  const heroCandidates = uniqueUrls([
    images.heroImage,
    github?.images.heroImage ?? "",
    wiki?.thumbnailUrl ?? "",
  ]);

  const screenshots = uniqueUrls([
    ...images.screenshots,
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
  };
};

export const autoFillSoftwareData = async (softwareName: string, options: AutoFillOptions = {}): Promise<AutoFillResult> => {
  try {
    const name = softwareName.trim();
    if (!name) {
      return { success: false, error: "Software name is required" };
    }

    const [wiki, github, images] = await Promise.all([
      fetchFromWikipedia(name),
      fetchFromGitHub(name),
      fetchImagesFromUnsplash(name),
    ]);

    const merged = mergeData({ name, wiki, github, images });

    const needsVersion = !(merged.version ?? "").trim();
    const needsSize = !(merged.sizeInMb ?? "").trim();
    const fallback = (needsVersion || needsSize)
      ? await fetchSizeAndVersionViaSearch({ name, hintVersion: options.version || merged.version })
      : { version: "", sizeInMb: 0 };

    const data: AutoFillData = {
      ...merged,
      version: merged.version || fallback.version || "",
      sizeInMb: merged.sizeInMb || (fallback.sizeInMb > 0 ? fallback.sizeInMb.toFixed(1) : ""),
    };

    return {
      success: true,
      data: {
        ...data,
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
