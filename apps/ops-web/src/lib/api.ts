type ApiFetchInit = Omit<RequestInit, 'body' | 'headers'> & {
  body?: unknown;
  headers?: HeadersInit;
  auth?: boolean;
};

function getBaseUrl() {
  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE ||
    'http://localhost:3001/api/v1';

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

async function getAdminToken(auth?: boolean): Promise<string | null> {
  if (!auth) return null;

  if (typeof window !== 'undefined') {
    try {
      const fromLocalStorage = localStorage.getItem('admin_token');
      if (fromLocalStorage) return fromLocalStorage;
    } catch {
      // ignore
    }

    try {
      const match = document.cookie.match(/(?:^|;\s*)admin_token=([^;]+)/);
      return match ? decodeURIComponent(match[1]) : null;
    } catch {
      return null;
    }
  }

  return await getServerAdminToken();
}

export async function apiFetch<T = any>(
  path: string,
  init: ApiFetchInit = {},
): Promise<T> {
  const base = getBaseUrl();
  const token = await getAdminToken(init.auth);

  const headers = new Headers(init.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let body: BodyInit | null | undefined = undefined;
  const rawBody = init.body;

  const isFormData =
    typeof FormData !== 'undefined' && rawBody instanceof FormData;

  const isBlob = typeof Blob !== 'undefined' && rawBody instanceof Blob;
  const isArrayBuffer = rawBody instanceof ArrayBuffer;
  const isString = typeof rawBody === 'string';

  const isPlainObject =
    rawBody !== null &&
    rawBody !== undefined &&
    typeof rawBody === 'object' &&
    !isFormData &&
    !isBlob &&
    !isArrayBuffer;

  if (isFormData) {
    body = rawBody;
  } else if (isString) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    body = rawBody;
  } else if (isPlainObject) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    body = JSON.stringify(rawBody);
  } else if (rawBody != null) {
    body = rawBody as BodyInit;
  }

  const res = await fetch(`${base}${path}`, {
    ...init,
    headers,
    body,
    cache: init.cache ?? 'no-store',
    credentials: 'include',
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;

    try {
      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const errorJson = await res.json();
        message =
          errorJson?.message ||
          errorJson?.error ||
          JSON.stringify(errorJson);
      } else {
        const text = await res.text();
        if (text) {
          message = text;
        }
      }
    } catch {
      // keep default message
    }

    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return (await res.json()) as T;
  }

  return (await res.text()) as T;
}