'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentAdmin, type CurrentAdmin } from '@/lib/getCurrentAdmin';
import AdminNotificationsPanel from '@/components/AdminNotificationsPanel';

type AlertsSummary = {
  totals?: {
    alerts?: number;
    high?: number;
  };
};

function NavItem({
  href,
  label,
  badge,
}: {
  href: string;
  label: string;
  badge?: number | null;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition ${
        active
          ? 'bg-emerald-600 text-white shadow-sm'
          : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-800'
      }`}
    >
      <span>{label}</span>

      {badge && badge > 0 ? (
        <span
          className={`ml-3 rounded-full px-2 py-0.5 text-xs font-bold ${
            active ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
          }`}
        >
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
  const [alertsCount, setAlertsCount] = useState(0);
  const [highAlertsCount, setHighAlertsCount] = useState(0);

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
          if (!cancelled) {
            setCurrentAdmin(null);
            setChecked(true);
          }

          if (!isAuthPage) {
            router.replace('/ops/login');
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

  useEffect(() => {
    if (!currentAdmin) return;
    if (!isGlobalSuperAdmin && !isTownSuperAdmin) return;

    let cancelled = false;

    async function loadAlerts() {
      try {
        const token = localStorage.getItem('admin_token') || '';

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/admin/alerts`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!res.ok) return;

        const data = (await res.json()) as AlertsSummary;

        if (!cancelled) {
          setAlertsCount(Number(data?.totals?.alerts || 0));
          setHighAlertsCount(Number(data?.totals?.high || 0));
        }
      } catch {
        // keep sidebar stable if alert polling fails
      }
    }

    loadAlerts();

    const interval = window.setInterval(loadAlerts, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [currentAdmin, isGlobalSuperAdmin, isTownSuperAdmin]);

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-100">
        {children}
      </div>
    );
  }

  if (!checked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-100 p-6 text-slate-700">
        Checking admin session…
      </div>
    );
  }

  if (!currentAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-100 p-6 text-slate-700">
        Redirecting to login…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-white">
      <div className="flex min-h-screen">
        <aside className="w-72 border-r border-emerald-100 bg-white/90 p-4 shadow-sm backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xl font-black tracking-tight text-emerald-800">
                KOSTOMA
              </div>
              <div className="text-xs font-semibold text-slate-500">
                Operations Console
              </div>
            </div>

            <AdminNotificationsPanel />
          </div>

          <div className="mb-5 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white px-4 py-3 shadow-sm">
            <div className="text-sm font-bold text-slate-900">
              {currentAdmin.firstName ||
                currentAdmin.username ||
                currentAdmin.email}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              {currentAdmin.email}
            </div>

            <div className="mt-2 inline-flex rounded-full bg-emerald-700 px-2.5 py-1 text-xs font-bold text-white">
              {currentAdmin.role}
            </div>

            {(isTownSuperAdmin || isWarehouseAdmin) && currentAdmin.town ? (
              <div className="mt-2 text-xs font-semibold text-slate-600">
                Town: {currentAdmin.town.name}
              </div>
            ) : null}
          </div>

          <nav className="space-y-1.5">
            <NavItem href="/ops/dashboard" label="Dashboard" />

            <NavItem
              href="/ops/alerts"
              label={highAlertsCount > 0 ? 'Alerts ⚠' : 'Alerts'}
              badge={alertsCount}
            />

            <NavItem href="/ops/orders" label="Orders" />
            <NavItem href="/ops/customers" label="Customers" />
            <NavItem href="/ops/drivers" label="Drivers" />

            {isGlobalSuperAdmin || isTownSuperAdmin ? (
              <>
                <NavItem href="/ops/cod" label="COD Cash" />
                <NavItem href="/ops/driver-payouts" label="Driver Payouts" />
              </>
            ) : null}

            <NavItem href="/ops/stock" label="Stock" />
            <NavItem href="/ops/reports" label="Reports" />

            {isGlobalSuperAdmin ? (
              <NavItem href="/ops/promos" label="Promos" />
            ) : null}

            {isGlobalSuperAdmin || isTownSuperAdmin ? (
              <NavItem href="/ops/admins" label="Admins" />
            ) : null}

            {isGlobalSuperAdmin ? (
              <div className="pt-4">
                <div className="px-3 pb-2 text-xs font-black uppercase tracking-wide text-emerald-700">
                  Locations
                </div>
                <NavItem href="/ops/towns" label="Towns" />
              </div>
            ) : null}

            <div className="pt-4">
              <div className="px-3 pb-2 text-xs font-black uppercase tracking-wide text-emerald-700">
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
              className="block w-full rounded-xl border border-emerald-100 bg-white px-3 py-2 text-center text-sm font-bold text-slate-700 hover:bg-emerald-50"
            >
              Change Password
            </Link>

            <button
              onClick={() => {
                localStorage.removeItem('admin_token');
                document.cookie =
                  'admin_token=; path=/; max-age=0; samesite=lax';
                window.location.href = '/ops/login';
              }}
              className="w-full rounded-xl bg-red-500 py-2 text-sm font-bold text-white hover:bg-red-600"
            >
              Logout
            </button>
          </div>

          <div className="mt-6 rounded-2xl bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-600">
            {missingImages > 0 ? (
              <div>⚠ {missingImages} product(s) missing images</div>
            ) : (
              <div>✅ No missing images</div>
            )}
          </div>
        </aside>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}