"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useLocale } from "next-intl";

import type { Software } from "@/lib/types/software";

import { SoftwareCard } from "@/components/molecules/software-card";

export const HomeSoftwareShowcase = ({ limit = 12 }: { limit?: number }) => {
  const locale = useLocale();
  const [items, setItems] = useState<Software[]>([]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        if (typeof window === "undefined") return;

        const perPage = Math.max(Math.floor(limit) || 0, 0);
        if (!perPage) {
          if (active) setItems([]);
          return;
        }

        const url = new URL("/api/software", window.location.origin);
        url.searchParams.set("sort", "popular");
        url.searchParams.set("page", "1");
        url.searchParams.set("perPage", String(perPage));

        const response = await fetch(url.toString(), { cache: "no-store" });
        if (!response.ok) {
          if (active) setItems([]);
          return;
        }

        const payload = (await response.json()) as { items?: Software[] };
        const nextItems = Array.isArray(payload.items) ? payload.items : [];
        if (active) {
          setItems(nextItems);
        }
      } catch {
        if (active) {
          setItems([]);
        }
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [limit]);

  const content = useMemo(() => {
    return items.map((software, index) => (
      <motion.div
        key={software.id}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.045, duration: 0.45, ease: "easeOut" }}
        className="h-full"
      >
        <SoftwareCard software={software} showActions />
      </motion.div>
    ));
  }, [items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mt-14 space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-300">Trending picks</p>
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">Popular downloads right now</h2>
          <p className="max-w-2xl text-sm text-neutral-300">
            A curated snapshot of what people are downloading most.
          </p>
        </div>

        <Link
          href={`/${locale}/software?sort=popular`}
          className="w-fit rounded-full border border-white/15 bg-white/10 px-5 py-2 text-sm font-semibold text-white/90 backdrop-blur-xl transition hover:border-white/30 hover:bg-white/15"
        >
          View full library
        </Link>
      </header>

      <AnimatePresence mode="popLayout">
        <motion.div
          key="grid"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="grid auto-rows-fr items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3"
        >
          {content}
        </motion.div>
      </AnimatePresence>
    </section>
  );
};
