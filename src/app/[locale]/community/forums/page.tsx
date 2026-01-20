import Link from "next/link";

import { AppShell } from "@/components/layouts/app-shell";
import { SideBar } from "@/components/layouts/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ForumsPage() {
  return (
    <AppShell sidebar={<SideBar />} className="pt-10">
      <section className="space-y-6">
        <Card className="border-white/10 bg-neutral-950/60">
          <CardHeader>
            <CardTitle className="text-base">Community Forums</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-neutral-300">
              قريبًا: قسم مجتمع للمناقشة وطلبات البرامج والألعاب.
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
