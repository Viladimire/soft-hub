import Link from "next/link";

import { defaultLocale, supportedLocales } from "@/i18n/locales";
import { cn } from "@/lib/utils/cn";

import { AppShell } from "@/components/layouts/app-shell";
import { SideBar } from "@/components/layouts/sidebar";
import { HomeSoftwareShowcase } from "@/components/organisms/home-software-showcase";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale ?? defaultLocale;

  if (!supportedLocales.includes(locale as (typeof supportedLocales)[number])) {
    const { notFound } = await import("next/navigation");
    notFound();
  }

  return (
    <AppShell
      hero={
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_40%_20%,rgba(99,102,241,0.22),transparent_55%),radial-gradient(circle_at_80%_0%,rgba(167,139,250,0.16),transparent_55%),radial-gradient(circle_at_0%_60%,rgba(14,165,233,0.10),transparent_60%)]" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent" />

          <div className="mx-auto w-full max-w-7xl px-6 py-20 sm:py-24 lg:py-28">
            <div className="mx-auto max-w-4xl text-center space-y-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-sm font-medium text-white/80">Your trusted software launchpad</span>
              </div>

              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                <span className="block bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                  Download software & games
                </span>
                <span className="mt-2 block bg-gradient-to-r from-blue-400 via-purple-400 to-blue-300 bg-clip-text text-transparent">
                  with verified links
                </span>
              </h1>

              <p className="mx-auto max-w-2xl text-base text-white/60 sm:text-lg">
                Explore curated software titles across platforms with fast direct links — no distractions.
              </p>

              <form
                action={`/${locale}/search`}
                method="GET"
                className="mx-auto w-full max-w-2xl"
              >
                <div className="group relative">
                  <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-blue-500/0 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-30" />
                  <div className="relative flex items-center rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl">
                    <input
                      name="query"
                      type="search"
                      placeholder="Search for software or games..."
                      className="h-14 w-full flex-1 bg-transparent px-6 text-base text-white placeholder:text-white/40 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="mr-2 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:shadow-blue-500/35"
                    >
                      Search
                    </button>
                  </div>
                </div>
              </form>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-sm">
                <span className="text-white/40">Popular:</span>
                {["Chrome", "WinRAR", "VS Code", "Games"].map((item) => (
                  <Link
                    key={item}
                    href={`/${locale}/search?query=${encodeURIComponent(item)}`}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                  >
                    {item}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      }
      sidebar={<SideBar />}
    >
      <section className="rounded-3xl border border-white/10 bg-white/5 py-10 backdrop-blur-sm">
        <div className="grid grid-cols-1 gap-8 px-6 text-center sm:grid-cols-3">
          {[
            { number: "10,000+", label: "Software available" },
            { number: "5M+", label: "Direct downloads served" },
            { number: "3", label: "Supported platforms" },
          ].map((stat) => (
            <div key={stat.label} className="space-y-2">
              <div className="text-4xl font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {stat.number}
              </div>
              <div className="text-sm text-white/60">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <HomeSoftwareShowcase />

      <section className="space-y-6">
        <header className="space-y-2">
          <h2 className="text-3xl font-semibold text-white">Discover categories</h2>
          <p className="text-sm text-white/60">Curated groups to help you pick the right tools.</p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { name: "Software", icon: "💻", href: `/${locale}/software?category=software`, color: "from-blue-500/20 to-cyan-500/20" },
            { name: "Games", icon: "🎮", href: `/${locale}/software?category=games`, color: "from-purple-500/20 to-pink-500/20" },
            { name: "Utilities", icon: "🛠️", href: `/${locale}/software?category=utilities`, color: "from-orange-500/20 to-red-500/20" },
            { name: "Multimedia", icon: "🎬", href: `/${locale}/software?category=multimedia`, color: "from-emerald-500/20 to-green-500/20" },
          ].map((category) => (
            <Link
              key={category.name}
              href={category.href}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/10"
            >
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity group-hover:opacity-100", category.color)} />
              <div className="relative">
                <div className="text-5xl">{category.icon}</div>
                <h3 className="mt-4 text-xl font-semibold text-white group-hover:text-blue-300 transition-colors">
                  {category.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <header className="space-y-2">
          <h2 className="text-3xl font-semibold text-white">Featured platforms</h2>
          <p className="text-sm text-white/60">Start with the ecosystem your team targets.</p>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              name: "Windows",
              code: "WI",
              href: `/${locale}/software?platforms=windows`,
              desc: "The broadest desktop ecosystem with deep enterprise adoption.",
              color: "from-blue-500 to-cyan-500",
            },
            {
              name: "macOS",
              code: "MA",
              href: `/${locale}/software?platforms=mac`,
              desc: "Polished experiences and consistent performance across Apple devices.",
              color: "from-purple-500 to-pink-500",
            },
            {
              name: "Linux",
              code: "LI",
              href: `/${locale}/software?platforms=linux`,
              desc: "Open-source powerhouse for workstations, servers, and IoT.",
              color: "from-orange-500 to-red-500",
            },
          ].map((platform) => (
            <Link
              key={platform.name}
              href={platform.href}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/10"
            >
              <div className={cn("inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br text-white text-xl font-bold", platform.color)}>
                {platform.code}
              </div>
              <h3 className="mt-5 text-xl font-semibold text-white group-hover:text-blue-300 transition-colors">
                {platform.name}
              </h3>
              <p className="mt-3 text-sm text-white/60 leading-relaxed">{platform.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-transparent p-10 text-center">
        <div className="pointer-events-none absolute inset-0 grid-pattern opacity-10" />
        <div className="relative space-y-4">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">Ready to explore?</h2>
          <p className="mx-auto max-w-2xl text-sm text-white/60">
            Browse the complete library of verified software and games.
          </p>
          <Link
            href={`/${locale}/software`}
            className="btn-primary mx-auto w-fit"
          >
            Browse Library
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
