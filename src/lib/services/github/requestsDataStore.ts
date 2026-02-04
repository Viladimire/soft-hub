import { Buffer } from "node:buffer";

import type { SoftwareRequest } from "@/lib/types/software-request";
import { readLocalAdminConfig } from "@/lib/services/local-admin-config";

const BRANCH = process.env.GITHUB_DATA_REPO_BRANCH ?? "main";
const DATA_PATH = process.env.GITHUB_REQUESTS_FILE_PATH ?? "public/data/requests/index.json";
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
  const branch = process.env.GITHUB_DATA_REPO_BRANCH ?? local.github?.branch ?? BRANCH;

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

const buildCommitMessage = (action: string, id?: string) => {
  const scope = id ? ` ${id}` : "";
  return `${action}${scope}`.trim();
};

type WriteDatasetOptions = {
  items: SoftwareRequest[];
  sha: string;
  action: string;
  id?: string;
};

const writeDatasetToGitHub = async ({ items, sha, action, id }: WriteDatasetOptions) => {
  const config = await resolveGitHubConfig();
  const url = getFileUrl(DATA_PATH, config);
  const content = Buffer.from(JSON.stringify(items, null, 2)).toString("base64");
  const message = buildCommitMessage(action, id);

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
};

const createEmptyDatasetOnGitHub = async () => {
  const config = await resolveGitHubConfig();
  const url = getFileUrl(DATA_PATH, config);
  const content = Buffer.from(JSON.stringify([], null, 2)).toString("base64");

  const payload = (await githubFetch(url, {
    method: "PUT",
    body: JSON.stringify({
      message: "Initialize requests dataset",
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
    throw new Error("Failed to initialize requests dataset on GitHub");
  }

  return { items: [] as SoftwareRequest[], sha };
};

export const fetchRequestsDatasetFromGitHub = async (): Promise<{ items: SoftwareRequest[]; sha: string }> => {
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
    throw new Error("Requests dataset on GitHub is not an array");
  }

  return {
    items: parsed as SoftwareRequest[],
    sha: payload.sha,
  };
};

const upsertRequest = (items: SoftwareRequest[], payload: SoftwareRequest) => {
  const index = items.findIndex((item) => item.id === payload.id);
  if (index === -1) {
    return { updated: payload, items: [payload, ...items] };
  }

  const next = [...items];
  next[index] = payload;
  return { updated: payload, items: next };
};

export const saveRequestToGitHub = async (request: SoftwareRequest) => {
  const dataset = await fetchRequestsDatasetFromGitHub();
  const { items, sha } = dataset;
  const { updated, items: next } = upsertRequest(items, request);
  await writeDatasetToGitHub({ items: next, sha, action: "Upsert request", id: updated.id });
  return updated;
};

export const deleteRequestFromGitHub = async (id: string) => {
  const dataset = await fetchRequestsDatasetFromGitHub();
  const { items, sha } = dataset;
  const existing = items.find((item) => item.id === id) ?? null;
  const next = items.filter((item) => item.id !== id);
  await writeDatasetToGitHub({ items: next, sha, action: "Delete request", id });
  return existing;
};
