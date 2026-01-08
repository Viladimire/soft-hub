#!/usr/bin/env node
const fs = require('node:fs/promises');
const path = require('node:path');
const process = require('node:process');

const DATA_DIR = path.join(process.cwd(), 'data');

async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw);
}

async function walkDirectory(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkDirectory(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }

  return files;
}

function validateSoftwareSchema(software) {
  const requiredFields = [
    'id',
    'slug',
    'name',
    'short_description',
    'description',
    'vendor_id',
    'category_ids',
    'download_url',
    'official_url',
    'created_at',
    'updated_at',
  ];

  const missing = requiredFields.filter((field) => software[field] === undefined || software[field] === null);
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
}

async function main() {
  try {
    const files = await walkDirectory(DATA_DIR);
    const errors = [];

    for (const filePath of files) {
      try {
        const parsed = await readJsonFile(filePath);

        if (filePath.includes(`${path.sep}software${path.sep}`)) {
          if (Array.isArray(parsed)) {
            parsed.forEach(validateSoftwareSchema);
          } else {
            validateSoftwareSchema(parsed);
          }
        }
      } catch (error) {
        errors.push({ file: path.relative(process.cwd(), filePath), message: error.message });
      }
    }

    if (errors.length > 0) {
      console.error('JSON validation failed:');
      errors.forEach((error) => {
        console.error(`- ${error.file}: ${error.message}`);
      });
      process.exitCode = 1;
      return;
    }

    console.log(`Validated ${files.length} JSON file(s) successfully.`);
  } catch (error) {
    console.error('JSON validation encountered a fatal error:', error);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('JSON validation encountered an unexpected error:', error);
  process.exit(1);
});
