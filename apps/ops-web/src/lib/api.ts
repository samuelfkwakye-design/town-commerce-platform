export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  // Prefer the URL you set in .env.local
  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE ||
    'http://localhost:3000/api/v1';

  // Prefer localStorage (so /ops/login can update it), otherwise fall back to env key
  const adminKey =
    typeof window !== 'undefined'
      ? localStorage.getItem('ops_admin_key') || process.env.NEXT_PUBLIC_ADMIN_KEY
      : process.env.NEXT_PUBLIC_ADMIN_KEY;

  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
    ...(adminKey ? { 'x-admin-key': adminKey } : {}),
  };

  if (init.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${base}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed (${res.status})`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return (await res.text()) as unknown as T;
  }

  return res.json();
}
