import type { Metadata } from "next";

import { SoftwareAdminPanel } from "@/components/admin/software-admin-panel";

export const metadata: Metadata = {
  title: "لوحة الإدارة",
  description: "إدارة بيانات البرامج المخزنة على GitHub لبوابة SOFT-HUB.",
};

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-neutral-950 py-12">
      <div className="mx-auto w-full max-w-6xl px-4">
        <SoftwareAdminPanel />
      </div>
    </main>
  );
}
