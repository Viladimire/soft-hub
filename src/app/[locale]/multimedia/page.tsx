"use client";

import { useLocale } from "next-intl";
import { Lock } from "lucide-react";

import { AppShell } from "@/components/layouts/app-shell";
import { SideBar } from "@/components/layouts/sidebar";
import { ComingSoonHero } from "@/components/templates/coming-soon-hero";

export default function MultimediaComingSoonPage() {
  const locale = useLocale();

  return (
    <AppShell sidebar={<SideBar />} className="pt-10">
      <section className="grid gap-6">
        <ComingSoonHero
          badge="Coming soon"
          badgeIcon={Lock}
          title="Multimedia library"
          description="We're preparing a curated multimedia catalog. Stay tuned for verified media tools and releases."
          gradientClassName="bg-gradient-to-br from-slate-900/70 via-neutral-950/75 to-slate-950/80"
          overlayClassName="bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_65%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.18),transparent_62%)]"
          actions={[
            {
              label: "Browse software",
              href: `/${locale}/software`,
              variant: "secondary",
            },
          ]}
          secondaryActions={[
            {
              label: "Back to home",
              href: `/${locale}`,
              variant: "ghost",
            },
          ]}
        />
      </section>
    </AppShell>
  );
}
