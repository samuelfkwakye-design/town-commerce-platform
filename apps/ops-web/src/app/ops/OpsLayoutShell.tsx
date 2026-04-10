'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type OpsDashboardResponse = {
  productsMissingImages: number;
  lowStockCount: number;
  confirmedStaleCount: number;
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
  missingImages,
}: {
  children: React.ReactNode;
  missingImages: number;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/ops/login';

  if (isLoginPage) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <aside className="w-64 border-r bg-white p-4">
          <div className="mb-4">
            <div className="text-lg font-semibold">Ops</div>
            <div className="text-xs text-gray-500">Town Commerce Platform</div>
          </div>

          <nav className="space-y-1">
            <NavItem href="/ops/dashboard" label="Dashboard" />
            <NavItem href="/ops/orders" label="Orders" />
            <NavItem href="/ops/customers" label="Customers" />
            <NavItem href="/ops/drivers" label="Drivers" />
            <NavItem href="/ops/stock" label="Stock" />
            <NavItem href="/ops/reports" label="Reports" />
            <NavItem href="/ops/promos" label="Promos" />

            <div className="pt-3">
              <div className="px-3 pb-1 text-xs font-semibold uppercase text-gray-500">
                Locations
              </div>
              <NavItem href="/ops/towns" label="Towns" />
            </div>

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
