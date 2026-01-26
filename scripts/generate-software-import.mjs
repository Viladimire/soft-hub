#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_INPUT = "scripts/data/software.csv";
const DEFAULT_OUTPUT = "scripts/import-data.sql";
const MIN_DESCRIPTION_LENGTH = 200;

const [, , inputArg = DEFAULT_INPUT, outputArg = DEFAULT_OUTPUT] = process.argv;
const cwd = process.cwd();
const inputPath = path.resolve(cwd, inputArg);
const outputPath = path.resolve(cwd, outputArg);

function parseCsv(text) {
  const rows = [];
  let currentRow = [];
  let currentValue = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === "\"" && inQuotes && nextChar === "\"") {
      currentValue += "\"";
      i += 1;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentValue);
      currentValue = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i += 1;
      }
      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = "";
    } else {
      currentValue += char;
    }
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  return rows
    .map((row) => row.map((value) => value.trim()))
    .filter((row) => row.some((value) => value.length > 0));
}

function escapeLiteral(value) {
  return String(value).replace(/'/g, "''");
}

function parseBoolean(value) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return ["true", "1", "yes", "y"].includes(normalized);
}

function parseNumber(value) {
  if (!value) return null;
  const number = Number(value.replace(/_/g, ""));
  return Number.isFinite(number) ? number : null;
}

function parseTextArray(value) {
  if (!value) return [];
  return value
    .split(/\||;/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function sqlText(value) {
  return `'${escapeLiteral(value)}'`;
}

function sqlNullableText(value) {
  if (value == null || value === "") return "null";
  return sqlText(value);
}

function sqlNullableNumber(value) {
  if (value == null) return "null";
  return Number.isFinite(value) ? String(value) : "null";
}

function sqlBoolean(value) {
  return value ? "true" : "false";
}

function sqlTextArray(values) {
  if (!values || values.length === 0) {
    return "'{}'::text[]";
  }
  const entries = values.map((value) => `'${escapeLiteral(value)}'`).join(", ");
  return `array[${entries}]`;
}

function sqlJson(value, fallback = {}) {
  const jsonString = JSON.stringify(value ?? fallback);
  return `'${escapeLiteral(jsonString)}'::jsonb`;
}

function sqlDate(value) {
  if (!value) return "null";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${value}`);
  }
  return `'${date.toISOString().slice(0, 10)}'::date`;
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Invalid JSON value: ${value}\n${error.message}`);
  }
}

async function main() {
  let rawCsv;
  try {
    rawCsv = await readFile(inputPath, "utf8");
  } catch (error) {
    console.error(`[generate-software-import] Failed to read input CSV at ${inputPath}`);
    console.error(error);
    process.exit(1);
  }

  const rows = parseCsv(rawCsv);
  if (rows.length === 0) {
    console.error("[generate-software-import] CSV is empty or contains no data rows.");
    process.exit(1);
  }

  const headers = rows[0];
  const headerIndex = new Map(headers.map((header, index) => [header, index]));

  const requiredHeaders = [
    "slug",
    "name",
    "description",
    "version",
    "download_url",
    "platforms",
    "categories",
    "type",
  ];

  const missingHeaders = requiredHeaders.filter((header) => !headerIndex.has(header));
  if (missingHeaders.length > 0) {
    console.error(`[generate-software-import] Missing required columns: ${missingHeaders.join(", ")}`);
    process.exit(1);
  }

  const dataRows = rows.slice(1);
  if (dataRows.length === 0) {
    console.error("[generate-software-import] CSV contains headers only. Add at least one data row.");
    process.exit(1);
  }

  const warnings = [];
  const sqlRows = dataRows.map((row, idx) => {
    const rowNumber = idx + 2; // account for 1-based index + header row

    const getValue = (key) => {
      const columnIndex = headerIndex.get(key);
      return columnIndex == null ? "" : row[columnIndex];
    };

    const slug = getValue("slug");
    const name = getValue("name");
    const summary = getValue("summary") || null;
    const description = getValue("description");
    const version = getValue("version");
    const sizeInBytes = parseNumber(getValue("size_in_bytes"));
    const platforms = parseTextArray(getValue("platforms"));
    const categories = parseTextArray(getValue("categories"));
    const type = getValue("type");
    const websiteUrl = getValue("website_url") || null;
    const downloadUrl = getValue("download_url");
    const isFeatured = parseBoolean(getValue("is_featured"));
    const isTrending = parseBoolean(getValue("is_trending"));
    const releaseDateRaw = getValue("release_date") || null;

    if (!slug) {
      throw new Error(`Row ${rowNumber}: slug is required.`);
    }
    if (!name) {
      throw new Error(`Row ${rowNumber}: name is required.`);
    }
    if (!description || description.length < MIN_DESCRIPTION_LENGTH) {
      warnings.push(`Row ${rowNumber} (${slug}): description is shorter than ${MIN_DESCRIPTION_LENGTH} characters.`);
    }
    if (!downloadUrl || !downloadUrl.startsWith("http")) {
      warnings.push(`Row ${rowNumber} (${slug}): download_url is missing or invalid.`);
    }
    if (platforms.length === 0) {
      warnings.push(`Row ${rowNumber} (${slug}): platforms list is empty.`);
    }
    if (categories.length === 0) {
      warnings.push(`Row ${rowNumber} (${slug}): categories list is empty.`);
    }

    const developer = {
      name: getValue("developer_name") || null,
      website: getValue("developer_website") || null,
      contact: getValue("developer_contact") || null,
    };

    const features = parseTextArray(getValue("features"));

    const media = {
      logoUrl: getValue("media_logo_url") || null,
      heroImage: getValue("media_hero_image") || null,
      gallery: parseTextArray(getValue("media_gallery")),
    };

    if (!media.logoUrl) {
      warnings.push(`Row ${rowNumber} (${slug}): media_logo_url is empty.`);
    }

    const requirements = {
      minimum: parseTextArray(getValue("requirements_minimum")),
      recommended: parseTextArray(getValue("requirements_recommended")),
    };

    const changelogRaw = getValue("changelog");
    let changelog = [];
    if (changelogRaw) {
      changelog = parseJson(changelogRaw, []);
      if (!Array.isArray(changelog)) {
        throw new Error(`Row ${rowNumber} (${slug}): changelog must be a JSON array.`);
      }
    }

    const stats = {
      downloads: parseNumber(getValue("json_stats_downloads")) ?? 0,
      views: parseNumber(getValue("json_stats_views")) ?? 0,
      rating: parseNumber(getValue("json_stats_rating")) ?? null,
      votes: parseNumber(getValue("json_stats_votes")) ?? null,
    };

    const columns = [
      sqlText(slug),
      sqlText(name),
      summary ? sqlText(summary) : "null",
      sqlText(description),
      sqlText(version),
      sqlNullableNumber(sizeInBytes),
      sqlTextArray(platforms),
      sqlTextArray(categories),
      sqlText(type),
      sqlNullableText(websiteUrl),
      sqlText(downloadUrl),
      sqlBoolean(isFeatured),
      sqlBoolean(isTrending),
      releaseDateRaw ? sqlDate(releaseDateRaw) : "null",
      "now()",
      "now()",
      sqlJson(developer),
      sqlTextArray(features),
      sqlJson(stats),
      sqlJson(media),
      sqlJson(requirements),
      sqlJson(changelog, []),
    ];

    return `  (${columns.join(", ")})`;
  });

  if (warnings.length > 0) {
    console.warn("[generate-software-import] Warnings:");
    warnings.forEach((warning) => console.warn(`  - ${warning}`));
  }

  const sql = `-- Auto-generated by scripts/generate-software-import.mjs on ${new Date().toISOString()}
-- Source CSV: ${path.relative(cwd, inputPath)}

insert into public.software (
  slug,
  name,
  summary,
  description,
  version,
  size_in_bytes,
  platforms,
  categories,
  type,
  website_url,
  download_url,
  is_featured,
  is_trending,
  release_date,
  created_at,
  updated_at,
  developer,
  features,
  stats,
  media,
  requirements,
  changelog
) values
${sqlRows.join(",\n")}
on conflict (slug) do update set
  name = excluded.name,
  summary = excluded.summary,
  description = excluded.description,
  version = excluded.version,
  size_in_bytes = excluded.size_in_bytes,
  platforms = excluded.platforms,
  categories = excluded.categories,
  type = excluded.type,
  website_url = excluded.website_url,
  download_url = excluded.download_url,
  is_featured = excluded.is_featured,
  is_trending = excluded.is_trending,
  release_date = excluded.release_date,
  updated_at = excluded.updated_at,
  developer = excluded.developer,
  features = excluded.features,
  stats = excluded.stats,
  media = excluded.media,
  requirements = excluded.requirements,
  changelog = excluded.changelog;
`;

  try {
    await writeFile(outputPath, sql, "utf8");
  } catch (error) {
    console.error(`[generate-software-import] Failed to write SQL output at ${outputPath}`);
    console.error(error);
    process.exit(1);
  }

  console.log(`✔ Generated SQL for ${sqlRows.length} software entries → ${path.relative(cwd, outputPath)}`);
}

main().catch((error) => {
  console.error("[generate-software-import] Unexpected error:");
  console.error(error);
  process.exit(1);
});
