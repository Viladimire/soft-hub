import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

const localAdminConfigPath = resolve(process.cwd(), ".local", "soft-hub-admin-config.json");

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

const safeReadSql = (relativePath) => {
  const p = resolve(process.cwd(), relativePath);
  if (!existsSync(p)) return "";
  return readFileSync(p, "utf-8");
};

const config = readMergedLocalAdminConfig();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || config?.supabase?.url;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || config?.supabase?.serviceRoleKey;

if (!url || !serviceRoleKey) {
  console.error(
    "❌ Supabase غير مُجهز للتأكد. لازم توفر NEXT_PUBLIC_SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY (أو يكونوا موجودين داخل .local/soft-hub-admin-config.json).",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const isMissingTable = (error) => {
  const msg = String(error?.message ?? "");
  const lowered = msg.toLowerCase();
  return (
    String(error?.code) === "42P01" ||
    msg.includes("42P01") ||
    lowered.includes("does not exist") ||
    // PostgREST schema cache errors typically indicate missing table/function or not exposed yet.
    lowered.includes("could not find the table") ||
    lowered.includes("in the schema cache") ||
    lowered.includes("could not find the function")
  );
};

const trySelect = async (table) => {
  const { error } = await supabase.from(table).select("*").limit(1);
  if (!error) return { ok: true };
  if (isMissingTable(error)) return { ok: false, missing: true, error };
  return { ok: false, missing: false, error };
};

const tryRpc = async (fnName) => {
  const { error } = await supabase.rpc(fnName);
  if (!error) return { ok: true };
  if (isMissingTable(error)) return { ok: false, missing: true, error };
  return { ok: false, missing: false, error };
};

const main = async () => {
  console.log("\n== Supabase Setup Verify ==\n");

  // 1) admin_config
  const adminConfig = await trySelect("admin_config");
  if (adminConfig.ok) {
    console.log("✅ admin_config: موجود");
  } else if (adminConfig.missing) {
    console.log("❌ admin_config: مش موجود (لازم 005_admin_config.sql)");
  } else {
    console.log("⚠️ admin_config: خطأ غير متوقع:");
    console.log(String(adminConfig.error?.message ?? adminConfig.error));
  }

  // 2) analytics (search events table) + rpc check
  const searchEvents = await trySelect("analytics_search_events");
  if (searchEvents.ok) {
    console.log("✅ analytics_search_events: موجود");
  } else if (searchEvents.missing) {
    console.log("❌ analytics_search_events: مش موجود (لازم 002_analytics.sql)");
  } else {
    console.log("⚠️ analytics_search_events: خطأ غير متوقع:");
    console.log(String(searchEvents.error?.message ?? searchEvents.error));
  }

  const totals = await tryRpc("analytics_totals");
  if (totals.ok) {
    console.log("✅ rpc analytics_totals: موجود");
  } else if (totals.missing) {
    console.log("❌ rpc analytics_totals: مش موجود (لازم 002_analytics.sql)");
  } else {
    console.log("⚠️ rpc analytics_totals: خطأ غير متوقع:");
    console.log(String(totals.error?.message ?? totals.error));
  }

  const needAdminConfigSql = !adminConfig.ok && adminConfig.missing;
  const needAnalyticsSql =
    (!searchEvents.ok && searchEvents.missing) || (!totals.ok && totals.missing);

  if (!needAdminConfigSql && !needAnalyticsSql) {
    console.log("\n✅ كله تمام: Supabase schema المطلوب للأدمن + analytics جاهز.\n");
    return;
  }

  console.log("\n== SQL to apply in Supabase SQL Editor ==\n");
  if (needAdminConfigSql) {
    const sql = safeReadSql("supabase/migrations/005_admin_config.sql");
    if (sql) {
      console.log("-- 005_admin_config.sql\n" + sql + "\n");
    } else {
      console.log("❌ مش لاقي ملف supabase/migrations/005_admin_config.sql في المشروع.");
    }
  }

  if (needAnalyticsSql) {
    const sql = safeReadSql("supabase/migrations/002_analytics.sql");
    if (sql) {
      console.log("-- 002_analytics.sql\n" + sql + "\n");
    } else {
      console.log("❌ مش لاقي ملف supabase/migrations/002_analytics.sql في المشروع.");
    }
  }

  console.log(
    "بعد ما تشغّل الـ SQL اللي فوق في Supabase SQL Editor، أعد تشغيل السكربت للتأكد إن كله بقى OK.",
  );
};

main().catch((error) => {
  console.error("\n❌ Verify script failed:", error?.message ?? error);
  process.exitCode = 1;
});
