'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/admin-auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ login, password }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      localStorage.setItem('admin_token', data.token);

      document.cookie = `admin_token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;

      router.push('/ops');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Login error');
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
        <h1 className="mb-1 text-2xl font-bold text-slate-900">Admin Login</h1>
        <p className="mb-5 text-sm text-slate-500">
          Sign in to access the operations dashboard.
        </p>

        <input
          placeholder="Email or Username"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          className="mb-3 w-full rounded border px-3 py-2"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-2 w-full rounded border px-3 py-2"
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