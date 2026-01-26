import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import { Client } from "pg";

const envPath = resolve(process.cwd(), ".env.local");

if (!existsSync(envPath)) {
  console.error("❌ ملف .env.local غير موجود. أضف بيانات Supabase DB أولاً.");
  process.exit(1);
}

const env = readFileSync(envPath, "utf-8")
  .split(/\r?\n/)
  .reduce((acc, line) => {
    if (!line || line.trim().startsWith("#")) return acc;
    const [key, ...rest] = line.split("=");
    if (!key) return acc;
    acc[key.trim()] = rest.join("=").trim();
    return acc;
  }, {});

const host = env.SUPABASE_DB_HOST;
const database = env.SUPABASE_DB_NAME ?? "postgres";
const user = env.SUPABASE_DB_USER ?? "postgres";
const password = env.SUPABASE_DB_PASSWORD;

if (!host || !password) {
  console.error(
    "❌ قيم قاعدة البيانات غير متوفرة. حدّث .env.local بالقيم SUPABASE_DB_HOST و SUPABASE_DB_PASSWORD (واختياريًا SUPABASE_DB_USER و SUPABASE_DB_NAME).",
  );
  process.exit(1);
}

const connectionString = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:5432/${encodeURIComponent(database)}`;

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

const migrations = [
  resolve(process.cwd(), "supabase", "migrations", "005_admin_config.sql"),
  resolve(process.cwd(), "supabase", "migrations", "002_analytics.sql"),
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
    console.error("\n❌ Failed to apply migrations:", error?.message ?? error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
