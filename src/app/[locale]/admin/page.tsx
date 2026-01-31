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
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchSoftwareStats } from "@/lib/services/softwareService";
import { readLocalAdminConfig } from "@/lib/services/local-admin-config";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Manage software, collections, analytics, and settings for SOFT-HUB.",
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
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" /> Secure admin access
            </p>
            <h1 className="text-3xl font-semibold text-white">Admin access required</h1>
            <p className="text-sm text-neutral-400">
              Enter your admin secret to unlock the management tools. Your session is stored in a secure cookie.
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

  try {
    const supabase = createSupabaseServerClient();
    const stats = await fetchSoftwareStats(supabase);
    softwareCount = stats.totalPrograms;
    softwareDownloads = stats.totalDownloads;
    softwareViews = stats.totalViews;
  } catch (error) {
    console.error("Failed to load software stats for admin dashboard", error);
  }

  if (githubConfigured) {
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
      title: "Create a new software entry",
      description: "Open the create form inside the Software tab.",
      href: "#software",
    },
    {
      id: "link-collections",
      title: "Manage collections",
      description: "Go to the Collections tab to add or update curated sets.",
      href: "#collections",
    },
    {
      id: "link-dataset",
      title: "Open dataset repository",
      description: "Review JSON datasets on GitHub.",
      href: githubRepoUrl,
      external: true,
    },
  ];

  return (
    <main className="min-h-screen bg-neutral-950 py-12">
      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Admin Dashboard</h1>
            <p className="text-sm text-neutral-400">Manage software, collections, analytics, and settings.</p>
          </div>
          <AdminHeaderActions />
        </div>

        {!githubConfigured ? (
          <section className="mb-8">
            <Card className="border-amber-400/20 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-200">GitHub settings are required to enable dataset management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-amber-100/90">
                <p>
                  Required GitHub variables are missing, so the <strong>Software</strong> and <strong>Collections</strong> tabs will not work until configured.
                </p>
                <div className="rounded-xl border border-amber-300/20 bg-neutral-950/40 p-4 text-xs text-neutral-200">
                  <p className="font-semibold text-neutral-100">Add these values to .env.local:</p>
                  <pre className="mt-2 whitespace-pre-wrap">{`GITHUB_DATA_REPO_OWNER=...\nGITHUB_DATA_REPO_NAME=...\nGITHUB_CONTENT_TOKEN=...\nGITHUB_DATA_REPO_BRANCH=main (optional)\nGITHUB_DATA_REPO_URL=https://github.com/<owner>/<repo> (optional)`}</pre>
                </div>
                <p className="text-xs text-amber-100/80">After setting them: restart your dev server.</p>
              </CardContent>
            </Card>
          </section>
        ) : null}

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <Card className="border-white/10 bg-neutral-900/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-neutral-400">Total software</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-white">{softwareCount}</p>
              <p className="mt-1 text-xs text-neutral-500">Total entries stored in Supabase</p>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-neutral-900/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-neutral-400">Total downloads</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-white">{softwareDownloads.toLocaleString("en-US")}</p>
              <p className="mt-1 text-xs text-neutral-500">Based on published software stats</p>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-neutral-900/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-neutral-400">Views & collections</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-white">{softwareViews.toLocaleString("en-US")}</p>
              <p className="mt-1 text-xs text-neutral-500">Views with {collectionsCount} published collections</p>
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
                  Open link
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
              title: "Software",
              content: <SoftwareAdminPanel />,
            },
            {
              id: "collections",
              title: "Collections",
              content: <CollectionsAdminPanel />,
            },
            {
              id: "analytics",
              title: "Analytics",
              content: <AnalyticsAdminPanel />,
            },
            {
              id: "requests",
              title: "Requests",
              content: <RequestsAdminPanel />,
            },
            {
              id: "settings",
              title: "Settings",
              content: <SettingsAdminPanel />,
            },
          ]}
        />
      </div>
    </main>
  );
}
