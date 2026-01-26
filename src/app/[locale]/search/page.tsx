import { AppShell } from "@/components/layouts/app-shell";
import { SideBar } from "@/components/layouts/sidebar";
import { FiltersPanel } from "@/components/organisms/filters-panel";
import { SoftwareGrid } from "@/components/organisms/software-grid";
import { useFilters } from "@/lib/hooks/useFilters";
import { useTranslations } from "next-intl";

export default function SearchPage() {
  const t = useTranslations("pages.search");
  const { snapshot } = useFilters();
  const query = snapshot.searchQuery;

  const title = query ? t("titleWithQuery", { query }) : t("title");
  const subtitle = query ? t("subtitleWithQuery") : t("subtitle");
  const showHint = !query?.length;

  return (
    <AppShell sidebar={<SideBar />} className="pt-10">
      <section className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">{title}</h1>
          <p className="text-sm text-neutral-300">{subtitle}</p>
          {showHint ? (
            <p className="text-xs text-neutral-500">{t("emptyHint")}</p>
          ) : null}
        </header>

        <FiltersPanel />
        <SoftwareGrid />
      </section>
    </AppShell>
  );
}
