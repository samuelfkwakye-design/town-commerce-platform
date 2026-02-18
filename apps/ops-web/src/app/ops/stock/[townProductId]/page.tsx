'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';

type TownProductStock = {
  townProductId: string;

  townId: string;
  townName: string;
  townSlug: string;

  productId: string;
  productName: string;

  pricingModel: 'UNIT' | 'WEIGHT';

  snapshotQty: number | null;
  snapshotWeightGrams: number | null;

  ledgerQty: number | null;
  ledgerWeightGrams: number | null;

  diffQty: number | null;
  diffWeightGrams: number | null;

  lastMovementAt: string | null;
  snapshotUpdatedAt: string | null;

  isMismatch: boolean;
};

type StockMovementLite = {
  id: string;
  createdAt: string;

  townProductId: string;

  type: string;
  reason: string | null;

  deltaQty: number | null;
  deltaWeightGrams: number | null;

  orderId: string | null;
  orderItemId: string | null;
  refundId: string | null;
  refundItemId: string | null;

  note: string | null;
};

type MovementsPage = {
  items: StockMovementLite[];
  pageInfo: {
    limit: number;
    hasNextPage: boolean;
    nextCursor: string | null;
  };
};

function safeErrMessage(raw: any): string {
  const msg = raw?.message ?? raw?.toString?.() ?? 'Request failed';
  if (typeof msg === 'string') {
    try {
      const parsed = JSON.parse(msg);
      if (parsed?.message) return parsed.message;
    } catch {
      // ignore
    }
    return msg;
  }
  return 'Request failed';
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function fmtQtyOrWeight(stock: TownProductStock, qty: number | null, grams: number | null): string {
  if (stock.pricingModel === 'UNIT') return qty === null ? '—' : String(qty);
  return grams === null ? '—' : `${grams} g`;
}

function computeDiff(stock: TownProductStock): { text: string; isZero: boolean } {
  if (stock.pricingModel === 'UNIT') {
    if (stock.diffQty === null) return { text: '—', isZero: true };
    return { text: String(stock.diffQty), isZero: stock.diffQty === 0 };
  }
  if (stock.diffWeightGrams === null) return { text: '—', isZero: true };
  return { text: `${stock.diffWeightGrams} g`, isZero: stock.diffWeightGrams === 0 };
}

export default function StockPage() {
  const params = useParams<{ townProductId: string }>();
  const townProductId = (params?.townProductId ?? '').toString();

  const [stock, setStock] = useState<TownProductStock | null>(null);
  const [stockErr, setStockErr] = useState<string | null>(null);
  const [loadingStock, setLoadingStock] = useState<boolean>(true);

  const [movements, setMovements] = useState<MovementsPage | null>(null);
  const [movementsErr, setMovementsErr] = useState<string | null>(null);
  const [loadingMoves, setLoadingMoves] = useState<boolean>(true);

  // Cursor pagination state
  const LIMIT = 20;
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const currentCursor = cursorStack[cursorStack.length - 1] ?? null;

  // Manual adjustment modal state
  const [adjOpen, setAdjOpen] = useState(false);
  const [adjDelta, setAdjDelta] = useState<string>(''); // signed string
  const [adjNote, setAdjNote] = useState<string>('');
  const [adjErr, setAdjErr] = useState<string | null>(null);
  const [adjBusy, setAdjBusy] = useState<boolean>(false);

  const diff = useMemo(() => (stock ? computeDiff(stock) : { text: '—', isZero: true }), [stock]);

  const unitLabel = useMemo(() => {
    if (!stock) return '';
    return stock.pricingModel === 'UNIT' ? 'Qty' : 'Grams';
  }, [stock]);

  async function loadStock(id: string) {
    setLoadingStock(true);
    setStockErr(null);
    try {
      const data = await apiFetch<TownProductStock>(`/admin/town-products/${id}/stock`);
      setStock(data);
    } catch (e: any) {
      setStock(null);
      setStockErr(safeErrMessage(e));
    } finally {
      setLoadingStock(false);
    }
  }

  async function loadMovements(id: string, cursor: string | null) {
    setLoadingMoves(true);
    setMovementsErr(null);
    try {
      const qs = new URLSearchParams();
      qs.set('limit', String(LIMIT));
      if (cursor) qs.set('cursor', cursor);

      const data = await apiFetch<MovementsPage>(
        `/admin/town-products/${id}/stock-movements?${qs.toString()}`,
      );
      setMovements(data);
    } catch (e: any) {
      setMovements(null);
      setMovementsErr(safeErrMessage(e));
    } finally {
      setLoadingMoves(false);
    }
  }

  function reloadCurrent() {
    if (!townProductId) return;
    void loadStock(townProductId);
    void loadMovements(townProductId, currentCursor);
  }

  useEffect(() => {
    if (!townProductId) {
      setLoadingStock(false);
      setLoadingMoves(false);
      setStock(null);
      setMovements(null);
      setStockErr('Missing townProductId in route');
      setMovementsErr(null);
      return;
    }

    setCursorStack([null]);
    void loadStock(townProductId);
    void loadMovements(townProductId, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [townProductId]);

  async function onReconcile() {
    if (!townProductId) return;
    if (!confirm('Reconcile snapshot stock to match ledger totals?')) return;

    try {
      await apiFetch(`/admin/town-products/${townProductId}/reconcile`, { method: 'POST' });
      reloadCurrent();
    } catch (e: any) {
      alert(safeErrMessage(e));
    }
  }

  function goNext() {
    const next = movements?.pageInfo?.nextCursor ?? null;
    if (!next) return;
    setCursorStack((s) => [...s, next]);
    void loadMovements(townProductId, next);
  }

  function goPrev() {
    if (cursorStack.length <= 1) return;
    const prevStack = cursorStack.slice(0, -1);
    const prevCursor = prevStack[prevStack.length - 1] ?? null;
    setCursorStack(prevStack);
    void loadMovements(townProductId, prevCursor);
  }

  function openAdjust() {
    setAdjErr(null);
    setAdjDelta('');
    setAdjNote('');
    setAdjOpen(true);
  }

  function closeAdjust() {
    if (adjBusy) return;
    setAdjOpen(false);
  }

  async function submitAdjust() {
    if (!stock) return;

    const raw = adjDelta.trim();
    const n = Number(raw);

    if (!raw) {
      setAdjErr(`Enter a signed ${unitLabel.toLowerCase()} change (e.g. 3 or -2).`);
      return;
    }
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      setAdjErr(`${unitLabel} change must be an integer (signed).`);
      return;
    }
    if (n === 0) {
      setAdjErr(`${unitLabel} change cannot be 0.`);
      return;
    }

    setAdjErr(null);
    setAdjBusy(true);

    try {
      const body =
        stock.pricingModel === 'UNIT'
          ? { deltaQty: n, note: adjNote.trim() || undefined }
          : { deltaWeightGrams: n, note: adjNote.trim() || undefined };

      await apiFetch(`/admin/town-products/${townProductId}/manual-adjustment`, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      setAdjOpen(false);
      reloadCurrent();
    } catch (e: any) {
      setAdjErr(safeErrMessage(e));
    } finally {
      setAdjBusy(false);
    }
  }

  const headerLine = useMemo(() => {
    if (loadingStock) return 'Loading stock…';
    if (stockErr) return stockErr;
    if (!stock) return '—';
    return `${stock.productName} · ${stock.townName} · ${stock.pricingModel}`;
  }, [loadingStock, stockErr, stock]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-gray-500">
            <Link href="/ops/orders" className="underline">
              Orders
            </Link>{' '}
            <span className="mx-1">/</span>
            <Link href="/ops/stock" className="underline">
              Stock
            </Link>
            <span className="mx-1">/</span>
            <span>Detail</span>
          </div>
          <h1 className="text-xl font-semibold mt-1">Stock Investigation</h1>
          <div className="text-sm text-gray-600 mt-1">
            TownProduct: <span className="font-mono">{townProductId || '—'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openAdjust}
            disabled={!stock || loadingStock}
            className="px-3 py-2 rounded border bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Manual adjustment
          </button>

          <button
            onClick={onReconcile}
            disabled={!stock || loadingStock}
            className="px-3 py-2 rounded border bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Reconcile snapshot to ledger
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className={`text-sm ${stockErr ? 'text-red-600' : 'text-gray-800'}`}>{headerLine}</span>

        {!loadingStock && !stockErr && stock ? (
          stock.isMismatch ? (
            <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">
              MISMATCH
            </span>
          ) : (
            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
              OK
            </span>
          )
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded border bg-white p-3">
          <div className="text-xs text-gray-500">Snapshot</div>
          <div className="text-2xl font-semibold mt-1">
            {stock ? fmtQtyOrWeight(stock, stock.snapshotQty, stock.snapshotWeightGrams) : '—'}
          </div>
          <div className="text-xs text-gray-500 mt-2">Updated</div>
          <div className="text-sm">{stock ? fmtDateTime(stock.snapshotUpdatedAt) : '—'}</div>
        </div>

        <div className="rounded border bg-white p-3">
          <div className="text-xs text-gray-500">Ledger</div>
          <div className="text-2xl font-semibold mt-1">
            {stock ? fmtQtyOrWeight(stock, stock.ledgerQty, stock.ledgerWeightGrams) : '—'}
          </div>
          <div className="text-xs text-gray-500 mt-2">Last movement</div>
          <div className="text-sm">{stock ? fmtDateTime(stock.lastMovementAt) : '—'}</div>
        </div>

        <div className="rounded border bg-white p-3">
          <div className="text-xs text-gray-500">Diff (Snapshot − Ledger)</div>
          <div className={`text-2xl font-semibold mt-1 ${diff.isZero ? 'text-gray-900' : 'text-red-700'}`}>
            {diff.text}
          </div>
          <div className="text-xs text-gray-500 mt-2">Tip</div>
          <div className="text-sm text-gray-700">Use Manual adjustment for ledger changes, then reconcile if needed.</div>
        </div>
      </div>

      <div className="rounded border bg-white">
        <div className="p-3 border-b flex items-center justify-between">
          <div className="font-medium">Stock Movements</div>
          <div className="flex items-center gap-2">
            <button
              onClick={goPrev}
              disabled={cursorStack.length <= 1 || loadingMoves}
              className="px-3 py-1 rounded border bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={goNext}
              disabled={!movements?.pageInfo?.hasNextPage || loadingMoves}
              className="px-3 py-1 rounded border bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

        {loadingMoves ? (
          <div className="p-3 text-sm text-gray-500">Loading movements…</div>
        ) : movementsErr ? (
          <div className="p-3 text-sm text-red-600">{movementsErr}</div>
        ) : !movements || movements.items.length === 0 ? (
          <div className="p-3 text-sm text-gray-500">No movements found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500">
                <tr className="border-b">
                  <th className="text-left p-2">When</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Delta</th>
                  <th className="text-left p-2">Order</th>
                  <th className="text-left p-2">Refund</th>
                  <th className="text-left p-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {movements.items.map((m) => {
                  const delta =
                    stock?.pricingModel === 'WEIGHT'
                      ? m.deltaWeightGrams === null
                        ? '—'
                        : `${m.deltaWeightGrams} g`
                      : m.deltaQty === null
                        ? '—'
                        : String(m.deltaQty);

                  return (
                    <tr key={m.id} className="border-b">
                      <td className="p-2 whitespace-nowrap">{fmtDateTime(m.createdAt)}</td>
                      <td className="p-2">{m.type}</td>
                      <td className="p-2">{delta}</td>
                      <td className="p-2 font-mono text-xs">
                        {m.orderId ? (
                          <Link className="underline" href={`/ops/orders/${m.orderId}`}>
                            {m.orderId.slice(0, 8)}…
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-2 font-mono text-xs">{m.refundId ? `${m.refundId.slice(0, 8)}…` : '—'}</td>
                      <td className="p-2">{m.note ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Adjustment Modal */}
      {adjOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded border bg-white shadow">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <div className="font-semibold">Manual Adjustment</div>
                <div className="text-xs text-gray-500">
                  {stock ? `${stock.productName} · ${stock.townName} · ${stock.pricingModel}` : '—'}
                </div>
              </div>

              <button
                onClick={closeAdjust}
                disabled={adjBusy}
                className="px-2 py-1 rounded border bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Close
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="text-sm text-gray-700">
                Enter a <span className="font-semibold">signed</span> change. Example: <span className="font-mono">3</span> or{' '}
                <span className="font-mono">-2</span>.
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">{unitLabel} change</label>
                <input
                  value={adjDelta}
                  onChange={(e) => setAdjDelta(e.target.value)}
                  placeholder={stock?.pricingModel === 'UNIT' ? 'e.g. 3 or -2' : 'e.g. 250 or -100'}
                  className="w-full rounded border px-3 py-2 text-sm"
                  disabled={adjBusy}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {stock?.pricingModel === 'WEIGHT' ? 'Grams (integer).' : 'Quantity (integer).'}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Note (optional)</label>
                <input
                  value={adjNote}
                  onChange={(e) => setAdjNote(e.target.value)}
                  placeholder="e.g. Stock count correction"
                  className="w-full rounded border px-3 py-2 text-sm"
                  disabled={adjBusy}
                />
              </div>

              {adjErr ? <div className="text-sm text-red-600">{adjErr}</div> : null}
            </div>

            <div className="p-4 border-t flex items-center justify-end gap-2">
              <button
                onClick={closeAdjust}
                disabled={adjBusy}
                className="px-3 py-2 rounded border bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitAdjust}
                disabled={adjBusy || !stock}
                className="px-3 py-2 rounded border bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {adjBusy ? 'Saving…' : 'Create movement'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
