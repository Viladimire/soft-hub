import { Buffer } from "node:buffer";

import type { Software } from "@/lib/types/software";
import { invalidateStaticSoftwareCache } from "@/lib/services/staticSoftwareRepository";

const OWNER = process.env.GITHUB_DATA_REPO_OWNER;
const REPO = process.env.GITHUB_DATA_REPO_NAME;
const TOKEN = process.env.GITHUB_CONTENT_TOKEN;
const BRANCH = process.env.GITHUB_DATA_REPO_BRANCH ?? "main";
const DATA_PATH = process.env.GITHUB_DATA_FILE_PATH ?? "public/data/software/index.json";
const COMMITTER_NAME = process.env.GITHUB_COMMITTER_NAME ?? "SOFT-HUB Bot";
const COMMITTER_EMAIL = process.env.GITHUB_COMMITTER_EMAIL ?? "bot@soft-hub.local";

const API_BASE = "https://api.github.com";

export class GitHubConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubConfigError";
  }
}

const assertConfig = () => {
  const missing = [
    ["GITHUB_DATA_REPO_OWNER", OWNER],
    ["GITHUB_DATA_REPO_NAME", REPO],
    ["GITHUB_CONTENT_TOKEN", TOKEN],
  ].filter(([, value]) => !value);

  if (missing.length) {
    throw new GitHubConfigError(
      `Missing GitHub configuration values: ${missing.map(([key]) => key).join(", ")}`,
    );
  }
};

type GitHubContentResponse = {
  content: string;
  encoding: string;
  sha: string;
};

const githubFetch = async (input: string, init?: RequestInit) => {
  assertConfig();

  const response = await fetch(input, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${TOKEN}`,
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

const getFileUrl = (path: string) =>
  `${API_BASE}/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}?ref=${BRANCH}`;

export const fetchSoftwareDatasetFromGitHub = async (): Promise<{ items: Software[]; sha: string }> => {
  const payload = (await githubFetch(getFileUrl(DATA_PATH))) as GitHubContentResponse;
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
  const url = getFileUrl(DATA_PATH);
  const content = Buffer.from(JSON.stringify(items, null, 2)).toString("base64");
  const message = buildCommitMessage(action, slug);

  await githubFetch(url, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content,
      sha,
      branch: BRANCH,
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
