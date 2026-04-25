'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

type DriverMe = {
  id: string;
  name: string;
  phone: string;
  availability: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  townId: string | null;
};

type DriverOrder = {
  id: string;
  status: 'CONFIRMED' | 'FULFILLED' | 'SETTLED' | string;
  createdAt: string;
  updatedAt: string;
  customerPhone: string | null;
  deliveryRecipientName: string | null;
  deliveryPhone: string | null;
  deliveryLine1: string | null;
  deliveryLine2: string | null;
  deliveryArea: string | null;
  deliveryTown: string | null;
  deliveryLandmark: string | null;
  deliveryNotes: string | null;
  total: string | number;
  driverName: string | null;
  driverPhone: string | null;
  driverAssignedAt: string | null;
  town: { id: string; name: string; slug: string };
  driver: {
    id: string;
    name: string;
    phone: string;
    availability: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  } | null;
};

function formatMoney(value: string | number) {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '—';

  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GHS',
  }).format(n);
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function buildAddress(order: DriverOrder) {
  return [
    order.deliveryLine1,
    order.deliveryLine2,
    order.deliveryArea,
    order.deliveryTown,
    order.deliveryLandmark ? `Landmark: ${order.deliveryLandmark}` : null,
  ]
    .filter(Boolean)
    .join(', ');
}

export default function DriverClient() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [driver, setDriver] = useState<DriverMe | null>(null);
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('driverToken');

    if (!savedToken) {
      router.replace('/ops/driver/login');
      return;
    }

    setToken(savedToken);
  }, [router]);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [meData, ordersData] = await Promise.all([
          apiFetch<DriverMe>('/driver-auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          apiFetch<DriverOrder[]>('/driver/orders', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!cancelled) {
          setDriver(meData);
          setOrders(Array.isArray(ordersData) ? ordersData : []);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load driver dashboard');
          localStorage.removeItem('driverToken');
          router.replace('/ops/driver/login');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  async function refreshOrders(currentToken: string) {
    const data = await apiFetch<DriverOrder[]>('/driver/orders', {
      headers: { Authorization: `Bearer ${currentToken}` },
    });

    setOrders(Array.isArray(data) ? data : []);
  }

  async function doAction(orderId: string, action: 'pickup' | 'delivered') {
    if (!token) return;

    setActionLoadingId(orderId);
    setError(null);

    try {
      await apiFetch(`/driver/orders/${orderId}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const message =
        action === 'pickup'
          ? 'Pickup confirmed. The customer has been notified.'
          : 'Delivery confirmed. The order has been completed.';

      setSuccessMessage(message);
      setError(null);

      if (action === 'delivered') {
        setCompletedOrderId(orderId);
      }

      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(100);
      }

      if (action === 'delivered') {
        setTimeout(async () => {
          await refreshOrders(token);
          setCompletedOrderId(null);
        }, 1200);
      } else {
        await refreshOrders(token);
      }

      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      setError(err?.message || 'Action failed');
    } finally {
      setActionLoadingId(null);
    }
  }

  function logout() {
    localStorage.removeItem('driverToken');
    router.replace('/ops/driver/login');
  }

  const activeOrders = useMemo(() => orders, [orders]);

  if (loading) {
    return (
      <div className="min-h-screen bg-emerald-50 px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-sm ring-1 ring-emerald-100">
          <div className="text-sm text-slate-600">Loading driver dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white px-3 py-4 sm:px-4">
  <div className="mx-auto w-full max-w-md space-y-4 sm:max-w-2xl">
        <div className="sticky top-3 z-10 rounded-[2rem] bg-emerald-700 p-5 text-white shadow-lg shadow-emerald-900/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
                Marketa Driver
              </div>
              <h1 className="mt-3 text-2xl font-bold">{driver?.name || 'Driver'}</h1>
              <p className="mt-1 text-sm text-emerald-50">Phone: {driver?.phone || '—'}</p>
              <p className="mt-1 text-sm text-emerald-50">
                Availability: {driver?.availability || '—'}
              </p>
            </div>

            <button
              onClick={logout}
              className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-emerald-800"
            >
              Log out
            </button>
          </div>
        </div>

        {successMessage ? (
          <div className="rounded-3xl border border-emerald-200 bg-white px-4 py-4 text-sm font-bold text-emerald-800 shadow-sm">
            ✅ {successMessage}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-emerald-100">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Assigned orders</h2>
            <div className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              {activeOrders.length} active
            </div>
          </div>

          {activeOrders.length === 0 ? (
            <div className="rounded-[2rem] bg-emerald-50 px-5 py-10 text-center">
  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl shadow-sm">
    🛵
  </div>
  <div className="text-base font-bold text-slate-900">No jobs assigned</div>
  <div className="mt-1 text-sm text-slate-600">
    New deliveries will appear here as soon as operations assigns them.
  </div>
</div>
          ) : (
            <div className="space-y-4">
              {activeOrders.map((order) => {
                const address = buildAddress(order);
                const isBusy = actionLoadingId === order.id;

                return (
                  <div
                    key={order.id}
                    className={`rounded-3xl border p-4 transition-all duration-500 ${
                      completedOrderId === order.id
                        ? 'scale-[0.99] border-emerald-300 bg-emerald-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    {completedOrderId === order.id ? (
                      <div className="mb-3 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white">
                        ✅ Delivery confirmed
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-base font-bold text-slate-900">
                          Order {order.id.slice(-8)}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          Status: {order.status}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          Town: {order.town?.name || '—'}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-800">
                          Total: {formatMoney(order.total)}
                        </div>
                      </div>

                      <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {order.status}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Recipient
                        </div>
                        <div className="mt-2 text-sm font-semibold text-slate-800">
                          {order.deliveryRecipientName || '—'}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          Delivery phone: {order.deliveryPhone || '—'}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          Customer phone: {order.customerPhone || '—'}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-3">
                        <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Address
                        </div>
                        <div className="mt-2 text-sm text-slate-800">{address || '—'}</div>
                        {order.deliveryNotes ? (
                          <div className="mt-2 text-sm text-slate-600">
                            Notes: {order.deliveryNotes}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 text-xs text-slate-500">
                      Assigned: {formatDate(order.driverAssignedAt)} · Created:{' '}
                      {formatDate(order.createdAt)}
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      {order.status === 'CONFIRMED' ? (
                        <button
                          onClick={() => doAction(order.id, 'pickup')}
                          disabled={isBusy}
                          className="w-full rounded-2xl bg-emerald-600 px-5 py-4 text-base font-bold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        >
                          {isBusy ? 'Confirming pickup...' : 'Confirm pickup'}
                        </button>
                      ) : null}

                      {order.status === 'FULFILLED' ? (
                        <button
                          onClick={() => doAction(order.id, 'delivered')}
                          disabled={isBusy}
                          className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-base font-bold text-white shadow-sm hover:bg-black disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        >
                          {isBusy ? 'Confirming delivery...' : 'Confirm delivered'}
                        </button>
                      ) : null}

                      {order.deliveryPhone ? (
                        <a
                          href={`tel:${order.deliveryPhone}`}
                          className="w-full rounded-2xl border border-slate-300 px-5 py-4 text-center text-base font-bold text-slate-700 sm:w-auto"
                        >
                          Call customer
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}