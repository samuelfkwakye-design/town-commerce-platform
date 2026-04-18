'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  getCurrentAdmin,
  type CurrentAdmin,
  type CurrentAdminRole,
} from '@/lib/getCurrentAdmin';

type RequireAdminRoleProps = {
  allowedRoles?: CurrentAdminRole[];
  children: ReactNode;
  redirectTo?: string;
  fallback?: ReactNode;
  requireTownScope?: boolean;
};

function hasRequiredRole(
  admin: CurrentAdmin | null,
  allowedRoles?: CurrentAdminRole[],
): boolean {
  if (!admin) return false;
  if (!allowedRoles || allowedRoles.length === 0) return true;
  return allowedRoles.includes(admin.role);
}

export default function RequireAdminRole({
  allowedRoles,
  children,
  redirectTo = '/ops/login',
  fallback,
  requireTownScope = false,
}: RequireAdminRoleProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [admin, setAdmin] = useState<CurrentAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let active = true;

    async function run() {
      try {
        const me = await getCurrentAdmin();
        if (!active) return;
        setAdmin(me);
      } catch {
        if (!active) return;
        setAdmin(null);
      } finally {
        if (!active) return;
        setLoading(false);
        setResolved(true);
      }
    }

    run();

    return () => {
      active = false;
    };
  }, []);

  const authorised = useMemo(() => {
    if (!hasRequiredRole(admin, allowedRoles)) return false;

    if (
      requireTownScope &&
      admin?.role !== 'GLOBAL_SUPER_ADMIN' &&
      !admin?.townId
    ) {
      return false;
    }

    return true;
  }, [admin, allowedRoles, requireTownScope]);

  useEffect(() => {
    if (!resolved || loading) return;

    if (!admin) {
      const next =
        pathname && pathname !== '/ops/login'
          ? `${redirectTo}?next=${encodeURIComponent(pathname)}`
          : redirectTo;
      router.replace(next);
      return;
    }

    if (!authorised) {
      router.replace('/ops');
    }
  }, [admin, authorised, loading, pathname, redirectTo, resolved, router]);

  if (loading || !resolved) {
    return <div className="p-6 text-sm text-slate-600">Checking access...</div>;
  }

  if (!admin) {
    return fallback ?? null;
  }

  if (!authorised) {
    return (
      fallback ?? (
        <div className="p-6">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            You do not have permission to view this page.
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
}