import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentAdmin, AdminRole } from '@/lib/getCurrentAdmin';

type Props = {
  children: ReactNode;
  allowedRoles?: AdminRole[];
  requireTownScope?: boolean;
};

export default async function RequireAdminRole({
  children,
  allowedRoles,
  requireTownScope = false,
}: Props) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect('/ops/login');
  }

  if (allowedRoles && !allowedRoles.includes(admin.role)) {
    redirect('/ops');
  }

  if (
    requireTownScope &&
    admin.role !== 'GLOBAL_SUPER_ADMIN' &&
    !admin.townId
  ) {
    redirect('/ops');
  }

  return <>{children}</>;
}
