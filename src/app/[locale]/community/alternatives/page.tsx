import Link from "next/link";

import { AppShell } from "@/components/layouts/app-shell";
import { SideBar } from "@/components/layouts/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AlternativesPage() {
  return (
    <AppShell sidebar={<SideBar />} className="pt-10">
      <section className="space-y-6">
        <Card className="border-white/10 bg-neutral-950/60">
          <CardHeader>
            <CardTitle className="text-base">Alternatives</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-neutral-300">
              قريبًا: صفحة بدائل البرامج داخل مكتبتنا (برامج وألعاب مجانية فقط).
            </p>
            <Button asChild variant="ghost" className="w-fit">
              <Link href="../../../">العودة للرئيسية</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
