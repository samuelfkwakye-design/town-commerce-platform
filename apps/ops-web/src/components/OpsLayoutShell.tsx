import Link from 'next/link';
import { ReactNode } from 'react';
import { getCurrentAdmin } from '@/lib/getCurrentAdmin';

type Props = {
  children: ReactNode;
};

export default async function OpsLayoutShell({ children }: Props) {
  const admin = await getCurrentAdmin();

  const role = admin?.role;

  const nav = [
    { href: '/ops', label: 'Dashboard', show: !!admin },
    {
      href: '/ops/orders',
      label: 'Orders',
      show:
        role === 'GLOBAL_SUPER_ADMIN' ||
        role === 'TOWN_SUPER_ADMIN' ||
        role === 'WAREHOUSE_ADMIN',
    },
    {
      href: '/ops/drivers',
      label: 'Drivers',
      show:
        role === 'GLOBAL_SUPER_ADMIN' ||
        role === 'TOWN_SUPER_ADMIN' ||
        role === 'WAREHOUSE_ADMIN',
    },
    {
      href: '/ops/stock',
      label: 'Stock',
      show:
        role === 'GLOBAL_SUPER_ADMIN' ||
        role === 'TOWN_SUPER_ADMIN' ||
        role === 'WAREHOUSE_ADMIN',
    },
    {
      href: '/ops/reports',
      label: 'Reports',
      show:
        role === 'GLOBAL_SUPER_ADMIN' ||
        role === 'TOWN_SUPER_ADMIN',
    },
    {
      href: '/ops/towns',
      label: 'Towns',
      show: role === 'GLOBAL_SUPER_ADMIN',
    },
    {
      href: '/ops/admins',
      label: 'Admins',
      show:
        role === 'GLOBAL_SUPER_ADMIN' ||
        role === 'TOWN_SUPER_ADMIN',
    },
  ].filter((i) => i.show);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div>
            <div className="font-semibold">Town Commerce Ops</div>
            <div className="text-xs text-gray-500">
              {admin
                ? `${admin.role}${admin.townId ? ' (Town scoped)' : ''}`
                : 'Not logged in'}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
              >
                {n.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4">{children}</div>
    </div>
  );
}