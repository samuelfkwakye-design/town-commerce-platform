'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export default function AdminLoginPage() {
  const router = useRouter();

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
  const data = await apiFetch<{
    accessToken?: string;
    token?: string;
    admin?: {
      id: string;
      email: string;
      role: string;
    };
  }>('/admin-auth/login', {
    method: 'POST',
    body: { login, password },
  });

      const token = data?.accessToken || data?.token;

if (!token) {
  throw new Error('Invalid login response');
}

localStorage.setItem('admin_token', token);

document.cookie = `admin_token=${token}; path=/; max-age=${
  60 * 60 * 24 * 7
}; samesite=lax`;

      router.replace('/ops');
        } catch (err: any) {
      console.error(err);

      const message =
        err?.message ||
        err?.response?.message ||
        JSON.stringify(err) ||
        'Login failed';

      setError(message);
      alert(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow"
      >
        <h1 className="mb-1 text-2xl font-bold text-slate-900">
          Admin Login
        </h1>
        <p className="mb-5 text-sm text-slate-500">
          Sign in to access the operations dashboard.
        </p>

        <input
          placeholder="Email or Username"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold placeholder:font-normal placeholder:text-slate-400"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold placeholder:font-normal placeholder:text-slate-400"
        />

        <div className="mb-4 text-right">
          <Link
            href="/ops/forgot-password"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Forgot password?
          </Link>
        </div>

        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-black py-2 text-white"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}