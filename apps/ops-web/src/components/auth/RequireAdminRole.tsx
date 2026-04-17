'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getCurrentAdmin,
  type CurrentAdmin,
} from '@/lib/admin/getCurrentAdmin';

type AdminRole =
  | 'GLOBAL_SUPER_ADMIN'
  | 'TOWN_SUPER_ADMIN'
  | 'WAREHOUSE_ADMIN';

export default function RequireAdminRole({
  allowedRoles,
  children,
  redirectTo = '/ops',
}: {
  allowedRoles: AdminRole[];
  children: React.ReactNode;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [admin, setAdmin] = useState<CurrentAdmin | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      const currentAdmin = await getCurrentAdmin();

      if (cancelled) return;

      if (!currentAdmin) {
        localStorage.removeItem('admin_token');
        router.replace('/ops/login');
        return;
      }

      if (!allowedRoles.includes(currentAdmin.role)) {
        router.replace(redirectTo);
        return;
      }

      setAdmin(currentAdmin);
      setChecked(true);
    }

    checkAccess();

    return () => {
      cancelled = true;
    };
  }, [allowedRoles, redirectTo, router]);

  if (!checked || !admin) {
    return <div className="p-6">Checking permissions…</div>;
  }

  return <>{children}</>;
}