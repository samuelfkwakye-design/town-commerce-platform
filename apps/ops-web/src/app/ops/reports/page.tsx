'use client';

import Link from 'next/link';

export default function ReportsHomePage() {
  return (
    <div className="p-4 space-y-4">
      <div>
        <div className="text-sm text-gray-500">
          <Link className="underline" href="/ops/orders">
            Orders
          </Link>{' '}
          <span className="mx-1">/</span>
          <span>Reports</span>
        </div>
        <h1 className="text-xl font-semibold mt-1">Reports</h1>
        <div className="text-sm text-gray-600 mt-1">Operational & accountant-ready reporting.</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Link
          href="/ops/reports/profit"
          className="rounded border bg-white p-4 hover:bg-gray-50"
        >
          <div className="font-medium">Profit & Valuation</div>
          <div className="text-sm text-gray-600 mt-1">
            Stock valuation, selling value, cost value, profit and margin by product.
          </div>
        </Link>

        <div className="rounded border bg-white p-4 opacity-60">
          <div className="font-medium">Net Profit Timeseries</div>
          <div className="text-sm text-gray-600 mt-1">
            Coming next — daily/weekly/monthly net profit view.
          </div>
        </div>
      </div>
    </div>
  );
}
