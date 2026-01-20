import { AppShell } from "@/components/layouts/app-shell";
import { HeroSection } from "@/components/organisms/hero-section";
import { SideBar } from "@/components/layouts/sidebar";
import { SoftwareGrid } from "@/components/organisms/software-grid";

export default function HomePage() {
  return (
    <AppShell hero={<HeroSection />} sidebar={<SideBar />}>
      <section className="space-y-6">
        <SoftwareGrid />
      </section>
    </AppShell>
  );
}
