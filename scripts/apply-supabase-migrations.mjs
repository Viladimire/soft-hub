import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

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

      // If a user accidentally appended another KEY=VALUE on the same line, keep only the first token.
      acc[key.trim()] = unquoted.split(/\s+/)[0]?.trim() ?? "";
      return acc;
    }, {});
};

const readLocalAdminConfig = () => {
  if (!existsSync(localAdminConfigPath)) return {};
  try {
    const raw = readFileSync(localAdminConfigPath, "utf-8");

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
            // ignore invalid chunks
          }
          start = -1;
        }
      }
    }

    if (!objects.length) {
      return {};
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
  } catch {
    return {};
  }
};

const env = parseEnvFile(envPath);
const localAdminConfig = readLocalAdminConfig();

// Prefer explicit process env overrides (useful since .env.local is gitignored)
const runtimeEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_DB_HOST: process.env.SUPABASE_DB_HOST,
  SUPABASE_DB_PORT: process.env.SUPABASE_DB_PORT,
  SUPABASE_DB_USER: process.env.SUPABASE_DB_USER,
  SUPABASE_DB_NAME: process.env.SUPABASE_DB_NAME,
  SUPABASE_DB_PASSWORD: process.env.SUPABASE_DB_PASSWORD,
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

const host =
  runtimeEnv.SUPABASE_DB_HOST ||
  env.SUPABASE_DB_HOST ||
  localAdminConfig?.supabase?.dbHost ||
  inferDbHostFromUrl(runtimeEnv.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || localAdminConfig?.supabase?.url);
const portRaw = runtimeEnv.SUPABASE_DB_PORT || env.SUPABASE_DB_PORT || localAdminConfig?.supabase?.dbPort;
const port = typeof portRaw === "string" && portRaw.trim() ? Number(portRaw.trim()) : 5432;
const database = runtimeEnv.SUPABASE_DB_NAME || env.SUPABASE_DB_NAME || "postgres";
const user = runtimeEnv.SUPABASE_DB_USER || env.SUPABASE_DB_USER || "postgres";
const password = runtimeEnv.SUPABASE_DB_PASSWORD || env.SUPABASE_DB_PASSWORD || localAdminConfig?.supabase?.dbPassword;

if (!host || !password) {
  console.error(
    "❌ قيم قاعدة البيانات غير متوفرة. أضف SUPABASE_DB_PASSWORD في .env.local (أو local config: supabase.dbPassword). ويمكن تحديد SUPABASE_DB_HOST يدويًا أو سيُستنتج من NEXT_PUBLIC_SUPABASE_URL.",
  );
  process.exit(1);
}

if (Number.isNaN(port) || port <= 0) {
  console.error("❌ SUPABASE_DB_PORT غير صالح.");
  process.exit(1);
}

const connectionString = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

const migrations = [
  resolve(process.cwd(), "supabase", "migrations", "005_admin_config.sql"),
  resolve(process.cwd(), "supabase", "migrations", "006_analytics_fix.sql"),
  resolve(process.cwd(), "supabase", "migrations", "007_software_columns_fix.sql"),
  resolve(process.cwd(), "supabase", "migrations", "008_software_missing_columns_fix.sql"),
  resolve(process.cwd(), "supabase", "migrations", "010_software_releases.sql"),
];

const applyMigration = async (filePath) => {
  if (!existsSync(filePath)) {
    throw new Error(`Migration file not found: ${filePath}`);
  }

  const sql = readFileSync(filePath, "utf-8");
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
  try {
    await client.connect();
    for (const filePath of migrations) {
      await applyMigration(filePath);
    }
    console.log("\n✅ All requested migrations applied.");
  } catch (error) {
    const message = error?.message ?? String(error);
    if (String(message).includes("getaddrinfo") || String(message).includes("ENOTFOUND") || String(message).includes("ENOENT")) {
      console.error(
        "\n❌ فشل الاتصال بقاعدة البيانات (DNS/Host). غالبًا تحتاج تستخدم Database Host/Port من Supabase Dashboard (Connection string / Pooler). حدّث SUPABASE_DB_HOST و SUPABASE_DB_PORT ثم أعد تشغيل السكربت.",
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
