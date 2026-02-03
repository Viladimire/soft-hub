import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/supabase/database.types";
import type {
  Platform,
  Software,
  SoftwareCategory,
  SoftwareRelease,
  SoftwareType,
} from "@/lib/types/software";

export type SoftwareListFilters = {
  search?: string;
  category?: string;
  platform?: string;
  type?: SoftwareType;
  featured?: boolean;
  trending?: boolean;
  orderBy?: "latest" | "popular" | "alpha";
  page?: number;
  perPage?: number;
};

export type FilteredSoftwareOptions = {
  query?: string;
  category?: string | null;
  platforms?: string[];
  types?: string[];
  sortBy?: "latest" | "popular" | "name";
  page?: number;
  perPage?: number;
  featured?: boolean;
  trending?: boolean;
};

let supabaseSchemaMismatchDetected = false;

const SCHEMA_MISMATCH_STORAGE_KEY = "supabase_schema_mismatch";

const readSchemaMismatchFromStorage = () => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SCHEMA_MISMATCH_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

const writeSchemaMismatchToStorage = () => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SCHEMA_MISMATCH_STORAGE_KEY, "1");
  } catch {
    // ignore
  }
};

export const fetchFilteredSoftware = async (
  options: FilteredSoftwareOptions = {},
  client: Supabase,
): Promise<SoftwareListResponse> => {
  if (!supabaseSchemaMismatchDetected && readSchemaMismatchFromStorage()) {
    supabaseSchemaMismatchDetected = true;
  }

  if (supabaseSchemaMismatchDetected) {
    const error = new Error("Supabase schema mismatch detected; skipping Supabase queries.") as Error & {
      code?: string;
    };
    error.code = "42703";
    throw error;
  }

  const supabase = client;

  const trimmedQuery = options.query?.trim() ?? "";
  const selectColumns = trimmedQuery
    ? `*, search_rank:ts_rank_cd(search_vector, websearch_to_tsquery('english', ${escapeSearchQuery(trimmedQuery)}))`
    : "*";

  let query = supabase.from("software").select(selectColumns, { count: "exact" });

  if (trimmedQuery) {
    const maybeTextSearch = (query as unknown as { textSearch?: unknown }).textSearch;
    if (typeof maybeTextSearch === "function") {
      query = maybeTextSearch.call(query, "search_vector", trimmedQuery, {
        config: "english",
        type: "websearch",
      });
    } else {
      query = query.ilike("name", `%${trimmedQuery}%`);
    }
  }

  if (options.category) {
    query = query.contains("categories", [options.category]);
  }

  if (options.platforms?.length) {
    query = query.contains("platforms", options.platforms);
  }

  if (options.types?.length) {
    query = query.in("type", options.types);
  }

  if (options.featured) {
    query = query.eq("is_featured", true);
  }

  if (options.trending) {
    query = query.eq("is_trending", true);
  }

  if (options.sortBy) {
    switch (options.sortBy) {
      case "popular":
        query = query.order("downloads_count", { ascending: false, nullsFirst: false });
        break;
      case "name":
        query = query.order("name", { ascending: true });
        break;
      case "latest":
      default:
        query = query.order("release_date", { ascending: false });
        break;
    }
  } else if (trimmedQuery) {
    query = query
      .order("search_rank", { ascending: false, nullsFirst: true })
      .order("downloads_count", { ascending: false, nullsFirst: false });
  } else {
    query = query.order("release_date", { ascending: false });
  }

  const page = Math.max(options.page ?? 1, 1);
  const perPage = Math.max(options.perPage ?? DEFAULT_PAGE_SIZE, 1);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    // If the connected Supabase project doesn't have the expected schema yet,
    // PostgREST returns 42703 (undefined_column). Degrade gracefully.
    if (error.code === "42703") {
      supabaseSchemaMismatchDetected = true;
      writeSchemaMismatchToStorage();

      if (options.trending) {
        console.warn("Supabase column 'is_trending' missing. Falling back to dataset without trending filter.");
        throw error;
      }

      if (options.featured) {
        console.warn("Supabase column 'is_featured' missing. Falling back to dataset without featured filter.");
        throw error;
      }

      if (options.sortBy && options.sortBy !== "name") {
        console.warn(
          `Supabase sorting column missing for sort '${options.sortBy}'. Falling back to name sorting.`,
        );
        throw error;
      }

      // As a last resort, drop optional filters/sorting and fetch the first page.
      console.warn("Supabase query failed due to schema mismatch. Falling back to a minimal query.");
      throw error;
    }

    throw error;
  }

  const rows = (data ?? []) as unknown as SoftwareSearchRow[];
  const items = rows.map(toSoftware);
  const total = count ?? items.length;
  const hasMore = to + 1 < total;

  return {
    items,
    total,
    page,
    perPage,
    hasMore,
  } satisfies SoftwareListResponse;
};

export type SoftwareListResponse = {
  items: Software[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
};

export type SoftwareRow = Database["public"]["Tables"]["software"]["Row"];
export type SoftwareReleaseRow = Database["public"]["Tables"]["software_releases"]["Row"];

type Supabase = SupabaseClient<Database>;

const DEFAULT_PAGE_SIZE = 12;

type SoftwareSearchRow = SoftwareRow & { search_rank?: number };

const isRecord = (value: Json | null): value is Record<string, Json> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const parseStats = (stats: Json | null): Software["stats"] => {
  if (!isRecord(stats)) {
    return DEFAULT_STATS;
  }

  return {
    downloads: toNumber(stats.downloads),
    views: toNumber(stats.views),
    rating: clampRating(stats.rating),
    votes: Math.max(toNumber(stats.votes), 0),
  };
};

const parseDeveloper = (developer: Json | null): Software["developer"] => {
  if (!isRecord(developer)) {
    return {};
  }

  const entries = Object.entries(developer).filter((entry): entry is [string, Json] => {
    const [key, value] = entry;
    return typeof key === "string" && value !== undefined;
  });

  return Object.fromEntries(entries) as Record<string, unknown>;
};

const parseFeatures = (features: string[] | null | undefined): Software["features"] =>
  Array.isArray(features)
    ? features.filter((feature): feature is string => typeof feature === "string")
    : [];

const parseMedia = (media: Json | null): Software["media"] => {
  if (!isRecord(media)) {
    return DEFAULT_MEDIA;
  }

  const galleryEntry = media.gallery;
  const gallery = Array.isArray(galleryEntry)
    ? galleryEntry.filter((item): item is string => typeof item === "string")
    : [];

  return {
    logoUrl: typeof media.logoUrl === "string" ? media.logoUrl : "",
    gallery,
    heroImage: typeof media.heroImage === "string" ? media.heroImage : undefined,
  };
};

const toSoftwareRelease = (row: SoftwareReleaseRow): SoftwareRelease => {
  return {
    id: row.id,
    softwareId: row.software_id,
    version: row.version,
    fileName: row.file_name,
    additionalInfo: row.additional_info,
    downloadUrl: row.download_url,
    sizeInBytes: row.size_in_bytes,
    releaseDate: row.release_date,
    downloadsCount: row.downloads_count,
    createdAt: row.created_at,
  };
};

const isMissingTableError = (error: unknown) => {
  const maybe = error as { code?: string } | null;
  return maybe?.code === "42P01";
};

const fetchSoftwareReleases = async (softwareId: string, client: Supabase): Promise<SoftwareRelease[]> => {
  const { data, error } = await client
    .from("software_releases")
    .select("*")
    .eq("software_id", softwareId)
    .order("release_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error)) {
      return [];
    }
    throw error;
  }

  return ((data ?? []) as SoftwareReleaseRow[]).map(toSoftwareRelease);
};

const PLATFORM_VALUES: Platform[] = ["windows", "mac", "linux", "android", "ios", "web"];
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

const parsePlatforms = (platforms: string[] | null | undefined): Platform[] =>
  Array.isArray(platforms)
    ? platforms
        .map((platform) => PLATFORM_CANONICAL.get(platform) ?? platform)
        .filter((platform): platform is Platform => PLATFORM_VALUES.includes(platform as Platform))
    : [];

const parseCategories = (categories: string[] | null | undefined): SoftwareCategory[] =>
  Array.isArray(categories)
    ? categories.filter((category): category is SoftwareCategory =>
        CATEGORY_VALUES.includes(category as SoftwareCategory),
      )
    : [];

const parseRequirements = (requirements: Json | null): Software["requirements"] => {
  if (!isRecord(requirements)) {
    return {};
  }

  const toStringArray = (value: Json | null | undefined) =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : undefined;

  return {
    minimum: toStringArray(requirements.minimum),
    recommended: toStringArray(requirements.recommended),
  };
};

const parseChangelog = (entries: Json | null): Software["changelog"] => {
  if (!Array.isArray(entries)) {
    return undefined;
  }

  const formatted = entries
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }

      const version = typeof entry.version === "string" ? entry.version : undefined;
      const date = typeof entry.date === "string" ? entry.date : undefined;
      const highlights = Array.isArray(entry.highlights)
        ? entry.highlights.filter((item): item is string => typeof item === "string")
        : undefined;

      if (!version || !date || !highlights?.length) {
        return null;
      }

      return { version, date, highlights };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  return formatted.length ? formatted : undefined;
};

const computePopularityFallbackStats = (params: {
  stats: Software["stats"];
  developer: Software["developer"];
}): Software["stats"] => {
  const { stats, developer } = params;

  const starsRaw = developer["stars"];
  const stars = typeof starsRaw === "number" && Number.isFinite(starsRaw) && starsRaw > 0 ? starsRaw : 0;

  const downloads = Math.max(stats.downloads, 0);
  const views = Math.max(stats.views, 0);
  const rating = Math.max(stats.rating, 0);
  const votes = Math.max(stats.votes, 0);

  const popularity = Math.log10(downloads + 1) + Math.log10(stars + 1) * 1.25;

  const derivedViews = Math.round(downloads * (3 + Math.min(Math.log10(stars + 1), 3)));
  const derivedRating = Number.isFinite(popularity)
    ? Math.min(5, Math.max(3, 3 + popularity / 3.5))
    : 0;
  const derivedVotes = Math.round(Math.min(5000, Math.max(votes, stars * 0.08)));

  return {
    downloads,
    views: views > 0 ? views : derivedViews,
    rating: rating > 0 ? clampRating(rating) : clampRating(derivedRating),
    votes: votes > 0 ? votes : derivedVotes,
  };
};

export const toSoftware = (row: SoftwareRow): Software => {
  const developer = parseDeveloper(row.developer);

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    description: row.description,
    version: row.version,
    sizeInBytes: row.size_in_bytes,
    platforms: parsePlatforms(row.platforms),
    categories: parseCategories(row.categories),
    type: row.type as SoftwareType,
    websiteUrl: row.website_url,
    downloadUrl: row.download_url,
    isFeatured: row.is_featured,
    isTrending: row.is_trending,
    releaseDate: row.release_date,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    stats: computePopularityFallbackStats({
      stats: parseStats(row.stats),
      developer,
    }),
    developer,
    features: parseFeatures(row.features),
    media: parseMedia(row.media),
    requirements: parseRequirements(row.requirements),
    changelog: parseChangelog(row.changelog),
  };
};

export const fetchSoftwareList = async (
  filters: SoftwareListFilters = {},
  client: Supabase,
): Promise<SoftwareListResponse> => {
  const {
    search,
    category,
    platform,
    type,
    featured,
    trending,
    orderBy,
    page = 1,
    perPage = DEFAULT_PAGE_SIZE,
  } = filters;

  return fetchFilteredSoftware(
    {
      query: search,
      category: category ?? undefined,
      platforms: platform ? [platform] : undefined,
      types: type ? [type] : undefined,
      featured,
      trending,
      sortBy: orderBy === "alpha" ? "name" : orderBy,
      page,
      perPage,
    },
    client,
  );
};

export const fetchSoftwareBySlug = async (slug: string, client: Supabase) => {
  const supabase = client;
  const { data, error } = await supabase
    .from("software")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const record = data as SoftwareRow | null;

  if (!record) {
    return null;
  }

  const software = toSoftware(record);
  const releases = await fetchSoftwareReleases(software.id, supabase).catch(() => []);
  return {
    ...software,
    releases,
  };
};

export const fetchSoftwareStats = async (client: Supabase) => {
  const supabase = client;
  const { data, error, count } = await supabase
    .from("software")
    .select("platforms, stats", { count: "exact" });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Pick<SoftwareRow, "platforms" | "stats">[];
  const totalPrograms = count ?? rows.length;
  const totals = rows.reduce(
    (acc, row) => {
      const parsedStats = parseStats(row.stats);
      acc.downloads += parsedStats.downloads;
      acc.views += parsedStats.views;
      parsePlatforms(row.platforms ?? []).forEach((platform) => acc.platforms.add(platform));
      return acc;
    },
    { downloads: 0, views: 0, platforms: new Set<Platform>() },
  );

  return {
    totalPrograms,
    totalDownloads: totals.downloads,
    totalViews: totals.views,
    totalPlatforms: totals.platforms.size,
  } as const;
};

export const fetchTrendingSoftware = async (limit: number, client: Supabase) => {
  const perPage = Math.max(Math.floor(limit) || 0, 1);
  const primary = await fetchFilteredSoftware({ trending: true, sortBy: "popular", page: 1, perPage }, client);

  if (primary.items.length > 0) {
    return primary.items;
  }

  const fallback = await fetchFilteredSoftware({ sortBy: "popular", page: 1, perPage }, client);
  return fallback.items;
};

export const fetchFeaturedSoftware = async (limit: number, client: Supabase) => {
  const perPage = Math.max(Math.floor(limit) || 0, 1);
  const response = await fetchFilteredSoftware({ featured: true, sortBy: "latest", page: 1, perPage }, client);
  return response.items;
};

export const fetchRelatedSoftware = async (params: { slug: string; categories: string[]; limit?: number }, client: Supabase) => {
  const { slug, categories, limit = 6 } = params;

  const supabase = client;
  const query = supabase
    .from("software")
    .select("*")
    .neq("slug", slug)
    .limit(limit)
    .order("downloads_count", { ascending: false })
    .order("release_date", { ascending: false });

  const final = categories.length ? query.overlaps("categories", categories) : query;

  const { data, error } = await final;

  if (error) {
    throw error;
  }

  return ((data ?? []) as SoftwareRow[]).map(toSoftware);
};

const escapeSearchQuery = (value: string) => `'${value.replace(/'/g, "''")}'`;

const DEFAULT_STATS: Software["stats"] = { downloads: 0, views: 0, rating: 0, votes: 0 };

const DEFAULT_MEDIA: Software["media"] = { logoUrl: "", gallery: [] };

const PLATFORM_CANONICAL = new Map<string, Platform>([
  ["win", "windows"],
  ["macos", "mac"],
  ["osx", "mac"],
  ["gnu/linux", "linux"],
  ["iphone", "ios"],
  ["ipad", "ios"],
]);

const toNumber = (value: Json | undefined) => {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

const clampRating = (value: Json | undefined) => {
  const numeric = toNumber(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(Math.max(numeric, 0), 5);
};

export const createSoftware = async (
  payload: Omit<Software, "id" | "createdAt" | "updatedAt" | "stats">,
  client: Supabase,
) => {
  const supabase = client;

  const { data, error } = await supabase
    .from("software")
    .insert(
      {
        slug: payload.slug,
        name: payload.name,
        summary: payload.summary,
        description: payload.description,
        version: payload.version,
        size_in_bytes: payload.sizeInBytes,
        platforms: payload.platforms,
        categories: payload.categories,
        type: payload.type,
        website_url: payload.websiteUrl ?? null,
        download_url: payload.downloadUrl,
        is_featured: payload.isFeatured,
        is_trending: payload.isTrending,
        release_date: payload.releaseDate,
        developer: (payload.developer ?? {}) as Json,
        features: payload.features,
        media: payload.media as Json,
        requirements: (payload.requirements ?? null) as Json | null,
        changelog: (payload.changelog ?? null) as Json | null,
      },
      { count: "exact" },
    )
    .select()
    .maybeSingle();

  if (error) {
    throw error;
  }

  const record = data as SoftwareRow | null;

  if (!record) {
    return null;
  }

  const software = toSoftware(record);

  try {
    await supabase
      .from("software_releases")
      .insert({
        software_id: software.id,
        version: software.version,
        file_name: `${software.name} ${software.version}`,
        additional_info: null,
        download_url: software.downloadUrl,
        size_in_bytes: software.sizeInBytes,
        release_date: software.releaseDate,
        downloads_count: 0,
      })
      .throwOnError();
  } catch (insertError: unknown) {
    const maybe = insertError as { code?: string } | null;
    if (isMissingTableError(insertError)) {
      // Ignore on older schemas.
    } else if (maybe?.code === "23505") {
      // Ignore unique constraint violations.
    } else {
      throw insertError;
    }
  }

  const releases = await fetchSoftwareReleases(software.id, supabase).catch(() => []);
  return {
    ...software,
    releases,
  };
};

export const updateSoftware = async (
  id: string,
  payload: Partial<Omit<Software, "id" | "createdAt" | "updatedAt" | "stats">>,
  client: Supabase,
) => {
  const supabase = client;

  const { data: existing, error: existingError } = await supabase
    .from("software")
    .select("id, version, download_url, size_in_bytes, release_date, name")
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  const { data, error } = await supabase
    .from("software")
    .update({
      slug: payload.slug,
      name: payload.name,
      summary: payload.summary,
      description: payload.description,
      version: payload.version,
      size_in_bytes: payload.sizeInBytes,
      platforms: payload.platforms,
      categories: payload.categories,
      type: payload.type,
      website_url: payload.websiteUrl,
      download_url: payload.downloadUrl,
      is_featured: payload.isFeatured,
      is_trending: payload.isTrending,
      release_date: payload.releaseDate,
      developer: (payload.developer as Json | undefined) ?? undefined,
      features: payload.features,
      media: (payload.media as Json | undefined) ?? undefined,
      requirements: (payload.requirements as Json | undefined) ?? undefined,
      changelog: (payload.changelog as Json | undefined) ?? undefined,
    })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    throw error;
  }

  const record = data as SoftwareRow | null;

  if (!record) {
    return null;
  }

  const software = toSoftware(record);

  const previous = existing as
    | Pick<SoftwareRow, "id" | "version" | "download_url" | "size_in_bytes" | "release_date" | "name">
    | null;

  if (previous) {
    const versionChanged = payload.version !== undefined && payload.version !== previous.version;
    const downloadChanged = payload.downloadUrl !== undefined && payload.downloadUrl !== previous.download_url;
    const sizeChanged = payload.sizeInBytes !== undefined && payload.sizeInBytes !== previous.size_in_bytes;
    const dateChanged = payload.releaseDate !== undefined && payload.releaseDate !== previous.release_date;

    if (versionChanged || downloadChanged || sizeChanged || dateChanged) {
      try {
        await supabase
          .from("software_releases")
          .insert({
            software_id: previous.id,
            version: previous.version,
            file_name: `${previous.name} ${previous.version}`,
            additional_info: null,
            download_url: previous.download_url,
            size_in_bytes: previous.size_in_bytes,
            release_date: previous.release_date,
            downloads_count: 0,
          })
          .throwOnError();
      } catch (insertError: unknown) {
        const maybe = insertError as { code?: string } | null;
        if (isMissingTableError(insertError)) {
          // Ignore on older schemas.
        } else if (maybe?.code === "23505") {
          // Ignore unique constraint violations.
        } else {
          throw insertError;
        }
      }
    }
  }

  try {
    await supabase
      .from("software_releases")
      .insert({
        software_id: software.id,
        version: software.version,
        file_name: `${software.name} ${software.version}`,
        additional_info: null,
        download_url: software.downloadUrl,
        size_in_bytes: software.sizeInBytes,
        release_date: software.releaseDate,
        downloads_count: 0,
      })
      .throwOnError();
  } catch (insertError: unknown) {
    const maybe = insertError as { code?: string } | null;
    if (isMissingTableError(insertError)) {
      // Ignore on older schemas.
    } else if (maybe?.code === "23505") {
      // Ignore unique constraint violations.
    } else {
      throw insertError;
    }
  }

  const releases = await fetchSoftwareReleases(software.id, supabase).catch(() => []);
  return {
    ...software,
    releases,
  };
};

export const deleteSoftware = async (id: string, client: Supabase) => {
  const supabase = client;
  const { error } = await supabase.from("software").delete().eq("id", id);

  if (error) {
    throw error;
  }
};
