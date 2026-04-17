import { apiFetch } from '@/lib/api';

export type CurrentAdmin = {
  id: string;
  email: string;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  role: 'GLOBAL_SUPER_ADMIN' | 'TOWN_SUPER_ADMIN' | 'WAREHOUSE_ADMIN';
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt?: string | null;
  townId?: string | null;
  town?: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  try {
    return await apiFetch<CurrentAdmin>('/admin-auth/me', {
      method: 'GET',
    });
  } catch {
    return null;
  }
}