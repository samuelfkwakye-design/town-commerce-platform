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
  customerPhone: string | null;
  customerEmail: string | null;

  subtotal?: string | number | null;
  total?: string | number | null;

  payNowTotal?: string | number | null;
  payOnDeliveryTotal?: string | number | null;
  goodsPaymentMethod?: string | null;

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

function toNumber(v: any): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function formatMoney(value: any, currency?: string | null) {
  const n = toNumber(value);
  if (n == null) return '—';
  const cur = currency || 'GBP';
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

export default function OpsOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL params (source of truth)
  const statusParam = (searchParams.get('status') ?? 'ALL') as StatusFilter;
  const qParam = searchParams.get('q') ?? '';
  const fromParam = searchParams.get('from') ?? '';
  const toParam = searchParams.get('to') ?? '';
  const townIdParam = searchParams.get('townId') ?? '';
  const limitParam = Number(searchParams.get('limit') ?? '20');
  const cursorParam = searchParams.get('cursor'); // string | null

  // UI state (controlled inputs)
  const [qInput, setQInput] = useState(qParam);
  const [fromInput, setFromInput] = useState(fromParam);
  const [toInput, setToInput] = useState(toParam);
  const [townIdInput, setTownIdInput] = useState(townIdParam);

  // keep inputs synced with URL when user navigates back/forward or links are shared
  useEffect(() => setQInput(qParam), [qParam]);
  useEffect(() => setFromInput(fromParam), [fromParam]);
  useEffect(() => setToInput(toParam), [toParam]);
  useEffect(() => setTownIdInput(townIdParam), [townIdParam]);

  // debounce search
  const [debouncedQ, setDebouncedQ] = useState(qParam);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(qInput.trim()), 400);
    return () => clearTimeout(t);
  }, [qInput]);

  // Paging (cursor stack in memory, but also in URL)
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);

  // Sync local cursor stack with URL cursor
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

  // Towns
  const [towns, setTowns] = useState<TownLite[]>([]);
  const [townsLoading, setTownsLoading] = useState(false);

  // Orders list
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
    cursor?: string | null; // null/'' means delete
    limit?: number;
  }) {
    const sp = new URLSearchParams(searchParams.toString());

    const apply = (key: string, value: string | undefined) => {
      if (value && value.trim().length > 0) sp.set(key, value.trim());
      else sp.delete(key);
    };

    apply("status", next.status);
    apply("q", next.q);
    apply("from", next.from);
    apply("to", next.to);
    apply("townId", next.townId);

    if (typeof next.limit === "number" && Number.isFinite(next.limit)) {
      sp.set("limit", String(next.limit));
    }

    if (next.cursor !== undefined) {
      const c = next.cursor;
      if (c && c.trim().length > 0) sp.set("cursor", c.trim());
      else sp.delete("cursor");
    }

    const qs = sp.toString();
    router.replace(qs ? `?${qs}` : "?");
  }

  // Apply debounced search to URL and reset cursor
  useEffect(() => {
    if (debouncedQ !== qParam) {
      updateQuery({ q: debouncedQ, cursor: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  // Fetch towns once
  useEffect(() => {
    (async () => {
      try {
        setTownsLoading(true);
        const data = await apiFetch<TownLite[]>("/towns");
        setTowns(Array.isArray(data) ? data : []);
      } catch {
        setTowns([]);
      } finally {
        setTownsLoading(false);
      }
    })();
  }, []);

  // Apply town/date changes to URL and reset cursor
  useEffect(() => {
    const safeFrom = isValidDateInput(fromInput) ? fromInput : "";
    const safeTo = isValidDateInput(toInput) ? toInput : "";

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

  // Banner text (Showing results for…)
  const activeFiltersText = useMemo(() => {
    const bits: string[] = [];

    if (statusParam && statusParam !== "ALL") bits.push(`Status: ${statusParam}`);
    if (qParam) bits.push(`Search: "${qParam}"`);

    if (townIdParam) {
      const townName = towns.find((t) => t.id === townIdParam)?.name;
      bits.push(`Town: ${townName ?? townIdParam}`);
    }

    if (fromParam) bits.push(`From: ${compactDate(fromParam)}`);
    if (toParam) bits.push(`To: ${compactDate(toParam)}`);

    return bits.join(" • ");
  }, [statusParam, qParam, townIdParam, fromParam, toParam, towns]);

  const listPath = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set("limit", String(Number.isFinite(limitParam) ? limitParam : 20));

    if (statusParam && statusParam !== "ALL") qs.set("status", statusParam);
    if (qParam) qs.set("q", qParam);
    if (townIdParam) qs.set("townId", townIdParam);
    if (fromParam) qs.set("from", startOfDayISO(fromParam));
    if (toParam) qs.set("to", endOfDayISO(toParam));
    if (cursor) qs.set("cursor", cursor);

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
        setErr(e?.message ?? "Failed to load orders");
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

      const currency = latestPayment?.currency ?? "GBP";
      return { o, latestPayment, currency };
    });
  }, [items]);

  return (
    <div className="p-6 space-y-4">
      
      <div className="flex items-center justify-between">
  <h1 className="text-xl font-semibold">Orders</h1>

  <div className="flex items-center gap-3">
    <ExportOrdersCsvButton />
    <Link className="underline text-sm" href="/ops/login">
      Change key
    </Link>
  </div>
</div>

      {/* Search + Date + Town */}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
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

        <select
          className="w-full rounded-xl border px-3 py-2"
          value={townIdInput}
          onChange={(e) => setTownIdInput(e.target.value)}
          disabled={townsLoading}
        >
          <option value="">{townsLoading ? "Loading towns…" : "All towns"}</option>
          {towns
            .filter((t) => t.isActive !== false)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
        </select>

        <button
          className="rounded-xl border px-3 py-2"
          onClick={() => {
            setQInput("");
            setFromInput("");
            setToInput("");
            setTownIdInput("");
            setCursorStack([null]);
            updateQuery({ q: "", from: "", to: "", townId: "", status: "ALL", cursor: null });
          }}
        >
          Clear filters
        </button>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => {
              setCursorStack([null]);
              updateQuery({ status: s, cursor: null });
            }}
            className={`px-3 py-1 rounded-full border text-sm ${
              statusParam === s ? "bg-black text-white" : "bg-white"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? <div>Loading…</div> : null}
      {err ? <div className="text-red-600 text-sm">{err}</div> : null}

      {/* Filter summary banner */}
      {activeFiltersText ? (
        <div className="rounded-xl border bg-gray-50 px-3 py-2 text-sm text-gray-700 flex items-center justify-between gap-3">
          <div className="truncate">Showing results for: {activeFiltersText}</div>
          <button
            className="shrink-0 underline"
            onClick={() => {
              setQInput("");
              setFromInput("");
              setToInput("");
              setTownIdInput("");
              setCursorStack([null]);
              updateQuery({ q: "", from: "", to: "", townId: "", status: "ALL", cursor: null });
            }}
          >
            Clear
          </button>
        </div>
      ) : null}

      {/* Table */}
      <div className="border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Order ID</th>
              <th className="text-left p-3">Town</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Total</th>
              <th className="text-left p-3">Latest Payment</th>
              <th className="text-left p-3">Created</th>
            </tr>
          </thead>

          <tbody>
            {rows.map(({ o, latestPayment, currency }) => (
              <tr key={o.id} className="border-t">
                <td className="p-3 font-mono text-xs">
                  <Link className="underline" href={`/ops/orders/${o.id}`}>
                    {o.id}
                  </Link>
                </td>

                <td className="p-3">{o.town?.name ?? "—"}</td>

                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs border ${badgeClass(o.status)}`}>
                    {o.status}
                  </span>
                </td>

                <td className="p-3">
                  {formatMoney(o.total ?? o.subtotal ?? o.payNowTotal ?? null, currency)}
                </td>

                <td className="p-3">
                  {latestPayment ? `${latestPayment.method} • ${latestPayment.status}` : "—"}
                </td>

                <td className="p-3">{formatDate(o.createdAt)}</td>
              </tr>
            ))}

            {!loading && items.length === 0 ? (
              <tr>
                <td className="p-3 text-gray-600" colSpan={6}>
                  No orders found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Pagination (below table) */}
      <div className="flex items-center justify-end gap-4">
        {/* Previous Button */}
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

        {/* Page Indicator */}
        <div className="text-sm font-medium">Page {pageNumber}</div>

        {/* Next Button */}
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
