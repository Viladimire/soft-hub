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
    "واجهة سهلة الاستخدام",
    "تحديثات وتحسينات مستمرة",
    "أداء سريع وخفيف",
    "توافق واسع مع أنظمة التشغيل",
  ];
};

const generateGenericRequirements = () => ({
  minimum: [
    "OS: Windows 10 أو أحدث / macOS 10.14 أو أحدث",
    "Processor: 1 GHz أو أسرع",
    "RAM: 2 GB",
    "Storage: 500 MB مساحة متاحة",
  ],
  recommended: [
    "OS: Windows 11 / macOS 12 أو أحدث",
    "Processor: Multi-core 2 GHz أو أسرع",
    "RAM: 4 GB أو أكثر",
    "Storage: 1 GB مساحة متاحة",
  ],
});

export const autoDetectCategory = (name: string) => {
  const lower = name.toLowerCase();

  if (/(game|fortnite|minecraft|valorant|league|apex)/i.test(lower)) {
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
  const searchUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(
    name,
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

  let version = "Latest";
  let sizeInMb = "250";

  if (apiUrl) {
    try {
      const releaseRes = await fetch(`${apiUrl}/releases/latest`, { headers: { Accept: "application/vnd.github+json" } });
      if (releaseRes.ok) {
        const releaseJson: unknown = await releaseRes.json();
        if (isPlainRecord(releaseJson)) {
          const tag = toText(releaseJson.tag_name);
          if (tag) version = tag;

          const assets = Array.isArray(releaseJson.assets) ? releaseJson.assets : [];
          const totalBytes = assets
            .filter(isPlainRecord)
            .map((asset) => asset.size)
            .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
            .reduce((sum, v) => sum + v, 0);

          if (totalBytes > 0) {
            sizeInMb = (totalBytes / (1024 * 1024)).toFixed(1);
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

  const version = clampText(github?.version || "1.0.0", 40);
  const sizeInMb = clampText(github?.sizeInMb || "250", 12);

  const requirements = generateGenericRequirements();

  const features = generateFeaturesFromDescription(description);

  const developer: Record<string, unknown> = {
    name: name,
    ...(github?.developer ?? {}),
    ...(wiki ? { source: "wikipedia", wikiTitle: wiki.title, wikiUrl: wiki.pageUrl } : {}),
  };

  const categories = [autoDetectCategory(name)];

  return {
    summary,
    description,
    version,
    sizeInMb,
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

export const autoFillSoftwareData = async (softwareName: string): Promise<AutoFillResult> => {
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

    const data = mergeData({ name, wiki, github, images });

    return {
      success: true,
      data: {
        ...data,
        summary: clampText(data.summary, 220),
        description: clampText(data.description, 1200),
        version: clampText(data.version || "1.0.0", 40),
        sizeInMb: clampText(data.sizeInMb || "250", 12),
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
