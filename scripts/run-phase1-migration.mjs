#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { Client } from "pg";

const migrationPath = new URL("../supabase/migrations/004_phase1_schema_adjustments.sql", import.meta.url);

(async () => {
  const connectionString = process.env.SUPABASE_DB_URL;

  if (!connectionString) {
    console.error("[migration] SUPABASE_DB_URL is not set. Please export it before running the script.");
    process.exit(1);
  }

  let sql;
  try {
    sql = await readFile(migrationPath, "utf8");
  } catch (error) {
    console.error("[migration] Failed to read migration file:", error);
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log("[migration] Connected to database. Applying migration 004_phase1_schema_adjustments...");
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("[migration] Migration applied successfully.");
  } catch (error) {
    console.error("[migration] Migration failed. Rolling back.", error);
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("[migration] Rollback failed:", rollbackError);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
})();
