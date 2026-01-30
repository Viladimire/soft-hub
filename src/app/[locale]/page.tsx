import { AppShell } from "@/components/layouts/app-shell";
import { HeroSection } from "@/components/organisms/hero-section";
import { SideBar } from "@/components/layouts/sidebar";
import { OrbitBackground } from "@/components/backgrounds/orbit-background";
import { HomeSoftwareShowcase } from "@/components/organisms/home-software-showcase";

export default function HomePage() {
  return (
    <>
      <OrbitBackground />
      <AppShell hero={<HeroSection />} sidebar={<SideBar />}>
        <section className="grid gap-6 lg:grid-cols-2">
          <a
            href="/en/software"
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl transition hover:border-white/25 hover:bg-white/10"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-rose-500/10 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-300">Explore</p>
              <h2 className="text-2xl font-semibold text-white sm:text-3xl">Browse the library</h2>
              <p className="text-sm text-neutral-300">
                Search, filter, and sort across software, games, and utilities.
              </p>
              <div className="pt-2 text-sm font-semibold text-white/90">Open library</div>
            </div>
          </a>

          <a
            href="/en/collections"
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl transition hover:border-white/25 hover:bg-white/10"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-cyan-500/10 to-emerald-500/10 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-300">Curated</p>
              <h2 className="text-2xl font-semibold text-white sm:text-3xl">View collections</h2>
              <p className="text-sm text-neutral-300">
                Hand-picked bundles of software to kickstart your next project.
              </p>
              <div className="pt-2 text-sm font-semibold text-white/90">Open collections</div>
            </div>
          </a>
        </section>

        <HomeSoftwareShowcase />
      </AppShell>
    </>
  );
}
