"use client";

import { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

import { NavBar } from "@/components/layouts/navbar";

type AppShellProps = {
  hero?: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
  className?: string;
};

export const AppShell = ({ hero, sidebar, children, className }: AppShellProps) => {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      <NavBar />
      {hero ?? null}
      <main
        className={cn(
          "mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-10 lg:py-12",
          className,
        )}
      >
        <div className={cn("flex flex-col gap-8 xl:flex-row xl:items-start")}
        >
          <div className={cn("flex-1 space-y-8", sidebar ? "xl:pr-6" : "")}>{children}</div>
          {sidebar ? (
            <aside className="w-full max-w-xs space-y-6 xl:sticky xl:top-28 xl:block">
              {sidebar}
            </aside>
          ) : null}
        </div>
      </main>
    </div>
  );
};
