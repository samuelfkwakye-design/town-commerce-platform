'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
  }).format(Number(n || 0));
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function CodPage() {
  const [data, setData] = useState<DriverCod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const totalOutstanding = useMemo(
    () => data.reduce((sum, d) => sum + Number(d.totalOutstanding || 0), 0),
    [data],
  );

  const totalOrders = useMemo(
    () => data.reduce((sum, d) => sum + d.orders.length, 0),
    [data],
  );

  async function loadData() {
    setError(null);

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

  async function markOrderCollected(orderId: string, driverName?: string | null) {
    const ok = confirm(
      `Confirm COD cash has been collected for order ${orderId.slice(-8)}?`,
    );

    if (!ok) return;

    setActionLoading(orderId);
    setError(null);
    setSuccess(null);

    try {
      await apiFetch(`/admin/orders/${orderId}/mark-cod-collected`, {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({
          note: `COD cash collected from ${driverName || 'driver'}`,
        }),
      });

      setSuccess(`COD collected for order ${orderId.slice(-8)}.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to mark COD as collected');
    } finally {
      setActionLoading(null);
    }
  }

  async function markDriverCollected(driver: DriverCod) {
    const ok = confirm(
      `Confirm you collected ${formatMoney(
        driver.totalOutstanding,
      )} from ${driver.driverName || 'this driver'} for ${
        driver.orders.length
      } order(s)?`,
    );

    if (!ok) return;

    setActionLoading(`driver-${driver.driverId}`);
    setError(null);
    setSuccess(null);

    try {
      for (const order of driver.orders) {
        await apiFetch(`/admin/orders/${order.orderId}/mark-cod-collected`, {
          method: 'PATCH',
          auth: true,
          body: JSON.stringify({
            note: `Bulk COD cash collected from ${driver.driverName || 'driver'}`,
          }),
        });
      }

      setSuccess(
        `Collected ${formatMoney(driver.totalOutstanding)} from ${
          driver.driverName || 'driver'
        }.`,
      );

      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to collect all COD for driver');
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-emerald-100">
        Loading COD cash...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-emerald-700 to-emerald-900 p-6 text-white shadow-lg shadow-emerald-900/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide">
              COD Control
            </div>
            <h1 className="mt-3 text-3xl font-black">COD Cash</h1>
            <p className="mt-2 text-sm text-emerald-50">
              Track cash held by drivers and mark collections when money is handed over.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/ops/reports/finance"
              className="rounded-2xl bg-white/15 px-4 py-3 text-sm font-bold text-white hover:bg-white/20"
            >
              Finance
            </Link>

            <button
              onClick={loadData}
              className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-emerald-800"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
          ✅ {success}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-emerald-100">
          <div className="text-xs font-black uppercase tracking-wide text-slate-500">
            Total outstanding
          </div>
          <div className="mt-3 text-3xl font-black text-amber-700">
            {formatMoney(totalOutstanding)}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-emerald-100">
          <div className="text-xs font-black uppercase tracking-wide text-slate-500">
            Drivers holding cash
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">
            {data.length}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-emerald-100">
          <div className="text-xs font-black uppercase tracking-wide text-slate-500">
            Orders pending collection
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">
            {totalOrders}
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-emerald-100">
          <div className="text-4xl">✅</div>
          <div className="mt-3 text-xl font-black text-slate-900">
            No outstanding COD
          </div>
          <div className="mt-1 text-sm text-slate-600">
            All driver cash has been settled.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((driver) => {
            const isExpanded = expandedDriver === driver.driverId;
            const driverBusy = actionLoading === `driver-${driver.driverId}`;

            return (
              <div
                key={driver.driverId}
                className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-emerald-100"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-lg font-black text-slate-900">
                      {driver.driverName || 'Driver'}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {driver.driverPhone || 'No phone'} · {driver.orders.length}{' '}
                      order(s)
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:items-end">
                    <div className="text-2xl font-black text-amber-700">
                      {formatMoney(driver.totalOutstanding)}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          setExpandedDriver(isExpanded ? null : driver.driverId)
                        }
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                      >
                        {isExpanded ? 'Hide orders' : 'View orders'}
                      </button>

                      <button
                        onClick={() => markDriverCollected(driver)}
                        disabled={driverBusy}
                        className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {driverBusy ? 'Collecting...' : 'Collect all'}
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="mt-5 space-y-2">
                    {driver.orders.map((order) => (
                      <div
                        key={order.orderId}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <div className="font-bold text-slate-900">
                            Order {order.orderId.slice(-8)}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Delivered: {formatDate(order.deliveredAt)}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-sm font-black text-amber-700">
                            {formatMoney(order.amount)}
                          </div>

                          <button
                            onClick={() =>
                              markOrderCollected(order.orderId, driver.driverName)
                            }
                            disabled={actionLoading === order.orderId}
                            className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {actionLoading === order.orderId
                              ? 'Processing...'
                              : 'Mark collected'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}