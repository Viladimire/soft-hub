"use client";

import { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

import { Navbar } from "@/components/layouts/navbar";

type AppShellProps = {
  hero?: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
  className?: string;
  sidebarClassName?: string;
};

export const AppShell = ({ hero, sidebar, children, className, sidebarClassName }: AppShellProps) => {
  return (
    <div className="min-h-screen">
      <Navbar />
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
            <aside className={cn("w-full max-w-xs space-y-6 xl:sticky xl:top-28 xl:block", sidebarClassName)}>
              {sidebar}
            </aside>
          ) : null}
        </div>
      </main>
    </div>
  );
};
