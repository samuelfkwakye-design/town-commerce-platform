type ApiFetchInit = Omit<RequestInit, 'body' | 'headers'> & {
  body?: unknown;
  headers?: HeadersInit;
};

function getBaseUrl() {
  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE ||
    'http://localhost:3000/api/v1';

  return base.replace(/\/+$/, '');
}

async function getServerAdminToken(): Promise<string | null> {
  try {
    const mod = await import('next/headers');
    const cookieStore = await mod.cookies();
    return cookieStore.get('admin_token')?.value ?? null;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(
  path: string,
  init: ApiFetchInit = {},
): Promise<T> {
  const base = getBaseUrl();

  let adminToken: string | null = null;

  if (typeof window !== 'undefined') {
    adminToken = localStorage.getItem('admin_token');
  } else {
    adminToken = await getServerAdminToken();
  }

  const headers = new Headers(init.headers);

  if (adminToken) {
    headers.set('Authorization', `Bearer ${adminToken}`);
  }

  let body: BodyInit | null | undefined = init.body as any;

  const isFormData =
    typeof FormData !== 'undefined' && body instanceof FormData;

  const isBodyObject =
    body !== null &&
    body !== undefined &&
    typeof body === 'object' &&
    !isFormData &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer);

  if (isBodyObject) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    body = JSON.stringify(body);
  } else if (typeof body === 'string') {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  const res = await fetch(`${base}${path}`, {
    ...init,
    body,
    cache: typeof window === 'undefined' ? 'no-store' : init.cache,
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

  return (await res.json()) as T;
}