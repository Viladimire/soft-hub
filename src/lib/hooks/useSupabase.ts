"use client";

import { useMemo } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export const useSupabase = () =>
  useMemo(() => createSupabaseBrowserClient(), []);
