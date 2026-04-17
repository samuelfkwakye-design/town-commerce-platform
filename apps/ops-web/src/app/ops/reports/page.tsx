import Link from 'next/link';
import RequireAdminRole from '@/components/RequireAdminRole';

export const dynamic = 'force-dynamic';

export default async function ReportsHomePage() {
  return (
    <RequireAdminRole
      allowedRoles={['GLOBAL_SUPER_ADMIN', 'TOWN_SUPER_ADMIN']}
      requireTownScope={false}
    >
      <div className="space-y-6 p-6">
        <div>
          <div className="text-sm text-slate-500">
            <Link className="hover:underline" href="/ops/orders">
              Orders
            </Link>
            <span className="mx-2">/</span>
            <span>Reports</span>
          </div>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Reports
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Operational and accountant-ready reporting for performance, valuation, and profit.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Link
            href="/ops/reports/profit"
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:bg-slate-50"
          >
            <div className="text-base font-semibold text-slate-900">
              Profit &amp; Valuation
            </div>
            <p className="mt-2 text-sm text-slate-600">
              View stock valuation, selling value, cost value, profit, and margin by product.
            </p>
          </Link>

          <Link
            href="/ops/reports/net-profit"
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:bg-slate-50"
          >
            <div className="text-base font-semibold text-slate-900">
              Net Profit Timeseries
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Track daily, weekly, or monthly net profit, including refund impact.
            </p>
          </Link>
        </div>
      </div>
    </RequireAdminRole>
  );
}