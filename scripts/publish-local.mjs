import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, ".local", "soft-hub-admin-config.json");

const SOFTWARE_PATH = process.env.GITHUB_DATA_FILE_PATH ?? "public/data/software/index.json";
const COLLECTIONS_PATH = process.env.GITHUB_COLLECTIONS_FILE_PATH ?? "public/data/collections/index.json";
const REQUESTS_PATH = process.env.GITHUB_REQUESTS_FILE_PATH ?? "public/data/requests/index.json";

const die = (message) => {
  console.error(message);
  process.exit(1);
};

const safeMask = (value) => {
  if (!value) return "";
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
};

const loadConfig = async () => {
  const raw = await readFile(CONFIG_PATH, "utf8");
  return JSON.parse(raw);
};

const githubRequest = async ({ token, url, method = "GET", body }) => {
  const res = await fetch(url, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }

  return { ok: res.ok, status: res.status, json };
};

const getContentsUrl = ({ owner, repo, branch, filePath }) => {
  const encoded = encodeURIComponent(filePath);
  return `https://api.github.com/repos/${owner}/${repo}/contents/${encoded}?ref=${encodeURIComponent(branch)}`;
};

const ensureDatasetFile = async ({ owner, repo, branch, token, filePath }) => {
  const url = getContentsUrl({ owner, repo, branch, filePath });
  const read = await githubRequest({ token, url });

  if (read.ok) return { created: false };

  if (read.status !== 404) {
    throw new Error(`GitHub read failed (${read.status}) for ${filePath}: ${typeof read.json === "string" ? read.json : JSON.stringify(read.json)}`);
  }

  const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`;
  const content = Buffer.from(JSON.stringify([], null, 2)).toString("base64");

  const write = await githubRequest({
    token,
    url: putUrl,
    method: "PUT",
    body: {
      message: `chore: init dataset ${filePath}`,
      content,
      branch,
      committer: { name: "SOFT-HUB Bot", email: "bot@soft-hub.local" },
    },
  });

  if (!write.ok) {
    throw new Error(`GitHub write failed (${write.status}) for ${filePath}: ${typeof write.json === "string" ? write.json : JSON.stringify(write.json)}`);
  }

  return { created: true };
};

const triggerVercelDeployHook = async (deployHookUrl) => {
  const res = await fetch(deployHookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ source: "soft-hub-script", action: "publish" }),
    cache: "no-store",
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`Vercel deploy hook failed (${res.status}): ${text.slice(0, 2000)}`);
  }

  return text.slice(0, 2000);
};

const main = async () => {
  const cfg = await loadConfig().catch((e) => {
    die(`تعذر قراءة ملف الإعدادات: ${CONFIG_PATH}\n${e?.message ?? e}`);
  });

  const owner = cfg?.github?.owner;
  const repo = cfg?.github?.repo;
  const token = cfg?.github?.token;
  const branch = cfg?.github?.branch ?? "main";

  const deployHookUrl = cfg?.vercel?.deployHookUrl;

  if (!owner || !repo || !token) {
    die("GitHub config ناقص داخل ملف الإعدادات المحلي (owner/repo/token)");
  }

  console.log("Using config:");
  console.log(`- GitHub: ${owner}/${repo} (branch: ${branch}) token: ${safeMask(token)}`);
  console.log(`- Datasets: ${SOFTWARE_PATH}, ${COLLECTIONS_PATH}, ${REQUESTS_PATH}`);
  console.log(`- Vercel deploy hook: ${deployHookUrl ? "configured" : "missing"}`);

  // Validate token
  const me = await githubRequest({ token, url: "https://api.github.com/user" });
  if (!me.ok) {
    die(
      `GitHub token غير صالح (Bad credentials).\nStatus: ${me.status}\nResponse: ${typeof me.json === "string" ? me.json : JSON.stringify(me.json)}`,
    );
  }

  console.log("GitHub auth OK");

  const results = [];
  for (const filePath of [SOFTWARE_PATH, COLLECTIONS_PATH, REQUESTS_PATH]) {
    const r = await ensureDatasetFile({ owner, repo, branch, token, filePath });
    results.push({ filePath, ...r });
  }

  for (const r of results) {
    console.log(`${r.created ? "CREATED" : "OK"}: ${r.filePath}`);
  }

  if (!deployHookUrl) {
    die("VERCEL_DEPLOY_HOOK_URL غير موجود داخل الكونفج. أنشئ Deploy Hook في Vercel والصقه في Settings ثم احفظ.");
  }

  const vercelResult = await triggerVercelDeployHook(deployHookUrl);
  console.log("Vercel deploy hook triggered successfully");
  if (vercelResult) console.log(vercelResult);
};

await main();
