import { cookies } from 'next/headers';

export type AdminRole =
  | 'GLOBAL_SUPER_ADMIN'
  | 'TOWN_SUPER_ADMIN'
  | 'WAREHOUSE_ADMIN';

export type CurrentAdmin = {
  id: string;
  email?: string | null;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role: AdminRole;
  townId?: string | null;
  isActive?: boolean;
};

function getApiBaseUrl() {
  const baseUrl =
    process.env.API_BASE ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE;

  if (!baseUrl) {
    throw new Error(
      'Missing API base URL. Set API_BASE or NEXT_PUBLIC_API_BASE_URL.',
    );
  }

  return baseUrl.replace(/\/+$/, '');
}

export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  try {
    const cookieStore = await cookies();

    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join('; ');

    const res = await fetch(`${getApiBaseUrl()}/admin-auth/me`, {
      method: 'GET',
      headers: {
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      cache: 'no-store',
    });

    if (!res.ok) return null;

    const admin = (await res.json()) as CurrentAdmin;

    if (!admin?.id || !admin?.role) return null;

    return admin;
  } catch (err) {
    console.error('getCurrentAdmin failed', err);
    return null;
  }
}