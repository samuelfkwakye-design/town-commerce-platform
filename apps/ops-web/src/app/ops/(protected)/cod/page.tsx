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

type ConfirmAction =
  | {
      type: 'order';
      orderId: string;
      driverName?: string | null;
      amount?: number;
    }
  | {
      type: 'driver';
      driver: DriverCod;
    }
  | null;

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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const totalOutstanding = useMemo(
    () => data.reduce((sum, d) => sum + Number(d.totalOutstanding || 0), 0),
    [data],
  );

  const totalOrders = useMemo(
    () => data.reduce((sum, d) => sum + d.orders.length, 0),
    [data],
  );

  async function loadData(options?: { silent?: boolean }) {
    if (options?.silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const res = await apiFetch<DriverCod[]>('/admin/cod/outstanding', {
        auth: true,
        cache: 'no-store',
      });

      setData(res || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load COD data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function collectOrder(orderId: string, driverName?: string | null) {
    setActionLoading(orderId);
    setError(null);
    setSuccess(null);

    try {
      await apiFetch(`/admin/orders/${orderId}/mark-cod-collected`, {
        method: 'PATCH',
        auth: true,
        body: {
          note: `COD cash collected from ${driverName || 'driver'}`,
        },
      });

      setSuccess(`COD collected for order ${orderId.slice(-8)}.`);
      await loadData({ silent: true });
    } catch (err: any) {
      setError(err?.message || 'Failed to mark COD as collected');
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
    }
  }

  async function collectDriver(driver: DriverCod) {
    setActionLoading(`driver-${driver.driverId}`);
    setError(null);
    setSuccess(null);

    try {
      for (const order of driver.orders) {
        await apiFetch(`/admin/orders/${order.orderId}/mark-cod-collected`, {
          method: 'PATCH',
          auth: true,
          body: {
            note: `Bulk COD cash collected from ${driver.driverName || 'driver'}`,
          },
        });
      }

      setSuccess(
        `Collected ${formatMoney(driver.totalOutstanding)} from ${
          driver.driverName || 'driver'
        }.`,
      );

      await loadData({ silent: true });
    } catch (err: any) {
      setError(err?.message || 'Failed to collect all COD for driver');
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
    }
  }

  async function confirmCollection() {
    if (!confirmAction) return;

    if (confirmAction.type === 'order') {
      await collectOrder(confirmAction.orderId, confirmAction.driverName);
      return;
    }

    await collectDriver(confirmAction.driver);
  }

  const confirmTitle =
    confirmAction?.type === 'driver'
      ? 'Confirm driver COD collection'
      : 'Confirm order COD collection';

  const confirmMessage =
    confirmAction?.type === 'driver'
      ? `You are confirming that ${formatMoney(
          confirmAction.driver.totalOutstanding,
        )} has been collected from ${
          confirmAction.driver.driverName || 'this driver'
        } for ${confirmAction.driver.orders.length} order(s).`
      : confirmAction?.type === 'order'
        ? `You are confirming that COD cash has been collected for order ${confirmAction.orderId.slice(
            -8,
          )}${
            confirmAction.amount
              ? ` (${formatMoney(confirmAction.amount)})`
              : ''
          }.`
        : '';

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-emerald-100">
        Loading COD cash...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {confirmAction ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="text-xl font-black text-slate-900">
              {confirmTitle}
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              {confirmMessage}
            </p>

            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
              Only confirm this after the cash has physically been handed over
              and counted.
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                disabled={Boolean(actionLoading)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmCollection}
                disabled={Boolean(actionLoading)}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading ? 'Processing...' : 'Confirm collection'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl bg-gradient-to-br from-emerald-700 to-emerald-900 p-6 text-white shadow-lg shadow-emerald-900/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide">
              COD Control
            </div>
            <h1 className="mt-3 text-3xl font-black">COD Cash</h1>
            <p className="mt-2 text-sm text-emerald-50">
              Track cash held by drivers and mark collections when money is
              handed over.
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
              type="button"
              onClick={() => loadData({ silent: true })}
              disabled={refreshing}
              className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
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
                      {driver.driverPhone || 'No phone'} ·{' '}
                      {driver.orders.length} order(s)
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:items-end">
                    <div className="text-2xl font-black text-amber-700">
                      {formatMoney(driver.totalOutstanding)}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedDriver(isExpanded ? null : driver.driverId)
                        }
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                      >
                        {isExpanded ? 'Hide orders' : 'View orders'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirmAction({ type: 'driver', driver })}
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
                            type="button"
                            onClick={() =>
                              setConfirmAction({
                                type: 'order',
                                orderId: order.orderId,
                                driverName: driver.driverName,
                                amount: order.amount,
                              })
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