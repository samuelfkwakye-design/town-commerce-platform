'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';

type PricingModel = 'UNIT' | 'WEIGHT';

type ReconcileRow = {
  townProductId: string;

  townId: string;
  townName: string;
  townSlug: string;

  productId: string;
  productName: string;

  pricingModel: PricingModel;

  snapshotQty: number | null;
  ledgerQty: number | null;
  diffQty: number | null;

  snapshotWeightGrams: number | null;
  ledgerWeightGrams: number | null;
  diffWeightGrams: number | null;

  lastMovementAt: string | null;
  snapshotUpdatedAt: string | null;

  isMismatch: boolean;
};

type PageInfo = {
  limit: number;
  hasNextPage: boolean;
  nextCursor: string | null;
};

type ReconcileListResponse = {
  items: ReconcileRow[];
  pageInfo: PageInfo;
};

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function fmtVal(row: ReconcileRow, kind: 'snapshot' | 'ledger' | 'diff') {
  const isWeight = row.pricingModel === 'WEIGHT';

  const val = isWeight
    ? kind === 'snapshot'
      ? row.snapshotWeightGrams
      : kind === 'ledger'
        ? row.ledgerWeightGrams
        : row.diffWeightGrams
    : kind === 'snapshot'
      ? row.snapshotQty
      : kind === 'ledger'
        ? row.ledgerQty
        : row.diffQty;

  if (val === null || val === undefined) return '—';

  if (isWeight) {
    const grams = Number(val);
    const kg = grams / 1000;
    return `${grams.toLocaleString()} g (${kg.toFixed(3)} kg)`;
  }

  return Number(val).toLocaleString();
}

export default function OpsStockDashboardPage() {
  const [limit, setLimit] = useState(50);
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);

  const [onlyMismatches, setOnlyMismatches] = useState(true);
  const [townId, setTownId] = useState('');

  const [data, setData] = useState<ReconcileListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const currentCursor = cursorStack[cursorStack.length - 1] ?? null;

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set('limit', String(limit));
    if (currentCursor) p.set('cursor', currentCursor);
    if (onlyMismatches) p.set('onlyMismatches', 'true');
    if (townId.trim()) p.set('townId', townId.trim());
    return p.toString();
  }, [limit, currentCursor, onlyMismatches, townId]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await apiFetch<ReconcileListResponse>(`/stock-movements/reconcile?${qs}`);
      setData(res);
    } catch (e: any) {
      setData(null);
      setErr(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs]);

  function goNext() {
    const next = data?.pageInfo?.nextCursor ?? null;
    if (!next) return;
    setCursorStack((s) => [...s, next]);
  }

  function goPrev() {
    if (cursorStack.length <= 1) return;
    setCursorStack((s) => s.slice(0, -1));
  }

  function resetPaging() {
    setCursorStack([null]);
  }

  const rows = data?.items ?? [];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-gray-500">
            <Link href="/ops/orders" className="underline">
              Orders
            </Link>{' '}
            <span className="mx-1">/</span>
            <span>Stock</span>
          </div>

          <h1 className="text-xl font-semibold mt-1">Stock</h1>
          <div className="text-sm text-gray-600">Detect → Investigate → Adjust → Reconcile → Audit</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            disabled={cursorStack.length <= 1 || loading}
            className="px-3 py-2 rounded border bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Prev
          </button>

          <button
            onClick={goNext}
            disabled={!data?.pageInfo?.hasNextPage || loading}
            className="px-3 py-2 rounded border bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <div className="rounded border bg-white p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2 md:flex-row md:items-end">
            <label className="text-sm">
              <div className="text-gray-600">TownId</div>
              <input
                className="mt-1 w-72 rounded-md border px-2 py-1 text-sm"
                placeholder="(optional) cmk..."
                value={townId}
                onChange={(e) => {
                  setTownId(e.target.value);
                  resetPaging();
                }}
              />
            </label>

            <label className="text-sm">
              <div className="text-gray-600">Limit</div>
              <select
                className="mt-1 rounded-md border px-2 py-1 text-sm"
                value={String(limit)}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  resetPaging();
                }}
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={String(n)}>
                    {n}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm mt-2 md:mt-0">
              <input
                type="checkbox"
                checked={onlyMismatches}
                onChange={(e) => {
                  setOnlyMismatches(e.target.checked);
                  resetPaging();
                }}
              />
              <span>Only mismatches</span>
            </label>
          </div>

          <div className="text-sm text-gray-600">
            Page <span className="font-medium text-gray-900">{cursorStack.length}</span>
          </div>
        </div>

        {err ? (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            {err}
          </div>
        ) : null}
      </div>

      <div className="rounded border bg-white overflow-x-auto">
        <table className="min-w-[1100px] w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-600">
            <tr className="text-left">
              <th className="p-3">Town</th>
              <th className="p-3">Product</th>
              <th className="p-3">Model</th>
              <th className="p-3">Snapshot</th>
              <th className="p-3">Ledger</th>
              <th className="p-3">Diff</th>
              <th className="p-3">Last move</th>
              <th className="p-3">Snapshot updated</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td className="p-3 text-gray-500" colSpan={9}>
                  Loading…
                </td>
              </tr>
            ) : err ? (
              <tr>
                <td className="p-3 text-red-600" colSpan={9}>
                  {err}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="p-3 text-gray-500" colSpan={9}>
                  No rows found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.townProductId}
                  className={`border-t ${row.isMismatch ? 'bg-red-50' : 'bg-white'}`}
                >
                  <td className="p-3">
                    <div className="font-medium">{row.townName}</div>
                    <div className="text-xs text-gray-500">{row.townSlug}</div>
                  </td>

                  <td className="p-3">
                    <div className="font-medium">{row.productName}</div>
                    <div className="text-xs text-gray-500 font-mono">{row.townProductId}</div>
                  </td>

                  <td className="p-3">{row.pricingModel}</td>
                  <td className="p-3">{fmtVal(row, 'snapshot')}</td>
                  <td className="p-3">{fmtVal(row, 'ledger')}</td>
                  <td className="p-3 font-semibold">{fmtVal(row, 'diff')}</td>
                  <td className="p-3 whitespace-nowrap">{fmtDate(row.lastMovementAt)}</td>
                  <td className="p-3 whitespace-nowrap">{fmtDate(row.snapshotUpdatedAt)}</td>

                  <td className="p-3">
                    <Link className="underline" href={`/ops/stock/${row.townProductId}`}>
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
