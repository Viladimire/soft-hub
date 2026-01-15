import { createClient } from "@supabase/supabase-js";

import { type Database } from "./database.types";
import { supabaseConfig } from "./config";

export const createSupabaseServerClient = () => {
  if (!supabaseConfig.url) {
    throw new Error("Supabase URL is missing.");
  }

  const serviceKey = supabaseConfig.serviceRoleKey || supabaseConfig.anonKey;

  if (!serviceKey) {
    throw new Error("Supabase service role key or anon key is required on the server.");
  }

  return createClient<Database>(supabaseConfig.url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
