import { createBrowserClient } from "@supabase/ssr";

import { type Database } from "./database.types";
import { supabaseConfig, isSupabaseConfigured } from "./config";

export const createSupabaseBrowserClient = () => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  return createBrowserClient<Database>(supabaseConfig.url, supabaseConfig.anonKey);
};
