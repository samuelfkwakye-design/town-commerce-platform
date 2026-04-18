"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type AdminRole =
  | "GLOBAL_SUPER_ADMIN"
  | "TOWN_SUPER_ADMIN"
  | "WAREHOUSE_ADMIN";

type CurrentAdmin = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: AdminRole;
  townId: string | null;
  town: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

type ProfitRow = {
  townProductId: string;
  townId: string;
  productId: string;
  productName: string;
  pricingModel: "UNIT" | "WEIGHT";
  stockQty: number | null;
  stockWeightGrams: number | null;
  sellingValue: number;
  costValue: number;
  profit: number;
  marginPercent: number | null;
};

type ProfitResponse = {
  rows: ProfitRow[];
  totals: {
    sellingValue: number;
    costValue: number;
    profit: number;
    marginPercent: number | null;
  };
  pageInfo: {
    limit: number;
    hasNextPage: boolean;
    nextCursor: string | null;
  };
};

function safeErrMessage(raw: any): string {
  const msg = raw?.message ?? raw?.toString?.() ?? "Request failed";
  if (typeof msg === "string") {
    try {
      const parsed = JSON.parse(msg);
      if (parsed?.message) return parsed.message;
    } catch {
      // ignore
    }
    return msg;
  }
  return "Request failed";
}

function fmtMoney(n: number): string {
  return Number.isFinite(n) ? n.toFixed(2) : String(n);
}

export default function ProfitReportPage() {
  const LIMIT = 25;

  const [admin, setAdmin] = useState<CurrentAdmin | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const [townId, setTownId] = useState<string>("");
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const cursor = cursorStack[cursorStack.length - 1] ?? null;

  const [data, setData] = useState<ProfitResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const isGlobal = admin?.role === "GLOBAL_SUPER_ADMIN";
  const isTownSuper = admin?.role === "TOWN_SUPER_ADMIN";
  const isWarehouse = admin?.role === "WAREHOUSE_ADMIN";

  async function load(
    currentTownId: string,
    currentCursor: string | null,
    currentAdmin?: CurrentAdmin | null,
  ) {
    const effectiveAdmin = currentAdmin ?? admin;
    if (!effectiveAdmin) return;

    setLoading(true);
    setErr(null);

    try {
      const qs = new URLSearchParams();
      qs.set("limit", String(LIMIT));

      if (currentCursor) qs.set("cursor", currentCursor);

      if (effectiveAdmin.role === "GLOBAL_SUPER_ADMIN") {
        if (currentTownId.trim()) {
          qs.set("townId", currentTownId.trim());
        }
      } else if (effectiveAdmin.townId) {
        qs.set("townId", effectiveAdmin.townId);
      }

      const res = await apiFetch<ProfitResponse>(`/reports/profit?${qs.toString()}`);
      setData(res);
    } catch (e: any) {
      setData(null);
      setErr(safeErrMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        setBootstrapping(true);
        setErr(null);
        setAccessDenied(false);

        const me = await apiFetch<CurrentAdmin>("/admin-auth/me");
        if (cancelled) return;

        setAdmin(me);

        if (me.role === "WAREHOUSE_ADMIN") {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        const initialTownId =
          me.role === "GLOBAL_SUPER_ADMIN" ? "" : me.townId ?? "";

        setTownId(initialTownId);
        setCursorStack([null]);

        await load(initialTownId, null, me);
      } catch (e: any) {
        if (!cancelled) {
          setErr(safeErrMessage(e));
          setLoading(false);
        }
      } finally {
        if (!cancelled) {
          setBootstrapping(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = data?.totals ?? null;

  function onApplyTown() {
    const effectiveTownId = isGlobal ? townId : admin?.townId ?? "";
    setCursorStack([null]);
    void load(effectiveTownId, null);
  }

  function goNext() {
    const next = data?.pageInfo?.nextCursor ?? null;
    if (!next) return;
    setCursorStack((s) => [...s, next]);
    void load(isGlobal ? townId : admin?.townId ?? "", next);
  }

  function goPrev() {
    if (cursorStack.length <= 1) return;
    const prevStack = cursorStack.slice(0, -1);
    const prevCursor = prevStack[prevStack.length - 1] ?? null;
    setCursorStack(prevStack);
    void load(isGlobal ? townId : admin?.townId ?? "", prevCursor);
  }

  const pageLabel = useMemo(() => {
    return `Page ${cursorStack.length}`;
  }, [cursorStack.length]);

  if (bootstrapping) {
    return (
      <div className="p-4">
        <div className="text-sm text-gray-500">Loading report access…</div>
      </div>
    );
  }

  if (accessDenied || isWarehouse) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-sm text-gray-500">
          <Link className="underline" href="/ops/reports">
            Reports
          </Link>{" "}
          <span className="mx-1">/</span>
          <span>Profit & Valuation</span>
        </div>

        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          You do not have permission to access this report.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-gray-500">
            <Link className="underline" href="/ops/reports">
              Reports
            </Link>{" "}
            <span className="mx-1">/</span>
            <span>Profit & Valuation</span>
          </div>
          <h1 className="text-xl font-semibold mt-1">Profit & Valuation</h1>
          <div className="text-sm text-gray-600 mt-1">
            Uses stock snapshot + per-item cost to estimate valuation and profit.
          </div>
          {admin ? (
            <div className="text-xs text-gray-500 mt-1">
              Role: <span className="font-medium">{admin.role}</span>
              {isTownSuper && admin.town ? (
                <>
                  {" "}
                  · Town-scoped to <span className="font-medium">{admin.town.name}</span>
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/ops/stock"
            className="px-3 py-2 rounded border bg-white hover:bg-gray-50"
          >
            Stock
          </Link>
          <Link
            href="/ops/orders"
            className="px-3 py-2 rounded border bg-white hover:bg-gray-50"
          >
            Orders
          </Link>
        </div>
      </div>

      <div className="rounded border bg-white p-3 flex flex-col md:flex-row md:items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Town</label>

          {isGlobal ? (
            <>
              <input
                value={townId}
                onChange={(e) => setTownId(e.target.value)}
                placeholder="e.g. cmkjwc7b00000x0dbnesilkaz"
                className="w-full rounded border px-3 py-2 text-sm"
              />
              <div className="text-xs text-gray-500 mt-1">Leave blank for all towns.</div>
            </>
          ) : (
            <>
              <div className="w-full rounded border bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {admin?.town?.name ?? "Assigned town"}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                This report is locked to your assigned town.
              </div>
            </>
          )}
        </div>

        <button
          onClick={onApplyTown}
          disabled={loading}
          className="px-3 py-2 rounded border bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
        >
          Apply
        </button>

        <div className="flex items-center gap-2 ml-auto">
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
          <div className="text-xs text-gray-500">{pageLabel}</div>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : err ? (
        <div className="text-sm text-red-600">{err}</div>
      ) : !data ? (
        <div className="text-sm text-gray-500">No data.</div>
      ) : (
        <>
          {totals ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="rounded border bg-white p-3">
                <div className="text-xs text-gray-500">Total selling value</div>
                <div className="text-2xl font-semibold mt-1">{fmtMoney(totals.sellingValue)}</div>
              </div>
              <div className="rounded border bg-white p-3">
                <div className="text-xs text-gray-500">Total cost value</div>
                <div className="text-2xl font-semibold mt-1">{fmtMoney(totals.costValue)}</div>
              </div>
              <div className="rounded border bg-white p-3">
                <div className="text-xs text-gray-500">Total profit</div>
                <div className="text-2xl font-semibold mt-1">{fmtMoney(totals.profit)}</div>
              </div>
              <div className="rounded border bg-white p-3">
                <div className="text-xs text-gray-500">Margin %</div>
                <div className="text-2xl font-semibold mt-1">
                  {totals.marginPercent === null ? "—" : `${totals.marginPercent.toFixed(2)}%`}
                </div>
              </div>
            </div>
          ) : null}

          <div className="rounded border bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500">
                <tr className="border-b">
                  <th className="text-left p-2">Product</th>
                  <th className="text-left p-2">Model</th>
                  <th className="text-left p-2">Stock</th>
                  <th className="text-left p-2">Selling</th>
                  <th className="text-left p-2">Cost</th>
                  <th className="text-left p-2">Profit</th>
                  <th className="text-left p-2">Margin</th>
                  <th className="text-left p-2">TownProduct</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => {
                  const stockText =
                    r.pricingModel === "UNIT"
                      ? r.stockQty === null
                        ? "—"
                        : String(r.stockQty)
                      : r.stockWeightGrams === null
                        ? "—"
                        : `${r.stockWeightGrams} g`;

                  const marginText =
                    r.marginPercent === null ? "—" : `${r.marginPercent.toFixed(2)}%`;

                  return (
                    <tr key={r.townProductId} className="border-b">
                      <td className="p-2">{r.productName}</td>
                      <td className="p-2">{r.pricingModel}</td>
                      <td className="p-2 font-mono text-xs">{stockText}</td>
                      <td className="p-2 font-mono text-xs">{fmtMoney(r.sellingValue)}</td>
                      <td className="p-2 font-mono text-xs">{fmtMoney(r.costValue)}</td>
                      <td className="p-2 font-mono text-xs">{fmtMoney(r.profit)}</td>
                      <td className="p-2 font-mono text-xs">{marginText}</td>
                      <td className="p-2 font-mono text-xs">
                        <Link className="underline" href={`/ops/stock/${r.townProductId}`}>
                          {r.townProductId.slice(0, 8)}…
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}