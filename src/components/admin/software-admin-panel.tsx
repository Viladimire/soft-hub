'use client';

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

import { formatCompactNumber } from "@/lib/utils/format";
import type { Platform, Software, SoftwareCategory, SoftwareType } from "@/lib/types/software";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const platformOptions: Platform[] = ["windows", "mac", "linux"];
const categoryOptions: SoftwareCategory[] = ["software", "games", "utilities", "operating-systems"];
const STANDARD_TYPE: SoftwareType = "standard";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const DEFAULT_FORM: FormState = {
  id: undefined,
  name: "",
  slug: "",
  summary: "",
  description: "",
  version: "1.0.0",
  sizeInMb: "250",
  downloadUrl: "",
  websiteUrl: "",
  releaseDate: new Date().toISOString().slice(0, 10),
  platforms: [],
  categories: [],
  type: STANDARD_TYPE,
  isFeatured: false,
  logoUrl: "",
  heroImage: "",
  gallery: "",
  statsDownloads: "0",
  statsViews: "0",
  statsRating: "0",
  statsVotes: "0",
  minRequirements: "",
  recRequirements: "",
  changelogJson: "",
  createdAt: undefined,
  updatedAt: undefined,
};

type AdminDatasetResponse = {
  items: Software[];
};

type FormState = {
  id?: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  version: string;
  sizeInMb: string;
  downloadUrl: string;
  websiteUrl: string;
  releaseDate: string;
  platforms: Platform[];
  categories: SoftwareCategory[];
  type: SoftwareType;
  isFeatured: boolean;
  logoUrl: string;
  heroImage: string;
  gallery: string;
  statsDownloads: string;
  statsViews: string;
  statsRating: string;
  statsVotes: string;
  minRequirements: string;
  recRequirements: string;
  changelogJson: string;
  createdAt?: string;
  updatedAt?: string;
};

type AdminNotification = {
  id: number;
  type: "success" | "error";
  message: string;
};

const toFormState = (software: Software): FormState => {
  const sizeInMb = software.sizeInBytes ? (software.sizeInBytes / (1024 * 1024)).toString() : "0";
  const gallery = software.media.gallery.join("\n");
  const minRequirements = software.requirements.minimum?.join("\n") ?? "";
  const recRequirements = software.requirements.recommended?.join("\n") ?? "";
  const releaseDate = software.releaseDate
    ? software.releaseDate.slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const heroImage = software.media.heroImage ?? "";
  const changelogJson = software.changelog?.length
    ? JSON.stringify(software.changelog, null, 2)
    : "";

  return {
    id: software.id,
    name: software.name,
    slug: software.slug,
    summary: software.summary ?? "",
    description: software.description,
    version: software.version,
    sizeInMb,
    downloadUrl: software.downloadUrl,
    websiteUrl: software.websiteUrl ?? "",
    releaseDate,
    platforms: software.platforms,
    categories: software.categories,
    type: software.type ?? STANDARD_TYPE,
    isFeatured: software.isFeatured,
    logoUrl: software.media.logoUrl,
    heroImage,
    gallery,
    statsDownloads: software.stats.downloads.toString(),
    statsViews: software.stats.views.toString(),
    statsRating: software.stats.rating.toString(),
    statsVotes: software.stats.votes.toString(),
    minRequirements,
    recRequirements,
    changelogJson,
    createdAt: software.createdAt,
    updatedAt: software.updatedAt,
  };
};

const parseNumber = (value: string, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseChangelog = (raw: string) => {
  if (!raw.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error("Changelog يجب أن يكون مصفوفة");
    }
    return parsed;
  } catch (error) {
    throw new Error(
      error instanceof Error ? `فشل قراءة الـ Changelog: ${error.message}` : "صيغة Changelog غير صحيحة",
    );
  }
};

const buildSoftwarePayload = (form: FormState) => {
  const now = new Date().toISOString();
  const sizeMb = parseNumber(form.sizeInMb, 0);
  const sizeInBytes = Math.max(Math.round(sizeMb * 1024 * 1024), 0);

  return {
    id: form.id,
    name: form.name.trim(),
    slug: form.slug.trim(),
    summary: form.summary.trim(),
    description: form.description.trim(),
    version: form.version.trim() || "1.0.0",
    sizeInBytes,
    downloadUrl: form.downloadUrl.trim(),
    websiteUrl: form.websiteUrl.trim() || undefined,
    releaseDate: form.releaseDate ? new Date(form.releaseDate).toISOString() : now,
    platforms: form.platforms,
    categories: form.categories,
    type: STANDARD_TYPE,
    isFeatured: form.isFeatured,
    stats: {
      downloads: parseNumber(form.statsDownloads, 0),
      views: parseNumber(form.statsViews, 0),
      rating: parseNumber(form.statsRating, 0),
      votes: parseNumber(form.statsVotes, 0),
    },
    media: {
      logoUrl: form.logoUrl.trim(),
      heroImage: form.heroImage.trim() || undefined,
      gallery: form.gallery
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 3),
    },
    requirements: {
      minimum: form.minRequirements
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
      recommended: form.recRequirements
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    },
    changelog: parseChangelog(form.changelogJson),
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
  };
};

type RequestError = Error & { status?: number };

const request = async <T,>(input: RequestInfo, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(typeof input === "string" ? input : input.toString(), {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody?.message ?? `فشل الطلب (${response.status})`;
    const error = new Error(message) as RequestError;
    error.status = response.status;
    throw error;
  }

  return response.json() as Promise<T>;
};

export const SoftwareAdminPanel = () => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [dataset, setDataset] = useState<Software[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [hasEditedSlug, setHasEditedSlug] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);
        const data = await request<AdminDatasetResponse>("/api/admin/software/supabase", { signal: controller.signal });
        setDataset(data.items);
        setError(null);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        const message = err instanceof Error ? err.message : "تعذر تحميل البيانات";
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
    };

    void load();

    return () => {
      controller.abort();
    };
  }, [router]);

  const pushNotification = (type: AdminNotification["type"], message: string) => {
    setNotifications((prev) => [...prev, { id: Date.now(), type, message }]);
    setTimeout(() => {
      setNotifications((prev) => prev.slice(1));
    }, 5000);
  };

  const openCreateForm = () => {
    setFormState({ ...DEFAULT_FORM, releaseDate: new Date().toISOString().slice(0, 10) });
    setIsFormOpen(true);
    setHasEditedSlug(false);
  };

  const openEditForm = (software: Software) => {
    setFormState(toFormState(software));
    setIsFormOpen(true);
    setHasEditedSlug(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setFormState(DEFAULT_FORM);
    setHasEditedSlug(false);
  };

  const syncDataset = async () => {
    try {
      setLoading(true);
      const data = await request<AdminDatasetResponse>("/api/admin/software/supabase");
      setDataset(data.items);
    } catch (err) {
      const message = err instanceof Error ? err.message : "تعذر تحديث القائمة";
      setError(message);
      if ((err as RequestError).status === 401) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsSaving(true);
      const payload = buildSoftwarePayload(formState);
      await request("/api/admin/software", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      pushNotification("success", "تم حفظ البرنامج بنجاح");
      closeForm();
      await syncDataset();
    } catch (err) {
      pushNotification("error", err instanceof Error ? err.message : "فشل حفظ البرنامج");
      if ((err as RequestError).status === 401) {
        router.refresh();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (software: Software) => {
    if (!confirm(`هل تريد حذف ${software.name}؟`)) {
      return;
    }

    try {
      setLoading(true);
      await request(`/api/admin/software?slug=${encodeURIComponent(software.slug)}`, {
        method: "DELETE",
      });
      pushNotification("success", "تم حذف البرنامج");
      await syncDataset();
    } catch (err) {
      pushNotification("error", err instanceof Error ? err.message : "فشل حذف البرنامج");
      if ((err as RequestError).status === 401) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const totalDownloads = useMemo(
    () => dataset.reduce((sum, item) => sum + (item.stats.downloads ?? 0), 0),
    [dataset],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-neutral-100">لوحة إدارة البرامج</h1>
        <p className="text-sm text-neutral-400">
          تحكم كامل في بيانات الكتالوج المخزن على GitHub. تأكد من أن بياناتك دقيقة قبل الحفظ.
        </p>
      </header>

      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-lg border px-4 py-2 text-sm ${
                notification.type === "success"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  : "border-red-500/40 bg-red-500/10 text-red-200"
              }`}
            >
              {notification.message}
            </div>
          ))}
        </div>
      )}

      <section className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-neutral-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-neutral-400">إجمالي البرامج</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-neutral-100">{dataset.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-neutral-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-neutral-400">إجمالي التحميلات</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-neutral-100">
                {formatCompactNumber(totalDownloads, "ar")}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-neutral-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-neutral-400">آخر تحديث</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl.font-semibold.text-neutral-100">
                {loading ? "..." : mounted ? new Date().toLocaleString("ar-EG") : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-xl.font-semibold.text-neutral-200">قائمة البرامج</h2>
          <div className="flex gap-2">
            <Button onClick={openCreateForm} className="bg-primary-500 text-white hover:bg-primary-400">
              برنامج جديد
            </Button>
            <Button variant="outline" onClick={syncDataset} disabled={loading}>
              تحديث القائمة
            </Button>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          {dataset.map((software) => (
            <Card key={software.id} className="border-white/10 bg-neutral-900/70">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg text-neutral-50">
                  <span>{software.name}</span>
                  <span className="text-xs font-normal text-neutral-500">{software.slug}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-neutral-300">
                <p className="line-clamp-3 text-neutral-400">{software.summary}</p>
                <div className="flex flex-wrap gap-2 text-xs text-neutral-400">
                  {software.platforms.map((platform) => (
                    <span
                      key={platform}
                      className="rounded-full border border-white/10 px-2 py-1 uppercase text-[10px]"
                    >
                      {platform}
                    </span>
                  ))}
                  <span className="rounded-full border border-white/10 px-2 py-1 uppercase text-[10px]">
                    {software.type}
                  </span>
                  {software.isFeatured ? (
                    <span className="rounded-full border border-amber-400/60 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200">
                      مميز
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-3 text-xs text-neutral-500">
                  <span>تحميلات: {software.stats.downloads.toLocaleString("ar-EG")}</span>
                  <span>تقييم: {software.stats.rating.toFixed(1)} ⭐</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => openEditForm(software)}>
                    تعديل
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500/60 text-red-200"
                    onClick={() => handleDelete(software)}
                  >
                    حذف
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {dataset.length === 0 && !loading && !error ? (
          <Card className="border-dashed border-white/10 bg-neutral-900/60">
            <CardContent className="p-6 text-center text-sm text-neutral-400">
              لم يتم إضافة أي برنامج بعد.
            </CardContent>
          </Card>
        ) : null}
      </section>

      {isFormOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-full w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/10 bg-neutral-950/95 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-neutral-100">
                {formState.id ? "تعديل برنامج" : "إضافة برنامج جديد"}
              </h3>
              <Button variant="ghost" onClick={closeForm} className="text-neutral-400 hover:text-neutral-200">
                إغلاق
              </Button>
            </div>

            <form onSubmit={handleFormSubmit} className="mt-6 space-y-6">
              <section className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-neutral-300">اسم البرنامج</label>
                  <Input
                    required
                    value={formState.name}
                    onChange={(event) => {
                      const value = event.target.value;
                      setFormState((state) => ({
                        ...state,
                        name: value,
                        ...(hasEditedSlug ? {} : { slug: slugify(value) }),
                      }));
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-neutral-300">الـ Slug</label>
                  <Input
                    required
                    value={formState.slug}
                    onChange={(event) => {
                      const value = slugify(event.target.value);
                      setFormState((state) => ({ ...state, slug: value }));
                      setHasEditedSlug(true);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-neutral-300">الإصدار</label>
                  <Input
                    value={formState.version}
                    onChange={(event) => setFormState((state) => ({ ...state, version: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-neutral-300">الحجم (ميغابايت)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formState.sizeInMb}
                    onChange={(event) => setFormState((state) => ({ ...state, sizeInMb: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-neutral-300">رابط التحميل</label>
                  <Input
                    required
                    value={formState.downloadUrl}
                    onChange={(event) =>
                      setFormState((state) => ({ ...state, downloadUrl: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-neutral-300">الموقع الرسمي</label>
                  <Input
                    value={formState.websiteUrl}
                    onChange={(event) =>
                      setFormState((state) => ({ ...state, websiteUrl: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-neutral-300">تاريخ الإصدار</label>
                  <Input
                    type="date"
                    value={formState.releaseDate}
                    onChange={(event) =>
                      setFormState((state) => ({ ...state, releaseDate: event.target.value }))
                    }
                  />
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm text-neutral-300">الملخص</label>
                  <Textarea
                    required
                    value={formState.summary}
                    onChange={(event) => setFormState((state) => ({ ...state, summary: event.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm text-neutral-300">الوصف</label>
                  <Textarea
                    required
                    value={formState.description}
                    onChange={(event) =>
                      setFormState((state) => ({ ...state, description: event.target.value }))
                    }
                    rows={6}
                  />
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-neutral-300">شعار البرنامج</label>
                  <Input
                    required
                    value={formState.logoUrl}
                    onChange={(event) => setFormState((state) => ({ ...state, logoUrl: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-neutral-300">صورة البطل</label>
                  <Input
                    value={formState.heroImage}
                    onChange={(event) => setFormState((state) => ({ ...state, heroImage: event.target.value }))}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm text-neutral-300">معرض الصور (كل رابط في سطر)</label>
                  <Textarea
                    value={formState.gallery}
                    onChange={(event) => setFormState((state) => ({ ...state, gallery: event.target.value }))}
                    rows={3}
                  />
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-neutral-300">المنصات المدعومة</label>
                  <div className="flex flex-wrap gap-2">
                    {platformOptions.map((platform) => {
                      const selected = formState.platforms.includes(platform);
                      return (
                        <Button
                          key={platform}
                          type="button"
                          variant={selected ? "primary" : "outline"}
                          className={selected ? "bg-primary-500" : undefined}
                          onClick={() =>
                            setFormState((state) => ({
                              ...state,
                              platforms: selected
                                ? state.platforms.filter((item) => item !== platform)
                                : [...state.platforms, platform],
                            }))
                          }
                        >
                          {platform}
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-neutral-300">الفئات</label>
                  <div className="flex flex-wrap gap-2">
                    {categoryOptions.map((category) => {
                      const selected = formState.categories.includes(category);
                      return (
                        <Button
                          key={category}
                          type="button"
                          variant={selected ? "primary" : "outline"}
                          className={selected ? "bg-primary-500" : undefined}
                          onClick={() =>
                            setFormState((state) => ({
                              ...state,
                              categories: selected
                                ? state.categories.filter((item) => item !== category)
                                : [...state.categories, category],
                            }))
                          }
                        >
                          {category}
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-neutral-300">الظهور في الواجهة</label>
                  <Button
                    type="button"
                    variant={formState.isFeatured ? "primary" : "outline"}
                    className={formState.isFeatured ? "bg-amber-500 text-neutral-900" : undefined}
                    onClick={() => setFormState((state) => ({ ...state, isFeatured: !state.isFeatured }))}
                  >
                    {formState.isFeatured ? "مميز" : "غير مميز"}
                  </Button>
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-neutral-300">تحميلات</label>
                  <Input
                    type="number"
                    min="0"
                    value={formState.statsDownloads}
                    onChange={(event) =>
                      setFormState((state) => ({ ...state, statsDownloads: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-neutral-300">مشاهدات</label>
                  <Input
                    type="number"
                    min="0"
                    value={formState.statsViews}
                    onChange={(event) => setFormState((state) => ({ ...state, statsViews: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-neutral-300">التقييم</label>
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={formState.statsRating}
                    onChange={(event) => setFormState((state) => ({ ...state, statsRating: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-neutral-300">عدد الأصوات</label>
                  <Input
                    type="number"
                    min="0"
                    value={formState.statsVotes}
                    onChange={(event) => setFormState((state) => ({ ...state, statsVotes: event.target.value }))}
                  />
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-neutral-300">المتطلبات الدنيا (سطر لكل بند)</label>
                  <Textarea
                    value={formState.minRequirements}
                    onChange={(event) =>
                      setFormState((state) => ({ ...state, minRequirements: event.target.value }))
                    }
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-neutral-300">المتطلبات الموصى بها (سطر لكل بند)</label>
                  <Textarea
                    value={formState.recRequirements}
                    onChange={(event) =>
                      setFormState((state) => ({ ...state, recRequirements: event.target.value }))
                    }
                    rows={3}
                  />
                </div>
              </section>

              <section className="space-y-2">
                <label className="text-sm text-neutral-300">سجل التحديثات (JSON)</label>
                <Textarea
                  value={formState.changelogJson}
                  onChange={(event) => setFormState((state) => ({ ...state, changelogJson: event.target.value }))}
                  rows={6}
                  placeholder='[\n  {"version":"1.0.0","date":"2024-01-01","highlights":["Initial release"]}\n]'
                />
              </section>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={closeForm}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={isSaving} className="bg-primary-500 text-white hover:bg-primary-400">
                  {isSaving ? "...جارٍ الحفظ" : "حفظ"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
