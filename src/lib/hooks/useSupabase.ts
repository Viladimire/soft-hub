"use client";

import { useMemo } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export const useSupabase = () =>
  useMemo(() => {
    try {
      if (typeof window !== "undefined") {
        const mismatch = window.localStorage.getItem("supabase_schema_mismatch") === "1";
        if (mismatch) {
          return null;
        }
      }
    } catch {
      // ignore
    }

    return createSupabaseBrowserClient();
  }, []);
