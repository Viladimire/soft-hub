import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import type { Platform, Software, SoftwareCategory } from "@/lib/types/software";
import {
  createSoftware,
  deleteSoftware,
  fetchFilteredSoftware,
  fetchSoftwareBySlug,
  updateSoftware,
} from "./softwareService";

type FilterQueryResponse = {
  data: unknown;
  error: unknown;
  count?: number | null;
};

type MockFn = ReturnType<typeof vi.fn>;

type QueryBuilder = {
  select: MockFn;
  insert: MockFn;
  update: MockFn;
  delete: MockFn;
  eq: MockFn;
  ilike: MockFn;
  or: MockFn;
  contains: MockFn;
  in: MockFn;
  order: MockFn;
  range: MockFn;
  then: MockFn;
  maybeSingle: MockFn;
};

const createSupabaseMock = (response: FilterQueryResponse) => {
  const builder = {} as QueryBuilder;
  const chain = () => vi.fn(() => builder);

  builder.select = chain();
  builder.insert = chain();
  builder.update = chain();
  builder.delete = chain();
  builder.eq = chain();
  builder.ilike = chain();
  builder.or = chain();
  builder.contains = chain();
  builder.in = chain();
  builder.order = chain();
  builder.range = chain();
  builder.then = vi.fn((onFulfilled: (value: FilterQueryResponse) => unknown, onRejected?: (reason: unknown) => unknown) =>
    Promise.resolve(response).then(onFulfilled, onRejected),
  );
  builder.maybeSingle = vi.fn(() => Promise.resolve({ data: response.data, error: response.error }));

  const from = vi.fn(() => builder);
  const supabase = { from } as unknown as SupabaseClient<Database>;
  return { supabase, builder, from };
};

const platformValues: Platform[] = ["windows", "linux"];
const categoryValues: SoftwareCategory[] = ["development"];

const expectedSoftware: Software = {
  id: "1",
  slug: "test-slug",
  name: "Test Software",
  summary: "Summary",
  description: "Description",
  version: "1.0.0",
  sizeInBytes: 123456,
  platforms: platformValues,
  categories: categoryValues,
  type: "standard",
  websiteUrl: "https://example.com",
  downloadUrl: "https://example.com/download",
  isFeatured: false,
  isTrending: false,
  releaseDate: "2024-01-01",
  updatedAt: "2024-01-02",
  createdAt: "2024-01-01",
  developer: {},
  features: [],
  stats: {
    downloads: 42,
    views: 100,
    rating: 4.5,
    votes: 12,
  },
  media: {
    logoUrl: "logo.png",
    gallery: ["gallery-1.png"],
    heroImage: "hero.png",
  },
  requirements: {
    minimum: ["1 GB RAM"],
    recommended: ["2 GB RAM"],
  },
  changelog: [
    {
      version: "1.0.0",
      date: "2024-01-01",
      highlights: ["Initial release"],
    },
  ],
};

const baseRow: Database["public"]["Tables"]["software"]["Row"] = {
  id: expectedSoftware.id,
  slug: expectedSoftware.slug,
  name: expectedSoftware.name,
  summary: expectedSoftware.summary,
  description: expectedSoftware.description,
  version: expectedSoftware.version,
  size_in_bytes: expectedSoftware.sizeInBytes,
  platforms: expectedSoftware.platforms,
  categories: expectedSoftware.categories,
  type: expectedSoftware.type,
  website_url: expectedSoftware.websiteUrl ?? null,
  download_url: expectedSoftware.downloadUrl,
  is_featured: expectedSoftware.isFeatured,
  downloads_count: expectedSoftware.stats.downloads,
  developer: (expectedSoftware.developer ?? {}) as unknown as Database["public"]["Tables"]["software"]["Row"]["developer"],
  features: expectedSoftware.features ?? [],
  is_trending: expectedSoftware.isTrending ?? false,
  release_date: expectedSoftware.releaseDate,
  updated_at: expectedSoftware.updatedAt,
  created_at: expectedSoftware.createdAt,
  stats: expectedSoftware.stats as unknown as Database["public"]["Tables"]["software"]["Row"]["stats"],
  media: expectedSoftware.media as unknown as Database["public"]["Tables"]["software"]["Row"]["media"],
  requirements: expectedSoftware.requirements as unknown as Database["public"]["Tables"]["software"]["Row"]["requirements"],
  changelog: expectedSoftware.changelog as unknown as Database["public"]["Tables"]["software"]["Row"]["changelog"],
  search_vector: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchFilteredSoftware", () => {
  it("returns items after transforming them correctly", async () => {
    const response = {
      data: [baseRow],
      error: null,
      count: 1,
    } satisfies FilterQueryResponse;

    const { supabase, from } = createSupabaseMock(response);

    const result = await fetchFilteredSoftware({ query: "Test" }, supabase);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: expectedSoftware.id,
      slug: expectedSoftware.slug,
      stats: expectedSoftware.stats,
      media: expectedSoftware.media,
    });
    expect(result.total).toBe(1);
    expect(result.hasMore).toBe(false);
    expect(from).toHaveBeenCalledWith("software");
  });

  it("throws the error returned by Supabase", async () => {
    const error = new Error("failed");
    const response = {
      data: null,
      error,
      count: null,
    } satisfies FilterQueryResponse;

    const { supabase } = createSupabaseMock(response);

    await expect(fetchFilteredSoftware({}, supabase)).rejects.toThrow(error);
  });
});

describe("fetchSoftwareBySlug", () => {
  it("returns null when Supabase returns no row", async () => {
    const { supabase, from } = createSupabaseMock({ data: null, error: null, count: null });

    const result = await fetchSoftwareBySlug("missing", supabase);

    expect(result).toBeNull();
    expect(from).toHaveBeenCalledWith("software");
  });
});

describe("createSoftware", () => {
  const payload: Omit<Software, "id" | "stats" | "createdAt" | "updatedAt"> = {
    slug: expectedSoftware.slug,
    name: expectedSoftware.name,
    summary: expectedSoftware.summary,
    description: expectedSoftware.description,
    version: expectedSoftware.version,
    sizeInBytes: expectedSoftware.sizeInBytes,
    platforms: expectedSoftware.platforms,
    categories: expectedSoftware.categories,
    type: expectedSoftware.type,
    websiteUrl: expectedSoftware.websiteUrl,
    downloadUrl: expectedSoftware.downloadUrl,
    isFeatured: expectedSoftware.isFeatured,
    isTrending: expectedSoftware.isTrending,
    releaseDate: expectedSoftware.releaseDate,
    media: expectedSoftware.media,
    requirements: expectedSoftware.requirements,
    changelog: expectedSoftware.changelog,
    developer: expectedSoftware.developer,
    features: expectedSoftware.features,
  };

  it("returns the record after successful creation", async () => {
    const { supabase, builder, from } = createSupabaseMock({ data: baseRow, error: null, count: null });

    const result = await createSoftware(payload, supabase);

    expect(result).toMatchObject({ id: baseRow.id, slug: baseRow.slug, name: baseRow.name });
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: payload.slug,
        name: payload.name,
        size_in_bytes: payload.sizeInBytes,
        download_url: payload.downloadUrl,
      }),
      { count: "exact" },
    );
    expect(builder.select).toHaveBeenCalled();
    expect(builder.maybeSingle).toHaveBeenCalled();
    expect(from).toHaveBeenCalledWith("software");
  });

  it("throws when creation fails", async () => {
    const error = new Error("insert failed");
    const { supabase } = createSupabaseMock({ data: null, error, count: null });

    await expect(createSoftware(payload, supabase)).rejects.toThrow(error);
  });
});

describe("updateSoftware", () => {
  const patch = {
    name: "Updated name",
    summary: "Updated summary",
  } as const;

  it("returns the record after successful update", async () => {
    const updatedRow = { ...baseRow, name: patch.name, summary: patch.summary };
    const { supabase, builder, from } = createSupabaseMock({ data: updatedRow, error: null, count: null });

    const result = await updateSoftware(baseRow.id, patch, supabase);

    expect(result).toMatchObject({ id: baseRow.id, name: patch.name, summary: patch.summary });
    expect(builder.update).toHaveBeenCalledWith(expect.objectContaining(patch));
    expect(builder.eq).toHaveBeenCalledWith("id", baseRow.id);
    expect(builder.select).toHaveBeenCalled();
    expect(builder.maybeSingle).toHaveBeenCalled();
    expect(from).toHaveBeenCalledWith("software");
  });

  it("throws when update fails", async () => {
    const error = new Error("update failed");
    const { supabase } = createSupabaseMock({ data: null, error, count: null });

    await expect(updateSoftware(baseRow.id, patch, supabase)).rejects.toThrow(error);
  });
});

describe("deleteSoftware", () => {
  it("deletes without errors", async () => {
    const { supabase, builder, from } = createSupabaseMock({ data: null, error: null, count: null });

    await expect(deleteSoftware(baseRow.id, supabase)).resolves.toBeUndefined();
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith("id", baseRow.id);
    expect(from).toHaveBeenCalledWith("software");
  });

  it("throws when deletion fails", async () => {
    const error = new Error("delete failed");
    const { supabase } = createSupabaseMock({ data: null, error, count: null });

    await expect(deleteSoftware(baseRow.id, supabase)).rejects.toThrow(error);
  });
});
