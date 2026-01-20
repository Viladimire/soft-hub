"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale } from "next-intl";

import { AppShell } from "@/components/layouts/app-shell";
import { SideBar } from "@/components/layouts/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function FilmsComingSoonPage() {
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "disabled" | "error">("idle");

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;

    try {
      setStatus("loading");
      const response = await fetch("/api/films/notify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: trimmed, locale }),
      });

      if (response.status === 501) {
        setStatus("disabled");
        return;
      }

      if (!response.ok) {
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  return (
    <AppShell sidebar={<SideBar />} className="pt-10">
      <section className="space-y-6">
        <Card className="border-white/10 bg-neutral-950/60">
          <CardHeader>
            <CardTitle className="text-base">الأفلام</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-neutral-300">
              مكتبة الأفلام قادمة قريبًا. حاليًا المنصة تركيزها برامج وألعاب مجانية بروابط تحميل مباشرة.
            </p>

            <div className="grid gap-3 sm:max-w-md">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="اكتب بريدك للتنبيه"
                className="bg-neutral-900/60 text-neutral-100"
              />
              <Button type="button" variant="primary" onClick={() => void handleSubmit()} disabled={status === "loading"}>
                {status === "loading" ? "...جارٍ الإرسال" : "أعلمني عند الإطلاق"}
              </Button>

              {status === "success" ? (
                <p className="text-xs text-emerald-300">تم تسجيل بريدك بنجاح.</p>
              ) : null}
              {status === "disabled" ? (
                <p className="text-xs text-neutral-400">ميزة التنبيه غير مفعّلة حاليًا.</p>
              ) : null}
              {status === "error" ? (
                <p className="text-xs text-rose-300">حصل خطأ. جرّب مرة أخرى.</p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary" className="w-fit">
                <Link href={`/${locale}/software`}>تصفح البرامج والألعاب</Link>
              </Button>
              <Button asChild variant="ghost" className="w-fit">
                <Link href={`/${locale}`}>العودة للرئيسية</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
