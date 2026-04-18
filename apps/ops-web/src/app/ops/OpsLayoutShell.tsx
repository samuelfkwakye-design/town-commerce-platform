'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentAdmin, type CurrentAdmin } from '@/lib/getCurrentAdmin';

function NavItem({
  href,
  label,
  badge,
}: {
  href: string;
  label: string;
  badge?: number | null;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-gray-100"
    >
      <span>{label}</span>

      {badge && badge > 0 ? (
        <span className="ml-3 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

export default function OpsLayoutShell({
  children,
  missingImages = 0,
}: {
  children: React.ReactNode;
  missingImages?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [currentAdmin, setCurrentAdmin] = useState<CurrentAdmin | null>(null);
  const [checked, setChecked] = useState(false);

  const isAuthPage =
    pathname === '/ops/login' ||
    pathname === '/ops/forgot-password' ||
    pathname === '/ops/reset-password';

  const isGlobalSuperAdmin = currentAdmin?.role === 'GLOBAL_SUPER_ADMIN';
  const isTownSuperAdmin = currentAdmin?.role === 'TOWN_SUPER_ADMIN';
  const isWarehouseAdmin = currentAdmin?.role === 'WAREHOUSE_ADMIN';

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const token =
          typeof window !== 'undefined'
            ? localStorage.getItem('admin_token')
            : null;

        if (!token) {
          if (!isAuthPage) {
            router.replace('/ops/login');
          }
          if (!cancelled) {
            setCurrentAdmin(null);
            setChecked(true);
          }
          return;
        }

        const admin = await getCurrentAdmin();

        if (cancelled) return;

        if (!admin) {
          localStorage.removeItem('admin_token');
          document.cookie = 'admin_token=; path=/; max-age=0; samesite=lax';
          setCurrentAdmin(null);
          setChecked(true);

          if (!isAuthPage) {
            router.replace('/ops/login');
          }
          return;
        }

        setCurrentAdmin(admin);
        setChecked(true);

        if (pathname === '/ops/login') {
          router.replace('/ops');
        }
      } catch {
        if (cancelled) return;

        setCurrentAdmin(null);
        setChecked(true);

        if (!isAuthPage) {
          router.replace('/ops/login');
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [pathname, isAuthPage, router]);

  if (isAuthPage) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  if (!checked) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        Checking admin session…
      </div>
    );
  }

  if (!currentAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        Redirecting to login…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <aside className="w-64 border-r bg-white p-4">
          <div className="mb-4">
            <div className="text-lg font-semibold">Ops</div>
            <div className="text-xs text-gray-500">Town Commerce Platform</div>

            <div className="mt-3 rounded-md border bg-slate-50 px-3 py-2">
              <div className="text-sm font-medium text-slate-900">
                {currentAdmin.firstName || currentAdmin.username || currentAdmin.email}
              </div>
              <div className="text-xs text-slate-500">{currentAdmin.email}</div>

              <div className="mt-1 inline-flex rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700">
                {currentAdmin.role}
              </div>

              {(isTownSuperAdmin || isWarehouseAdmin) && currentAdmin.town ? (
                <div className="mt-2 text-xs text-slate-500">
                  Town: {currentAdmin.town.name}
                </div>
              ) : null}
            </div>
          </div>

          <nav className="space-y-1">
            <NavItem href="/ops/dashboard" label="Dashboard" />
            <NavItem href="/ops/orders" label="Orders" />
            <NavItem href="/ops/customers" label="Customers" />
            <NavItem href="/ops/drivers" label="Drivers" />
            <NavItem href="/ops/stock" label="Stock" />
            <NavItem href="/ops/reports" label="Reports" />

            {isGlobalSuperAdmin ? <NavItem href="/ops/promos" label="Promos" /> : null}
            {isGlobalSuperAdmin || isTownSuperAdmin ? (
              <NavItem href="/ops/admins" label="Admins" />
            ) : null}

            {isGlobalSuperAdmin ? (
              <div className="pt-3">
                <div className="px-3 pb-1 text-xs font-semibold uppercase text-gray-500">
                  Locations
                </div>
                <NavItem href="/ops/towns" label="Towns" />
              </div>
            ) : null}

            <div className="pt-3">
              <div className="px-3 pb-1 text-xs font-semibold uppercase text-gray-500">
                Catalog
              </div>

              <NavItem
                href={
                  missingImages > 0
                    ? '/ops/town-products?missingImages=true'
                    : '/ops/town-products'
                }
                label="Town Products"
                badge={missingImages}
              />
              <NavItem href="/ops/categories" label="Categories" />
            </div>
          </nav>

          <div className="mt-6 space-y-2">
            <Link
              href="/ops/change-password"
              className="block w-full rounded border border-slate-300 px-3 py-2 text-center text-sm text-slate-700 hover:bg-slate-50"
            >
              Change Password
            </Link>

            <button
              onClick={() => {
                localStorage.removeItem('admin_token');
                document.cookie = 'admin_token=; path=/; max-age=0; samesite=lax';
                window.location.href = '/ops/login';
              }}
              className="w-full rounded bg-red-500 py-2 text-sm text-white"
            >
              Logout
            </button>
          </div>

          <div className="mt-6 text-xs text-gray-500">
            {missingImages > 0 ? (
              <div>⚠ {missingImages} product(s) missing images</div>
            ) : (
              <div>✅ No missing images</div>
            )}
          </div>
        </aside>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}