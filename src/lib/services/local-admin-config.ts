import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";

import { createClient } from "@supabase/supabase-js";

import { supabaseConfig } from "@/lib/supabase/config";

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

const ADMIN_CONFIG_TABLE = "admin_config";
const ADMIN_CONFIG_SINGLETON_ID = 1;

const createSupabaseAdminClient = () => {
  if (!supabaseConfig.url) {
    throw new Error("Supabase URL is missing.");
  }

  const serviceKey = supabaseConfig.serviceRoleKey || supabaseConfig.anonKey;
  if (!serviceKey) {
    throw new Error("Supabase service role key or anon key is required on the server.");
  }

  return createClient(supabaseConfig.url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

const readConfigFromSupabase = async (): Promise<LocalAdminConfig> => {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from(ADMIN_CONFIG_TABLE)
    .select("config")
    .eq("id", ADMIN_CONFIG_SINGLETON_ID)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const raw = (data && typeof data === "object" && "config" in data ? (data as { config?: unknown }).config : undefined) ?? {};
  return configSchema.parse(raw);
};

const writeConfigToSupabase = async (next: LocalAdminConfig) => {
  const validated = configSchema.parse(next);
  const supabase = createSupabaseAdminClient();

  const payload = {
    id: ADMIN_CONFIG_SINGLETON_ID,
    config: validated as unknown,
  };

  const { error } = await supabase
    .from(ADMIN_CONFIG_TABLE)
    .upsert(payload, { onConflict: "id" });

  if (error) {
    throw error;
  }

  return validated;
};

const readConfigFromEnv = (): LocalAdminConfig => {
  return configSchema.parse({
    github: {
      owner: process.env.GITHUB_DATA_REPO_OWNER,
      repo: process.env.GITHUB_DATA_REPO_NAME,
      token: process.env.GITHUB_CONTENT_TOKEN,
      branch: process.env.GITHUB_DATA_REPO_BRANCH,
      repoUrl: process.env.GITHUB_DATA_REPO_URL,
    },
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    vercel: {
      token: process.env.VERCEL_TOKEN,
      projectId: process.env.VERCEL_PROJECT_ID,
      teamId: process.env.VERCEL_TEAM_ID,
      deployHookUrl: process.env.VERCEL_DEPLOY_HOOK_URL,
    },
  });
};

const mergeConfigs = (base: LocalAdminConfig, fallback: LocalAdminConfig): LocalAdminConfig =>
  configSchema.parse({
    github: { ...fallback.github, ...base.github },
    supabase: { ...fallback.supabase, ...base.supabase },
    vercel: { ...fallback.vercel, ...base.vercel },
  });

const resolveConfigPath = () => {
  const configuredPath = process.env.LOCAL_ADMIN_CONFIG_PATH;
  if (configuredPath && configuredPath.trim()) {
    const trimmed = configuredPath.trim();
    return path.isAbsolute(trimmed) ? trimmed : path.join(process.cwd(), trimmed);
  }

  return path.join(process.cwd(), ".local", "soft-hub-admin-config.json");
};

const CONFIG_PATH = resolveConfigPath();
const CONFIG_DIR = path.dirname(CONFIG_PATH);

export const getLocalAdminConfigPath = () => CONFIG_PATH;

const ensureDir = async () => {
  if (process.env.VERCEL) {
    throw new Error("LOCAL_ADMIN_CONFIG_NOT_WRITABLE");
  }
  await fs.mkdir(CONFIG_DIR, { recursive: true });
};

export const readLocalAdminConfig = async (): Promise<LocalAdminConfig> => {
  if (process.env.VERCEL) {
    try {
      const fromSupabase = await readConfigFromSupabase();
      const fromEnv = readConfigFromEnv();
      return mergeConfigs(fromSupabase, fromEnv);
    } catch {
      return readConfigFromEnv();
    }
  }

  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return configSchema.parse(parsed);
  } catch {
    return {};
  }
};

export const writeLocalAdminConfig = async (next: LocalAdminConfig) => {
  if (process.env.VERCEL) {
    return writeConfigToSupabase(next);
  }

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
