'use client';

import { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/utils/cn";

import { Button } from "@/components/ui/button";

export type AdminTab = {
  id: string;
  title: string;
  content: React.ReactNode;
};

export type AdminTabsProps = {
  tabs: AdminTab[];
  initialTabId?: string;
};

export const AdminTabs = ({ tabs, initialTabId }: AdminTabsProps) => {
  const [active, setActive] = useState(() => initialTabId ?? tabs[0]?.id ?? "");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!tabs.length) return;

    const applyHash = () => {
      const raw = window.location.hash;
      const next = raw.startsWith("#") ? raw.slice(1) : raw;
      if (!next) return;
      if (tabs.some((tab) => tab.id === next)) {
        setActive(next);
      }
    };

    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => {
      window.removeEventListener("hashchange", applyHash);
    };
  }, [tabs]);

  const handleSelect = useCallback((id: string) => {
    setActive(id);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${id}`);
    }
  }, []);

  const activeTab = tabs.find((tab) => tab.id === active) ?? tabs[0];

  return (
    <section className="space-y-6">
      <div className="inline-flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-neutral-900/70 p-2">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab?.id;

          return (
            <Button
              key={tab.id}
              onClick={() => handleSelect(tab.id)}
              variant={isActive ? "primary" : "ghost"}
              className={cn(
                "rounded-xl px-4 py-2 text-sm",
                isActive ? "shadow-lg" : "text-neutral-300 hover:text-neutral-50",
              )}
            >
              {tab.title}
            </Button>
          );
        })}
      </div>

      <div className="rounded-3xl border border-white/10 bg-neutral-950/70 p-6 shadow-lg">
        {activeTab?.content ?? <p className="text-sm text-neutral-300">No content available.</p>}
      </div>
    </section>
  );
};
