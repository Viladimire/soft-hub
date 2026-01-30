'use client';

import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const SettingsAdminPanel = () => {
  const [supabaseStatus, setSupabaseStatus] = useState<
    "unknown" | "ok" | "not_configured" | "not_initialized" | "unauthorized" | "error"
  >("unknown");

  const [configStatus, setConfigStatus] = useState<"idle" | "loading" | "saving" | "error" | "saved">("idle");
  const [deployStatus, setDeployStatus] = useState<"idle" | "deploying" | "success" | "error">("idle");
  const [deployMessage, setDeployMessage] = useState<string>("");
  const [publishStatus, setPublishStatus] = useState<"idle" | "publishing" | "success" | "error">("idle");
  const [publishMessage, setPublishMessage] = useState<string>("");
  const [vercelStatus, setVercelStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [vercelUrl, setVercelUrl] = useState<string>("");
  const [vercelInfo, setVercelInfo] = useState<string>("");
  const [configPath, setConfigPath] = useState<string>("");

  const [localConfig, setLocalConfig] = useState({
    githubOwner: "",
    githubRepo: "",
    githubToken: "",
    githubBranch: "main",
    githubRepoUrl: "",
    supabaseUrl: "",
    supabaseAnonKey: "",
    supabaseServiceRoleKey: "",
    vercelToken: "",
    vercelProjectId: "",
    vercelTeamId: "",
    vercelDeployHookUrl: "",
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setConfigStatus("loading");
        const response = await fetch("/api/admin/local-config");
        if (!active) return;

        if (!response.ok) {
          setConfigStatus("error");
          return;
        }

        const payload = (await response.json()) as { config?: unknown; path?: string };
        const cfg = (payload && typeof payload === "object" && "config" in payload
          ? (payload as { config?: unknown }).config
          : undefined) as
          | {
              github?: {
                owner?: string;
                repo?: string;
                token?: string;
                branch?: string;
                repoUrl?: string;
              };
              supabase?: {
                url?: string;
                anonKey?: string;
                serviceRoleKey?: string;
              };
              vercel?: {
                token?: string;
                projectId?: string;
                teamId?: string;
                deployHookUrl?: string;
              };
            }
          | undefined;
        setConfigPath(payload?.path ?? "");

        setLocalConfig((prev) => ({
          ...prev,
          githubOwner: cfg?.github?.owner ?? "",
          githubRepo: cfg?.github?.repo ?? "",
          githubToken: cfg?.github?.token ?? "",
          githubBranch: cfg?.github?.branch ?? "main",
          githubRepoUrl: cfg?.github?.repoUrl ?? "",
          supabaseUrl: cfg?.supabase?.url ?? "",
          supabaseAnonKey: cfg?.supabase?.anonKey ?? "",
          supabaseServiceRoleKey: cfg?.supabase?.serviceRoleKey ?? "",
          vercelToken: cfg?.vercel?.token ?? "",
          vercelProjectId: cfg?.vercel?.projectId ?? "",
          vercelTeamId: cfg?.vercel?.teamId ?? "",
          vercelDeployHookUrl: cfg?.vercel?.deployHookUrl ?? "",
        }));

        setConfigStatus("idle");
      } catch {
        if (active) setConfigStatus("error");
      }
    };

    void load();
    
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        const response = await fetch("/api/admin/analytics");
        if (!active) return;

        if (response.status === 200) {
          setSupabaseStatus("ok");
          return;
        }

        if (response.status === 501) {
          setSupabaseStatus("not_configured");
          return;
        }

        if (response.status === 503) {
          setSupabaseStatus("not_initialized");
          return;
        }

        if (response.status === 401) {
          setSupabaseStatus("unauthorized");
          return;
        }

        setSupabaseStatus("error");
      } catch {
        if (active) setSupabaseStatus("error");
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">System settings</h2>
        <p className="text-sm text-neutral-400">Quick configuration overview. (Sensitive values are not shown)</p>
      </div>

      <Card className="border-white/10 bg-neutral-950/60">
        <CardHeader>
          <CardTitle className="text-base text-white">Local config (for testing)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-neutral-300">
          <p className="text-xs text-neutral-400">
            This config is stored locally in your project (<strong>.local/soft-hub-admin-config.json</strong>) to simplify testing.
          </p>
          {configPath ? <p className="text-xs text-neutral-500">Path: {configPath}</p> : null}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-xs text-neutral-400">GITHUB_DATA_REPO_OWNER</label>
              <Input
                value={localConfig.githubOwner}
                onChange={(e) => setLocalConfig((prev) => ({ ...prev, githubOwner: e.target.value }))}
                className="bg-neutral-900/80 text-neutral-100"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs text-neutral-400">GITHUB_DATA_REPO_NAME</label>
              <Input
                value={localConfig.githubRepo}
                onChange={(e) => setLocalConfig((prev) => ({ ...prev, githubRepo: e.target.value }))}
                className="bg-neutral-900/80 text-neutral-100"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs text-neutral-400">GITHUB_CONTENT_TOKEN</label>
              <Input
                value={localConfig.githubToken}
                onChange={(e) => setLocalConfig((prev) => ({ ...prev, githubToken: e.target.value }))}
                className="bg-neutral-900/80 text-neutral-100"
                type="password"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs text-neutral-400">GITHUB_DATA_REPO_BRANCH</label>
              <Input
                value={localConfig.githubBranch}
                onChange={(e) => setLocalConfig((prev) => ({ ...prev, githubBranch: e.target.value }))}
                className="bg-neutral-900/80 text-neutral-100"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs text-neutral-400">GITHUB_DATA_REPO_URL</label>
              <Input
                value={localConfig.githubRepoUrl}
                onChange={(e) => setLocalConfig((prev) => ({ ...prev, githubRepoUrl: e.target.value }))}
                className="bg-neutral-900/80 text-neutral-100"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs text-neutral-400">NEXT_PUBLIC_SUPABASE_URL</label>
              <Input
                value={localConfig.supabaseUrl}
                onChange={(e) => setLocalConfig((prev) => ({ ...prev, supabaseUrl: e.target.value }))}
                className="bg-neutral-900/80 text-neutral-100"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="block text-xs text-neutral-400">NEXT_PUBLIC_SUPABASE_ANON_KEY</label>
              <Input
                value={localConfig.supabaseAnonKey}
                onChange={(e) => setLocalConfig((prev) => ({ ...prev, supabaseAnonKey: e.target.value }))}
                className="bg-neutral-900/80 text-neutral-100"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="block text-xs text-neutral-400">SUPABASE_SERVICE_ROLE_KEY</label>
              <Input
                value={localConfig.supabaseServiceRoleKey}
                onChange={(e) => setLocalConfig((prev) => ({ ...prev, supabaseServiceRoleKey: e.target.value }))}
                className="bg-neutral-900/80 text-neutral-100"
                type="password"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="block text-xs text-neutral-400">VERCEL_TOKEN</label>
              <Input
                value={localConfig.vercelToken}
                onChange={(e) => setLocalConfig((prev) => ({ ...prev, vercelToken: e.target.value }))}
                className="bg-neutral-900/80 text-neutral-100"
                type="password"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs text-neutral-400">VERCEL_PROJECT_ID</label>
              <Input
                value={localConfig.vercelProjectId}
                onChange={(e) => setLocalConfig((prev) => ({ ...prev, vercelProjectId: e.target.value }))}
                className="bg-neutral-900/80 text-neutral-100"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs text-neutral-400">VERCEL_TEAM_ID</label>
              <Input
                value={localConfig.vercelTeamId}
                onChange={(e) => setLocalConfig((prev) => ({ ...prev, vercelTeamId: e.target.value }))}
                className="bg-neutral-900/80 text-neutral-100"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="block text-xs text-neutral-400">VERCEL_DEPLOY_HOOK_URL</label>
              <Input
                value={localConfig.vercelDeployHookUrl}
                onChange={(e) => setLocalConfig((prev) => ({ ...prev, vercelDeployHookUrl: e.target.value }))}
                className="bg-neutral-900/80 text-neutral-100"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                const run = async () => {
                  try {
                    setConfigStatus("saving");
                    const response = await fetch("/api/admin/local-config", {
                      method: "PUT",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({
                        github: {
                          owner: localConfig.githubOwner || undefined,
                          repo: localConfig.githubRepo || undefined,
                          token: localConfig.githubToken || undefined,
                          branch: localConfig.githubBranch || undefined,
                          repoUrl: localConfig.githubRepoUrl || undefined,
                        },
                        supabase: {
                          url: localConfig.supabaseUrl || undefined,
                          anonKey: localConfig.supabaseAnonKey || undefined,
                          serviceRoleKey: localConfig.supabaseServiceRoleKey || undefined,
                        },
                        vercel: {
                          token: localConfig.vercelToken || undefined,
                          projectId: localConfig.vercelProjectId || undefined,
                          teamId: localConfig.vercelTeamId || undefined,
                          deployHookUrl: localConfig.vercelDeployHookUrl || undefined,
                        },
                      }),
                    });

                    if (!response.ok) {
                      setConfigStatus("error");
                      return;
                    }

                    setConfigStatus("saved");
                    setTimeout(() => setConfigStatus("idle"), 1200);
                  } catch {
                    setConfigStatus("error");
                  }
                };

                void run();
              }}
            >
              {configStatus === "saving" ? "Saving..." : "Save locally"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={deployStatus === "deploying" || !localConfig.vercelDeployHookUrl}
              onClick={() => {
                const run = async () => {
                  try {
                    setDeployStatus("deploying");
                    setDeployMessage("");
                    const response = await fetch("/api/admin/deploy", { method: "POST" });
                    if (!response.ok) {
                      const payload = (await response.json().catch(() => ({}))) as { message?: string };
                      setDeployMessage(payload?.message ?? "Deploy failed");
                      setDeployStatus("error");
                      setTimeout(() => setDeployStatus("idle"), 2500);
                      return;
                    }

                    const payload = (await response.json().catch(() => ({}))) as { message?: string };
                    setDeployMessage(payload?.message ?? "Deploy triggered");
                    setDeployStatus("success");
                    setTimeout(() => setDeployStatus("idle"), 2000);
                  } catch {
                    setDeployMessage("Deploy failed");
                    setDeployStatus("error");
                    setTimeout(() => setDeployStatus("idle"), 2500);
                  }
                };

                void run();
              }}
            >
              {deployStatus === "deploying" ? "Deploying..." : "Deploy to Vercel"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={publishStatus === "publishing" || !localConfig.vercelDeployHookUrl}
              onClick={() => {
                const run = async () => {
                  try {
                    setPublishStatus("publishing");
                    setPublishMessage("");
                    const response = await fetch("/api/admin/publish", { method: "POST" });
                    const payload = (await response.json().catch(() => ({}))) as { message?: string };
                    if (!response.ok) {
                      setPublishMessage(payload?.message ?? "Publish failed");
                      setPublishStatus("error");
                      setTimeout(() => setPublishStatus("idle"), 3000);
                      return;
                    }

                    setPublishMessage(payload?.message ?? "Publish started");
                    setPublishStatus("success");
                    setTimeout(() => setPublishStatus("idle"), 2500);
                  } catch {
                    setPublishMessage("Publish failed");
                    setPublishStatus("error");
                    setTimeout(() => setPublishStatus("idle"), 3000);
                  }
                };

                void run();
              }}
            >
              {publishStatus === "publishing" ? "Publishing..." : "Publish (GitHub + Vercel)"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={vercelStatus === "loading"}
              onClick={() => {
                const run = async () => {
                  try {
                    setVercelStatus("loading");
                    setVercelInfo("");
                    setVercelUrl("");
                    const response = await fetch("/api/admin/vercel");
                    const payload = (await response.json().catch(() => ({}))) as {
                      latest?: { url?: string; state?: string | null; createdAt?: number };
                      message?: string;
                      vercelStatus?: number;
                      details?: unknown;
                    };

                    if (!response.ok) {
                      setVercelStatus("error");
                      const details = payload?.details ? `\n${JSON.stringify(payload.details).slice(0, 800)}` : "";
                      const upstream = payload?.vercelStatus ? ` (Vercel: ${payload.vercelStatus})` : "";
                      setVercelInfo(`${payload?.message ?? "Failed to fetch deployment URL"}${upstream}${details}`);
                      return;
                    }

                    const url = payload?.latest?.url ?? "";
                    setVercelUrl(url);
                    setVercelInfo(
                      payload?.latest?.state
                        ? `State: ${payload.latest.state}`
                        : "Fetched latest deployment URL",
                    );
                    setVercelStatus("success");
                  } catch {
                    setVercelStatus("error");
                    setVercelInfo("Failed to fetch deployment URL");
                  }
                };

                void run();
              }}
            >
              {vercelStatus === "loading" ? "Fetching..." : "Fetch live URL"}
            </Button>
            {configStatus === "saved" ? <span className="text-xs text-emerald-300">Saved</span> : null}
            {configStatus === "error" ? <span className="text-xs text-rose-300">Failed to save settings</span> : null}
            {deployStatus === "success" ? <span className="text-xs text-emerald-300">Deploy triggered</span> : null}
            {deployStatus === "error" ? <span className="text-xs text-rose-300">Deploy failed</span> : null}
          </div>
          {deployMessage ? <p className="text-xs text-neutral-400">{deployMessage}</p> : null}
          {publishMessage ? <p className="text-xs text-neutral-400">{publishMessage}</p> : null}
          {vercelInfo ? <p className="text-xs text-neutral-400">{vercelInfo}</p> : null}
          {vercelUrl ? (
            <p className="text-xs">
              <a href={vercelUrl} target="_blank" rel="noreferrer" className="text-primary-300 hover:text-primary-200">
                {vercelUrl}
              </a>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-neutral-950/60">
        <CardHeader>
          <CardTitle className="text-base text-white">Configuration status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-neutral-300">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2">
            <span className="text-neutral-200">Supabase Analytics</span>
            <span
              className={
                supabaseStatus === "ok"
                  ? "text-emerald-300"
                  : supabaseStatus === "not_configured" || supabaseStatus === "not_initialized"
                    ? "text-amber-300"
                    : "text-rose-300"
              }
            >
              {supabaseStatus === "unknown"
                ? "Checking..."
                : supabaseStatus === "ok"
                  ? "Enabled"
                  : supabaseStatus === "not_configured"
                    ? "Not configured"
                    : supabaseStatus === "not_initialized"
                      ? "Not initialized"
                    : supabaseStatus === "unauthorized"
                      ? "Unauthorized"
                      : "Error"}
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            If you see &quot;Not configured&quot; it means Supabase environment variables are missing on the server (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).
            <br />
            If you see &quot;Not initialized&quot; it means Supabase is set up, but analytics migrations have not been applied yet.
          </p>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-neutral-950/60">
        <CardHeader>
          <CardTitle className="text-base text-white">Notes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-neutral-300">
          For Supabase analytics in the admin dashboard:
          - Enable Supabase and run migrations.
          - Prefer setting SUPABASE_SERVICE_ROLE_KEY on the server (never expose it in the client).
        </CardContent>
      </Card>
    </div>
  );
};
