import { Buffer } from "node:buffer";

import type { Software } from "@/lib/types/software";
import { invalidateStaticSoftwareCache } from "@/lib/services/staticSoftwareRepository";
import { readLocalAdminConfig } from "@/lib/services/local-admin-config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DATA_PATH = process.env.GITHUB_DATA_FILE_PATH ?? "public/data/software/index.json";
const ITEMS_DIR = process.env.GITHUB_SOFTWARE_ITEMS_DIR ?? "public/data/software/items";
const SKIP_INDEX_UPDATE = (process.env.GITHUB_SOFTWARE_SKIP_INDEX_UPDATE ?? "").toLowerCase() === "true";
const COMMITTER_NAME = process.env.GITHUB_COMMITTER_NAME ?? "SOFT-HUB Bot";
const COMMITTER_EMAIL = process.env.GITHUB_COMMITTER_EMAIL ?? "bot@soft-hub.local";

const API_BASE = "https://api.github.com";
const JSDELIVR_BASE = "https://cdn.jsdelivr.net/gh";

const LATEST_PAGES_DIR = process.env.GITHUB_SOFTWARE_LATEST_PAGES_DIR ?? "public/data/software/pages/latest";
const LATEST_PAGE_SIZE = Number(process.env.GITHUB_SOFTWARE_LATEST_PAGE_SIZE ?? "20") || 20;
const LATEST_CHUNK_SIZE = Number(process.env.GITHUB_SOFTWARE_LATEST_CHUNK_SIZE ?? "1000") || 1000;

export class GitHubConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubConfigError";
  }
}

type GitHubRuntimeConfig = {
  owner: string;
  repo: string;
  token: string;
  branch: string;
};

const resolveGitHubConfig = async (): Promise<GitHubRuntimeConfig> => {
  const local = await readLocalAdminConfig();
  const owner = process.env.GITHUB_DATA_REPO_OWNER ?? local.github?.owner;
  const repo = process.env.GITHUB_DATA_REPO_NAME ?? local.github?.repo;
  const token = process.env.GITHUB_CONTENT_TOKEN ?? local.github?.token;
  const branch = process.env.GITHUB_DATA_REPO_BRANCH ?? local.github?.branch ?? "main";

  const missing = [
    ["GITHUB_DATA_REPO_OWNER", owner],
    ["GITHUB_DATA_REPO_NAME", repo],
    ["GITHUB_CONTENT_TOKEN", token],
  ].filter(([, value]) => !value);

  if (missing.length) {
    throw new GitHubConfigError(
      `Missing GitHub configuration values: ${missing.map(([key]) => key).join(", ")}`,
    );
  }

  return {
    owner: owner as string,
    repo: repo as string,
    token: token as string,
    branch,
  };
};

type GitHubContentResponse = {
  content: string;
  encoding: string;
  sha: string;
};

const encodeGitHubPath = (path: string) =>
  path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

const githubFetch = async (input: string, init?: RequestInit) => {
  const { token } = await resolveGitHubConfig();

  const response = await fetch(input, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`GitHub API request failed (${response.status}): ${errorBody}`);
  }

  return response.json();
};

const githubFetchRaw = async (input: string, init?: RequestInit) => {
  const { token } = await resolveGitHubConfig();

  return fetch(input, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
};

const deleteFileFromGitHub = async (params: { path: string; message: string }) => {
  const config = await resolveGitHubConfig();
  const sha = await tryGetContentSha(params.path, config);
  if (!sha) return;
  const url = getContentUrl(params.path, config);

  await githubFetch(url, {
    method: "DELETE",
    body: JSON.stringify({
      message: params.message,
      sha,
      branch: config.branch,
      committer: {
        name: COMMITTER_NAME,
        email: COMMITTER_EMAIL,
      },
    }),
  });
};

const getContentUrl = (path: string, config: GitHubRuntimeConfig) =>
  `${API_BASE}/repos/${config.owner}/${config.repo}/contents/${encodeGitHubPath(path)}`;

const tryGetContentSha = async (path: string, config: GitHubRuntimeConfig): Promise<string | null> => {
  const response = await githubFetchRaw(getContentUrl(path, config));
  if (response.status === 404) return null;
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`GitHub API request failed (${response.status}): ${errorBody}`);
  }

  const payload = (await response.json()) as Partial<GitHubContentResponse>;
  return typeof payload.sha === "string" && payload.sha ? payload.sha : null;
};

const upsertTextFileToGitHub = async (params: {
  path: string;
  text: string;
  message: string;
}) => {
  const config = await resolveGitHubConfig();
  const sha = await tryGetContentSha(params.path, config);
  const url = getContentUrl(params.path, config);
  const content = Buffer.from(params.text).toString("base64");

  await githubFetch(url, {
    method: "PUT",
    body: JSON.stringify({
      message: params.message,
      content,
      sha: sha ?? undefined,
      branch: config.branch,
      committer: {
        name: COMMITTER_NAME,
        email: COMMITTER_EMAIL,
      },
    }),
  });
};

const decodeContent = (payload: GitHubContentResponse) => {
  if (payload.encoding !== "base64") {
    throw new Error(`Unsupported encoding for GitHub content: ${payload.encoding}`);
  }

  const buffer = Buffer.from(payload.content, "base64");
  return buffer.toString("utf-8");
};

const getFileUrl = (path: string, config: GitHubRuntimeConfig) =>
  `${API_BASE}/repos/${config.owner}/${config.repo}/contents/${encodeGitHubPath(path)}?ref=${config.branch}`;

const createEmptyDatasetOnGitHub = async () => {
  const config = await resolveGitHubConfig();
  const url = getFileUrl(DATA_PATH, config);
  const content = Buffer.from(JSON.stringify([], null, 2)).toString("base64");

  const payload = (await githubFetch(url, {
    method: "PUT",
    body: JSON.stringify({
      message: "Initialize software dataset",
      content,
      branch: config.branch,
      committer: {
        name: COMMITTER_NAME,
        email: COMMITTER_EMAIL,
      },
    }),
  })) as { content?: { sha?: string } };

  const sha = payload?.content?.sha;
  if (!sha) {
    throw new Error("Failed to initialize software dataset on GitHub");
  }

  invalidateStaticSoftwareCache();
  return { items: [] as Software[], sha };
};

export const fetchSoftwareDatasetFromGitHub = async (): Promise<{ items: Software[]; sha: string }> => {
  const config = await resolveGitHubConfig();
  const url = getFileUrl(DATA_PATH, config);
  const response = await githubFetchRaw(url);

  if (response.status === 404) {
    return createEmptyDatasetOnGitHub();
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`GitHub API request failed (${response.status}): ${errorBody}`);
  }

  const payload = (await response.json()) as GitHubContentResponse;
  const raw = decodeContent(payload);
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("Software dataset on GitHub is not an array");
  }

  return {
    items: parsed as Software[],
    sha: payload.sha,
  };
};

const buildCommitMessage = (action: string, slug?: string) => {
  const scope = slug ? ` ${slug}` : "";
  return `${action}${scope}`.trim();
};

type WriteDatasetOptions = {
  items: Software[];
  sha: string;
  action: string;
  slug?: string;
};

const writeDatasetToGitHub = async ({ items, sha, action, slug }: WriteDatasetOptions) => {
  const config = await resolveGitHubConfig();
  const url = getFileUrl(DATA_PATH, config);
  const content = Buffer.from(JSON.stringify(items, null, 2)).toString("base64");
  const message = buildCommitMessage(action, slug);

  await githubFetch(url, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content,
      sha,
      branch: config.branch,
      committer: {
        name: COMMITTER_NAME,
        email: COMMITTER_EMAIL,
      },
    }),
  });

  invalidateStaticSoftwareCache();
};

const getItemPath = (slug: string) => `${ITEMS_DIR}/${slug}.json`;

const saveSoftwareItemToGitHub = async (software: Software) => {
  await upsertTextFileToGitHub({
    path: getItemPath(software.slug),
    text: JSON.stringify(software, null, 2),
    message: buildCommitMessage("chore: upsert software item", software.slug),
  });
};

const deleteSoftwareItemFromGitHub = async (slug: string) => {
  await deleteFileFromGitHub({
    path: getItemPath(slug),
    message: buildCommitMessage("chore: remove software item", slug),
  });
};

type UpsertResult = {
  updated: Software;
  items: Software[];
};

const upsertSoftware = (items: Software[], payload: Software): UpsertResult => {
  const index = items.findIndex((item) => item.slug === payload.slug);

  if (index === -1) {
    return {
      updated: payload,
      items: [...items, payload],
    };
  }

  const next = [...items];
  next[index] = payload;

  return {
    updated: payload,
    items: next,
  };
};

type RemoveResult = {
  removed: Software | null;
  items: Software[];
};

const removeSoftware = (items: Software[], slug: string): RemoveResult => {
  const existing = items.find((item) => item.slug === slug) ?? null;

  if (!existing) {
    return { removed: null, items };
  }

  return {
    removed: existing,
    items: items.filter((item) => item.slug !== slug),
  };
};

export const saveSoftwareToGitHub = async (software: Software) => {
  await saveSoftwareItemToGitHub(software);

  if (!SKIP_INDEX_UPDATE) {
    const { items, sha } = await fetchSoftwareDatasetFromGitHub();
    const { items: updatedItems } = upsertSoftware(items, software);

    await writeDatasetToGitHub({
      items: updatedItems,
      sha,
      action: "chore: sync software",
      slug: software.slug,
    });
  }

  return software;
};

export const deleteSoftwareFromGitHub = async (slug: string) => {
  await deleteSoftwareItemFromGitHub(slug);

  if (SKIP_INDEX_UPDATE) {
    return null;
  }

  const { items, sha } = await fetchSoftwareDatasetFromGitHub();
  const { items: updatedItems, removed } = removeSoftware(items, slug);

  if (!removed) {
    throw new Error(`Software with slug "${slug}" not found`);
  }

  await writeDatasetToGitHub({
    items: updatedItems,
    sha,
    action: "chore: remove software",
    slug,
  });

  return removed;
};

type LatestPagesMeta = {
  generatedAt: string;
  perPage: number;
  chunkSize: number;
  total: number;
  chunks: number;
};

const sortLatest = (items: Software[]) =>
  [...items].sort(
    (a, b) => new Date(b.releaseDate ?? 0).getTime() - new Date(a.releaseDate ?? 0).getTime(),
  );

const chunk = <T,>(items: T[], size: number) => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
};

const toIsoDateString = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) return new Date().toISOString();
  // Accept either ISO or YYYY-MM-DD.
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    // Ensure we still output ISO to keep UI consistent.
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  return new Date().toISOString();
};

const normalizeSupabaseSoftwareRow = (row: Record<string, unknown>): Software => {
  const slug = typeof row.slug === "string" ? row.slug : "";
  const releaseDateRaw = row.release_date;
  const updatedAtRaw = row.updated_at;
  const createdAtRaw = row.created_at;

  const releaseDate = toIsoDateString(
    typeof releaseDateRaw === "string" && releaseDateRaw.trim() ? releaseDateRaw : undefined,
  );

  return {
    id: typeof row.id === "string" ? row.id : slug,
    slug,
    name: typeof row.name === "string" ? row.name : slug,
    summary: typeof row.summary === "string" ? row.summary : "",
    description: typeof row.description === "string" ? row.description : "",
    version: typeof row.version === "string" ? row.version : "1.0.0",
    sizeInBytes: Number(row.size_in_bytes ?? 0) || 0,
    platforms: Array.isArray(row.platforms) ? (row.platforms as Software["platforms"]) : ["windows"],
    categories: Array.isArray(row.categories) ? (row.categories as Software["categories"]) : ["software"],
    type: typeof row.type === "string" ? (row.type as Software["type"]) : "standard",
    websiteUrl: typeof row.website_url === "string" && row.website_url.trim() ? row.website_url : null,
    downloadUrl: typeof row.download_url === "string" ? row.download_url : "",
    isFeatured: Boolean(row.is_featured),
    isTrending: Boolean(row.is_trending),
    releaseDate,
    updatedAt: toIsoDateString(updatedAtRaw),
    createdAt: toIsoDateString(createdAtRaw),
    stats:
      row.stats && typeof row.stats === "object" && !Array.isArray(row.stats)
        ? (row.stats as Software["stats"])
        : { downloads: 0, views: 0, rating: 0, votes: 0 },
    developer:
      row.developer && typeof row.developer === "object" && !Array.isArray(row.developer)
        ? (row.developer as Software["developer"])
        : {},
    features: Array.isArray(row.features) ? (row.features as string[]) : [],
    media:
      row.media && typeof row.media === "object" && !Array.isArray(row.media)
        ? (row.media as Software["media"])
        : { logoUrl: "", gallery: [], heroImage: "" },
    requirements:
      row.requirements && typeof row.requirements === "object" && !Array.isArray(row.requirements)
        ? (row.requirements as Software["requirements"])
        : {},
    changelog:
      Array.isArray(row.changelog)
        ? (row.changelog as Software["changelog"])
        : undefined,
  } satisfies Software;
};

const fetchSupabaseLatestTotal = async () => {
  const supabase = createSupabaseServerClient();
  const { count, error } = await supabase
    .from("software")
    .select("slug", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
};

const fetchSupabaseLatestChunk = async (from: number, to: number) => {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("software")
    .select(
      "id,slug,name,summary,description,version,size_in_bytes,platforms,categories,type,website_url,download_url,developer,features,is_featured,is_trending,release_date,stats,media,requirements,changelog,created_at,updated_at",
    )
    .order("release_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .range(from, to);
  if (error) throw error;
  return (data ?? []).map((row) => normalizeSupabaseSoftwareRow(row as Record<string, unknown>));
};

const publishLatestPagesViaSupabase = async (params: { perPage: number; chunkSize: number }) => {
  const config = await resolveGitHubConfig();
  const total = await fetchSupabaseLatestTotal();

  const chunksCount = total > 0 ? Math.ceil(total / params.chunkSize) : 0;
  const meta: LatestPagesMeta = {
    generatedAt: new Date().toISOString(),
    perPage: params.perPage,
    chunkSize: params.chunkSize,
    total,
    chunks: chunksCount,
  };

  await upsertTextFileToGitHub({
    path: `${LATEST_PAGES_DIR}/meta.json`,
    text: JSON.stringify(meta, null, 2),
    message: "chore: publish software latest pages meta",
  });

  for (let index = 0; index < chunksCount; index += 1) {
    const chunkNo = String(index + 1).padStart(4, "0");
    const path = `${LATEST_PAGES_DIR}/chunk-${chunkNo}.json`;
    const from = index * params.chunkSize;
    const to = Math.min(from + params.chunkSize - 1, Math.max(total - 1, 0));
    const items = total > 0 ? await fetchSupabaseLatestChunk(from, to) : [];
    await upsertTextFileToGitHub({
      path,
      text: JSON.stringify(items, null, 2),
      message: `chore: publish software latest chunk ${chunkNo}`,
    });
  }

  invalidateStaticSoftwareCache();

  return {
    ok: true as const,
    perPage: params.perPage,
    total,
    pages: chunksCount,
    metaUrl: `${JSDELIVR_BASE}/${config.owner}/${config.repo}@${config.branch}/${LATEST_PAGES_DIR}/meta.json`,
  };
};

export const publishLatestSoftwarePagesToGitHub = async () => {
  const config = await resolveGitHubConfig();
  const perPage = Math.min(Math.max(LATEST_PAGE_SIZE, 1), 50);
  const chunkSize = Math.min(Math.max(LATEST_CHUNK_SIZE, perPage), 5000);

  // Supabase-first (scales to 100k+ without GitHub index.json)
  try {
    return await publishLatestPagesViaSupabase({ perPage, chunkSize });
  } catch (error) {
    // Fall back to GitHub index dataset to avoid breaking publish in partially configured envs.
    if (process.env.NODE_ENV !== "production") {
      console.warn("Supabase latest publish failed; falling back to GitHub dataset", error);
    }
  }

  const { items } = await fetchSoftwareDatasetFromGitHub();

  const sorted = sortLatest(items);
  const chunks = chunk(sorted, chunkSize);

  const meta: LatestPagesMeta = {
    generatedAt: new Date().toISOString(),
    perPage,
    chunkSize,
    total: sorted.length,
    chunks: chunks.length,
  };

  await upsertTextFileToGitHub({
    path: `${LATEST_PAGES_DIR}/meta.json`,
    text: JSON.stringify(meta, null, 2),
    message: "chore: publish software latest pages meta",
  });

  // Upload each chunk (best effort). 1-indexed chunk names.
  for (let index = 0; index < chunks.length; index += 1) {
    const chunkNo = String(index + 1).padStart(4, "0");
    const path = `${LATEST_PAGES_DIR}/chunk-${chunkNo}.json`;
    await upsertTextFileToGitHub({
      path,
      text: JSON.stringify(chunks[index], null, 2),
      message: `chore: publish software latest chunk ${chunkNo}`,
    });
  }

  invalidateStaticSoftwareCache();

  return {
    ok: true as const,
    perPage,
    total: sorted.length,
    // Backward compatible field name (used by the publish endpoint UI)
    pages: chunks.length,
    metaUrl: `${JSDELIVR_BASE}/${config.owner}/${config.repo}@${config.branch}/${LATEST_PAGES_DIR}/meta.json`,
  };
};

const guessExtension = (mime: string) => {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "bin";
};

export const uploadImageAssetToGitHub = async (params: {
  bytes: Uint8Array;
  mime: string;
  type: "logo" | "hero" | "screenshot";
  filenameBase?: string;
}) => {
  const config = await resolveGitHubConfig();
  const ext = guessExtension(params.mime);
  const safeBase = (params.filenameBase ?? "asset").replace(/[^a-z0-9_-]/gi, "-");
  const path = `public/assets/admin/${params.type}/${safeBase}-${Date.now()}.${ext}`;
  const url = `${API_BASE}/repos/${config.owner}/${config.repo}/contents/${encodeGitHubPath(path)}`;
  const content = Buffer.from(params.bytes).toString("base64");

  await githubFetch(url, {
    method: "PUT",
    body: JSON.stringify({
      message: `chore: upload ${params.type} asset`,
      content,
      branch: config.branch,
      committer: {
        name: COMMITTER_NAME,
        email: COMMITTER_EMAIL,
      },
    }),
  });

  return {
    path,
    url: `${JSDELIVR_BASE}/${config.owner}/${config.repo}@${config.branch}/${path}`,
  };
};
