import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.BASE_URL || "https://soft-hub-alpha.vercel.app";
const ADMIN_API_SECRET = process.env.ADMIN_API_SECRET || "";
const SCRAPE_URL = process.env.SCRAPE_URL || "";
const UPLOAD_FILE = process.env.UPLOAD_FILE || "";

const requireEnv = (name, value) => {
  if (!value) {
    throw new Error(`Missing env: ${name}`);
  }
  return value;
};

const authHeaders = () => {
  const secret = requireEnv("ADMIN_API_SECRET", ADMIN_API_SECRET);
  return {
    authorization: `Bearer ${secret}`,
  };
};

const safeJson = async (res) => {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

const postJson = async (pathname, body) => {
  const url = new URL(pathname, BASE_URL).toString();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await safeJson(res);

  return {
    url,
    status: res.status,
    ok: res.ok,
    json,
  };
};

const extToMime = (ext) => {
  const e = ext.toLowerCase();
  if (e === ".png") return "image/png";
  if (e === ".jpg" || e === ".jpeg") return "image/jpeg";
  if (e === ".webp") return "image/webp";
  return "application/octet-stream";
};

const postUpload = async (filePath, type) => {
  const url = new URL("/api/admin/upload", BASE_URL).toString();
  const abs = path.resolve(filePath);
  const filename = path.basename(abs);
  const mime = extToMime(path.extname(filename));

  const bytes = await fs.promises.readFile(abs);
  const blob = new Blob([bytes], { type: mime });

  const form = new FormData();
  form.append("file", blob, filename);
  form.append("type", type);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...authHeaders(),
    },
    body: form,
  });

  const json = await safeJson(res);

  return {
    url,
    status: res.status,
    ok: res.ok,
    json,
  };
};

const printResult = (title, result) => {
  console.log("\n====", title, "====");
  console.log("url:", result.url);
  console.log("status:", result.status, "ok:", result.ok);
  console.log("response:", JSON.stringify(result.json, null, 2));
};

const main = async () => {
  console.log("BASE_URL:", BASE_URL);

  const autofill = await postJson("/api/admin/auto-fill", {
    name: "CapCut",
    version: "",
  });
  printResult("AUTO-FILL", autofill);

  if (SCRAPE_URL) {
    const scrape = await postJson("/api/admin/scrape", { url: SCRAPE_URL });
    printResult("SCRAPE", scrape);
  } else {
    console.log("\n==== SCRAPE ====\nSKIPPED (SCRAPE_URL not set)");
  }

  if (UPLOAD_FILE) {
    const upload = await postUpload(UPLOAD_FILE, "logo");
    printResult("UPLOAD", upload);
  } else {
    console.log("\n==== UPLOAD ====\nSKIPPED (UPLOAD_FILE not set)");
  }
};

main().catch((err) => {
  console.error("\nSmoke test failed:", err?.message || err);
  process.exitCode = 1;
});
