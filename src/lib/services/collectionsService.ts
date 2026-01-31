import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/supabase/database.types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toSoftware, type SoftwareRow } from "@/lib/services/softwareService";
import {
  getStaticCollectionBySlug,
  getStaticCollectionSummaries,
  getStaticCollections,
} from "@/lib/services/staticCollectionsRepository";
import type { Collection, CollectionItem, CollectionSummary, CollectionTheme } from "@/lib/types/collection";

import type { Software } from "@/lib/types/software";

type Supabase = SupabaseClient<Database>;

type CollectionRow = Database["public"]["Tables"]["collections"]["Row"];
type CollectionItemRow = Database["public"]["Tables"]["collection_items"]["Row"] & {
  software?: Database["public"]["Tables"]["software"]["Row"] | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const toTheme = (value: Json | null): CollectionTheme => {
  if (!isRecord(value)) {
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

const toCollectionItem = (row: CollectionItemRow): CollectionItem => {
  const softwareRow = row.software as SoftwareRow | null | undefined;
  const software: Software | undefined = softwareRow ? toSoftware(softwareRow) : undefined;

  return {
    collectionId: row.collection_id,
    softwareId: row.software_id,
    softwareSlug: software?.slug,
    position: row.position ?? 0,
    highlight: row.highlight ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    software,
  };
};

const toCollection = (row: CollectionRow, items: CollectionItemRow[]): Collection => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  subtitle: row.subtitle,
  description: row.description,
  coverImageUrl: row.cover_image_url,
  accentColor: row.accent_color,
  theme: toTheme(row.theme),
  isFeatured: row.is_featured,
  displayOrder: row.display_order,
  publishedAt: row.published_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  items: items
    .map((item) => toCollectionItem(item))
    .sort((a, b) => a.position - b.position || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
});

const toCollectionSummary = (row: CollectionRow, itemsCount: number): CollectionSummary => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  subtitle: row.subtitle,
  description: row.description,
  coverImageUrl: row.cover_image_url,
  accentColor: row.accent_color,
  theme: toTheme(row.theme),
  isFeatured: row.is_featured,
  displayOrder: row.display_order,
  publishedAt: row.published_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  itemsCount,
});

export const fetchCollectionsFromSupabase = async (client: Supabase, includeDrafts = false) => {
  const query = client
    .from("collections")
    .select(
      `*, collection_items:collection_items(
          collection_id,
          software_id,
          position,
          highlight,
          created_at,
          updated_at,
          software:software(*)
        )`,
    )
    .order("display_order", { ascending: false })
    .order("created_at", { ascending: false });

  if (!includeDrafts) {
    query.not("published_at", "is", null);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Array<CollectionRow & { collection_items: CollectionItemRow[] | null | undefined }>;

  return rows.map((row) =>
    toCollection(row, Array.isArray(row.collection_items) ? row.collection_items : []),
  );
};

export const fetchCollectionFromSupabase = async (slug: string, client: Supabase, includeDrafts = false) => {
  const { data, error } = await client
    .from("collections")
    .select(
      `*, collection_items:collection_items(
          collection_id,
          software_id,
          position,
          highlight,
          created_at,
          updated_at,
          software:software(*)
        )`
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  if (!includeDrafts && data.published_at === null) {
    return null;
  }

  const row = data as CollectionRow & { collection_items: CollectionItemRow[] | null | undefined };

  return toCollection(row, Array.isArray(row.collection_items) ? row.collection_items : []);
};

export const fetchCollectionSummariesFromSupabase = async (client: Supabase, includeDrafts = false) => {
  const query = client
    .from("collections")
    .select("*, collection_items(count)")
    .order("display_order", { ascending: false })
    .order("created_at", { ascending: false });

  if (!includeDrafts) {
    query.not("published_at", "is", null);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Array<CollectionRow & { collection_items: { count: number | null }[] | null }>;

  return rows.map((row) =>
    toCollectionSummary(row, row.collection_items?.[0]?.count ?? 0),
  );
};

export const getCollections = async (client?: Supabase) => {
  if (client) {
    try {
      const live = await fetchCollectionsFromSupabase(client, false);

      if (live.length > 0) {
        return live;
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Falling back to static collections dataset", error);
      }
    }
  }

  return getStaticCollections();
};

export const getCollectionSummaries = async (client?: Supabase) => {
  if (client) {
    try {
      const live = await fetchCollectionSummariesFromSupabase(client, false);

      if (live.length > 0) {
        return live;
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Falling back to static collection summaries", error);
      }
    }
  }

  return getStaticCollectionSummaries();
};

export const getCollectionBySlug = async (slug: string, client?: Supabase) => {
  if (client) {
    try {
      const collection = await fetchCollectionFromSupabase(slug, client, false);

      if (collection) {
        return collection;
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`Failed to fetch collection ${slug} from Supabase`, error);
      }
    }
  }

  return getStaticCollectionBySlug(slug);
};

export const loadCollections = async () => {
  if (isSupabaseConfigured()) {
    try {
      const client = createSupabaseServerClient();
      return await fetchCollectionsFromSupabase(client, false);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Failed to load collections from Supabase, falling back to static dataset", error);
      }
    }
  }

  return getStaticCollections();
};
