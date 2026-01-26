'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export const AdminHeaderActions = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/admin/session", { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = typeof payload?.message === "string" ? payload.message : "تعذر تسجيل الخروج";
        setError(message);
        return;
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تسجيل الخروج");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
      <Button type="button" variant="outline" className="rounded-full border-white/20" onClick={() => void handleLogout()} disabled={loading}>
        {loading ? "جارٍ تسجيل الخروج..." : "تسجيل الخروج"}
      </Button>
    </div>
  );
};
