import { AppShell } from "@/components/layouts/app-shell";
import { SideBar } from "@/components/layouts/sidebar";
import { FiltersPanel } from "@/components/organisms/filters-panel";
import { SoftwareGrid } from "@/components/organisms/software-grid";

export default function SoftwareIndexPage() {
  return (
    <AppShell sidebar={<SideBar />} className="pt-10">
      <section className="space-y-6">
        <FiltersPanel />
        <SoftwareGrid />
      </section>
    </AppShell>
  );
}
