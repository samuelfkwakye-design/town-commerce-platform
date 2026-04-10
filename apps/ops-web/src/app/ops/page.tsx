import Link from 'next/link';
import { apiFetch } from '@/lib/api';

export const dynamic = 'force-dynamic';

type OpsDashboardResponse = {
  productsMissingImages: number;
  lowStockCount: number;
  confirmedStaleCount: number;
};

function StatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-slate-500">{title}</div>
      <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
      <div className="mt-2 text-sm text-slate-500">{hint}</div>
    </div>
  );
}

function ActionCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow"
    >
      <div className="text-lg font-semibold text-slate-900">{title}</div>
      <div className="mt-2 text-sm text-slate-600">{description}</div>
    </Link>
  );
}

export default async function OpsHomePage() {
  let snapshot: OpsDashboardResponse | null = null;

  try {
    snapshot = await apiFetch<OpsDashboardResponse>('/admin/reports/ops-dashboard', {
      method: 'GET',
    });
  } catch {
    snapshot = null;
  }

  const missingImages = snapshot?.productsMissingImages ?? 0;
  const lowStockCount = snapshot?.lowStockCount ?? 0;
  const staleOrders = snapshot?.confirmedStaleCount ?? 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl p-6 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Ops Dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Monitor orders, drivers, stock, catalog quality, and day-to-day operations from one place.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            title="Products Missing Images"
            value={missingImages}
            hint="Catalog items that still need product photos."
          />
          <StatCard
            title="Low Stock Items"
            value={lowStockCount}
            hint="Products that may need urgent stock attention."
          />
          <StatCard
            title="Stale Confirmed Orders"
            value={staleOrders}
            hint="Confirmed orders that may need follow-up."
          />
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold text-slate-900">Quick Actions</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ActionCard
              href="/ops/orders"
              title="Manage Orders"
              description="Review live orders, confirm availability, refund items, and track delivery progress."
            />
            <ActionCard
              href="/ops/drivers"
              title="Manage Drivers"
              description="View drivers by town, update availability, and monitor assignments."
            />
            <ActionCard
              href="/ops/stock"
              title="Review Stock"
              description="Investigate mismatches, inspect movements, and reconcile stock records."
            />
            <ActionCard
              href="/ops/customers"
              title="Customers"
              description="View customer records and support order-related operations."
            />
            <ActionCard
              href="/ops/town-products"
              title="Town Products"
              description="Manage catalog items, image quality, and town-level product coverage."
            />
            <ActionCard
              href="/ops/towns"
              title="Towns & Settings"
              description="Review operational areas and manage town-level configuration."
            />
          </div>
        </div>

        <div className="mt-8 grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Today’s Focus</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div>Check confirmed orders waiting too long for fulfillment.</div>
              <div>Review driver availability before peak order times.</div>
              <div>Resolve missing catalog images to improve customer confidence.</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Next Build Phase</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div>Role-based access for Super Admin and Warehouse Admin.</div>
              <div>Protect action buttons based on role permissions.</div>
              <div>Driver-facing login and delivery workflow.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}