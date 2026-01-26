import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";

import { AdminTabs } from "@/components/admin/admin-tabs";
import { AdminHeaderActions } from "@/components/admin/admin-header-actions";
import { AdminLogin } from "@/components/admin/admin-login";
import { AnalyticsAdminPanel } from "@/components/admin/analytics-admin-panel";
import { CollectionsAdminPanel } from "@/components/admin/collections-admin-panel";
import { RequestsAdminPanel } from "@/components/admin/requests-admin-panel";
import { SettingsAdminPanel } from "@/components/admin/settings-admin-panel";
import { SoftwareAdminPanel } from "@/components/admin/software-admin-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ADMIN_SESSION_COOKIE_NAME, isValidAdminSessionValue } from "@/lib/auth/admin-session";
import { fetchCollectionsDatasetFromGitHub } from "@/lib/services/github/collectionsDataStore";
import { fetchSoftwareDatasetFromGitHub } from "@/lib/services/github/softwareDataStore";
import { readLocalAdminConfig } from "@/lib/services/local-admin-config";

export const metadata: Metadata = {
  title: "لوحة الإدارة",
  description: "إدارة بيانات البرامج والمجموعات الخاصة ببوابة SOFT-HUB.",
};

const isGitHubDataConfigured = async () => {
  if (process.env.GITHUB_DATA_REPO_OWNER && process.env.GITHUB_DATA_REPO_NAME && process.env.GITHUB_CONTENT_TOKEN) {
    return true;
  }

  const local = await readLocalAdminConfig();
  return Boolean(local.github?.owner && local.github?.repo && local.github?.token);
};

const resolveGitHubRepoUrl = async () => {
  if (process.env.GITHUB_DATA_REPO_URL) return process.env.GITHUB_DATA_REPO_URL;

  const local = await readLocalAdminConfig();
  if (local.github?.repoUrl) return local.github.repoUrl;
  if (local.github?.owner && local.github?.repo) {
    return `https://github.com/${local.github.owner}/${local.github.repo}`;
  }

  return "https://github.com";
};

export default async function AdminPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  const isAuthorized = isValidAdminSessionValue(sessionCookie);

  if (!isAuthorized) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-950 px-4 py-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.25),_transparent_55%)]" />
        <section className="relative z-10 w-full max-w-lg space-y-6 text-center">
          <header className="space-y-2">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-neutral-900/70 px-4 py-1 text-xs text-neutral-300">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" /> لوحة التحكم المؤمنة
            </p>
            <h1 className="text-3xl font-semibold text-white">أمان الوصول مطلوب</h1>
            <p className="text-sm text-neutral-400">
              أدخل مفتاح الإدارة السري لفتح أدوات إدارة البرامج والمجموعات. يتم حفظ الجلسة في كوكي محمية.
            </p>
          </header>
          <AdminLogin />
        </section>
      </main>
    );
  }

  const githubConfigured = await isGitHubDataConfigured();
  const githubRepoUrl = await resolveGitHubRepoUrl();

  let softwareCount = 0;
  let softwareDownloads = 0;
  let softwareViews = 0;
  let collectionsCount = 0;

  if (githubConfigured) {
    try {
      const { items } = await fetchSoftwareDatasetFromGitHub();
      softwareCount = items.length;
      softwareDownloads = items.reduce((total, item) => total + (item.stats?.downloads ?? 0), 0);
      softwareViews = items.reduce((total, item) => total + (item.stats?.views ?? 0), 0);
    } catch (error) {
      console.error("Failed to load software dataset for admin dashboard", error);
    }

    try {
      const { items } = await fetchCollectionsDatasetFromGitHub();
      collectionsCount = items.length;
    } catch (error) {
      console.error("Failed to load collections dataset for admin dashboard", error);
    }
  }

  const quickLinks: Array<{
    id: string;
    title: string;
    description: string;
    href: string;
    external?: boolean;
  }> = [
    {
      id: "link-software",
      title: "إنشاء برنامج جديد",
      description: "ابدأ نموذج الإضافة داخل تبويب إدارة البرامج.",
      href: "#software",
    },
    {
      id: "link-collections",
      title: "تنظيم المجموعات",
      description: "انتقل إلى تبويب المجموعات لإضافة أو تحديث التجميعات.",
      href: "#collections",
    },
    {
      id: "link-dataset",
      title: "فتح مستودع البيانات",
      description: "استعرض بيانات JSON على GitHub للمراجعة السريعة.",
      href: githubRepoUrl,
      external: true,
    },
  ];

  return (
    <main className="min-h-screen bg-neutral-950 py-12">
      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">لوحة الإدارة</h1>
            <p className="text-sm text-neutral-400">إدارة البرامج، المجموعات، التحليلات، والإعدادات.</p>
          </div>
          <AdminHeaderActions />
        </div>

        {!githubConfigured ? (
          <section className="mb-8">
            <Card className="border-amber-400/20 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-200">إعدادات GitHub مطلوبة لتفعيل إدارة البرامج والمجموعات</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-amber-100/90">
                <p>
                  لم يتم ضبط متغيرات GitHub المطلوبة، لذلك تبويبات <strong>البرامج</strong> و<strong>المجموعات</strong> لن تعمل حتى يتم ضبطها.
                </p>
                <div className="rounded-xl border border-amber-300/20 bg-neutral-950/40 p-4 text-xs text-neutral-200">
                  <p className="font-semibold text-neutral-100">ضع القيم التالية في .env.local:</p>
                  <pre className="mt-2 whitespace-pre-wrap">{`GITHUB_DATA_REPO_OWNER=...\nGITHUB_DATA_REPO_NAME=...\nGITHUB_CONTENT_TOKEN=...\nGITHUB_DATA_REPO_BRANCH=main (اختياري)\nGITHUB_DATA_REPO_URL=https://github.com/<owner>/<repo> (اختياري)`}</pre>
                </div>
                <p className="text-xs text-amber-100/80">
                  بعد ضبطها: اقفل السيرفر وشغّله تاني.
                </p>
              </CardContent>
            </Card>
          </section>
        ) : null}

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <Card className="border-white/10 bg-neutral-900/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-neutral-400">عدد البرامج</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-white">{softwareCount}</p>
              <p className="mt-1 text-xs text-neutral-500">إجمالي العناصر المخزنة في GitHub</p>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-neutral-900/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-neutral-400">إجمالي التحميلات</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-white">{softwareDownloads.toLocaleString("ar-EG")}</p>
              <p className="mt-1 text-xs text-neutral-500">حسب إحصاءات البرامج المنشورة</p>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-neutral-900/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-neutral-400">زيارات ولوائح</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-white">{softwareViews.toLocaleString("ar-EG")}</p>
              <p className="mt-1 text-xs text-neutral-500">المشاهَدات مع {collectionsCount} مجموعة منشورة</p>
            </CardContent>
          </Card>
        </section>

        <section className="mb-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <Card key={link.id} className="group border-white/10 bg-neutral-900/70 transition hover:border-primary-400/40 hover:bg-neutral-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-white">{link.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm text-neutral-400">
                <p>{link.description}</p>
                <Link
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noreferrer" : undefined}
                  className="inline-flex items-center gap-2 text-primary-300 transition hover:text-primary-200"
                >
                  فتح الرابط
                  <span aria-hidden className="text-lg">↗</span>
                </Link>
              </CardContent>
            </Card>
          ))}
        </section>

        <AdminTabs
          tabs={[
            {
              id: "software",
              title: "إدارة البرامج",
              content: <SoftwareAdminPanel />,
            },
            {
              id: "collections",
              title: "إدارة المجموعات",
              content: <CollectionsAdminPanel />,
            },
            {
              id: "analytics",
              title: "التحليلات",
              content: <AnalyticsAdminPanel />,
            },
            {
              id: "requests",
              title: "الطلبات",
              content: <RequestsAdminPanel />,
            },
            {
              id: "settings",
              title: "الإعدادات",
              content: <SettingsAdminPanel />,
            },
          ]}
        />
      </div>
    </main>
  );
}
