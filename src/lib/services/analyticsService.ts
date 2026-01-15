import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Json } from "@/lib/supabase/database.types";

const safeClient = () => {
  if (!isSupabaseConfigured()) return null;
  return createSupabaseBrowserClient();
};

const updateStats = async (softwareId: string, field: "views" | "downloads") => {
  const supabase = safeClient();
  if (!supabase) return;

  const { data, error } = await supabase
    .from("software")
    .select("stats")
    .eq("id", softwareId)
    .maybeSingle();

  if (error) return;

  const current = (data?.stats ?? {}) as Record<string, unknown>;
  const currentValue = Number(current[field] ?? 0);
  const next = { ...current, [field]: currentValue + 1 } as unknown as Json;

  await supabase.from("software").update({ stats: next }).eq("id", softwareId);
};

export const incrementViews = async (softwareId: string) => {
  await updateStats(softwareId, "views");
};

export const incrementDownloads = async (softwareId: string) => {
  await updateStats(softwareId, "downloads");
};
