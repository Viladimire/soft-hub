"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Status = "idle" | "loading" | "success" | "error";

export const RequestForm = () => {
  const t = useTranslations("pages.request");
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("form.errors.nameRequired"));
      setStatus("error");
      return;
    }

    try {
      setStatus("loading");
      setError(null);
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          websiteUrl: websiteUrl.trim() ? websiteUrl.trim() : null,
          notes: notes.trim() ? notes.trim() : null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = typeof payload?.message === "string" ? payload.message : t("form.errors.generic");
        setError(message);
        setStatus("error");
        return;
      }

      setStatus("success");
      setName("");
      setWebsiteUrl("");
      setNotes("");
    } catch {
      setError(t("form.errors.generic"));
      setStatus("error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-xs text-neutral-400">{t("form.fields.name")}</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("form.placeholders.name")}
            className="bg-neutral-900/80 text-neutral-100"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-xs text-neutral-400">{t("form.fields.website")}</label>
          <Input
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder={t("form.placeholders.website")}
            className="bg-neutral-900/80 text-neutral-100"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs text-neutral-400">{t("form.fields.notes")}</label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("form.placeholders.notes")}
          className="min-h-[120px] bg-neutral-900/80 text-neutral-100"
        />
      </div>

      {status === "success" ? <p className="text-sm text-emerald-300">{t("form.status.success")}</p> : null}
      {status === "error" && error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <Button type="button" variant="primary" onClick={() => void submit()} disabled={status === "loading"}>
        {status === "loading" ? t("form.actions.loading") : t("form.actions.submit")}
      </Button>
    </div>
  );
};
