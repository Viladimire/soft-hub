import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import readline from "node:readline";

import { Client } from "pg";

const envPath = resolve(process.cwd(), ".env.local");
const localAdminConfigPath = resolve(process.cwd(), ".local", "soft-hub-admin-config.json");

const parseEnvFile = (path) => {
  if (!existsSync(path)) return {};
  return readFileSync(path, "utf-8")
    .split(/\r?\n/)
    .reduce((acc, line) => {
      if (!line || line.trim().startsWith("#")) return acc;
      const [key, ...rest] = line.split("=");
      if (!key) return acc;

      const rawValue = rest.join("=").trim();
      const unquoted =
        (rawValue.startsWith('"') && rawValue.endsWith('"')) || (rawValue.startsWith("'") && rawValue.endsWith("'"))
          ? rawValue.slice(1, -1)
          : rawValue;

      acc[key.trim()] = unquoted.split(/\s+/)[0]?.trim() ?? "";
      return acc;
    }, {});
};

const readMergedLocalAdminConfig = () => {
  if (!existsSync(localAdminConfigPath)) return {};
  const raw = readFileSync(localAdminConfigPath, "utf-8");

  // Support accidental multiple JSON objects appended in same file.
  const objects = [];
  let depth = 0;
  let start = -1;

  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (ch === "{") {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        const chunk = raw.slice(start, i + 1);
        try {
          objects.push(JSON.parse(chunk));
        } catch {
          // ignore
        }
        start = -1;
      }
    }
  }

  const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
  const deepMerge = (base, extra) => {
    if (!isObject(base) || !isObject(extra)) return base;
    const out = { ...base };
    for (const key of Object.keys(extra)) {
      const nextVal = extra[key];
      if (isObject(out[key]) && isObject(nextVal)) {
        out[key] = deepMerge(out[key], nextVal);
      } else if (typeof nextVal !== "undefined") {
        out[key] = nextVal;
      }
    }
    return out;
  };

  return objects.reduce((acc, obj) => deepMerge(acc, obj), {});
};

const inferDbHostFromUrl = (url) => {
  if (typeof url !== "string" || !url) return "";
  try {
    const u = new URL(url);
    const hostname = u.hostname;
    const match = hostname.match(/^([a-z0-9-]+)\.supabase\.co$/i);
    if (!match) return "";
    return `db.${match[1]}.supabase.co`;
  } catch {
    return "";
  }
};

const prompt = async (question) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await new Promise((resolve) => rl.question(question, resolve));
    return String(answer ?? "").trim();
  } finally {
    rl.close();
  }
};

const safeReadSql = (relativePath) => {
  const p = resolve(process.cwd(), relativePath);
  if (!existsSync(p)) return "";
  return readFileSync(p, "utf-8");
};

const applyMigration = async (client, filePath) => {
  const sql = safeReadSql(filePath);
  if (!sql) {
    throw new Error(`Migration file not found or empty: ${filePath}`);
  }

  console.log(`\n🔧 Applying: ${filePath}`);
  await client.query("begin");
  try {
    await client.query("set search_path to public");
    await client.query(sql);
    await client.query("commit");
    console.log("✅ Done");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
};

(async () => {
  const env = parseEnvFile(envPath);
  const cfg = readMergedLocalAdminConfig();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || cfg?.supabase?.url;

  let host = env.SUPABASE_DB_HOST || cfg?.supabase?.dbHost || inferDbHostFromUrl(supabaseUrl);
  let portRaw = env.SUPABASE_DB_PORT || cfg?.supabase?.dbPort;
  let port = typeof portRaw === "string" && portRaw.trim() ? Number(portRaw.trim()) : 5432;

  const user = env.SUPABASE_DB_USER || "postgres";
  const database = env.SUPABASE_DB_NAME || "postgres";
  const password = env.SUPABASE_DB_PASSWORD || cfg?.supabase?.dbPassword;

  if (!password) {
    console.error(
      "❌ dbPassword غير موجود. ضيف SUPABASE_DB_PASSWORD في .env.local أو ضيف supabase.dbPassword في .local/soft-hub-admin-config.json",
    );
    process.exit(1);
  }

  if (!host || host.includes(".supabase.co")) {
    console.log(
      "\n⚠️ الـ DB Host الحالي غالبًا Direct connection (db.<ref>.supabase.co) وقد يفشل على IPv4/DNS. الأفضل تستخدم Pooler host من Supabase Dashboard.",
    );
  }

  if (!cfg?.supabase?.dbHost && !env.SUPABASE_DB_HOST) {
    const answer = await prompt(
      "\nاكتب SUPABASE_DB_HOST (Pooler host اللي فيه .pooler.supabase.com) أو اضغط Enter للمحاولة بالقيمة الحالية: ",
    );
    if (answer) host = answer;
  }

  if (!env.SUPABASE_DB_PORT && !cfg?.supabase?.dbPort) {
    const answer = await prompt("\nاكتب SUPABASE_DB_PORT (مثلاً 6543 أو 5432) أو اضغط Enter لافتراضي 5432: ");
    if (answer) port = Number(answer);
  }

  if (!host) {
    console.error("❌ SUPABASE_DB_HOST غير متوفر.");
    process.exit(1);
  }
  if (Number.isNaN(port) || port <= 0) {
    console.error("❌ SUPABASE_DB_PORT غير صالح.");
    process.exit(1);
  }

  const connectionString = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("\n== Applying Supabase migrations ==\n");
    await client.connect();

    await applyMigration(client, "supabase/migrations/005_admin_config.sql");
    await applyMigration(client, "supabase/migrations/002_analytics.sql");
    await applyMigration(client, "supabase/migrations/007_software_columns_fix.sql");
    await applyMigration(client, "supabase/migrations/008_software_missing_columns_fix.sql");

    console.log("\n✅ All requested migrations applied.");
    console.log("\nشغّل بعد كده للتحقق:\n  node scripts/verify-supabase-setup.mjs\n");
  } catch (error) {
    const message = error?.message ?? String(error);
    if (String(message).includes("getaddrinfo") || String(message).includes("ENOTFOUND") || String(message).includes("ENOENT")) {
      console.error(
        "\n❌ فشل DNS/Host. لازم تستخدم Pooler host/port من Supabase Dashboard (Connect → Pooler → View parameters).",
      );
      console.error("\nDetails:", message);
      process.exitCode = 1;
      return;
    }

    console.error("\n❌ Failed to apply migrations:", message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
