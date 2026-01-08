'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const STORAGE_KEY = 'softhub_admin_software';
const TOKEN_KEY = 'softhub_admin_token';

interface SoftwareForm {
  id: string;
  name: string;
  vendor: string;
  status: 'draft' | 'published';
}

const defaultSoftware: SoftwareForm = {
  id: '',
  name: '',
  vendor: '',
  status: 'draft',
};

export default function EditSoftwarePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<SoftwareForm>(defaultSoftware);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.replace('/');
      return;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? (JSON.parse(stored) as SoftwareForm[]) : [];
    const slug = params?.id ?? 'new';

    if (!parsed.length) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    }

    if (slug === 'new') {
      setIsNew(true);
      setForm({ ...defaultSoftware, id: '' });
      return;
    }

    const existing = parsed.find((item) => item.id === slug);
    if (existing) {
      setForm(existing);
    } else {
      setIsNew(true);
      setForm({ ...defaultSoftware, id: slug });
    }
  }, [params, router]);

  const title = useMemo(() => (isNew ? 'إضافة برنامج جديد' : `تعديل برنامج: ${form.name}`), [isNew, form.name]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const items = stored ? (JSON.parse(stored) as SoftwareForm[]) : [];

    let nextItems: SoftwareForm[];
    if (isNew) {
      const id = form.id || form.name.toLowerCase().replace(/\s+/g, '-');
      const newItem = { ...form, id };
      nextItems = [...items.filter((item) => item.id !== id), newItem];
    } else {
      nextItems = items.map((item) => (item.id === form.id ? form : item));
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
    alert('تم حفظ التغييرات بنجاح (تخزين محلي تجريبي)');
    router.replace('/dashboard');
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10">
      <div className="mx-auto w-full max-w-3xl rounded-xl border border-zinc-200 bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
        <p className="mt-2 text-sm text-zinc-500">يتم التخزين محلياً لأغراض العرض فقط.</p>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm text-zinc-600">
            المعرّف (Slug)
            <input
              name="id"
              value={form.id}
              onChange={handleChange}
              required
              placeholder="مثال: adobe-photoshop"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring"
            />
          </label>

          <label className="block text-sm text-zinc-600">
            اسم البرنامج
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring"
            />
          </label>

          <label className="block text-sm text-zinc-600">
            المزود
            <input
              name="vendor"
              value={form.vendor}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring"
            />
          </label>

          <label className="block text-sm text-zinc-600">
            الحالة
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring"
            >
              <option value="draft">مسودة</option>
              <option value="published">منشور</option>
            </select>
          </label>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-800"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
            >
              حفظ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
