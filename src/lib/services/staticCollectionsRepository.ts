import staticCollectionsDataset from "@/lib/data/static-collections-dataset.json";
import { fetchStaticSoftwareDataset, getStaticSoftwareBySlug } from "@/lib/services/staticSoftwareRepository";
import type { Collection, CollectionItem, CollectionSummary } from "@/lib/types/collection";

const COLLECTIONS_DATA_BASE = process.env.NEXT_PUBLIC_COLLECTIONS_DATA_URL_BASE ?? process.env.NEXT_PUBLIC_DATA_BASE_URL ?? "";
const COLLECTIONS_FILENAME = "collections/index.json";
const DEFAULT_REMOTE_BASE = "https://raw.githubusercontent.com/Viladimire/soft-hub/main/public/data";

let collectionsPromise: Promise<Collection[]> | null = null;

const sanitizeBaseUrl = (value: string) => value.replace(/\/+$/, "");

const resolveCollectionsUrl = () => {
  if (COLLECTIONS_DATA_BASE) {
    return `${sanitizeBaseUrl(COLLECTIONS_DATA_BASE)}/${COLLECTIONS_FILENAME}`;
  }

  if (typeof window !== "undefined") {
    return `/data/${COLLECTIONS_FILENAME}`;
  }

  return `${DEFAULT_REMOTE_BASE}/${COLLECTIONS_FILENAME}`;
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeTheme = (value: unknown): Collection["theme"] => {
  if (!isPlainRecord(value)) {
    return {};
  }

  return {
    background: typeof value.background === "string" ? value.background : undefined,
    foreground: typeof value.foreground === "string" ? value.foreground : undefined,
    gradientStart: typeof value.gradientStart === "string" ? value.gradientStart : undefined,
    gradientEnd: typeof value.gradientEnd === "string" ? value.gradientEnd : undefined,
    pattern: typeof value.pattern === "string" ? value.pattern : undefined,
  };
};

type RawCollectionItem = {
  softwareId?: string;
  softwareSlug?: string;
  highlight?: string | null;
  position?: number;
};

const normalizeCollectionItem = (value: unknown): RawCollectionItem | null => {
  if (!isPlainRecord(value)) {
    return null;
  }

  const softwareId = typeof value.softwareId === "string" ? value.softwareId : undefined;
  const softwareSlug = typeof value.softwareSlug === "string" ? value.softwareSlug : undefined;

  if (!softwareId && !softwareSlug) {
    return null;
  }

  return {
    softwareId,
    softwareSlug,
    highlight: typeof value.highlight === "string" ? value.highlight : undefined,
    position: typeof value.position === "number" && Number.isInteger(value.position) ? value.position : undefined,
  } satisfies RawCollectionItem;
};

const normalizeCollection = (entry: unknown): Collection => {
  const record = isPlainRecord(entry) ? entry : {};
  const now = new Date().toISOString();

  const itemsRaw = Array.isArray(record.items) ? record.items : [];
  const itemsNormalized = itemsRaw
    .map((item) => normalizeCollectionItem(item))
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return {
    id: typeof record.id === "string" ? record.id : typeof record.slug === "string" ? record.slug : crypto.randomUUID(),
    slug: typeof record.slug === "string" ? record.slug : "",
    title: typeof record.title === "string" ? record.title : "Untitled collection",
    subtitle: typeof record.subtitle === "string" ? record.subtitle : null,
    description: typeof record.description === "string" ? record.description : null,
    coverImageUrl: typeof record.coverImageUrl === "string" ? record.coverImageUrl : null,
    accentColor: typeof record.accentColor === "string" ? record.accentColor : null,
    theme: normalizeTheme(record.theme),
    isFeatured: Boolean(record.isFeatured),
    displayOrder: typeof record.displayOrder === "number" ? record.displayOrder : 0,
    publishedAt: typeof record.publishedAt === "string" ? record.publishedAt : null,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : now,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : now,
    items: itemsNormalized.map((item, index) => ({
      collectionId: typeof record.id === "string" ? record.id : typeof record.slug === "string" ? record.slug : "",
      softwareId: item.softwareId ?? item.softwareSlug ?? "",
      softwareSlug: item.softwareSlug,
      position: item.position ?? index,
      highlight: item.highlight ?? null,
      createdAt: now,
      updatedAt: now,
    })),
  } satisfies Collection;
};

const parseCollectionsArray = (payload: unknown): Collection[] => {
  if (!Array.isArray(payload)) {
    throw new Error("Collections dataset payload is not an array");
  }

  return payload.map((entry) => normalizeCollection(entry));
};

let localCollectionsCache: Collection[] | null = null;

const loadLocalCollections = () => {
  if (!localCollectionsCache) {
    localCollectionsCache = parseCollectionsArray(staticCollectionsDataset as unknown);
  }

  return localCollectionsCache;
};

const loadCollectionsDataset = async () => {
  if (!COLLECTIONS_DATA_BASE) {
    return loadLocalCollections();
  }

  const url = resolveCollectionsUrl();

  try {
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Failed to fetch collections dataset from ${url} (status ${response.status})`);
    }

    const raw = await response.json();
    return parseCollectionsArray(raw);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Falling back to bundled static collections dataset after remote fetch failure", error);
    }
    return loadLocalCollections();
  }
};

export const fetchStaticCollectionsDataset = async (): Promise<Collection[]> => {
  if (!collectionsPromise) {
    collectionsPromise = loadCollectionsDataset().catch((error) => {
      collectionsPromise = null;
      throw error;
    });
  }

  return collectionsPromise;
};

export const invalidateStaticCollectionsCache = () => {
  collectionsPromise = null;
  localCollectionsCache = null;
};

export const getStaticCollections = async () => {
  const dataset = await fetchStaticCollectionsDataset();
  return dataset
    .filter((collection) => collection.publishedAt)
    .sort((a, b) => b.displayOrder - a.displayOrder || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getStaticCollectionById = async (id: string) => {
  const dataset = await fetchStaticCollectionsDataset();
  return dataset.find((collection) => collection.id === id) ?? null;
};

export const listStaticCollectionSlugs = async () => {
  const dataset = await fetchStaticCollectionsDataset();
  return dataset
    .filter((collection) => collection.publishedAt)
    .map((collection) => collection.slug)
    .filter((slug, index, all) => slug && all.indexOf(slug) === index);
};

export const getStaticCollectionBySlug = async (slug: string) => {
  const dataset = await fetchStaticCollectionsDataset();
  const match = dataset.find((collection) => collection.slug === slug);

  if (!match) {
    return null;
  }

  const softwareDataset = await fetchStaticSoftwareDataset();
  const softwareById = new Map(softwareDataset.map((software) => [software.id, software] as const));
  const softwareBySlug = new Map(softwareDataset.map((software) => [software.slug, software] as const));

  const itemsWithSoftware: CollectionItem[] = match.items.map((item, index) => {
    const software =
      softwareById.get(item.softwareId) ??
      softwareBySlug.get(item.softwareId) ??
      (item.softwareSlug ? softwareBySlug.get(item.softwareSlug) : undefined);

    if (!software && process.env.NODE_ENV !== "production") {
      console.warn(`Static collection item ${item.softwareId} has no matching software entry`);
    }

    return {
      ...item,
      position: item.position ?? index,
      softwareSlug: software?.slug ?? item.softwareSlug,
      software,
    };
  });

  return {
    ...match,
    items: itemsWithSoftware,
  } satisfies Collection;
};

export const getStaticCollectionSummaries = async () => {
  const dataset = await fetchStaticCollectionsDataset();
  const filtered = dataset.filter((collection) => collection.publishedAt);

  return filtered.map((collection) => ({
    id: collection.id,
    slug: collection.slug,
    title: collection.title,
    subtitle: collection.subtitle,
    description: collection.description,
    coverImageUrl: collection.coverImageUrl,
    accentColor: collection.accentColor,
    theme: collection.theme,
    isFeatured: collection.isFeatured,
    displayOrder: collection.displayOrder,
    publishedAt: collection.publishedAt,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
    itemsCount: collection.items.length,
  })) satisfies CollectionSummary[];
};
