"use client";

import { useState } from "react";
import { Filter } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FiltersPanel } from "@/components/organisms/filters-panel";

export const MobileFilters = () => {
  const t = useTranslations("filters");
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  const positionClass = locale === "ar" ? "left-5" : "right-5";

  return (
    <>
      <Button
        type="button"
        variant="primary"
        onClick={() => setOpen(true)}
        className={`fixed bottom-5 ${positionClass} z-40 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_46px_rgba(79,70,229,0.45)] transition hover:-translate-y-1 hover:shadow-[0_24px_62px_rgba(99,102,241,0.55)] lg:hidden`}
      >
        <Filter className="h-4 w-4" />
        {t("title")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <FiltersPanel />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
