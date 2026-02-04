import { Buffer } from "node:buffer";

import type { Collection } from "@/lib/types/collection";
import { invalidateStaticCollectionsCache } from "@/lib/services/staticCollectionsRepository";
import { readLocalAdminConfig } from "@/lib/services/local-admin-config";

const DATA_PATH = process.env.GITHUB_COLLECTIONS_FILE_PATH ?? "public/data/collections/index.json";
const COMMITTER_NAME = process.env.GITHUB_COMMITTER_NAME ?? "SOFT-HUB Bot";
const COMMITTER_EMAIL = process.env.GITHUB_COMMITTER_EMAIL ?? "bot@soft-hub.local";

const API_BASE = "https://api.github.com";

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
      message: "Initialize collections dataset",
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
    throw new Error("Failed to initialize collections dataset on GitHub");
  }

  return { items: [] as Collection[], sha };
};

const buildCommitMessage = (action: string, slug?: string) => {
  const scope = slug ? ` ${slug}` : "";
  return `${action}${scope}`.trim();
};

type WriteDatasetOptions = {
  items: Collection[];
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

  invalidateStaticCollectionsCache();
};

type RemoveResult = {
  removed: Collection | null;
  items: Collection[];
};

const stripCollectionForStorage = (collection: Collection): Collection => ({
  ...collection,
  items: collection.items.map((item) => ({
    collectionId: collection.id,
    softwareId: item.softwareId,
    softwareSlug: item.softwareSlug,
    position: item.position,
    highlight: item.highlight ?? null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  })),
});

const upsertCollection = (items: Collection[], payload: Collection) => {
  const sanitized = stripCollectionForStorage(payload);
  const index = items.findIndex((item) => item.slug === sanitized.slug);

  if (index === -1) {
    return {
      updated: sanitized,
      items: [...items, sanitized],
    };
  }

  const next = [...items];
  next[index] = sanitized;

  return {
    updated: sanitized,
    items: next,
  };
};

const removeCollection = (items: Collection[], slug: string): RemoveResult => {
  const existing = items.find((item) => item.slug === slug) ?? null;

  if (!existing) {
    return { removed: null, items };
  }

  return {
    removed: existing,
    items: items.filter((item) => item.slug !== slug),
  };
};

export const fetchCollectionsDatasetFromGitHub = async (): Promise<{ items: Collection[]; sha: string }> => {
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
    throw new Error("Collections dataset on GitHub is not an array");
  }

  return {
    items: parsed as Collection[],
    sha: payload.sha,
  };
};

export const saveCollectionToGitHub = async (collection: Collection) => {
  const { items, sha } = await fetchCollectionsDatasetFromGitHub();
  const { items: updatedItems, updated } = upsertCollection(items, collection);

  await writeDatasetToGitHub({
    items: updatedItems,
    sha,
    action: "chore: sync collection",
    slug: collection.slug,
  });

  return updated;
};

export const deleteCollectionFromGitHub = async (slug: string) => {
  const { items, sha } = await fetchCollectionsDatasetFromGitHub();
  const { items: updatedItems, removed } = removeCollection(items, slug);

  if (!removed) {
    throw new Error(`Collection with slug "${slug}" not found`);
  }

  await writeDatasetToGitHub({
    items: updatedItems,
    sha,
    action: "chore: remove collection",
    slug,
  });

  return removed;
};
