'use client';

import RequireAdminRole from '@/components/auth/RequireAdminRole';
import NewTownClient from './new-town-client';

export default function NewTownPage() {
  return (
    <RequireAdminRole allowedRoles={['GLOBAL_SUPER_ADMIN']}>
      <NewTownClient />
    </RequireAdminRole>
  );
}