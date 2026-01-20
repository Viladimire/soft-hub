import staticSoftwareDataset from "@/lib/data/static-software-dataset.json";
import type { FilteredSoftwareOptions } from "@/lib/services/softwareService";
import type { Software, SoftwareCategory } from "@/lib/types/software";

const DATA_BASE_ENV = process.env.NEXT_PUBLIC_SOFTWARE_DATA_URL_BASE ?? process.env.NEXT_PUBLIC_DATA_BASE_URL ?? "";
const DATA_FILENAME = "software/index.json";
const DEFAULT_REMOTE_BASE = "https://raw.githubusercontent.com/Viladimire/soft-hub/main/public/data";

let datasetPromise: Promise<Software[]> | null = null;

const sanitizeBaseUrl = (value: string) => value.replace(/\/+$/, "");

const resolveDatasetUrl = () => {
  if (DATA_BASE_ENV) {
    return `${sanitizeBaseUrl(DATA_BASE_ENV)}/${DATA_FILENAME}`;
  }

  if (typeof window !== "undefined") {
    return `/data/${DATA_FILENAME}`;
  }

  return `${DEFAULT_REMOTE_BASE}/${DATA_FILENAME}`;
};

const normalizePlatform = (value: unknown): Software["platforms"][number] | null => {
  const raw = typeof value === "string" ? value.toLowerCase().trim() : "";
  if (raw === "windows" || raw === "win") return "windows";
  if (raw === "mac" || raw === "macos" || raw === "osx") return "mac";
  if (raw === "linux") return "linux";
  if (raw === "android") return "android";
  if (raw === "ios" || raw === "iphone" || raw === "ipad") return "ios";
  return null;
};

const CATEGORY_VALUES: SoftwareCategory[] = [
  "software",
  "games",
  "operating-systems",
  "multimedia",
  "utilities",
  "development",
  "security",
  "productivity",
  "education",
];

const CATEGORY_SET = new Set<SoftwareCategory>(CATEGORY_VALUES);
const DEFAULT_CATEGORY: SoftwareCategory = "software";

const normalizeCategories = (values: unknown): Software["categories"] => {
  const raw = Array.isArray(values)
    ? values
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.toLowerCase().trim())
    : [];

  const normalized = raw.filter((item): item is SoftwareCategory => CATEGORY_SET.has(item as SoftwareCategory));

  if (normalized.length) {
    return normalized;
  }

  return [DEFAULT_CATEGORY];
};

const normalizeStats = (value: unknown): Software["stats"] => {
  const record = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  return {
    downloads: Number(record.downloads ?? 0) || 0,
    views: Number(record.views ?? 0) || 0,
    rating: Number(record.rating ?? 0) || 0,
    votes: Number(record.votes ?? 0) || 0,
  };
};

const FALLBACK_HERO_IMAGE = "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80";

const normalizeMedia = (value: unknown): Software["media"] => {
  const record = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const gallery = Array.isArray(record.gallery)
    ? record.gallery.filter((item): item is string => typeof item === "string")
    : [];

  return {
    logoUrl: typeof record.logoUrl === "string" ? record.logoUrl : "",
    gallery,
    heroImage: typeof record.heroImage === "string" ? record.heroImage : FALLBACK_HERO_IMAGE,
  };
};

const normalizeRequirements = (value: unknown): Software["requirements"] => {
  const record = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const min = Array.isArray(record.minimum)
    ? record.minimum.filter((item): item is string => typeof item === "string")
    : undefined;
  const rec = Array.isArray(record.recommended)
    ? record.recommended.filter((item): item is string => typeof item === "string")
    : undefined;
  return { minimum: min, recommended: rec };
};

const normalizeEntry = (entry: unknown): Software => {
  const record = entry && typeof entry === "object" && !Array.isArray(entry) ? (entry as Record<string, unknown>) : {};

  const slug = typeof record.slug === "string" ? record.slug : "";
  const name = typeof record.name === "string" ? record.name : slug;
  const summary = typeof record.summary === "string" ? record.summary : "";
  const description = typeof record.description === "string" ? record.description : summary;

  const rawPlatforms = Array.isArray(record.platforms) ? record.platforms : [];
  const platforms = rawPlatforms
    .map((value) => normalizePlatform(value))
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  const categories = normalizeCategories(record.categories);

  const version = typeof record.version === "string" ? record.version : "1.0.0";
  const sizeInBytes = Number(record.sizeInBytes ?? 0) || 0;
  const downloadUrl = typeof record.downloadUrl === "string" ? record.downloadUrl : "";

  const now = new Date().toISOString();
  const releaseDate = typeof record.releaseDate === "string" ? record.releaseDate : now;
  const updatedAt = typeof record.updatedAt === "string" ? record.updatedAt : releaseDate;
  const createdAt = typeof record.createdAt === "string" ? record.createdAt : releaseDate;

  return {
    id: typeof record.id === "string" ? record.id : slug,
    slug,
    name,
    summary,
    description,
    version,
    sizeInBytes,
    platforms: platforms.length ? platforms : ["windows"],
    categories,
    type: "free",
    websiteUrl: typeof record.websiteUrl === "string" ? record.websiteUrl : null,
    downloadUrl,
    isFeatured: Boolean(record.isFeatured),
    releaseDate,
    updatedAt,
    createdAt,
    stats: normalizeStats(record.stats),
    media: normalizeMedia(record.media),
    requirements: normalizeRequirements(record.requirements),
    changelog: Array.isArray(record.changelog)
      ? (record.changelog as unknown as Software["changelog"])
      : undefined,
  } satisfies Software;
};

const parseSoftwareArray = (payload: unknown): Software[] => {
  if (!Array.isArray(payload)) {
    throw new Error("Software dataset payload is not an array");
  }

  return payload.map((entry) => normalizeEntry(entry));
};

let localDatasetCache: Software[] | null = null;

const loadLocalDataset = () => {
  if (!localDatasetCache) {
    localDatasetCache = parseSoftwareArray(staticSoftwareDataset as unknown);
  }

  return localDatasetCache;
};

const loadDataset = async () => {
  if (!DATA_BASE_ENV) {
    return loadLocalDataset();
  }

  const url = resolveDatasetUrl();
  try {
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Failed to fetch software dataset from ${url} (status ${response.status})`);
    }

    const raw = await response.json();
    return parseSoftwareArray(raw);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Falling back to bundled static dataset after remote fetch failure", error);
    }
    return loadLocalDataset();
  }
};

export const fetchStaticSoftwareDataset = async (): Promise<Software[]> => {
  if (!datasetPromise) {
    datasetPromise = loadDataset().catch((error) => {
      datasetPromise = null;
      throw error;
    });
  }

  return datasetPromise;
};

const normalize = (value: string) => value.toLowerCase();

const matchesQuery = (candidate: Software, query: string) => {
  const term = normalize(query);
  return [candidate.name, candidate.summary, candidate.description]
    .filter(Boolean)
    .some((field) => normalize(field).includes(term));
};

const matchesCategory = (candidate: Software, category: string) =>
  candidate.categories?.includes(category as Software["categories"][number]);

const matchesPlatforms = (candidate: Software, platforms: string[]) => {
  if (!platforms.length) return true;
  const platformSet = new Set(candidate.platforms ?? []);
  return platforms.every((platform) => platformSet.has(platform as Software["platforms"][number]));
};

const matchesTypes = (candidate: Software, types: string[]) => {
  if (!types.length) return true;
  return types.includes(candidate.type);
};

const sortCollection = (collection: Software[], sortBy?: FilteredSoftwareOptions["sortBy"]) => {
  const sorted = [...collection];

  switch (sortBy) {
    case "popular":
      return sorted.sort(
        (a, b) => (b.stats?.downloads ?? 0) - (a.stats?.downloads ?? 0),
      );
    case "name":
      return sorted.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
    case "latest":
    default:
      return sorted.sort(
        (a, b) =>
          new Date(b.releaseDate ?? 0).getTime() - new Date(a.releaseDate ?? 0).getTime(),
      );
  }
};

const paginate = (collection: Software[], page: number, perPage: number) => {
  const safePage = Math.max(page, 1);
  const safePerPage = Math.max(perPage, 1);
  const from = (safePage - 1) * safePerPage;
  const to = from + safePerPage;
  const items = collection.slice(from, to);

  return {
    items,
    page: safePage,
    perPage: safePerPage,
    total: collection.length,
    hasMore: to < collection.length,
  } as const;
};

export const queryStaticSoftware = async (
  options: FilteredSoftwareOptions & { page: number; perPage: number },
) => {
  const dataset = await fetchStaticSoftwareDataset();
  const { query, category, platforms = [], types = [], sortBy, page, perPage } = options;

  let filtered = dataset;

  if (query) {
    filtered = filtered.filter((software) => matchesQuery(software, query));
  }

  if (category) {
    filtered = filtered.filter((software) => matchesCategory(software, category));
  }

  if (platforms.length) {
    filtered = filtered.filter((software) => matchesPlatforms(software, platforms));
  }

  if (types.length) {
    filtered = filtered.filter((software) => matchesTypes(software, types));
  }

  const sorted = sortCollection(filtered, sortBy);
  const pagination = paginate(sorted, page, perPage);

  return {
    items: pagination.items,
    total: pagination.total,
    page: pagination.page,
    perPage: pagination.perPage,
    hasMore: pagination.hasMore,
  };
};

export const getStaticSoftwareStats = async () => {
  const dataset = await fetchStaticSoftwareDataset();

  const totalPrograms = dataset.length;
  const totalDownloads = dataset.reduce((sum, software) => sum + (software.stats?.downloads ?? 0), 0);
  const platformSet = dataset.reduce((acc, software) => {
    software.platforms?.forEach((platform) => acc.add(platform));
    return acc;
  }, new Set<string>());

  return {
    totalPrograms,
    totalDownloads,
    totalPlatforms: platformSet.size,
  } as const;
};

export const invalidateStaticSoftwareCache = () => {
  datasetPromise = null;
};

export const getStaticSoftwareBySlug = async (slug: string) => {
  const dataset = await fetchStaticSoftwareDataset();
  return dataset.find((software) => software.slug === slug) ?? null;
};

export const getStaticRelatedSoftware = async (slug: string, limit = 3) => {
  const dataset = await fetchStaticSoftwareDataset();
  return dataset.filter((software) => software.slug !== slug).slice(0, Math.max(limit, 0));
};

export const getStaticTrendingSoftware = async (limit = 3) => {
  const dataset = await fetchStaticSoftwareDataset();
  return [...dataset]
    .sort((a, b) => (b.stats?.downloads ?? 0) - (a.stats?.downloads ?? 0))
    .slice(0, Math.max(limit, 0));
};

export const getStaticFeaturedGames = async (limit = 3) => {
  const dataset = await fetchStaticSoftwareDataset();
  return [...dataset]
    .filter((item) => item.categories?.includes("games"))
    .sort((a, b) => (b.stats?.downloads ?? 0) - (a.stats?.downloads ?? 0))
    .slice(0, Math.max(limit, 0));
};

export const listStaticSoftwareSlugs = async () => {
  const dataset = await fetchStaticSoftwareDataset();
  return dataset.map((software) => software.slug);
};
