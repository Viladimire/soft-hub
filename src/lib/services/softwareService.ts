import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import type {
  Platform,
  Software,
  SoftwareCategory,
  SoftwareType,
} from "@/lib/types/software";

export type SoftwareListFilters = {
  search?: string;
  category?: string;
  platform?: string;
  type?: SoftwareType;
  featured?: boolean;
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
};

export const fetchFilteredSoftware = async (
  options: FilteredSoftwareOptions = {},
  client: Supabase,
) => {
  const supabase = client;

  let query = supabase.from("software").select("*", { count: "exact" });

  if (options.query) {
    const escaped = options.query
      .trim()
      .replace(/\*/g, "\\*")
      .replace(/,/g, "\\,");
    const pattern = `*${escaped}*`;
    query = query.or(
      `name.ilike.${pattern},summary.ilike.${pattern},description.ilike.${pattern}`,
    );
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

  switch (options.sortBy) {
    case "popular":
      query = query.order("stats->>downloads", { ascending: false, nullsFirst: false });
      break;
    case "name":
      query = query.order("name", { ascending: true });
      break;
    case "latest":
    default:
      query = query.order("release_date", { ascending: false });
      break;
  }

  const page = Math.max(options.page ?? 1, 1);
  const perPage = Math.max(options.perPage ?? DEFAULT_PAGE_SIZE, 1);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as SoftwareRow[];
  const items = rows.map(toSoftware);

  return {
    items,
    total: count ?? items.length,
    page,
    perPage,
    hasMore: to < ((count ?? items.length) - 1),
  } satisfies SoftwareListResponse;
};

export type SoftwareListResponse = {
  items: Software[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
};

type SoftwareRow = Database["public"]["Tables"]["software"]["Row"];

type Supabase = SupabaseClient<Database>;

const DEFAULT_PAGE_SIZE = 12;

const isRecord = (value: Json | null): value is Record<string, Json> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const parseStats = (stats: Json | null): Software["stats"] => {
  if (!isRecord(stats)) {
    return { downloads: 0, views: 0, rating: 0, votes: 0 };
  }

  return {
    downloads: Number(stats.downloads) || 0,
    views: Number(stats.views) || 0,
    rating: Number(stats.rating) || 0,
    votes: Number(stats.votes) || 0,
  };
};

const parseMedia = (media: Json | null): Software["media"] => {
  if (!isRecord(media)) {
    return {
      logoUrl: "",
      gallery: [],
    };
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

const PLATFORM_VALUES: Platform[] = ["windows", "mac", "linux", "android", "ios"];
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

const parsePlatforms = (platforms: string[]): Platform[] =>
  platforms.filter((platform): platform is Platform =>
    PLATFORM_VALUES.includes(platform as Platform),
  );

const parseCategories = (categories: string[]): SoftwareCategory[] =>
  categories.filter((category): category is SoftwareCategory =>
    CATEGORY_VALUES.includes(category as SoftwareCategory),
  );

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

const toSoftware = (row: SoftwareRow): Software => ({
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
  releaseDate: row.release_date,
  updatedAt: row.updated_at,
  createdAt: row.created_at,
  stats: parseStats(row.stats),
  media: parseMedia(row.media),
  requirements: parseRequirements(row.requirements),
  changelog: parseChangelog(row.changelog),
});

export const fetchSoftwareList = async (
  filters: SoftwareListFilters = {},
  client: Supabase,
): Promise<SoftwareListResponse> => {
  const supabase = client;
  const page = Math.max(filters.page ?? 1, 1);
  const perPage = filters.perPage ?? DEFAULT_PAGE_SIZE;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("software")
    .select("*", { count: "exact" })
    .range(from, to);

  if (filters.search) {
    query = query.ilike("name", `%${filters.search}%`);
  }

  if (filters.category) {
    query = query.contains("categories", [filters.category]);
  }

  if (filters.platform) {
    query = query.contains("platforms", [filters.platform]);
  }

  if (filters.type) {
    query = query.eq("type", filters.type);
  }

  if (filters.featured) {
    query = query.eq("is_featured", true);
  }

  switch (filters.orderBy) {
    case "popular":
      query = query.order("stats->>downloads", { ascending: false, nullsFirst: false });
      break;
    case "alpha":
      query = query.order("name", { ascending: true });
      break;
    case "latest":
    default:
      query = query.order("release_date", { ascending: false });
      break;
  }

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as SoftwareRow[];
  const items = rows.map(toSoftware);
  const total = count ?? items.length;

  return {
    items,
    total,
    page,
    perPage,
    hasMore: to < (total - 1),
  };
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

  return record ? toSoftware(record) : null;
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
  const totalDownloads = rows.reduce((sum, row) => sum + parseStats(row.stats).downloads, 0);
  const platformSet = rows.reduce((set, row) => {
    parsePlatforms(row.platforms ?? []).forEach((platform) => set.add(platform));
    return set;
  }, new Set<Platform>());

  return {
    totalPrograms,
    totalDownloads,
    totalPlatforms: platformSet.size,
  } as const;
};

export const fetchTrendingSoftware = async (limit: number, client: Supabase) => {
  const perPage = Math.max(Math.floor(limit) || 0, 1);
  const response = await fetchFilteredSoftware({ sortBy: "popular", page: 1, perPage }, client);
  return response.items;
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
        release_date: payload.releaseDate,
        media: payload.media,
        requirements: payload.requirements ?? null,
        changelog: payload.changelog ?? null,
      },
      { count: "exact" },
    )
    .select()
    .maybeSingle();

  if (error) {
    throw error;
  }

  const record = data as SoftwareRow | null;

  return record ? toSoftware(record) : null;
};

export const updateSoftware = async (
  id: string,
  payload: Partial<Omit<Software, "id" | "createdAt" | "updatedAt" | "stats">>,
  client: Supabase,
) => {
  const supabase = client;

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
      release_date: payload.releaseDate,
      media: payload.media,
      requirements: payload.requirements,
      changelog: payload.changelog,
    })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    throw error;
  }

  const record = data as SoftwareRow | null;

  return record ? toSoftware(record) : null;
};

export const deleteSoftware = async (id: string, client: Supabase) => {
  const supabase = client;
  const { error } = await supabase.from("software").delete().eq("id", id);

  if (error) {
    throw error;
  }
};
