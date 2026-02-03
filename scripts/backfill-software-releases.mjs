import fs from "node:fs";
import path from "node:path";

import pg from "pg";

const { Client } = pg;

const stripQuotes = (value) => value.replace(/^['"]|['"]$/g, "");

const loadDotEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const out = {};
  const raw = fs.readFileSync(filePath, "utf-8");
  for (const lineRaw of raw.split(/\r?\n/)) {
    const line = lineRaw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) {
      continue;
    }
    const [key, ...rest] = line.split("=");
    const value = rest.join("=").trim();
    out[key.trim()] = stripQuotes(value);
  }
  return out;
};

const envFileValues = loadDotEnvFile(path.resolve(process.cwd(), ".env.local"));
const pick = (key) => process.env[key] ?? envFileValues[key];

const host = pick("SUPABASE_DB_HOST");
const port = Number(pick("SUPABASE_DB_PORT") || "5432");
const user = pick("SUPABASE_DB_USER");
const database = pick("SUPABASE_DB_NAME") || "postgres";
const password = pick("SUPABASE_DB_PASSWORD") || pick("SUPABASE_DB_PASS");

if (!host || !user || !database || !password || !port) {
  throw new Error(
    "Missing DB connection vars. Ensure .env.local contains SUPABASE_DB_HOST, SUPABASE_DB_PORT, SUPABASE_DB_USER, SUPABASE_DB_NAME, SUPABASE_DB_PASSWORD.",
  );
}

const client = new Client({
  host,
  port,
  user,
  password,
  database,
  ssl: { rejectUnauthorized: false, servername: host },
});

const main = async () => {
  await client.connect();

  // Insert a release row for each software record if it doesn't already exist.
  // Uses the unique index (software_id, version) to avoid duplicates.
  const insertSql = `
    insert into public.software_releases
      (software_id, version, file_name, additional_info, download_url, size_in_bytes, release_date, downloads_count)
    select
      s.id,
      s.version,
      (s.name || ' ' || s.version) as file_name,
      null as additional_info,
      s.download_url,
      s.size_in_bytes,
      s.release_date,
      0 as downloads_count
    from public.software s
    where s.download_url is not null
    on conflict (software_id, version) do nothing;
  `;

  const res = await client.query(insertSql);

  const countRes = await client.query(
    "select count(*)::bigint as releases_count from public.software_releases",
  );

  process.stdout.write(
    `Inserted releases rows (may be 0 if already exists): ${res.rowCount}\nTotal releases rows now: ${countRes.rows[0].releases_count}\n`,
  );

  await client.end();
};

main().catch((err) => {
  process.stderr.write(`${err?.stack || err?.message || String(err)}\n`);
  process.exitCode = 1;
  client.end().catch(() => {});
});
