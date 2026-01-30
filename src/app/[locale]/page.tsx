import { AppShell } from "@/components/layouts/app-shell";
import { HeroSection } from "@/components/organisms/hero-section";
import { SideBar } from "@/components/layouts/sidebar";
import { FiltersPanel } from "@/components/organisms/filters-panel";
import { SoftwareGrid } from "@/components/organisms/software-grid";
import { MobileFilters } from "@/components/organisms/mobile-filters";
import { OrbitBackground } from "@/components/backgrounds/orbit-background";

export default function HomePage() {
  return (
    <>
      <OrbitBackground />
      <AppShell hero={<HeroSection />} sidebar={<SideBar />}>
        <div className="grid gap-8 lg:grid-cols-[320px_1fr] lg:items-start">
          <aside className="hidden lg:block lg:sticky lg:top-28 lg:h-fit">
            <FiltersPanel />
          </aside>
          <main className="min-w-0">
            <SoftwareGrid />
          </main>
        </div>
        <MobileFilters />
      </AppShell>
    </>
  );
}
