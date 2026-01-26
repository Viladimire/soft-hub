import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";

const configSchema = z.object({
  github: z
    .object({
      owner: z.string().optional(),
      repo: z.string().optional(),
      token: z.string().optional(),
      branch: z.string().optional(),
      repoUrl: z.string().optional(),
    })
    .optional(),
  supabase: z
    .object({
      url: z.string().optional(),
      anonKey: z.string().optional(),
      serviceRoleKey: z.string().optional(),
    })
    .optional(),
  vercel: z
    .object({
      token: z.string().optional(),
      projectId: z.string().optional(),
      teamId: z.string().optional(),
      deployHookUrl: z.string().optional(),
    })
    .optional(),
});

export type LocalAdminConfig = z.infer<typeof configSchema>;

const CONFIG_DIR = path.join(process.cwd(), ".local");
const CONFIG_PATH = path.join(CONFIG_DIR, "soft-hub-admin-config.json");

export const getLocalAdminConfigPath = () => CONFIG_PATH;

const ensureDir = async () => {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
};

export const readLocalAdminConfig = async (): Promise<LocalAdminConfig> => {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return configSchema.parse(parsed);
  } catch {
    return {};
  }
};

export const writeLocalAdminConfig = async (next: LocalAdminConfig) => {
  const validated = configSchema.parse(next);
  await ensureDir();
  await fs.writeFile(CONFIG_PATH, JSON.stringify(validated, null, 2), "utf8");
  return validated;
};

export const mergeLocalAdminConfig = async (partial: LocalAdminConfig) => {
  const current = await readLocalAdminConfig();
  const next = {
    ...current,
    ...partial,
    github: { ...current.github, ...partial.github },
    supabase: { ...current.supabase, ...partial.supabase },
    vercel: { ...current.vercel, ...partial.vercel },
  } as LocalAdminConfig;

  return writeLocalAdminConfig(next);
};
