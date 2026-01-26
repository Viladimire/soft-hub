"use client";

import { useLocale, useTranslations } from "next-intl";

import type { Software } from "@/lib/types/software";

import { SoftwareCard } from "@/components/molecules/software-card";

export const RelatedSoftware = ({ items }: { items: Software[] }) => {
  const locale = useLocale();
  const t = useTranslations("pages.softwareDetail.related");

  if (!items.length) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-neutral-50">{t("title")}</h2>
        <a href={`/${locale}/software`} className="text-sm text-neutral-300 hover:text-neutral-100">
          {t("viewMore")}
        </a>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {items.map((software) => (
          <SoftwareCard key={software.id} software={software} showActions={false} />
        ))}
      </div>
    </section>
  );
};
