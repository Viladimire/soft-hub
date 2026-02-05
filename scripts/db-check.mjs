import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Client } = pg;

const stripQuotes = (value) => value.replace(/^['"]|['"]$/g, "");

const loadEnv = () => {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error(".env.local not found");
  }
  return fs
    .readFileSync(envPath, "utf-8")
    .split(/\r?\n/)
    .reduce((acc, lineRaw) => {
      const line = lineRaw.trim();
      if (!line || line.startsWith("#") || !line.includes("=")) return acc;
      const [key, ...rest] = line.split("=");
      acc[key.trim()] = stripQuotes(rest.join("=").trim());
      return acc;
    }, {});
};

const main = async () => {
  const env = loadEnv();

  const host = env.SUPABASE_DB_HOST;
  const port = Number(env.SUPABASE_DB_PORT || 5432);
  const user = env.SUPABASE_DB_USER;
  const database = env.SUPABASE_DB_NAME || "postgres";
  const password = env.SUPABASE_DB_PASSWORD;

  if (!host || !user || !database || !password) {
    throw new Error(
      "Missing DB env vars. Need SUPABASE_DB_HOST, SUPABASE_DB_PORT, SUPABASE_DB_USER, SUPABASE_DB_NAME, SUPABASE_DB_PASSWORD",
    );
  }

  const client = new Client({
    host,
    port,
    user,
    database,
    password,
    ssl: { rejectUnauthorized: false, servername: host },
  });

  await client.connect();

  const mustTables = [
    "software",
    "software_releases",
    "admin_config",
    "analytics_events",
    "analytics_search_events",
  ];

  const tablesRes = await client.query(
    "select table_name from information_schema.tables where table_schema='public' and table_name = any($1)",
    [mustTables],
  );

  const present = tablesRes.rows.map((r) => r.table_name);
  const missing = mustTables.filter((t) => !present.includes(t));

  const countsRes = await client.query(
    "select (select count(*) from public.software) as software_rows, (select count(*) from public.software_releases) as releases_rows",
  );

  const policiesRes = await client.query(
    "select tablename, policyname, cmd, roles from pg_policies where schemaname='public' and tablename in ('software','software_releases') order by tablename, policyname",
  );

  process.stdout.write("== DB CHECK ==\n");
  process.stdout.write(`tables_present: ${present.sort().join(", ") || "none"}\n`);
  process.stdout.write(`tables_missing: ${missing.join(", ") || "none"}\n`);
  process.stdout.write(
    `row_counts: software=${countsRes.rows[0].software_rows} releases=${countsRes.rows[0].releases_rows}\n`,
  );
  process.stdout.write(`policies_count: ${policiesRes.rowCount}\n`);
  for (const p of policiesRes.rows) {
    process.stdout.write(`- ${p.tablename}.${p.policyname} cmd=${p.cmd} roles=${p.roles}\n`);
  }

  await client.end();
};

main().catch((err) => {
  process.stderr.write(`DB_CHECK_FAILED: ${err?.message || String(err)}\n`);
  process.exitCode = 1;
});
