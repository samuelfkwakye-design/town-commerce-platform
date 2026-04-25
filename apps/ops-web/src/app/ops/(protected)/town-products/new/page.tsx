import NewTownProductClient from './new-client';
import RequireAdminRole from '@/components/RequireAdminRole';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <RequireAdminRole
      allowedRoles={['GLOBAL_SUPER_ADMIN', 'TOWN_SUPER_ADMIN']}
      requireTownScope={false}
    >
      <NewTownProductClient />
    </RequireAdminRole>
  );
}