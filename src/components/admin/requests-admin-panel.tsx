'use client';

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { SoftwareRequest, SoftwareRequestStatus } from "@/lib/types/software-request";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type RequestsDatasetResponse = {
  items: SoftwareRequest[];
  sha: string;
};

type AdminNotification = {
  id: number;
  type: "success" | "error";
  message: string;
};

type RequestError = {
  status?: number;
};

const request = async <T,>(path: string, init?: RequestInit) => {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = typeof payload?.message === "string" ? payload.message : "Request failed";
    const error = new Error(message) as Error & RequestError;
    error.status = response.status;
    throw error;
  }

  return response.json() as Promise<T>;
};

type FormState = {
  id?: string;
  name: string;
  websiteUrl: string;
  notes: string;
  status: SoftwareRequestStatus;
};

const DEFAULT_FORM: FormState = {
  id: undefined,
  name: "",
  websiteUrl: "",
  notes: "",
  status: "new",
};

const statusOptions: Array<{ value: SoftwareRequestStatus; label: string }> = [
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
];

const toFormState = (item: SoftwareRequest): FormState => ({
  id: item.id,
  name: item.name,
  websiteUrl: item.websiteUrl ?? "",
  notes: item.notes ?? "",
  status: item.status,
});

export const RequestsAdminPanel = () => {
  const router = useRouter();
  const [dataset, setDataset] = useState<SoftwareRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM);

  const pushNotification = (type: AdminNotification["type"], message: string) => {
    setNotifications((prev) => [...prev, { id: Date.now(), type, message }]);
    setTimeout(() => {
      setNotifications((prev) => prev.slice(1));
    }, 5000);
  };

  const syncDataset = async () => {
    try {
      setLoading(true);
      const data = await request<RequestsDatasetResponse>("/api/admin/requests");
      setDataset(data.items);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load requests";
      setError(message);
      setDataset([]);
      if ((err as RequestError).status === 401) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        setLoading(true);
        const data = await request<RequestsDatasetResponse>("/api/admin/requests", { signal: controller.signal });
        setDataset(data.items);
        setError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : "Failed to load requests";
        setError(message);
        setDataset([]);
        if ((err as RequestError).status === 401) {
          router.refresh();
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [router]);

  const openCreateForm = () => {
    setFormState(DEFAULT_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (item: SoftwareRequest) => {
    setFormState(toFormState(item));
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setFormState(DEFAULT_FORM);
  };

  const handleFormChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsSaving(true);
      await request<{ item: SoftwareRequest }>("/api/admin/requests", {
        method: "POST",
        body: JSON.stringify({
          id: formState.id,
          name: formState.name,
          websiteUrl: formState.websiteUrl ? formState.websiteUrl : null,
          notes: formState.notes ? formState.notes : null,
          status: formState.status,
        }),
      });

      pushNotification("success", "Request saved");
      closeForm();
      await syncDataset();
    } catch (err) {
      pushNotification("error", err instanceof Error ? err.message : "Failed to save request");
      if ((err as RequestError).status === 401) {
        router.refresh();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: SoftwareRequest) => {
    if (!confirm(`Delete request: ${item.name}?`)) {
      return;
    }

    try {
      setLoading(true);
      await request(`/api/admin/requests?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
      pushNotification("success", "Request deleted");
      await syncDataset();
    } catch (err) {
      pushNotification("error", err instanceof Error ? err.message : "Failed to delete request");
      if ((err as RequestError).status === 401) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = useMemo(
    () =>
      Object.fromEntries(statusOptions.map((s) => [s.value, s.label])) as Record<
        SoftwareRequestStatus,
        string
      >,
    [],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Software requests</h2>
        <p className="text-sm text-neutral-400">Manage incoming software requests (full CRUD).</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="primary" onClick={openCreateForm}>
          New request
        </Button>
        <Button type="button" variant="outline" className="border-white/15" onClick={() => void syncDataset()} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      </div>

      {notifications.length ? (
        <div className="space-y-2">
          {notifications.map((note) => (
            <div
              key={note.id}
              className={
                note.type === "success"
                  ? "rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100"
                  : "rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-100"
              }
            >
              {note.message}
            </div>
          ))}
        </div>
      ) : null}

      {isFormOpen ? (
        <Card className="border-white/10 bg-neutral-950/60">
          <CardHeader>
            <CardTitle className="text-base text-white">{formState.id ? "Edit request" : "Create request"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="block text-xs text-neutral-400">Software name</label>
                <Input
                  value={formState.name}
                  onChange={(event) => handleFormChange("name", event.target.value)}
                  className="bg-neutral-900/80 text-neutral-100"
                  placeholder="e.g. Notion"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs text-neutral-400">Website (optional)</label>
                <Input
                  value={formState.websiteUrl}
                  onChange={(event) => handleFormChange("websiteUrl", event.target.value)}
                  className="bg-neutral-900/80 text-neutral-100"
                  placeholder="https://example.com"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs text-neutral-400">Status</label>
                <select
                  value={formState.status}
                  onChange={(event) => handleFormChange("status", event.target.value as SoftwareRequestStatus)}
                  className="w-full rounded-xl border border-white/10 bg-neutral-900/80 px-3 py-2 text-sm text-neutral-100"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-neutral-950">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs text-neutral-400">Notes</label>
                <Textarea
                  value={formState.notes}
                  onChange={(event) => handleFormChange("notes", event.target.value)}
                  className="min-h-[120px] bg-neutral-900/80 text-neutral-100"
                  placeholder="Any extra details about the request, source, alternatives..."
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="primary" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save"}
                </Button>
                <Button type="button" variant="ghost" onClick={closeForm} className="text-neutral-200">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-white/10 bg-neutral-950/60">
        <CardHeader>
          <CardTitle className="text-base text-white">Requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-neutral-300">
          {loading ? <p className="text-neutral-400">Loading...</p> : null}
          {!loading && !dataset.length ? <p className="text-neutral-400">No requests yet.</p> : null}

          {dataset.map((item) => (
            <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-white">{item.name}</p>
                  <p className="mt-1 text-xs text-neutral-400">{statusLabel[item.status] ?? item.status}</p>
                  {item.websiteUrl ? (
                    <a href={item.websiteUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs text-primary-300 hover:text-primary-200">
                      {item.websiteUrl}
                    </a>
                  ) : null}
                  {item.notes ? <p className="mt-2 text-sm text-neutral-300 whitespace-pre-wrap">{item.notes}</p> : null}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => openEditForm(item)}>
                    Edit
                  </Button>
                  <Button type="button" variant="outline" className="border-white/15" onClick={() => void handleDelete(item)}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
