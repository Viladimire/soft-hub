import { cache } from "react";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { ZodTypeAny, infer as ZodInfer } from "zod";

import {
  categorySchema,
  settingsSchema,
  softwareSchema,
  vendorSchema,
  type Category,
  type Settings,
  type Software,
  type Vendor,
} from "@/lib/schemas";

const DATA_ROOT = path.join(process.cwd(), "data");
const SOFTWARE_DIR = path.join(DATA_ROOT, "software");

async function readJsonFile<Schema extends ZodTypeAny>(
  absolutePath: string,
  schema: Schema,
): Promise<ZodInfer<Schema>> {
  const fileContents = await fs.readFile(absolutePath, "utf-8");
  const unparsed = JSON.parse(fileContents);
  return schema.parse(unparsed);
}

async function safeReadJsonFile<Schema extends ZodTypeAny>(
  absolutePath: string,
  schema: Schema,
): Promise<ZodInfer<Schema> | null> {
  try {
    return await readJsonFile(absolutePath, schema);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export const getSettings = cache(async (): Promise<Settings> => {
  const absolutePath = path.join(DATA_ROOT, "settings.json");
  return readJsonFile(absolutePath, settingsSchema);
});

export const getCategories = cache(async (): Promise<Category[]> => {
  const absolutePath = path.join(DATA_ROOT, "categories.json");
  return readJsonFile(absolutePath, categorySchema.array());
});

export const getVendors = cache(async (): Promise<Vendor[]> => {
  const absolutePath = path.join(DATA_ROOT, "vendors.json");
  return readJsonFile(absolutePath, vendorSchema.array());
});

async function readSoftwareFile(fileName: string): Promise<Software> {
  const absolutePath = path.join(SOFTWARE_DIR, fileName);
  return readJsonFile(absolutePath, softwareSchema);
}

export const getAllSoftware = cache(async (): Promise<Software[]> => {
  const entries = await fs.readdir(SOFTWARE_DIR);
  const softwareFiles = entries.filter((file) => file.endsWith(".json"));

  const softwareItems = await Promise.all(
    softwareFiles.map(async (fileName) => {
      const software = await readSoftwareFile(fileName);
      return software;
    }),
  );

  return softwareItems.sort((a, b) => a.name.localeCompare(b.name));
});

export async function getSoftwareBySlug(slug: string): Promise<Software | null> {
  const fileName = `${slug}.json`;
  return safeReadJsonFile(path.join(SOFTWARE_DIR, fileName), softwareSchema);
}

export async function getSoftwareSlugs(): Promise<string[]> {
  const entries = await fs.readdir(SOFTWARE_DIR);
  return entries
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.replace(/\.json$/u, ""));
}

export const getCategoryMap = cache(async (): Promise<Map<string, Category>> => {
  const categories = await getCategories();
  return new Map(categories.map((category) => [category.id, category]));
});

export const getVendorMap = cache(async (): Promise<Map<string, Vendor>> => {
  const vendors = await getVendors();
  return new Map(vendors.map((vendor) => [vendor.id, vendor]));
});

export function resolveCategoryNames(categoryIds: string[], categoryMap: Map<string, Category>): string[] {
  return categoryIds
    .map((categoryId) => categoryMap.get(categoryId)?.name)
    .filter((name): name is string => Boolean(name));
}

export function firstNonEmpty(...candidates: Array<string | undefined | null>): string | undefined {
  return candidates.find(
    (candidate): candidate is string => typeof candidate === "string" && candidate.trim().length > 0,
  );
}
