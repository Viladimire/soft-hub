'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'softhub_admin_software';
const TOKEN_KEY = 'softhub_admin_token';

interface SoftwareItem {
  id: string;
  name: string;
  vendor: string;
  status: string;
}

const fallbackSoftware: SoftwareItem[] = [
  {
    id: 'adobe-photoshop',
    name: 'Adobe Photoshop',
    vendor: 'Adobe Inc.',
    status: 'published',
  },
];

export default function DashboardPage() {
  const [software, setSoftware] = useState<SoftwareItem[]>(fallbackSoftware);

  useEffect(() => {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      window.location.href = '/';
      return;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as SoftwareItem[];
        if (Array.isArray(parsed)) {
          setSoftware(parsed);
        }
      } catch (error) {
        console.warn('Failed to parse stored software entries', error);
      }
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackSoftware));
    }
  }, []);

  const publishedCount = useMemo(
    () => software.filter((item) => item.status === 'published').length,
    [software],
  );

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-8 py-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">SoftHub Admin Dashboard</h1>
        <p className="text-sm text-zinc-500">إدارة المحتوى التجريبي واستعراض حالة البرامج.</p>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-8 py-10">
        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">عدد البرامج</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-900">{software.length}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">منشور</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-600">{publishedCount}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">مسودات</p>
            <p className="mt-2 text-3xl font-semibold text-amber-500">
              {software.length - publishedCount}
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-zinc-900">قائمة البرامج</h2>
            <Link
              href="/software/new/edit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
            >
              إضافة برنامج جديد
            </Link>
          </div>
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  البرنامج
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  المزود
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  الحالة
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white">
              {software.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 text-sm font-medium text-zinc-900">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-zinc-500">{item.vendor}</td>
                  <td className="px-6 py-4 text-sm text-zinc-500">{item.status}</td>
                  <td className="px-6 py-4 text-right text-sm">
                    <Link
                      href={`/software/${item.id}/edit`}
                      className="rounded-lg border border-zinc-300 px-3 py-1 text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-800"
                    >
                      تعديل
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
