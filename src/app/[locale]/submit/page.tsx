import Link from "next/link";

import { AppShell } from "@/components/layouts/app-shell";
import { SideBar } from "@/components/layouts/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SubmitPage() {
  return (
    <AppShell sidebar={<SideBar />} className="pt-10">
      <section className="space-y-6">
        <Card className="border-white/10 bg-neutral-950/60">
          <CardHeader>
            <CardTitle className="text-base">إضافة برنامج / لعبة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-neutral-300">
              صفحة الإضافة العامة قيد التجهيز. قريبًا ستقدر تبعت اقتراحات برامج وألعاب مجانية بروابط تحميل مباشرة.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary" className="w-fit">
                <Link href="../admin">لوحة الإدارة</Link>
              </Button>
              <Button asChild variant="ghost" className="w-fit">
                <Link href="../">العودة للرئيسية</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
