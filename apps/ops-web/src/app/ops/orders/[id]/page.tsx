'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';

function toNumber(v: any): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function formatMoney(value: any, currency: string) {
  const n = toNumber(value);
  if (n == null) return '—';
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB');
}

function statusBadgeClass(status: string) {
  switch ((status || '').toUpperCase()) {
    case 'DRAFT':
      return 'bg-gray-100 border-gray-200 text-gray-800';
    case 'CONFIRMED':
      return 'bg-indigo-100 border-indigo-200 text-indigo-900';
    case 'FULFILLED':
      return 'bg-blue-100 border-blue-200 text-blue-900';
    case 'SETTLED':
      return 'bg-green-100 border-green-200 text-green-900';
    case 'REFUNDED':
      return 'bg-purple-100 border-purple-200 text-purple-900';
    case 'CANCELLED':
      return 'bg-red-100 border-red-200 text-red-900';
    case 'PARTIALLY_REFUNDED':
      return 'bg-orange-100 border-orange-200 text-orange-900';
    case 'REQUESTED':
      return 'bg-gray-100 border-gray-200 text-gray-800';
    default:
      return 'bg-gray-100 border-gray-200 text-gray-800';
  }
}

function paymentStatusBadgeClass(status: string) {
  switch ((status || '').toUpperCase()) {
    case 'SUCCESS':
      return 'bg-green-100 border-green-200 text-green-900';
    case 'FAILED':
      return 'bg-red-100 border-red-200 text-red-900';
    case 'PENDING':
      return 'bg-yellow-100 border-yellow-200 text-yellow-900';
    default:
      return 'bg-gray-100 border-gray-200 text-gray-800';
  }
}

function sumMoney(values: any[]): number {
  return values.reduce((acc, v) => acc + (toNumber(v) ?? 0), 0);
}

function upper(v: any) {
  return String(v ?? '').toUpperCase();
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // ignore
  }
}

function hasCodCollectedPayment(order: any) {
  const payments = order?.payments ?? [];
  return payments.some(
    (p: any) =>
      (p?.method ?? '').toUpperCase() === 'COD' &&
      (p?.status ?? '').toUpperCase() === 'SUCCESS' &&
      true,
  );
}

function kgLabelFromGrams(grams: any) {
  if (grams == null) return '—';
  const n = Number(grams);
  if (!Number.isFinite(n)) return '—';
  return `${(n / 1000).toFixed(3)} kg`;
}

function isRegisteredCustomer(order: any) {
  return Boolean(order?.customerId || order?.customer?.id);
}

function getCustomerDisplayName(order: any) {
  const customer = order?.customer;

  const fullName =
    [customer?.firstName, customer?.lastName].filter(Boolean).join(' ').trim() ||
    customer?.name ||
    order?.customerName ||
    order?.deliveryRecipientName ||
    order?.deliveryAddress?.recipientName ||
    '—';

  return fullName;
}

function getCustomerPhone(order: any) {
  return (
    order?.customerPhone ||
    order?.customer?.phone ||
    order?.deliveryPhone ||
    order?.deliveryAddress?.phone ||
    '—'
  );
}

function getDeliveryAddress(order: any) {
  const d = order?.deliveryAddress;

  return {
    recipientName: d?.recipientName ?? order?.deliveryRecipientName ?? '—',
    phone: d?.phone ?? order?.deliveryPhone ?? '—',
    line1: d?.line1 ?? order?.deliveryLine1 ?? '—',
    line2: d?.line2 ?? order?.deliveryLine2 ?? '',
    area: d?.area ?? order?.deliveryArea ?? '',
    town: d?.town ?? order?.deliveryTown ?? '—',
    landmark: d?.landmark ?? order?.deliveryLandmark ?? '',
    notes: d?.notes ?? order?.deliveryNotes ?? '',
  };
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [order, setOrder] = useState<any>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [confirmAction, setConfirmAction] = useState<null | (() => Promise<void>)>(null);

  const [refundOpen, setRefundOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundRestock, setRefundRestock] = useState(true);
  const [refundQtyByItemId, setRefundQtyByItemId] = useState<Record<string, number>>({});
  const [refundWeightGramsByItemId, setRefundWeightGramsByItemId] = useState<
    Record<string, number>
  >({});

  const currency = useMemo(() => {
    const p0 = order?.payments?.[0];
    return p0?.currency ?? 'GHS';
  }, [order?.payments]);

  const customerName = useMemo(() => getCustomerDisplayName(order), [order]);
  const customerPhone = useMemo(() => getCustomerPhone(order), [order]);
  const deliveryAddress = useMemo(() => getDeliveryAddress(order), [order]);
  const registeredCustomer = useMemo(() => isRegisteredCustomer(order), [order]);

  async function load() {
    if (!id) return;
    try {
      setLoading(true);
      setErr(null);

      const o = await apiFetch<any>(`/admin/orders/${id}`);
      setOrder(o);

      try {
        const res = await apiFetch<any>(`/orders/${id}/stock-movements?limit=50`);
        const rows = Array.isArray(res) ? res : res?.items ?? res?.rows ?? [];
        setMovements(Array.isArray(rows) ? rows : []);
      } catch {
        setMovements([]);
      }
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const paymentsSorted = useMemo(() => {
    const p = [...(order?.payments ?? [])];
    p.sort(
      (a, b) =>
        (new Date(b.createdAt ?? 0).getTime() || 0) - (new Date(a.createdAt ?? 0).getTime() || 0),
    );

    return p.map((pay) => {
      const refunds = [...(pay?.Refund ?? [])];
      refunds.sort(
        (a, b) =>
          (new Date(b.createdAt ?? 0).getTime() || 0) - (new Date(a.createdAt ?? 0).getTime() || 0),
      );
      return { ...pay, Refund: refunds };
    });
  }, [order?.payments]);

  const paymentsSummary = useMemo(() => {
    const payments = paymentsSorted ?? [];

    const paidSuccess = payments.filter((p: any) => upper(p.status) === 'SUCCESS');
    const paidTotal = sumMoney(paidSuccess.map((p: any) => p.amount));

    const allRefunds = payments.flatMap((p: any) => p?.Refund ?? []);
    const refundedTotal = sumMoney(allRefunds.map((r: any) => r.amount));

    const net = paidTotal - refundedTotal;

    return {
      paidTotal,
      refundedTotal,
      net,
      refundsCount: allRefunds.length,
      paymentsCount: payments.length,
    };
  }, [paymentsSorted]);

  const canForceSettle = (order?.status || '').toUpperCase() === 'FULFILLED';
  const canCancel = ['DRAFT', 'CONFIRMED'].includes((order?.status || '').toUpperCase());
  const canRefund = ['SETTLED', 'FULFILLED', 'PARTIALLY_REFUNDED'].includes(
    (order?.status || '').toUpperCase(),
  );

  const hasAnyPayment = (order?.payments ?? []).length > 0;
  const payOnDeliveryAmount = Number(order?.payOnDeliveryTotal ?? 0);
  const codCollected = useMemo(() => hasCodCollectedPayment(order), [order]);

  const canMarkCodCollected =
    (order?.goodsPaymentMethod ?? '').toUpperCase() === 'COD' &&
    (order?.status ?? '').toUpperCase() === 'FULFILLED' &&
    payOnDeliveryAmount > 0 &&
    !hasAnyPayment;

  function openConfirm(text: string, action: () => Promise<void>) {
    setConfirmText(text);
    setConfirmAction(() => action);
    setConfirmOpen(true);
  }

  function closeConfirm() {
    setConfirmOpen(false);
    setConfirmText('');
    setConfirmAction(null);
  }

  function openRefund() {
    setRefundReason('');
    setRefundRestock(true);

    const initQty: Record<string, number> = {};
    const initWg: Record<string, number> = {};

    for (const it of order?.items ?? []) {
      initQty[it.id] = 0;
      initWg[it.id] = 0;
    }

    setRefundQtyByItemId(initQty);
    setRefundWeightGramsByItemId(initWg);
    setRefundOpen(true);
  }

  function closeRefund() {
    setRefundOpen(false);
  }

  async function submitRefund() {
    if (!id) return;

    const selected = (order?.items ?? [])
      .map((it: any) => {
        const pricingModel = (it.townProduct?.pricingModel ?? '').toUpperCase();

        if (pricingModel === 'WEIGHT') {
          const grams = Number(refundWeightGramsByItemId[it.id] ?? 0);
          return grams > 0 ? { orderItemId: it.id, weightGrams: grams } : null;
        }

        const qty = Number(refundQtyByItemId[it.id] ?? 0);
        return qty > 0 ? { orderItemId: it.id, quantity: qty } : null;
      })
      .filter(Boolean) as any[];

    if (selected.length === 0) {
      setActionErr('Select at least one item to refund.');
      return;
    }

    if (!refundReason.trim()) {
      setActionErr('Please provide a reason for the refund.');
      return;
    }

    try {
      setActionLoading(true);
      setActionErr(null);
      setActionOk(null);

      await apiFetch(`/orders/${id}/refund-items`, {
        method: 'POST',
        body: JSON.stringify({
          reason: refundReason.trim(),
          restock: refundRestock,
          items: selected,
        }),
      });

      setActionOk('Refund request created.');
      closeRefund();
      await load();
      document.getElementById('payments')?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => setActionOk(null), 2500);
    } catch (e: any) {
      setActionErr(e?.message ?? 'Refund failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function markCodCollected() {
    if (!id) return;

    try {
      setActionLoading(true);
      setActionErr(null);
      setActionOk(null);

      await apiFetch(`/admin/orders/${id}/mark-cod-collected`, {
        method: 'PATCH',
        body: JSON.stringify({ note: 'Cash received by rider' }),
      });

      setActionOk('COD marked as collected.');
      await load();
      document.getElementById('payments')?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => setActionOk(null), 2500);
    } catch (e: any) {
      setActionErr(e?.message ?? 'Mark COD collected failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function forceSettleDev() {
    if (!id) return;

    try {
      setActionLoading(true);
      setActionErr(null);
      setActionOk(null);

      await apiFetch(`/orders/${id}/dev/force-settle`, { method: 'POST' });

      setActionOk('Force settle successful.');
      await load();
      document.getElementById('payments')?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => setActionOk(null), 2500);
    } catch (e: any) {
      setActionErr(e?.message ?? 'Force settle failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function cancelOrder() {
    if (!id) return;

    try {
      setActionLoading(true);
      setActionErr(null);
      setActionOk(null);

      await apiFetch(`/orders/${id}/cancel`, { method: 'PATCH' });

      setActionOk('Order cancelled.');
      await load();
      setTimeout(() => setActionOk(null), 2500);
    } catch (e: any) {
      setActionErr(e?.message ?? 'Cancel failed');
    } finally {
      setActionLoading(false);
    }
  }

  const townProductIdByOrderItemId = useMemo(() => {
    const m = new Map<string, string>();
    for (const it of order?.items ?? []) {
      if (it?.id && it?.townProductId) m.set(it.id, it.townProductId);
    }
    return m;
  }, [order?.items]);

  if (loading) return <div className="p-6">Loading…</div>;

  if (err) {
    return (
      <div className="p-6 space-y-3">
        <Link className="underline text-sm" href="/ops/orders">
          ← Back to Orders
        </Link>
        <div className="text-red-600">{err}</div>
      </div>
    );
  }

  if (!order) return <div className="p-6">No data</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="text-sm text-gray-600">
            <Link className="underline" href="/ops/orders">
              ← Back to Orders
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">Order</h1>
            <span className={`px-2 py-1 rounded-full text-xs border ${statusBadgeClass(order.status)}`}>
              {order.status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="font-mono text-xs text-gray-700">{order.id}</div>
            <button
              className="underline text-xs text-gray-700"
              onClick={async () => {
                await copyText(order.id);
                setActionOk('Order ID copied.');
                setTimeout(() => setActionOk(null), 1200);
              }}
            >
              copy
            </button>
          </div>

          <div className="text-xs text-gray-500">
            Created: {formatDate(order.createdAt)} • Updated: {formatDate(order.updatedAt)}
          </div>
        </div>

        <div className="text-right space-y-1">
          <div className="text-sm text-gray-600">{order.town?.name ?? '—'}</div>
          <div className="text-xs text-gray-500">{order.town?.slug ?? ''}</div>
          <div className="text-sm text-gray-700">
            {customerPhone}
            {order.customerEmail ? ` • ${order.customerEmail}` : ''}
          </div>
        </div>
      </div>

      {/* Customer + delivery */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Customer</h2>
            <span
              className={`px-2 py-1 rounded-full text-xs border ${
                registeredCustomer
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              {registeredCustomer ? 'Registered customer' : 'Guest checkout'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Name</span>
              <span className="font-semibold text-right">{customerName}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Phone</span>
              <span className="font-semibold text-right">{customerPhone}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Email</span>
              <span className="font-semibold text-right">{order.customerEmail ?? '—'}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Account</span>
              <span className="font-semibold text-right">
                {registeredCustomer ? order.customerId ?? order.customer?.id ?? 'Registered' : 'Guest'}
              </span>
            </div>
          </div>
        </div>

        <div className="border rounded-2xl p-4 space-y-3">
          <h2 className="font-semibold">Delivery address</h2>

          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Recipient</span>
              <span className="font-semibold text-right">{deliveryAddress.recipientName}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Phone</span>
              <span className="font-semibold text-right">{deliveryAddress.phone}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Address line 1</span>
              <span className="font-semibold text-right">{deliveryAddress.line1}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Address line 2</span>
              <span className="font-semibold text-right">{deliveryAddress.line2 || '—'}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Area</span>
              <span className="font-semibold text-right">{deliveryAddress.area || '—'}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Town</span>
              <span className="font-semibold text-right">{deliveryAddress.town}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Landmark</span>
              <span className="font-semibold text-right">{deliveryAddress.landmark || '—'}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Notes</span>
              <span className="font-semibold text-right">{deliveryAddress.notes || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          {canMarkCodCollected ? (
            <button
              onClick={() =>
                openConfirm(
                  'Mark COD as collected? This will create a SUCCESS COD payment.',
                  markCodCollected,
                )
              }
              disabled={actionLoading}
              className="px-3 py-2 border rounded-xl text-sm bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {actionLoading
                ? 'Working…'
                : `Mark COD collected (${formatMoney(payOnDeliveryAmount, currency)})`}
            </button>
          ) : null}

          {codCollected ? (
            <span className="px-2 py-1 rounded-full text-xs border bg-green-50 border-green-200 text-green-800">
              COD collected
            </span>
          ) : null}

          {canForceSettle ? (
            <button
              onClick={() => openConfirm('Force settle this order? (DEV action)', forceSettleDev)}
              disabled={actionLoading}
              className="px-3 py-2 border rounded-xl text-sm bg-white hover:bg-gray-50 disabled:opacity-50"
              title="DEV: mark order settled + create SUCCESS payment"
            >
              {actionLoading ? 'Forcing…' : 'Force settle (dev)'}
            </button>
          ) : null}

          {canRefund ? (
            <button
              onClick={openRefund}
              disabled={actionLoading}
              className="px-3 py-2 rounded-xl text-sm border border-amber-500 text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-50"
              title="Refund selected items"
            >
              Refund items
            </button>
          ) : null}

          {canCancel ? (
            <button
              onClick={() => openConfirm('Cancel this order? This cannot be undone.', cancelOrder)}
              disabled={actionLoading}
              className="px-3 py-2 rounded-xl text-sm border border-red-500 text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50"
              title="Cancel this order"
            >
              <span className="inline-flex items-center gap-2">
                <span aria-hidden>⚠</span>
                <span>{actionLoading ? 'Working…' : 'Cancel order'}</span>
              </span>
            </button>
          ) : null}
        </div>

        {actionErr ? <div className="text-sm text-red-600">{actionErr}</div> : null}
        {actionOk ? <div className="text-sm text-green-700">{actionOk}</div> : null}
      </div>

      {/* Totals */}
      <div className="border rounded-2xl p-4">
        <h2 className="font-semibold mb-3">Totals</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-semibold">{formatMoney(order.subtotal, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Items subtotal</span>
            <span className="font-semibold">{formatMoney(order.itemsSubtotal, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Delivery fee</span>
            <span className="font-semibold">{formatMoney(order.deliveryFee, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Service fee</span>
            <span className="font-semibold">{formatMoney(order.serviceFee, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Pay now</span>
            <span className="font-semibold">{formatMoney(order.payNowTotal, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Pay on delivery</span>
            <span className="font-semibold">{formatMoney(order.payOnDeliveryTotal, currency)}</span>
          </div>
          <div className="flex justify-between sm:col-span-2">
            <span className="text-gray-600">Order total</span>
            <span className="font-semibold">{formatMoney(order.total, currency)}</span>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="border rounded-2xl p-4 space-y-3">
        <h2 className="font-semibold">Items</h2>
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3">Product</th>
                <th className="p-3">Pricing</th>
                <th className="p-3">Qty / Weight</th>
                <th className="p-3">Unit Price</th>
                <th className="p-3">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {(order.items ?? []).map((it: any) => {
                const pricingModel = (it.townProduct?.pricingModel ?? '').toUpperCase();
                const qtyOrWeight =
                  pricingModel === 'WEIGHT' ? kgLabelFromGrams(it.weightGrams) : it.quantity ?? '—';

                const productName = it.townProduct?.product?.name ?? it.townProductId;

                return (
                  <tr key={it.id} className="border-t">
                    <td className="p-3">
                      {it.townProductId ? (
                        <Link href={`/ops/stock/${it.townProductId}`} className="underline hover:text-blue-600">
                          {productName}
                        </Link>
                      ) : (
                        productName
                      )}

                      <div className="flex items-center gap-2">
                        <div className="font-mono text-xs text-gray-400">{it.id}</div>
                        <button
                          className="underline text-xs text-gray-500"
                          onClick={async () => {
                            await copyText(it.id);
                            setActionOk('OrderItem ID copied.');
                            setTimeout(() => setActionOk(null), 1200);
                          }}
                        >
                          copy
                        </button>
                      </div>
                    </td>
                    <td className="p-3">{pricingModel || '—'}</td>
                    <td className="p-3">{qtyOrWeight}</td>
                    <td className="p-3">{formatMoney(it.unitPrice, currency)}</td>
                    <td className="p-3">{formatMoney(it.lineTotal, currency)}</td>
                  </tr>
                );
              })}
              {(order.items ?? []).length === 0 ? (
                <tr>
                  <td className="p-3 text-gray-600" colSpan={5}>
                    No items.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payments timeline */}
      <div id="payments" className="border rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Payments</h2>
          <div className="text-xs text-gray-500">Latest first</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <div className="border rounded-xl p-3 bg-white">
            <div className="text-xs text-gray-500">Paid (SUCCESS)</div>
            <div className="text-sm font-semibold">{formatMoney(paymentsSummary.paidTotal, currency)}</div>
          </div>

          <div className="border rounded-xl p-3 bg-white">
            <div className="text-xs text-gray-500">Refunded</div>
            <div className="text-sm font-semibold">{formatMoney(paymentsSummary.refundedTotal, currency)}</div>
            <div className="text-xs text-gray-500">{paymentsSummary.refundsCount} refund(s)</div>
          </div>

          <div className="border rounded-xl p-3 bg-white">
            <div className="text-xs text-gray-500">Net</div>
            <div className="text-sm font-semibold">{formatMoney(paymentsSummary.net, currency)}</div>
          </div>

          <div className="border rounded-xl p-3 bg-white">
            <div className="text-xs text-gray-500">Events</div>
            <div className="text-sm font-semibold">{paymentsSummary.paymentsCount} payment(s)</div>
          </div>
        </div>

        {paymentsSorted.length === 0 ? (
          <div className="text-sm text-gray-600">No payments.</div>
        ) : (
          <div className="space-y-4">
            {paymentsSorted.map((p: any) => {
              const refunds = p?.Refund ?? [];

              return (
                <div key={p.id} className="relative pl-7">
                  <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-200" />
                  <div className="absolute left-0 top-4 h-4 w-4 rounded-full border bg-white" />

                  <div className="border rounded-xl p-3 space-y-3 bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-sm">
                            <span className="font-semibold">{p.method ?? '—'}</span>
                            <span className="text-gray-500"> • {p.purpose ?? '—'}</span>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs border ${paymentStatusBadgeClass(
                              p.status,
                            )}`}
                          >
                            {p.status ?? '—'}
                          </span>
                        </div>

                        <div className="text-xs text-gray-500">{formatDate(p.createdAt)}</div>

                        <div className="flex items-center gap-2">
                          <div className="font-mono text-xs text-gray-600">{p.id}</div>
                          <button
                            className="underline text-xs text-gray-600"
                            onClick={async () => {
                              await copyText(p.id);
                              setActionOk('Payment ID copied.');
                              setTimeout(() => setActionOk(null), 1200);
                            }}
                          >
                            copy
                          </button>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-gray-500">Amount</div>
                        <div className="text-sm font-semibold">
                          {formatMoney(p.amount, p.currency ?? currency)}
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">Refunds</div>
                        <div className="text-xs text-gray-500">{refunds.length} total</div>
                      </div>

                      {refunds.length === 0 ? (
                        <div className="text-sm text-gray-600 mt-2">No refunds on this payment.</div>
                      ) : (
                        <div className="space-y-3 mt-3">
                          {refunds.map((r: any) => (
                            <div key={r.id} className="relative pl-6">
                              <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-200" />
                              <div className="absolute left-0 top-3 h-3 w-3 rounded-full border bg-white" />

                              <div className="bg-gray-50 border rounded-xl p-3 space-y-2">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <div className="font-mono text-xs text-gray-700">{r.id}</div>
                                      <button
                                        className="underline text-xs text-gray-700"
                                        onClick={async () => {
                                          await copyText(r.id);
                                          setActionOk('Refund ID copied.');
                                          setTimeout(() => setActionOk(null), 1200);
                                        }}
                                      >
                                        copy
                                      </button>

                                      <span
                                        className={`px-2 py-1 rounded-full text-xs border ${statusBadgeClass(
                                          r.status,
                                        )}`}
                                      >
                                        {r.status ?? '—'}
                                      </span>
                                    </div>

                                    <div className="text-xs text-gray-500">{formatDate(r.createdAt)}</div>
                                  </div>

                                  <div className="text-right">
                                    <div className="text-xs text-gray-500">Amount</div>
                                    <div className="text-sm font-semibold">
                                      {formatMoney(r.amount, r.currency ?? currency)}
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Restock</span>
                                    <span className="font-semibold">{String(r.restock)}</span>
                                  </div>

                                  <div className="flex justify-between sm:col-span-2">
                                    <span className="text-gray-600">Reason</span>
                                    <span className="font-semibold">{r.reason ?? '—'}</span>
                                  </div>
                                </div>

                                <div>
                                  <div className="text-sm font-semibold mb-2">Refund items</div>
                                  {(r.items ?? []).length === 0 ? (
                                    <div className="text-sm text-gray-600">No refund items.</div>
                                  ) : (
                                    <div className="border rounded-lg overflow-hidden bg-white">
                                      <table className="w-full text-sm">
                                        <thead className="bg-gray-50 text-left">
                                          <tr>
                                            <th className="p-2">OrderItem</th>
                                            <th className="p-2">Qty</th>
                                            <th className="p-2">Weight</th>
                                            <th className="p-2">Amount</th>
                                            <th className="p-2">Stock</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {(r.items ?? []).map((ri: any) => {
                                            const tpId = ri?.orderItemId
                                              ? townProductIdByOrderItemId.get(ri.orderItemId) ?? null
                                              : null;

                                            return (
                                              <tr key={ri.id} className="border-t">
                                                <td className="p-2">
                                                  <div className="flex items-center gap-2">
                                                    <div className="font-mono text-xs">
                                                      {ri.orderItemId ?? '—'}
                                                    </div>
                                                    {ri.orderItemId ? (
                                                      <button
                                                        className="underline text-xs text-gray-600"
                                                        onClick={async () => {
                                                          await copyText(ri.orderItemId);
                                                          setActionOk('OrderItem ID copied.');
                                                          setTimeout(() => setActionOk(null), 1200);
                                                        }}
                                                      >
                                                        copy
                                                      </button>
                                                    ) : null}
                                                  </div>
                                                </td>
                                                <td className="p-2">{ri.quantity ?? '—'}</td>
                                                <td className="p-2">
                                                  {ri.weightGrams != null ? kgLabelFromGrams(ri.weightGrams) : '—'}
                                                </td>
                                                <td className="p-2">
                                                  {formatMoney(ri.amount, r.currency ?? currency)}
                                                </td>
                                                <td className="p-2">
                                                  {tpId ? (
                                                    <Link href={`/ops/stock/${tpId}`} className="underline text-xs">
                                                      view
                                                    </Link>
                                                  ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                  )}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stock movements */}
      <div className="border rounded-2xl p-4 space-y-3">
        <h2 className="font-semibold">Stock movements</h2>
        {movements.length === 0 ? (
          <div className="text-sm text-gray-600">No stock movements.</div>
        ) : (
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="p-3">Created</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Δ Qty</th>
                  <th className="p-3">Δ Weight (kg)</th>
                  <th className="p-3">Refund</th>
                  <th className="p-3">Note</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m: any) => (
                  <tr key={m.id} className="border-t">
                    <td className="p-3">{formatDate(m.createdAt)}</td>
                    <td className="p-3">{m.reason ?? '—'}</td>
                    <td className="p-3">{m.deltaQty ?? '—'}</td>
                    <td className="p-3">
                      {m.deltaWeightGrams != null ? (Number(m.deltaWeightGrams) / 1000).toFixed(3) : '—'}
                    </td>
                    <td className="p-3 font-mono text-xs">{m.refundId ?? '—'}</td>
                    <td className="p-3">{m.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Refund modal */}
      {refundOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeRefund} />
          <div className="relative w-full max-w-2xl mx-4 rounded-2xl border bg-white shadow-lg p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">Refund items</div>
                <div className="text-sm text-gray-600">Select quantities/weights to refund.</div>
              </div>
              <button
                onClick={closeRefund}
                className="px-3 py-2 rounded-xl text-sm border bg-white hover:bg-gray-50"
                disabled={actionLoading}
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Reason</label>
                  <input
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="e.g. Customer returned item"
                    className="mt-1 w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={refundRestock}
                      onChange={(e) => setRefundRestock(e.target.checked)}
                    />
                    Restock items
                  </label>
                </div>
              </div>

              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="p-3">Item</th>
                      <th className="p-3">Pricing</th>
                      <th className="p-3">Max</th>
                      <th className="p-3">Refund</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(order?.items ?? []).map((it: any) => {
                      const pricingModel = (it.townProduct?.pricingModel ?? '').toUpperCase();
                      const name = it.townProduct?.product?.name ?? it.townProductId;

                      const maxQty = Number(it.quantity ?? 0);
                      const maxGrams = Number(it.weightGrams ?? 0);
                      const maxKg = maxGrams / 1000;

                      return (
                        <tr key={it.id} className="border-t">
                          <td className="p-3">
                            {name}
                            <div className="font-mono text-xs text-gray-400">{it.id}</div>
                          </td>

                          <td className="p-3">{pricingModel || '—'}</td>

                          <td className="p-3">
                            {pricingModel === 'WEIGHT' ? `${maxKg.toFixed(3)} kg` : maxQty}
                          </td>

                          <td className="p-3">
                            {pricingModel === 'WEIGHT' ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={maxKg}
                                  step={0.001}
                                  value={((refundWeightGramsByItemId[it.id] ?? 0) / 1000).toFixed(3)}
                                  onChange={(e) => {
                                    const kg = Number(e.target.value || 0);
                                    const clampedKg = Math.max(0, Math.min(maxKg, kg));
                                    const grams = Math.round(clampedKg * 1000);
                                    setRefundWeightGramsByItemId((prev) => ({ ...prev, [it.id]: grams }));
                                  }}
                                  className="w-32 px-3 py-2 border rounded-xl text-sm"
                                />
                                <span className="text-sm text-gray-600">kg</span>
                              </div>
                            ) : (
                              <input
                                type="number"
                                min={0}
                                max={maxQty}
                                value={refundQtyByItemId[it.id] ?? 0}
                                onChange={(e) => {
                                  const v = Math.max(0, Math.min(maxQty, Number(e.target.value || 0)));
                                  setRefundQtyByItemId((prev) => ({ ...prev, [it.id]: v }));
                                }}
                                className="w-28 px-3 py-2 border rounded-xl text-sm"
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {(order?.items ?? []).length === 0 ? (
                      <tr>
                        <td className="p-3 text-gray-600" colSpan={4}>
                          No items.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={closeRefund}
                  className="px-3 py-2 rounded-xl text-sm border bg-white hover:bg-gray-50"
                  disabled={actionLoading}
                >
                  Back
                </button>

                <button
                  onClick={async () => {
                    setRefundOpen(false);
                    await submitRefund();
                  }}
                  className="px-3 py-2 rounded-xl text-sm border bg-black text-white hover:bg-gray-900 disabled:opacity-50"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Submitting…' : 'Submit refund'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Confirm modal */}
      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeConfirm} />
          <div className="relative w-full max-w-md mx-4 rounded-2xl border bg-white shadow-lg p-5">
            <div className="text-lg font-semibold">Confirm</div>
            <div className="mt-2 text-sm text-gray-700">{confirmText}</div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={closeConfirm}
                className="px-3 py-2 rounded-xl text-sm border bg-white hover:bg-gray-50"
                disabled={actionLoading}
              >
                Back
              </button>

              <button
                onClick={async () => {
                  if (!confirmAction) return;
                  closeConfirm();
                  await confirmAction();
                }}
                className="px-3 py-2 rounded-xl text-sm border bg-black text-white hover:bg-gray-900 disabled:opacity-50"
                disabled={actionLoading}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}