import Link from "next/link";

import { AppShell } from "@/components/layouts/app-shell";
import { SideBar } from "@/components/layouts/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TrendsPage() {
  return (
    <AppShell sidebar={<SideBar />} className="pt-10">
      <section className="space-y-6">
        <Card className="border-white/10 bg-neutral-950/60">
          <CardHeader>
            <CardTitle className="text-base">Trends</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-neutral-300">
              هذه الصفحة قيد التطوير. حاليًا يمكنك مشاهدة الأكثر شعبية من صفحة المكتبة.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary" className="w-fit">
                <Link href="../../software?sort=popular">عرض الأكثر تحميلًا</Link>
              </Button>
              <Button asChild variant="ghost" className="w-fit">
                <Link href="../">العودة لـ Insights</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
