'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

type Availability = 'AVAILABLE' | 'BUSY' | 'OFFLINE';

type DriverMe = {
  id: string;
  name: string;
  phone: string;
  availability: Availability;
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
  payOnDeliveryTotal?: string | number;
  goodsPaymentMethod?: 'COD' | 'MOMO' | string;
  driverName: string | null;
  driverPhone: string | null;
  driverAssignedAt: string | null;
  town: { id: string; name: string; slug: string };
  driver: {
    id: string;
    name: string;
    phone: string;
    availability: Availability;
  } | null;
};

type CodSummary = {
  driver: {
    id: string;
    name: string;
    phone: string;
    availability: Availability;
  };
  outstandingAmount: number;
  deliveredCodOrders: Array<{
    orderId: string;
    deliveredAt: string;
    amountDue: number;
    orderTotal: number;
    customerName: string | null;
    customerPhone: string | null;
    area: string | null;
    town: string | null;
    status: 'PENDING_HANDOVER';
  }>;
};
type EarningsSummary = {
  currency: 'GHS';
  earningPerDelivery: number;
  todayDeliveries: number;
  weekDeliveries: number;
  todayEstimatedEarnings: number;
  weekEstimatedEarnings: number;
  recentDeliveries: Array<{
    orderId: string;
    deliveredAt: string | null;
    orderTotal: number;
    goodsPaymentMethod: string;
    codAmount: number;
    estimatedEarning: number;
  }>;
};

type HistoryOrder = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  total: string | number;
  payOnDeliveryTotal: string | number;
  goodsPaymentMethod: string;
  deliveryRecipientName: string | null;
  deliveryPhone: string | null;
  deliveryArea: string | null;
  deliveryTown: string | null;
};

function formatMoney(value: string | number | undefined | null) {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
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
  const [codSummary, setCodSummary] = useState<CodSummary | null>(null);
  const [history, setHistory] = useState<HistoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [pendingAction, setPendingAction] = useState<{
  orderId: string;
  action: 'pickup' | 'delivered';
} | null>(null);

const [copyMessage, setCopyMessage] = useState<string | null>(null);
  useEffect(() => {
    const savedToken = localStorage.getItem('driverToken');

    if (!savedToken) {
      router.replace('/ops/driver/login');
      return;
    }

    setToken(savedToken);
  }, [router]);

  async function loadDashboard(currentToken: string) {
    const [meData, ordersData, codData, historyData, earningsData] = await Promise.all([
      apiFetch<DriverMe>('/driver-auth/me', {
        headers: { Authorization: `Bearer ${currentToken}` },
      }),
      apiFetch<DriverOrder[]>('/driver/orders', {
        headers: { Authorization: `Bearer ${currentToken}` },
      }),
      apiFetch<CodSummary>('/driver/cod/summary', {
        headers: { Authorization: `Bearer ${currentToken}` },
      }),
      apiFetch<HistoryOrder[]>('/driver/orders/history', {
        headers: { Authorization: `Bearer ${currentToken}` },
      }),
      apiFetch<EarningsSummary>('/driver/earnings/summary', {
  headers: { Authorization: `Bearer ${currentToken}` },
}),
    ]);

    setDriver(meData);
    setOrders(Array.isArray(ordersData) ? ordersData : []);
    setCodSummary(codData);
    setHistory(Array.isArray(historyData) ? historyData : []);
    setEarnings(earningsData);
  }

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        await loadDashboard(token as string);

        if (cancelled) return;
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

  async function refreshDashboard(currentToken: string) {
    await loadDashboard(currentToken);
  }

  async function toggleAvailability() {
    if (!token || !driver) return;

    const nextAvailability =
      driver.availability === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE';

    setAvailabilityLoading(true);
    setError(null);

    const previous = driver;

    setDriver({
      ...driver,
      availability: nextAvailability,
    });

    try {
      const updated = await apiFetch<DriverMe>('/driver/availability', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ availability: nextAvailability }),
      });

      setDriver((current) => ({
        ...(current || previous),
        ...updated,
      }));

      setSuccessMessage(
        nextAvailability === 'AVAILABLE'
          ? 'You are now available for deliveries.'
          : 'You are now offline.',
      );

      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(100);
      }

      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setDriver(previous);
      setError(err?.message || 'Failed to update availability');
    } finally {
      setAvailabilityLoading(false);
    }
  }

  async function doAction(orderId: string, action: 'pickup' | 'delivered') {
    if (!token) return;

    setActionLoadingId(orderId);
    setError(null);

    try {
      const result: any = await apiFetch(`/driver/orders/${orderId}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const message =
        action === 'pickup'
          ? 'Pickup confirmed. KOSTOMA has notified the customer.'
          : result?.codPendingHandover
            ? `Delivery confirmed. Please hand over ${formatMoney(
                result?.codAmountDue,
              )} to the town super admin.`
            : 'Delivery confirmed. Order completed via KOSTOMA.';

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
          await refreshDashboard(token);
          setCompletedOrderId(null);
        }, 1200);
      } else {
        await refreshDashboard(token);
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

  function requestAction(orderId: string, action: 'pickup' | 'delivered') {
  setPendingAction({ orderId, action });
}

async function confirmPendingAction() {
  if (!pendingAction) return;

  const next = pendingAction;
  setPendingAction(null);

  await doAction(next.orderId, next.action);
}

async function copyOrCallCustomer(phone: string) {
  const isMobile =
    typeof navigator !== 'undefined' &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobile) {
    window.location.href = `tel:${phone}`;
    return;
  }

  await navigator.clipboard.writeText(phone);
  setCopyMessage(`Phone number copied: ${phone}`);

  setTimeout(() => {
    setCopyMessage(null);
  }, 3000);
}

  function logout() {
    localStorage.removeItem('driverToken');
    router.replace('/ops/driver/login');
  }

  const activeOrders = useMemo(() => orders, [orders]);
  const todayDeliveries = useMemo(() => {
    const today = new Date().toDateString();
    return history.filter((order) => new Date(order.updatedAt).toDateString() === today)
      .length;
  }, [history]);

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
    {pendingAction ? (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
          <div className="text-xl font-black text-slate-900">
            {pendingAction.action === 'pickup'
              ? 'Confirm pickup'
              : 'Confirm delivery'}
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            {pendingAction.action === 'pickup'
              ? 'Please confirm that you have physically picked up this order.'
              : 'Please confirm that this order has been delivered to the customer.'}
          </p>

          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
            Only confirm this action when it has actually happened.
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setPendingAction(null)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={confirmPendingAction}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
            >
              {pendingAction.action === 'pickup'
                ? 'Confirm pickup'
                : 'Confirm delivery'}
            </button>
          </div>
        </div>
      </div>
    ) : null}

    {copyMessage ? (
      <div className="fixed right-4 top-4 z-[110] rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 shadow-lg">
        ✅ {copyMessage}
      </div>
    ) : null}

    <div className="mx-auto w-full max-w-md space-y-4 sm:max-w-2xl">
      <div className="sticky top-3 z-30 rounded-[2rem] border border-emerald-500 bg-emerald-700 p-5 text-white shadow-2xl shadow-emerald-900/20 backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
              KOSTOMA Driver
            </div>
            <h1 className="mt-3 text-2xl font-bold">{driver?.name || 'Driver'}</h1>
            <p className="mt-1 text-sm text-emerald-50">Phone: {driver?.phone || '—'}</p>
            <p className="mt-1 text-sm text-emerald-50">
              Status: <span className="font-bold">{driver?.availability || '—'}</span>
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-3xl bg-white p-4 text-center shadow-sm ring-1 ring-emerald-100">
          <div className="text-2xl font-black text-slate-900">{activeOrders.length}</div>
          <div className="mt-1 text-xs font-semibold text-slate-500">Active</div>
        </div>

        <div className="rounded-3xl bg-white p-4 text-center shadow-sm ring-1 ring-emerald-100">
          <div className="text-2xl font-black text-slate-900">
            {earnings?.todayDeliveries ?? todayDeliveries}
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-500">Today</div>
        </div>

        <div className="rounded-3xl bg-white p-4 text-center shadow-sm ring-1 ring-emerald-100">
          <div className="text-lg font-black text-emerald-700">
            {formatMoney(earnings?.todayEstimatedEarnings || 0)}
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-500">Today pay</div>
        </div>

        <div className="rounded-3xl bg-white p-4 text-center shadow-sm ring-1 ring-emerald-100">
          <div className="text-lg font-black text-amber-700">
            {formatMoney(codSummary?.outstandingAmount || 0)}
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-500">Cash</div>
        </div>
      </div>

      <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-5 text-white shadow-lg shadow-emerald-900/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide">
              Today&apos;s earnings
            </div>

            <div className="mt-3 animate-pulse text-4xl font-black">
              {formatMoney(earnings?.todayEstimatedEarnings || 0)}
            </div>

            <p className="mt-2 text-sm font-semibold text-emerald-50">
              You completed {earnings?.todayDeliveries || 0}{' '}
              {(earnings?.todayDeliveries || 0) === 1 ? 'delivery' : 'deliveries'} today.
            </p>

            <p className="mt-1 text-xs text-emerald-100">
              Estimated at {formatMoney(earnings?.earningPerDelivery || 10)} per delivery.
            </p>
          </div>

          <div className="rounded-2xl bg-white/15 px-4 py-3 text-right">
            <div className="text-xs font-bold uppercase tracking-wide text-emerald-100">
              This week
            </div>
            <div className="mt-1 text-xl font-black">
              {formatMoney(earnings?.weekEstimatedEarnings || 0)}
            </div>
            <div className="mt-1 text-xs font-semibold text-emerald-100">
              {earnings?.weekDeliveries || 0} deliveries
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-emerald-100">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Availability</h2>
            <p className="mt-1 text-sm text-slate-600">
              Toggle whether you are ready to receive deliveries.
            </p>
          </div>
          <button
            onClick={toggleAvailability}
            disabled={availabilityLoading || driver?.availability === 'BUSY'}
            className={`rounded-2xl px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
              driver?.availability === 'AVAILABLE' ? 'bg-slate-900' : 'bg-emerald-600'
            }`}
          >
            {availabilityLoading
              ? 'Updating...'
              : driver?.availability === 'AVAILABLE'
                ? 'Go offline'
                : 'Go available'}
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

      {(codSummary?.outstandingAmount || 0) > 0 ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <h2 className="text-lg font-black text-amber-950">Cash to hand over</h2>
          <div className="mt-2 text-3xl font-black text-amber-900">
            {formatMoney(codSummary?.outstandingAmount || 0)}
          </div>
          <p className="mt-2 text-sm font-semibold text-amber-900">
            This is COD cash from delivered orders. Hand it over to the town super admin.
          </p>

          <div className="mt-4 space-y-2">
            {codSummary?.deliveredCodOrders.slice(0, 4).map((order) => (
              <div key={order.orderId} className="rounded-2xl bg-white/80 px-4 py-3 text-sm">
                <div className="font-bold text-slate-900">
                  Order {order.orderId.slice(-8)} · {formatMoney(order.amountDue)}
                </div>
                <div className="mt-1 text-slate-600">
                  {order.customerName || 'Customer'} · {formatDate(order.deliveredAt)}
                </div>
              </div>
            ))}
          </div>
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
              const isCod =
                order.goodsPaymentMethod === 'COD' &&
                Number(order.payOnDeliveryTotal || 0) > 0;

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

                  {isCod ? (
                    <div className="mb-3 rounded-2xl bg-amber-100 px-4 py-3 text-sm font-bold text-amber-900">
                      Cash on delivery: collect {formatMoney(order.payOnDeliveryTotal)}
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-base font-bold text-slate-900">
                        Order {order.id.slice(-8)}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">Status: {order.status}</div>
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
                        onClick={() => requestAction(order.id, 'pickup')}
                        disabled={isBusy}
                        className="w-full rounded-2xl bg-emerald-600 px-5 py-4 text-base font-bold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                      >
                        {isBusy ? 'Confirming pickup...' : 'Confirm pickup'}
                      </button>
                    ) : null}

                    {order.status === 'FULFILLED' ? (
                      <button
                        onClick={() => requestAction(order.id, 'delivered')}
                        disabled={isBusy}
                        className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-base font-bold text-white shadow-sm hover:bg-black disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                      >
                        {isBusy ? 'Confirming delivery...' : 'Confirm delivered'}
                      </button>
                    ) : null}

                    {order.deliveryPhone ? (
                      <button
                        onClick={() => copyOrCallCustomer(order.deliveryPhone!)}
                        className="w-full rounded-2xl border border-slate-300 px-5 py-4 text-center text-base font-bold text-slate-700 sm:w-auto"
                      >
                        Call customer
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-emerald-100">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Recent deliveries</h2>
          <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            Last 30
          </div>
        </div>

        {history.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            No completed deliveries yet.
          </div>
        ) : (
          <div className="space-y-3">
            {history.slice(0, 8).map((order) => (
              <div
                key={order.id}
                className="rounded-2xl border border-slate-200 p-4 transition hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900">
                      Order {order.id.slice(-8)}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {order.deliveryRecipientName || 'Customer'} ·{' '}
                      {formatDate(order.updatedAt)}
                    </div>
                  </div>

                  <div className="text-right text-sm font-bold text-slate-900">
                    {formatMoney(order.total)}
                  </div>
                </div>

                {order.goodsPaymentMethod === 'COD' ? (
                  <div className="mt-2 text-xs font-bold text-amber-700">
                    COD: {formatMoney(order.payOnDeliveryTotal)}
                  </div>
                ) : null}

                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  💰 Earned {formatMoney(earnings?.earningPerDelivery || 10)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);
}