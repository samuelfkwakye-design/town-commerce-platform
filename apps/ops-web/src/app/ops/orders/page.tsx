'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { ExportOrdersCsvButton } from '@/components/ExportOrdersCsvButton';

type PaymentLite = {
  id: string;
  status: string;
  method: string;
  purpose?: string | null;
  amount?: string | number | null;
  currency?: string | null;
  createdAt?: string | null;
};

type OrderLite = {
  id: string;
  createdAt: string;
  updatedAt?: string;
  status: string;
  townId?: string;
  customerId?: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  customerName?: string | null;

  subtotal?: string | number | null;
  total?: string | number | null;
  currency?: string | null;

  payNowTotal?: string | number | null;
  payOnDeliveryTotal?: string | number | null;
  goodsPaymentMethod?: string | null;

  deliveryRecipientName?: string | null;
  deliveryPhone?: string | null;
  deliveryTown?: string | null;
  deliveryAddress?: {
    recipientName?: string | null;
    phone?: string | null;
    town?: string | null;
  } | null;

  customer?: {
    id?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
    phone?: string | null;
  } | null;

  town?: { name?: string | null; slug?: string | null } | null;
  payments?: PaymentLite[] | null;
};

type TownLite = {
  id: string;
  name: string;
  slug: string;
  isActive?: boolean;
};

const STATUSES = [
  'ALL',
  'DRAFT',
  'FULFILLED',
  'SETTLED',
  'REFUNDED',
  'CANCELLED',
  'PARTIALLY_REFUNDED',
] as const;

type StatusFilter = (typeof STATUSES)[number];

const LAST_TOWN_STORAGE_KEY = 'opsOrders:lastTownId';

function badgeClass(status: string) {
  switch (status) {
    case 'DRAFT':
      return 'bg-gray-100 border-gray-200 text-gray-800';
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
    default:
      return 'bg-gray-100 border-gray-200 text-gray-800';
  }
}

function customerBadgeClass(isRegistered: boolean) {
  return isRegistered
    ? 'bg-green-50 border-green-200 text-green-800'
    : 'bg-amber-50 border-amber-200 text-amber-800';
}

function toNumber(v: any): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function formatMoney(value: any, currency?: string | null) {
  const n = toNumber(value);
  if (n == null) return '—';
  const cur = currency || 'GHS';
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: cur }).format(n);
  } catch {
    return `${n.toFixed(2)} ${cur}`;
  }
}

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB');
}

function isValidDateInput(v: string) {
  if (!v) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function compactDate(v: string) {
  if (!v) return '';
  if (v.includes('T')) return v.slice(0, 10);
  return v;
}

function startOfDayISO(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  return d.toISOString();
}

function endOfDayISO(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T23:59:59.999Z`);
  return d.toISOString();
}

function getCustomerName(order: OrderLite) {
  const fullName =
    [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(' ').trim() ||
    order.customer?.name ||
    order.customerName ||
    order.deliveryAddress?.recipientName ||
    order.deliveryRecipientName ||
    '—';

  return fullName;
}

function getCustomerPhone(order: OrderLite) {
  return (
    order.customerPhone ||
    order.customer?.phone ||
    order.deliveryAddress?.phone ||
    order.deliveryPhone ||
    '—'
  );
}

function getDeliveryTown(order: OrderLite) {
  return order.deliveryAddress?.town || order.deliveryTown || order.town?.name || '—';
}

function isRegisteredCustomer(order: OrderLite) {
  return Boolean(
    order.customerId ||
      order.customer?.id ||
      order.customer?.firstName ||
      order.customer?.lastName ||
      order.customer?.name,
  );
}

export default function OpsOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const statusParam = (searchParams.get('status') ?? 'ALL') as StatusFilter;
  const qParam = searchParams.get('q') ?? '';
  const fromParam = searchParams.get('from') ?? '';
  const toParam = searchParams.get('to') ?? '';
  const townIdParam = searchParams.get('townId') ?? '';
  const limitParam = Number(searchParams.get('limit') ?? '20');
  const cursorParam = searchParams.get('cursor');

  const [qInput, setQInput] = useState(qParam);
  const [fromInput, setFromInput] = useState(fromParam);
  const [toInput, setToInput] = useState(toParam);
  const [townIdInput, setTownIdInput] = useState(townIdParam);
  const [townSearchInput, setTownSearchInput] = useState('');

  useEffect(() => setQInput(qParam), [qParam]);
  useEffect(() => setFromInput(fromParam), [fromParam]);
  useEffect(() => setToInput(toParam), [toParam]);
  useEffect(() => setTownIdInput(townIdParam), [townIdParam]);

  const [debouncedQ, setDebouncedQ] = useState(qParam);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(qInput.trim()), 400);
    return () => clearTimeout(t);
  }, [qInput]);

  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);

  useEffect(() => {
    if (!cursorParam) {
      setCursorStack([null]);
      return;
    }
    setCursorStack((prev) => {
      const tail = prev[prev.length - 1];
      if (tail === cursorParam) return prev;
      return [...prev, cursorParam];
    });
  }, [cursorParam]);

  const cursor = cursorStack[cursorStack.length - 1];
  const pageNumber = cursorStack.length;

  const [towns, setTowns] = useState<TownLite[]>([]);
  const [townsLoading, setTownsLoading] = useState(false);

  const [items, setItems] = useState<OrderLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);

  function updateQuery(next: {
    status?: string;
    q?: string;
    from?: string;
    to?: string;
    townId?: string;
    cursor?: string | null;
    limit?: number;
  }) {
    const sp = new URLSearchParams(searchParams.toString());

    const apply = (key: string, value: string | undefined) => {
      if (value && value.trim().length > 0) sp.set(key, value.trim());
      else sp.delete(key);
    };

    apply('status', next.status);
    apply('q', next.q);
    apply('from', next.from);
    apply('to', next.to);
    apply('townId', next.townId);

    if (typeof next.limit === 'number' && Number.isFinite(next.limit)) {
      sp.set('limit', String(next.limit));
    }

    if (next.cursor !== undefined) {
      const c = next.cursor;
      if (c && c.trim().length > 0) sp.set('cursor', c.trim());
      else sp.delete('cursor');
    }

    const qs = sp.toString();
    router.replace(qs ? `?${qs}` : '?');
  }

  useEffect(() => {
    if (debouncedQ !== qParam) {
      updateQuery({ q: debouncedQ, cursor: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  useEffect(() => {
    (async () => {
      try {
        setTownsLoading(true);
        const data = await apiFetch<TownLite[]>('/towns');
        const rows = Array.isArray(data) ? data : [];
        setTowns(rows);
      } catch {
        setTowns([]);
      } finally {
        setTownsLoading(false);
      }
    })();
  }, []);

  // Sync town search input from selected townId
  useEffect(() => {
    if (!townIdParam) {
      setTownSearchInput('');
      return;
    }

    const selected = towns.find((t) => t.id === townIdParam);
    setTownSearchInput(selected?.name ?? '');
  }, [townIdParam, towns]);

  // Remember selected town
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (townIdParam) {
      window.localStorage.setItem(LAST_TOWN_STORAGE_KEY, townIdParam);
    }
  }, [townIdParam]);

  // Auto-restore last selected town when URL has no townId
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (townsLoading) return;
    if (townIdParam) return;
    if (towns.length === 0) return;

    const savedTownId = window.localStorage.getItem(LAST_TOWN_STORAGE_KEY);
    if (!savedTownId) return;

    const exists = towns.some((t) => t.id === savedTownId && t.isActive !== false);
    if (!exists) return;

    updateQuery({ townId: savedTownId, cursor: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [townIdParam, townsLoading, towns]);

  useEffect(() => {
    const safeFrom = isValidDateInput(fromInput) ? fromInput : '';
    const safeTo = isValidDateInput(toInput) ? toInput : '';

    const changed =
      safeFrom !== fromParam || safeTo !== toParam || townIdInput !== townIdParam;

    if (changed) {
      updateQuery({
        from: safeFrom,
        to: safeTo,
        townId: townIdInput,
        cursor: null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromInput, toInput, townIdInput]);

  const activeTowns = useMemo(
    () => towns.filter((t) => t.isActive !== false),
    [towns],
  );

  const filteredTownSuggestions = useMemo(() => {
    const term = townSearchInput.trim().toLowerCase();
    if (!term) return activeTowns;

    return activeTowns.filter(
      (t) =>
        t.name.toLowerCase().includes(term) ||
        t.slug.toLowerCase().includes(term),
    );
  }, [activeTowns, townSearchInput]);

  const selectedTown = useMemo(
    () => towns.find((t) => t.id === townIdParam) ?? null,
    [towns, townIdParam],
  );

  const activeFiltersText = useMemo(() => {
    const bits: string[] = [];

    if (selectedTown) bits.push(`Town: ${selectedTown.name}`);
    if (statusParam && statusParam !== 'ALL') bits.push(`Status: ${statusParam}`);
    if (qParam) bits.push(`Search: "${qParam}"`);
    if (fromParam) bits.push(`From: ${compactDate(fromParam)}`);
    if (toParam) bits.push(`To: ${compactDate(toParam)}`);

    return bits.join(' • ');
  }, [selectedTown, statusParam, qParam, fromParam, toParam]);

  const listPath = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set('limit', String(Number.isFinite(limitParam) ? limitParam : 20));

    if (statusParam && statusParam !== 'ALL') qs.set('status', statusParam);
    if (qParam) qs.set('q', qParam);
    if (townIdParam) qs.set('townId', townIdParam);
    if (fromParam) qs.set('from', startOfDayISO(fromParam));
    if (toParam) qs.set('to', endOfDayISO(toParam));
    if (cursor) qs.set('cursor', cursor);

    return `/admin/orders?${qs.toString()}`;
  }, [limitParam, statusParam, qParam, townIdParam, fromParam, toParam, cursor]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const data = await apiFetch<any>(listPath);

        setItems(data.items ?? []);
        setNextCursor(data.pageInfo?.nextCursor ?? null);
        setHasNext(Boolean(data.pageInfo?.hasNextPage));
      } catch (e: any) {
        setErr(e?.message ?? 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    })();
  }, [listPath]);

  const rows = useMemo(() => {
    return items.map((o) => {
      const payments = o.payments ?? [];
      const latestPayment =
        payments.length > 0
          ? [...payments].sort((a, b) => {
              const ta = new Date(a.createdAt ?? 0).getTime() || 0;
              const tb = new Date(b.createdAt ?? 0).getTime() || 0;
              return tb - ta;
            })[0]
          : null;

      const currency = o.currency ?? latestPayment?.currency ?? 'GHS';
      const customerName = getCustomerName(o);
      const customerPhone = getCustomerPhone(o);
      const deliveryTown = getDeliveryTown(o);
      const registeredCustomer = isRegisteredCustomer(o);

      return {
        o,
        latestPayment,
        currency,
        customerName,
        customerPhone,
        deliveryTown,
        registeredCustomer,
      };
    });
  }, [items]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Orders</h1>
          <div className="text-sm text-gray-600">
            {selectedTown
              ? `Focused on ${selectedTown.name}`
              : 'Central view across all towns'}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ExportOrdersCsvButton />
          <Link className="underline text-sm" href="/ops/login">
            Change key
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border p-4 bg-white space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="font-semibold">Town filter</div>
            <div className="text-sm text-gray-600">
              Choose a town first so local teams can focus only on their market.
            </div>
          </div>

          {selectedTown ? (
            <button
              className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
              onClick={() => {
                setTownSearchInput('');
                setTownIdInput('');
                setCursorStack([null]);
                updateQuery({ townId: '', cursor: null });
              }}
            >
              View all towns
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <input
              list="ops-order-town-options"
              className="w-full rounded-xl border px-3 py-3 text-sm"
              placeholder={townsLoading ? 'Loading towns…' : 'Type town name or slug…'}
              value={townSearchInput}
              onChange={(e) => {
                const value = e.target.value;
                setTownSearchInput(value);

                const trimmed = value.trim();
                if (!trimmed) {
                  setTownIdInput('');
                  return;
                }

                const exactMatch = activeTowns.find(
                  (t) =>
                    t.name.toLowerCase() === trimmed.toLowerCase() ||
                    t.slug.toLowerCase() === trimmed.toLowerCase(),
                );

                setTownIdInput(exactMatch?.id ?? '');
              }}
              disabled={townsLoading}
            />

            <datalist id="ops-order-town-options">
              {filteredTownSuggestions.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.slug}
                </option>
              ))}
            </datalist>

            <div className="mt-2 text-xs text-gray-500">
              Start typing a town name and choose from the suggestions.
            </div>
          </div>

          <div className="rounded-xl border bg-gray-50 px-3 py-3 text-sm">
            <div className="text-gray-500">Current scope</div>
            <div className="font-semibold mt-1">
              {selectedTown ? selectedTown.name : 'All towns'}
            </div>
          </div>
        </div>
      </div>

      {!selectedTown ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          You are viewing orders across all towns. For daily local operations, select a town first.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
        <input
          className="w-full rounded-xl border px-3 py-2"
          placeholder="Search phone, email, order ID…"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
        />

        <input
          className="w-full rounded-xl border px-3 py-2"
          type="date"
          value={fromInput}
          onChange={(e) => setFromInput(e.target.value)}
        />

        <input
          className="w-full rounded-xl border px-3 py-2"
          type="date"
          value={toInput}
          onChange={(e) => setToInput(e.target.value)}
        />

        <button
          className="rounded-xl border px-3 py-2"
          onClick={() => {
            setQInput('');
            setFromInput('');
            setToInput('');
            setTownSearchInput('');
            setTownIdInput('');
            setCursorStack([null]);
            updateQuery({ q: '', from: '', to: '', townId: '', status: 'ALL', cursor: null });
          }}
        >
          Clear filters
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => {
              setCursorStack([null]);
              updateQuery({ status: s, cursor: null });
            }}
            className={`px-3 py-1 rounded-full border text-sm ${
              statusParam === s ? 'bg-black text-white' : 'bg-white'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? <div>Loading…</div> : null}
      {err ? <div className="text-red-600 text-sm">{err}</div> : null}

      {activeFiltersText ? (
        <div className="rounded-xl border bg-gray-50 px-3 py-2 text-sm text-gray-700 flex items-center justify-between gap-3">
          <div className="truncate">Showing results for: {activeFiltersText}</div>
          <button
            className="shrink-0 underline"
            onClick={() => {
              setQInput('');
              setFromInput('');
              setToInput('');
              setTownSearchInput('');
              setTownIdInput('');
              setCursorStack([null]);
              updateQuery({ q: '', from: '', to: '', townId: '', status: 'ALL', cursor: null });
            }}
          >
            Clear
          </button>
        </div>
      ) : null}

      <div className="border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Order</th>
              <th className="text-left p-3">Customer</th>
              <th className="text-left p-3">Delivery</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Total</th>
              <th className="text-left p-3">Latest Payment</th>
              <th className="text-left p-3">Created</th>
            </tr>
          </thead>

          <tbody>
            {rows.map(
              ({
                o,
                latestPayment,
                currency,
                customerName,
                customerPhone,
                deliveryTown,
                registeredCustomer,
              }) => (
                <tr key={o.id} className="border-t align-top">
                  <td className="p-3">
                    <div className="space-y-1">
                      <div className="font-mono text-xs">
                        <Link className="underline" href={`/ops/orders/${o.id}`}>
                          {o.id}
                        </Link>
                      </div>
                      <div className="text-xs text-gray-600">{o.town?.name ?? '—'}</div>
                    </div>
                  </td>

                  <td className="p-3">
                    <div className="space-y-1">
                      <div className="font-medium">{customerName}</div>
                      <div className="text-xs text-gray-600">{customerPhone}</div>
                      <div>
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs border ${customerBadgeClass(
                            registeredCustomer,
                          )}`}
                        >
                          {registeredCustomer ? 'Registered' : 'Guest'}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="p-3">
                    <div className="space-y-1">
                      <div className="font-medium">
                        {o.deliveryAddress?.recipientName ?? o.deliveryRecipientName ?? '—'}
                      </div>
                      <div className="text-xs text-gray-600">{deliveryTown}</div>
                    </div>
                  </td>

                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs border ${badgeClass(o.status)}`}>
                      {o.status}
                    </span>
                  </td>

                  <td className="p-3">
                    {formatMoney(o.total ?? o.subtotal ?? o.payNowTotal ?? null, currency)}
                  </td>

                  <td className="p-3">
                    {latestPayment ? `${latestPayment.method} • ${latestPayment.status}` : '—'}
                  </td>

                  <td className="p-3">{formatDate(o.createdAt)}</td>
                </tr>
              ),
            )}

            {!loading && items.length === 0 ? (
              <tr>
                <td className="p-3 text-gray-600" colSpan={7}>
                  No orders found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-4">
        {cursorStack.length > 1 ? (
          <button
            onClick={() => {
              setCursorStack((prev) => {
                const nextStack = prev.slice(0, -1);
                const nextCur = nextStack[nextStack.length - 1];
                updateQuery({ cursor: nextCur });
                return nextStack;
              });
            }}
            className="px-4 py-2 border rounded-xl"
          >
            ← Previous
          </button>
        ) : (
          <div />
        )}

        <div className="text-sm font-medium">Page {pageNumber}</div>

        {hasNext ? (
          <button
            onClick={() => {
              if (!nextCursor) return;
              setCursorStack((prev) => [...prev, nextCursor]);
              updateQuery({ cursor: nextCursor });
            }}
            className="px-4 py-2 border rounded-xl"
          >
            Next →
          </button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}