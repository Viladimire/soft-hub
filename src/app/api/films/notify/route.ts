import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/utils/rate-limit";

const bodySchema = z.object({
  email: z.string().email(),
  locale: z.string().min(2).max(10).optional(),
});

export const POST = async (request: NextRequest) => {
  try {
    const limit = rateLimit(request, { keyPrefix: "films-notify", limit: 10, windowMs: 60 * 60_000 });
    if (!limit.ok) {
      return NextResponse.json(
        { message: "Too many requests" },
        {
          status: 429,
          headers: {
            "x-ratelimit-limit": String(limit.limit),
            "x-ratelimit-remaining": String(limit.remaining),
            "x-ratelimit-reset": String(limit.resetAt),
          },
        },
      );
    }

    const payload = bodySchema.parse(await request.json());

    type FilmsDatabase = {
      public: {
        Tables: {
          film_subscribers: {
            Row: {
              id: string;
              email: string;
              locale: string;
              notified: boolean;
              created_at: string;
            };
            Insert: {
              email: string;
              locale?: string;
              notified?: boolean;
              created_at?: string;
            };
            Update: {
              email?: string;
              locale?: string;
              notified?: boolean;
              created_at?: string;
            };
            Relationships: [];
          };
        };
        Views: Record<string, never>;
        Functions: Record<string, never>;
        Enums: Record<string, never>;
        CompositeTypes: Record<string, never>;
      };
    };

    const supabase = createSupabaseServerClient() as unknown as SupabaseClient<FilmsDatabase>;

    const { error } = await supabase.from("film_subscribers").upsert(
      {
        email: payload.email.toLowerCase(),
        locale: payload.locale ?? "en",
      },
      { onConflict: "email" },
    );

    if (error) {
      const message = String((error as { message?: unknown } | null)?.message ?? "");
      if (message.toLowerCase().includes("relation") && message.toLowerCase().includes("does not exist")) {
        return NextResponse.json(
          { message: "Films module is not enabled yet" },
          { status: 501 },
        );
      }
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation failed", errors: error.flatten() }, { status: 400 });
    }

    console.error("POST /api/films/notify failed", error);
    return NextResponse.json({ message: "Failed to subscribe" }, { status: 500 });
  }
};
