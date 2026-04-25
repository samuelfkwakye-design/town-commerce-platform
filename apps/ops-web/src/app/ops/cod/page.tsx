'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type DriverCod = {
  driverId: string;
  driverName: string | null;
  driverPhone: string | null;
  totalOutstanding: number;
  orders: {
    orderId: string;
    amount: number;
    deliveredAt: string;
  }[];
};

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GHS',
  }).format(n);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function CodPage() {
  const [data, setData] = useState<DriverCod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function loadData() {
    try {
      const res = await apiFetch<DriverCod[]>('/admin/cod/outstanding', {
        auth: true,
      });
      setData(res || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load COD data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function markCollected(orderId: string) {
    if (!confirm('Confirm cash has been collected for this order?')) return;

    setActionLoading(orderId);

    try {
      await apiFetch(`/admin/orders/${orderId}/mark-cod-collected`, {
        method: 'PATCH',
        auth: true,
      });

      // Refresh list after action
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to mark as collected');
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return <div className="p-6">Loading COD data...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">COD Cash</h1>

      {data.length === 0 ? (
        <div className="text-slate-600">No outstanding COD</div>
      ) : (
        <div className="space-y-4">
          {data.map((driver) => (
            <div
              key={driver.driverId}
              className="rounded-2xl border p-4 bg-white shadow-sm"
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold text-lg">
                    {driver.driverName || 'Driver'}
                  </div>
                  <div className="text-sm text-slate-600">
                    {driver.driverPhone || '—'}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl font-bold text-amber-700">
                    {formatMoney(driver.totalOutstanding)}
                  </div>
                  <button
                    className="text-sm text-blue-600 mt-1"
                    onClick={() =>
                      setExpandedDriver(
                        expandedDriver === driver.driverId
                          ? null
                          : driver.driverId,
                      )
                    }
                  >
                    {expandedDriver === driver.driverId
                      ? 'Hide'
                      : 'View orders'}
                  </button>
                </div>
              </div>

              {expandedDriver === driver.driverId && (
                <div className="mt-4 space-y-2">
                  {driver.orders.map((o) => (
                    <div
                      key={o.orderId}
                      className="flex justify-between items-center text-sm border rounded-xl px-3 py-2"
                    >
                      <div>
                        Order {o.orderId.slice(-8)} <br />
                        <span className="text-slate-500">
                          {formatDate(o.deliveredAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="font-semibold">
                          {formatMoney(o.amount)}
                        </div>

                        <button
                          onClick={() => markCollected(o.orderId)}
                          disabled={actionLoading === o.orderId}
                          className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {actionLoading === o.orderId
                            ? 'Processing...'
                            : 'Collected'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}