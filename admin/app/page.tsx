'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const TOKEN_KEY = 'softhub_admin_token';

export default function AdminLoginPage() {
  const router = useRouter();

  useEffect(() => {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (token) {
      router.replace('/dashboard');
    }
  }, [router]);

  const handleLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = formData.get('password');

    if (password === 'admin') {
      window.localStorage.setItem(TOKEN_KEY, 'demo-token');
      router.replace('/dashboard');
    } else {
      alert('كلمة المرور غير صحيحة');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-lg"
      >
        <h1 className="mb-4 text-2xl font-semibold text-zinc-900">تسجيل دخول SoftHub Admin</h1>
        <p className="mb-6 text-sm text-zinc-500">استخدم كلمة المرور التجريبية (admin) للدخول.</p>
        <label className="mb-4 block text-sm text-zinc-600">
          كلمة المرور
          <input
            type="password"
            name="password"
            required
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-lg bg-zinc-900 px-4 py-2 font-semibold text-white transition hover:bg-zinc-700"
        >
          دخول
        </button>
      </form>
    </div>
  );
}
