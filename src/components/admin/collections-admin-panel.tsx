'use client';

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Collection } from "@/lib/types/collection";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type CollectionDatasetResponse = {
  items: Collection[];
  sha: string;
};

type AdminNotification = {
  id: number;
  type: "success" | "error";
  message: string;
};

type FormState = {
  id?: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  coverImageUrl: string;
  accentColor: string;
  themeJson: string;
  isFeatured: boolean;
  displayOrder: string;
  publishedAt: string;
  createdAt?: string;
  itemsJson: string;
};

const DEFAULT_FORM: FormState = {
  slug: "",
  title: "",
  subtitle: "",
  description: "",
  coverImageUrl: "",
  accentColor: "",
  themeJson: "{}",
  isFeatured: false,
  displayOrder: "0",
  publishedAt: "",
  createdAt: undefined,
  itemsJson: "[]",
};

const parseJson = <T,>(label: string, value: string, fallback: T): T => {
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch (error) {
    throw new Error(`فشل تحليل ${label}: ${(error as Error).message}`);
  }
};

const normalizePublishedAt = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("صيغة تاريخ نشر غير صحيحة، يرجى استخدام ISO أو datetime-local");
  }

  return parsed.toISOString();
};

const toFormState = (collection: Collection): FormState => {
  const themeJson = JSON.stringify(collection.theme ?? {}, null, 2);
  const itemsPayload = collection.items.map((item) => ({
    softwareId: item.softwareId || undefined,
    softwareSlug: item.softwareSlug || undefined,
    position: item.position,
    highlight: item.highlight ?? undefined,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));

  return {
    id: collection.id,
    slug: collection.slug,
    title: collection.title,
    subtitle: collection.subtitle ?? "",
    description: collection.description ?? "",
    coverImageUrl: collection.coverImageUrl ?? "",
    accentColor: collection.accentColor ?? "",
    themeJson,
    isFeatured: collection.isFeatured,
    displayOrder: collection.displayOrder.toString(),
    publishedAt: collection.publishedAt ?? "",
    createdAt: collection.createdAt,
    itemsJson: JSON.stringify(itemsPayload, null, 2),
  } satisfies FormState;
};

const buildCollectionPayload = (form: FormState): Collection => {
  const now = new Date().toISOString();
  const theme = parseJson("الثيم", form.themeJson, {} as Collection["theme"]);
  const itemsPayload = parseJson<
    Array<{
      softwareId?: string;
      softwareSlug?: string;
      position?: number;
      highlight?: string | null;
      createdAt?: string;
      updatedAt?: string;
    }>
  >("العناصر", form.itemsJson, []);

  if (!itemsPayload.length) {
    throw new Error("يجب إدخال عنصر واحد على الأقل للمجموعة");
  }

  const collectionId = form.id ?? crypto.randomUUID();
  const publishedAt = normalizePublishedAt(form.publishedAt);
  const displayOrder = Number(form.displayOrder || 0);

  if (!Number.isFinite(displayOrder)) {
    throw new Error("قيمة ترتيب العرض غير صحيحة");
  }

  const createdAt = form.createdAt ?? now;

  const items = itemsPayload.map((item, index) => {
    const softwareKey = item.softwareId ?? item.softwareSlug;

    if (!softwareKey) {
      throw new Error("كل عنصر يجب أن يحتوي على softwareId أو softwareSlug");
    }

    const position = Number.isFinite(item.position) ? (item.position as number) : index;

    const itemCreatedAt = item.createdAt ?? now;
    const itemUpdatedAt = item.updatedAt ?? now;

    return {
      collectionId,
      softwareId: item.softwareId ?? softwareKey,
      softwareSlug: item.softwareSlug,
      position,
      highlight: item.highlight ?? null,
      createdAt: itemCreatedAt,
      updatedAt: itemUpdatedAt,
    } satisfies Collection["items"][number];
  });

  return {
    id: collectionId,
    slug: form.slug.trim(),
    title: form.title.trim(),
    subtitle: form.subtitle.trim() || null,
    description: form.description.trim() || null,
    coverImageUrl: form.coverImageUrl.trim() || null,
    accentColor: form.accentColor.trim() || null,
    theme,
    isFeatured: form.isFeatured,
    displayOrder,
    publishedAt,
    createdAt,
    updatedAt: now,
    items,
  } satisfies Collection;
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

export const CollectionsAdminPanel = () => {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const [dataset, setDataset] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);
        const data = await request<CollectionDatasetResponse>("/api/admin/collections", {
          signal: controller.signal,
        });
        setDataset(data.items);
        setError(null);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        const message = err instanceof Error ? err.message : "تعذر تحميل بيانات المجموعات";
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
    setFormState({
      ...DEFAULT_FORM,
      slug: "",
      title: "",
      themeJson: "{}",
      itemsJson: JSON.stringify(
        [
          {
            softwareSlug: "",
            position: 0,
            highlight: "",
          },
        ],
        null,
        2,
      ),
    });
    setIsFormOpen(true);
  };

  const openEditForm = (collection: Collection) => {
    setFormState(toFormState(collection));
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setFormState(DEFAULT_FORM);
  };

  const syncDataset = async () => {
    try {
      setLoading(true);
      const data = await request<CollectionDatasetResponse>("/api/admin/collections");
      setDataset(data.items);
      setError(null);
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

  const handleFormChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsSaving(true);
      const payload = buildCollectionPayload(formState);
      await request<{ item: Collection }>("/api/admin/collections", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      pushNotification("success", "تم حفظ المجموعة بنجاح");
      closeForm();
      await syncDataset();
    } catch (err) {
      pushNotification("error", err instanceof Error ? err.message : "فشل حفظ المجموعة");
      if ((err as RequestError).status === 401) {
        router.refresh();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (collection: Collection) => {
    if (!confirm(`هل تريد حذف المجموعة ${collection.title}؟`)) {
      return;
    }

    try {
      setLoading(true);
      await request(`/api/admin/collections?slug=${encodeURIComponent(collection.slug)}`, {
        method: "DELETE",
      });
      pushNotification("success", "تم حذف المجموعة");
      await syncDataset();
    } catch (err) {
      pushNotification("error", err instanceof Error ? err.message : "فشل حذف المجموعة");
      if ((err as RequestError).status === 401) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const totalCollections = dataset.length;
  const totalItems = useMemo(
    () => dataset.reduce((sum, item) => sum + item.items.length, 0),
    [dataset],
  );

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-semibold text-neutral-100">لوحة إدارة المجموعات</h2>
          <p className="text-sm text-neutral-400">
            أنشئ وحرر مجموعات البرامج مع التحكم الكامل في بياناتها وثيماتها. يتم حفظ التعديلات مباشرة في مستودع GitHub
            بعد التحقق من صلاحية الجلسة.
          </p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-3">
            <Button onClick={openCreateForm} className="bg-primary-500 text-white hover:bg-primary-400">
              مجموعة جديدة
            </Button>
            <Button variant="outline" onClick={syncDataset} disabled={loading}>
              تحديث القائمة
            </Button>
          </div>
          <p className="text-xs text-neutral-500">
            يتم إرسال جميع الطلبات مع ملف تعريف الارتباط للجلسة (HTTP-only) ويعاد تحميل الصفحة في حال انتهاء الصلاحية.
          </p>
        </div>
      </header>

      {notifications.length ? (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-lg border px-4 py-2 text-sm ${
                notification.type === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-200"
              }`}
            >
              {notification.message}
            </div>
          ))}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-white/10 bg-neutral-950/70">
          <CardContent className="space-y-1 p-4">
            <p className="text-xs text-neutral-400">إجمالي المجموعات</p>
            <p className="text-xl font-semibold text-white">{totalCollections}</p>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-neutral-950/70">
          <CardContent className="space-y-1 p-4">
            <p className="text-xs text-neutral-400">إجمالي العناصر</p>
            <p className="text-xl font-semibold text-white">{totalItems}</p>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-neutral-950/70">
          <CardContent className="space-y-1 p-4">
            <p className="text-xs text-neutral-400">آخر مزامنة</p>
            <p className="text-xl font-semibold text-white">{loading ? "..." : mounted ? new Date().toLocaleString("ar-EG") : "—"}</p>
          </CardContent>
        </Card>
      </section>

      {error ? (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        {dataset.map((collection) => (
          <Card key={collection.id} className="border-white/10 bg-neutral-950/70">
            <CardHeader className="space-y-2">
              <CardTitle className="text-xl text-white">{collection.title}</CardTitle>
              <div className="text-xs text-neutral-400">
                <p>الرمز: {collection.slug}</p>
                <p>ترتيب العرض: {collection.displayOrder}</p>
                <p>الحالة: {collection.publishedAt ? "منشورة" : "مسودة"}</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-neutral-300">
              {collection.description ? <p className="line-clamp-3">{collection.description}</p> : null}
              <div className="flex flex-wrap gap-2 text-xs text-neutral-400">
                <span>عناصر: {collection.items.length}</span>
                {collection.isFeatured ? <span className="text-amber-300">مميزة</span> : null}
                {collection.accentColor ? <span>لون: {collection.accentColor}</span> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => openEditForm(collection)} variant="secondary" className="text-sm">
                  تعديل
                </Button>
                <Button onClick={() => handleDelete(collection)} variant="ghost" className="text-sm text-rose-300">
                  حذف
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {isFormOpen ? (
        <Card className="border-primary-500/30 bg-neutral-950/80">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              {formState.id ? "تعديل المجموعة" : "إنشاء مجموعة جديدة"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleFormSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-xs text-neutral-400">Slug</label>
                  <Input
                    required
                    value={formState.slug}
                    onChange={(event) => handleFormChange("slug", event.target.value)}
                    className="bg-neutral-900/70 text-neutral-100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs text-neutral-400">العنوان</label>
                  <Input
                    required
                    value={formState.title}
                    onChange={(event) => handleFormChange("title", event.target.value)}
                    className="bg-neutral-900/70 text-neutral-100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs text-neutral-400">الوصف المختصر</label>
                  <Input
                    value={formState.subtitle}
                    onChange={(event) => handleFormChange("subtitle", event.target.value)}
                    className="bg-neutral-900/70 text-neutral-100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs text-neutral-400">رابط الغلاف</label>
                  <Input
                    value={formState.coverImageUrl}
                    onChange={(event) => handleFormChange("coverImageUrl", event.target.value)}
                    className="bg-neutral-900/70 text-neutral-100"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs text-neutral-400">الوصف</label>
                <Textarea
                  rows={4}
                  value={formState.description}
                  onChange={(event) => handleFormChange("description", event.target.value)}
                  className="bg-neutral-900/70 text-neutral-100"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="block text-xs text-neutral-400">اللون المميز</label>
                  <Input
                    value={formState.accentColor}
                    onChange={(event) => handleFormChange("accentColor", event.target.value)}
                    className="bg-neutral-900/70 text-neutral-100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs text-neutral-400">ترتيب العرض</label>
                  <Input
                    type="number"
                    value={formState.displayOrder}
                    onChange={(event) => handleFormChange("displayOrder", event.target.value)}
                    className="bg-neutral-900/70 text-neutral-100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs text-neutral-400">تاريخ النشر (اختياري)</label>
                  <Input
                    value={formState.publishedAt}
                    onChange={(event) => handleFormChange("publishedAt", event.target.value)}
                    placeholder="2024-01-01T00:00:00Z"
                    className="bg-neutral-900/70 text-neutral-100"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="isFeatured"
                  type="checkbox"
                  checked={formState.isFeatured}
                  onChange={(event) => handleFormChange("isFeatured", event.target.checked)}
                  className="h-4 w-4 rounded border border-neutral-600 bg-neutral-900 text-primary-500"
                />
                <label htmlFor="isFeatured" className="text-sm text-neutral-300">
                  مجموعة مميزة
                </label>
              </div>

              <div className="space-y-2">
                <label className="block text-xs text-neutral-400">الثيم (JSON)</label>
                <Textarea
                  rows={4}
                  value={formState.themeJson}
                  onChange={(event) => handleFormChange("themeJson", event.target.value)}
                  className="font-mono text-xs text-neutral-100"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs text-neutral-400">العناصر (JSON Array)</label>
                <Textarea
                  rows={6}
                  value={formState.itemsJson}
                  onChange={(event) => handleFormChange("itemsJson", event.target.value)}
                  className="font-mono text-xs text-neutral-100"
                />
                <p className="text-xs text-neutral-500">
                  مثال: <code>{`[{ "softwareSlug": "photoshop", "position": 0, "highlight": "أدوات تصميم" }]`}</code>
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={isSaving} className="bg-primary-500 text-white hover:bg-primary-400">
                  {isSaving ? "جارٍ الحفظ..." : "حفظ المجموعة"}
                </Button>
                <Button type="button" variant="ghost" onClick={closeForm}>
                  إلغاء
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};
