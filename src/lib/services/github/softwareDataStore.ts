import { Buffer } from "node:buffer";

import type { Software } from "@/lib/types/software";
import { invalidateStaticSoftwareCache } from "@/lib/services/staticSoftwareRepository";
import { readLocalAdminConfig } from "@/lib/services/local-admin-config";

const DATA_PATH = process.env.GITHUB_DATA_FILE_PATH ?? "public/data/software/index.json";
const COMMITTER_NAME = process.env.GITHUB_COMMITTER_NAME ?? "SOFT-HUB Bot";
const COMMITTER_EMAIL = process.env.GITHUB_COMMITTER_EMAIL ?? "bot@soft-hub.local";

const API_BASE = "https://api.github.com";
const JSDELIVR_BASE = "https://cdn.jsdelivr.net/gh";

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

const decodeContent = (payload: GitHubContentResponse) => {
  if (payload.encoding !== "base64") {
    throw new Error(`Unsupported encoding for GitHub content: ${payload.encoding}`);
  }

  const buffer = Buffer.from(payload.content, "base64");
  return buffer.toString("utf-8");
};

const getFileUrl = (path: string, config: GitHubRuntimeConfig) =>
  `${API_BASE}/repos/${config.owner}/${config.repo}/contents/${encodeGitHubPath(path)}?ref=${config.branch}`;

export const fetchSoftwareDatasetFromGitHub = async (): Promise<{ items: Software[]; sha: string }> => {
  const config = await resolveGitHubConfig();
  const payload = (await githubFetch(getFileUrl(DATA_PATH, config))) as GitHubContentResponse;
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
  const { items, sha } = await fetchSoftwareDatasetFromGitHub();
  const { items: updatedItems } = upsertSoftware(items, software);

  await writeDatasetToGitHub({
    items: updatedItems,
    sha,
    action: "chore: sync software",
    slug: software.slug,
  });

  return software;
};

export const deleteSoftwareFromGitHub = async (slug: string) => {
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
