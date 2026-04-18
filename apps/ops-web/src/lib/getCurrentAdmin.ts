import { apiFetch } from '@/lib/api';

export type CurrentAdminRole =
  | 'GLOBAL_SUPER_ADMIN'
  | 'TOWN_SUPER_ADMIN'
  | 'WAREHOUSE_ADMIN';

export type CurrentAdmin = {
  id: string;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: CurrentAdminRole;
  townId: string | null;
  town: { id: string; name: string; slug: string } | null;
  isActive: boolean;
};

function normaliseAdmin(raw: any): CurrentAdmin | null {
  if (!raw || typeof raw !== 'object') return null;
  if (!raw.id || !raw.email || !raw.role) return null;

  return {
    id: String(raw.id),
    email: String(raw.email),
    username: raw.username != null ? String(raw.username) : null,
    firstName: raw.firstName != null ? String(raw.firstName) : null,
    lastName: raw.lastName != null ? String(raw.lastName) : null,
    phone: raw.phone != null ? String(raw.phone) : null,
    role: String(raw.role) as CurrentAdminRole,
    townId: raw.townId != null ? String(raw.townId) : null,
    town:
      raw.town && typeof raw.town === 'object'
        ? {
            id: String(raw.town.id),
            name: String(raw.town.name),
            slug: String(raw.town.slug),
          }
        : null,
    isActive: Boolean(raw.isActive),
  };
}

export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  try {
    const data = await apiFetch('/admin-auth/me', {
      method: 'GET',
      auth: true,
      cache: 'no-store',
    });

    return normaliseAdmin(data);
  } catch {
    return null;
  }
}