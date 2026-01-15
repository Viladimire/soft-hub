import { beforeEach, describe, expect, it, vi } from "vitest";

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

const createFilterQuery = (response: FilterQueryResponse) => {
  const builder: any = {};

  builder.select = vi.fn(() => builder);
  builder.or = vi.fn(() => builder);
  builder.contains = vi.fn(() => builder);
  builder.in = vi.fn(() => builder);
  builder.order = vi.fn(() => builder);
  builder.range = vi.fn(() => builder);
  builder.then = (onFulfilled: (value: FilterQueryResponse) => unknown, onRejected?: (reason: unknown) => unknown) =>
    Promise.resolve(response).then(onFulfilled, onRejected);

  return builder;
};

const createSingleQuery = (response: { data: unknown; error: unknown }) => {
  const builder: any = {};

  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.maybeSingle = vi.fn(() => Promise.resolve(response));

  return builder;
};

const createInsertQuery = (response: { data: unknown; error: unknown }) => {
  const builder: any = {};

  builder.insert = vi.fn(() => builder);
  builder.select = vi.fn(() => builder);
  builder.maybeSingle = vi.fn(() => Promise.resolve(response));

  return builder;
};

const createUpdateQuery = (response: { data: unknown; error: unknown }) => {
  const builder: any = {};

  builder.update = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.select = vi.fn(() => builder);
  builder.maybeSingle = vi.fn(() => Promise.resolve(response));

  return builder;
};

const createDeleteQuery = (response: { error: unknown }) => {
  const builder: any = {};

  builder.delete = vi.fn(() => builder);
  builder.eq = vi.fn(() => Promise.resolve(response));

  return builder;
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
  type: "free",
  websiteUrl: "https://example.com",
  downloadUrl: "https://example.com/download",
  isFeatured: false,
  releaseDate: "2024-01-01",
  updatedAt: "2024-01-02",
  createdAt: "2024-01-01",
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
  release_date: expectedSoftware.releaseDate,
  updated_at: expectedSoftware.updatedAt,
  created_at: expectedSoftware.createdAt,
  stats: expectedSoftware.stats as unknown as Database["public"]["Tables"]["software"]["Row"]["stats"],
  media: expectedSoftware.media as unknown as Database["public"]["Tables"]["software"]["Row"]["media"],
  requirements: expectedSoftware.requirements as unknown as Database["public"]["Tables"]["software"]["Row"]["requirements"],
  changelog: expectedSoftware.changelog as unknown as Database["public"]["Tables"]["software"]["Row"]["changelog"],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchFilteredSoftware", () => {
  it("يعيد العناصر بعد تحويلها بصورة صحيحة", async () => {
    const response = {
      data: [baseRow],
      error: null,
      count: 1,
    } satisfies FilterQueryResponse;

    const supabase = {
      from: vi.fn(() => createFilterQuery(response)),
    } as any;

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
    expect(supabase.from).toHaveBeenCalledWith("software");
  });

  it("يرمي الخطأ القادم من Supabase", async () => {
    const error = new Error("failed");
    const response = {
      data: null,
      error,
      count: null,
    } satisfies FilterQueryResponse;

    const supabase = {
      from: vi.fn(() => createFilterQuery(response)),
    } as any;

    await expect(fetchFilteredSoftware({}, supabase)).rejects.toThrow(error);
  });
});

describe("fetchSoftwareBySlug", () => {
  it("يعيد null عندما لا تعود Supabase بأي صف", async () => {
    const supabase = {
      from: vi.fn(() => createSingleQuery({ data: null, error: null })),
    } as any;

    const result = await fetchSoftwareBySlug("missing", supabase);

    expect(result).toBeNull();
    expect(supabase.from).toHaveBeenCalledWith("software");
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
    releaseDate: expectedSoftware.releaseDate,
    media: expectedSoftware.media,
    requirements: expectedSoftware.requirements,
    changelog: expectedSoftware.changelog,
  };

  it("يعيد السجل بعد الإنشاء بنجاح", async () => {
    const response = { data: baseRow, error: null };
    const query = createInsertQuery(response);
    const supabase = {
      from: vi.fn(() => query),
    } as any;

    const result = await createSoftware(payload, supabase);

    expect(result).toMatchObject({ id: baseRow.id, slug: baseRow.slug, name: baseRow.name });
    expect(query.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: payload.slug,
        name: payload.name,
        size_in_bytes: payload.sizeInBytes,
        download_url: payload.downloadUrl,
      }),
      { count: "exact" },
    );
    expect(supabase.from).toHaveBeenCalledWith("software");
  });

  it("يرمي الخطأ عند فشل الإنشاء", async () => {
    const error = new Error("insert failed");
    const supabase = {
      from: vi.fn(() => createInsertQuery({ data: null, error })),
    } as any;

    await expect(createSoftware(payload, supabase)).rejects.toThrow(error);
  });
});

describe("updateSoftware", () => {
  const patch = {
    name: "Updated name",
    summary: "Updated summary",
  } as const;

  it("يعيد السجل بعد التحديث بنجاح", async () => {
    const updatedRow = { ...baseRow, name: patch.name, summary: patch.summary };
    const query = createUpdateQuery({ data: updatedRow, error: null });
    const supabase = {
      from: vi.fn(() => query),
    } as any;

    const result = await updateSoftware(baseRow.id, patch, supabase);

    expect(result).toMatchObject({ id: baseRow.id, name: patch.name, summary: patch.summary });
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining(patch));
    expect(query.eq).toHaveBeenCalledWith("id", baseRow.id);
    expect(supabase.from).toHaveBeenCalledWith("software");
  });

  it("يرمي الخطأ عند فشل التحديث", async () => {
    const error = new Error("update failed");
    const supabase = {
      from: vi.fn(() => createUpdateQuery({ data: null, error })),
    } as any;

    await expect(updateSoftware(baseRow.id, patch, supabase)).rejects.toThrow(error);
  });
});

describe("deleteSoftware", () => {
  it("ينفّذ الحذف دون أخطاء", async () => {
    const query = createDeleteQuery({ error: null });
    const supabase = {
      from: vi.fn(() => query),
    } as any;

    await expect(deleteSoftware(baseRow.id, supabase)).resolves.toBeUndefined();
    expect(query.delete).toHaveBeenCalled();
    expect(query.eq).toHaveBeenCalledWith("id", baseRow.id);
    expect(supabase.from).toHaveBeenCalledWith("software");
  });

  it("يرمي الخطأ عند فشل الحذف", async () => {
    const error = new Error("delete failed");
    const supabase = {
      from: vi.fn(() => createDeleteQuery({ error })),
    } as any;

    await expect(deleteSoftware(baseRow.id, supabase)).rejects.toThrow(error);
  });
});
