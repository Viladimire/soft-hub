import pg from "pg";
import fs from "node:fs";
import dns from "node:dns";
import path from "node:path";

const { Client } = pg;

const GB = 1024 * 1024 * 1024;

const requireEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing environment variable ${key}. Set SUPABASE_DB_URL (or DATABASE_URL) to your Postgres connection string.`,
    );
  }
  return value;
};

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

const tryParseJson = (raw) => {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch (err) {
    return { ok: false, error: err };
  }
};

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const deepMerge = (target, source) => {
  if (!isPlainObject(target) || !isPlainObject(source)) {
    return source;
  }

  const out = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (key in out && isPlainObject(out[key]) && isPlainObject(value)) {
      out[key] = deepMerge(out[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
};

const readConfigFromFile = (filePath) => {
  const content = fs.readFileSync(filePath, "utf-8");

  const parsedWhole = tryParseJson(content);
  if (parsedWhole.ok) {
    return parsedWhole.value;
  }

  const chunks = content
    .split(/\n\s*(?=\{)|\n\s*={3,}\s*\n/g)
    .map((c) => c.trim())
    .filter(Boolean);

  let merged = null;
  for (const chunk of chunks) {
    const parsed = tryParseJson(chunk);
    if (parsed.ok) {
      merged = merged ? deepMerge(merged, parsed.value) : parsed.value;
    }
  }

  if (merged) {
    return merged;
  }

  throw new Error(
    `Failed to parse config JSON at ${filePath}. Ensure it contains valid JSON.`,
  );
};

const buildDbUrlFromConfig = (config) => {
  const supabaseUrl = config?.supabase?.url;
  const dbPassword = config?.supabase?.dbPassword;
  const overrideHost = config?.supabase?.dbHost || config?.supabase?.poolerHost;

  if (!dbPassword) {
    return null;
  }

  const encodedPassword = encodeURIComponent(dbPassword);

  // If a DB/pooler host is provided explicitly, prefer it (often has IPv4).
  if (overrideHost) {
    return `postgresql://postgres:${encodedPassword}@${overrideHost}:5432/postgres?sslmode=require`;
  }

  if (!supabaseUrl) {
    return null;
  }

  let hostname;
  try {
    hostname = new URL(supabaseUrl).hostname;
  } catch {
    return null;
  }

  const projectRef = hostname.split(".")[0];
  if (!projectRef) {
    return null;
  }

  return `postgresql://postgres:${encodedPassword}@db.${projectRef}.supabase.co:5432/postgres?sslmode=require`;
};

let dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

// If we don't have a full URL, attempt to build one from env vars.
const envFileValues = loadDotEnvFile(path.resolve(process.cwd(), ".env.local"));
const pick = (key) => process.env[key] ?? envFileValues[key];

const envHost = pick("SUPABASE_DB_HOST");
const envPort = pick("SUPABASE_DB_PORT") || "5432";
const envUser = pick("SUPABASE_DB_USER");
const envName = pick("SUPABASE_DB_NAME") || "postgres";
const envPassword = pick("SUPABASE_DB_PASSWORD") || pick("SUPABASE_DB_PASS");

if (!dbUrl && envHost && envUser && envPassword) {
  const encodedPassword = encodeURIComponent(envPassword);
  dbUrl = `postgresql://${encodeURIComponent(envUser)}:${encodedPassword}@${envHost}:${envPort}/${encodeURIComponent(envName)}?sslmode=require`;
}

if (!dbUrl) {
  const configPath =
    process.env.SOFT_HUB_ADMIN_CONFIG ||
    path.resolve(process.cwd(), ".local", "soft-hub-admin-config.json");

  if (fs.existsSync(configPath)) {
    const config = readConfigFromFile(configPath);
    const derived = buildDbUrlFromConfig(config);
    if (derived) {
      dbUrl = derived;
    }
  }
}

if (!dbUrl) {
  requireEnv("SUPABASE_DB_URL");
}

if (dbUrl && (dbUrl.includes("<") || dbUrl.includes(">"))) {
  throw new Error(
    "SUPABASE_DB_URL looks like a template placeholder. Paste the real Postgres connection string from Supabase (it starts with postgresql://).",
  );
}

if (dbUrl && !/^postgres(ql)?:\/\//i.test(dbUrl)) {
  throw new Error(
    "SUPABASE_DB_URL must be a Postgres connection string (postgresql://...). The Supabase project URL (https://...supabase.co) will not work.",
  );
}

// Some Supabase DB hostnames resolve to IPv6 (AAAA) records only.
// On certain Windows/DNS setups Node may try IPv4 first and fail.
// Prefer IPv6 to avoid getaddrinfo ENOENT when no A record exists.
try {
  dns.setDefaultResultOrder("ipv6first");
} catch {
  // Older Node versions may not support this; ignore.
}

const buildClientOptions = async () => {
  const sslDisabled = process.env.PGSSLMODE === "disable" || process.env.PGSSL === "0";

  const url = new URL(dbUrl);
  const hostname = url.hostname;
  const port = url.port ? Number(url.port) : 5432;
  const database = (url.pathname || "/postgres").replace(/^\//, "") || "postgres";

  const user = decodeURIComponent(url.username || "postgres");
  const password = decodeURIComponent(url.password || "");

  let host = hostname;
  try {
    const resolved6 = await dns.promises.resolve6(hostname);
    if (resolved6 && resolved6.length) {
      host = resolved6[0];
    }
  } catch {
    // If resolution fails we'll let pg try normal resolution.
  }

  const ssl = sslDisabled
    ? undefined
    : {
        rejectUnauthorized: false,
        // Keep SNI servername as the hostname even if we connect via IP.
        servername: hostname,
      };

  return {
    host,
    port,
    user,
    password,
    database,
    ssl,
  };
};

const queryOne = async (client, text, params) => {
  const res = await client.query(text, params);
  return res.rows[0];
};

const queryAll = async (client, text, params) => {
  const res = await client.query(text, params);
  return res.rows;
};

const printKv = (label, value) => {
  process.stdout.write(`${label}: ${value}\n`);
};

const safePretty = (bytes) => (bytes == null ? "N/A" : bytes);

const main = async () => {
  const clientOptions = await buildClientOptions();
  const client = new Client(clientOptions);
  await client.connect();

  const dbSize = await queryOne(
    client,
    `select
      current_database() as db,
      pg_database_size(current_database()) as db_bytes,
      pg_size_pretty(pg_database_size(current_database())) as db_size
    `,
  );

  printKv("Database", dbSize.db);
  printKv("Database size", `${dbSize.db_size} (${dbSize.db_bytes} bytes)`);
  process.stdout.write("\n");

  const tableSizes = await queryAll(
    client,
    `select
      relname as table,
      pg_relation_size(oid) as data_bytes,
      pg_indexes_size(oid) as index_bytes,
      pg_total_relation_size(oid) as total_bytes,
      pg_size_pretty(pg_relation_size(oid)) as data_size,
      pg_size_pretty(pg_indexes_size(oid)) as index_size,
      pg_size_pretty(pg_total_relation_size(oid)) as total_size
    from pg_class
    where relkind = 'r'
      and relnamespace = 'public'::regnamespace
    order by pg_total_relation_size(oid) desc
    `,
  );

  process.stdout.write("Top tables by total size:\n");
  for (const row of tableSizes.slice(0, 10)) {
    process.stdout.write(
      `- ${row.table}: total=${row.total_size} (data=${row.data_size}, indexes=${row.index_size})\n`,
    );
  }
  process.stdout.write("\n");

  const softwareStats = await queryOne(
    client,
    `select
      count(*)::bigint as software_rows,
      pg_total_relation_size('public.software')::bigint as software_total_bytes,
      pg_size_pretty(pg_total_relation_size('public.software')) as software_total_pretty,
      case when count(*) = 0 then null
           else round(pg_total_relation_size('public.software')::numeric / count(*))::bigint
      end as approx_total_bytes_per_row,
      case when count(*) = 0 then null
           else pg_size_pretty(round(pg_total_relation_size('public.software')::numeric / count(*))::bigint)
      end as approx_total_per_row_pretty
    from public.software;
    `,
  );

  process.stdout.write("Software table (public.software):\n");
  printKv("Rows", softwareStats.software_rows);
  printKv(
    "Total size",
    `${softwareStats.software_total_pretty} (${softwareStats.software_total_bytes} bytes)`,
  );
  printKv(
    "Approx total bytes per row (incl. indexes/TOAST)",
    `${safePretty(softwareStats.approx_total_per_row_pretty)} (${safePretty(softwareStats.approx_total_bytes_per_row)} bytes)`,
  );

  const bytesPerRow = softwareStats.approx_total_bytes_per_row;
  if (bytesPerRow && bytesPerRow > 0) {
    const rows1gb = Math.floor(GB / bytesPerRow);
    const rows5gb = Math.floor((5 * GB) / bytesPerRow);
    process.stdout.write("\nCapacity estimate based on current avg row cost:\n");
    printKv("Approx rows in 1GB", rows1gb);
    printKv("Approx rows in 5GB", rows5gb);
  } else {
    process.stdout.write("\nCapacity estimate skipped (software table has 0 rows).\n");
  }

  process.stdout.write("\n");

  const releasesExists = await queryOne(
    client,
    `select exists(
      select 1
      from information_schema.tables
      where table_schema='public' and table_name='software_releases'
    ) as exists;`,
  );

  if (releasesExists.exists) {
    const releasesStats = await queryOne(
      client,
      `select
        count(*)::bigint as release_rows,
        pg_total_relation_size('public.software_releases')::bigint as releases_total_bytes,
        pg_size_pretty(pg_total_relation_size('public.software_releases')) as releases_total_pretty,
        case when count(*) = 0 then null
             else round(pg_total_relation_size('public.software_releases')::numeric / count(*))::bigint
        end as approx_total_bytes_per_release,
        case when count(*) = 0 then null
             else pg_size_pretty(round(pg_total_relation_size('public.software_releases')::numeric / count(*))::bigint)
        end as approx_total_per_release_pretty
      from public.software_releases;
      `,
    );

    process.stdout.write("Software releases table (public.software_releases):\n");
    printKv("Rows", releasesStats.release_rows);
    printKv(
      "Total size",
      `${releasesStats.releases_total_pretty} (${releasesStats.releases_total_bytes} bytes)`,
    );
    printKv(
      "Approx total bytes per release row",
      `${safePretty(releasesStats.approx_total_per_release_pretty)} (${safePretty(releasesStats.approx_total_bytes_per_release)} bytes)`,
    );
  } else {
    process.stdout.write("software_releases table not found (migration may not be applied yet).\n");
  }

  await client.end();
};

main().catch((err) => {
  process.stderr.write(`${err?.stack || err?.message || String(err)}\n`);
  process.exitCode = 1;
});
