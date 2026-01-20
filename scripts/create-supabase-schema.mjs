import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import { Client } from "pg";

const envPath = resolve(process.cwd(), ".env.local");

if (!existsSync(envPath)) {
  console.error("❌ ملف .env.local غير موجود. قم بتشغيل setup-supabase-env.ps1 أولاً.");
  process.exit(1);
}

const env = readFileSync(envPath, "utf-8").split(/\r?\n/).reduce((acc, line) => {
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
  console.error("❌ قيم قاعدة البيانات (المضيف، كلمة المرور) غير متوفرة. حدّث .env.local بالقيم SUPABASE_DB_HOST و SUPABASE_DB_PASSWORD.");
  process.exit(1);
}

const connectionString = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:5432/${encodeURIComponent(database)}`;

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

const createTableSql = `
create table if not exists public.software (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  summary text not null,
  description text not null,
  version text not null,
  size_in_bytes bigint not null,
  platforms text[] not null default '{}',
  categories text[] not null default '{}',
  type text not null,
  website_url text,
  download_url text not null,
  is_featured boolean not null default false,
  release_date timestamptz not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  stats jsonb not null default '{}',
  media jsonb not null default '{}',
  requirements jsonb,
  changelog jsonb
);

create index if not exists idx_software_slug on public.software (slug);
create index if not exists idx_software_categories on public.software using gin (categories);
create index if not exists idx_software_platforms on public.software using gin (platforms);
create index if not exists idx_software_is_featured on public.software (is_featured);
create index if not exists idx_software_release_date on public.software (release_date desc);
`;

(async () => {
  try {
    await client.connect();
    console.log("🔧 إنشاء جدول software (إن لزم) ...");
    await client.query("set search_path to public");
    await client.query(createTableSql);
    console.log("✅ تم التأكد من وجود جدول software والفهارس المساندة.");
  } catch (error) {
    console.error("❌ فشل إنشاء المخطط:", error?.message ?? error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
