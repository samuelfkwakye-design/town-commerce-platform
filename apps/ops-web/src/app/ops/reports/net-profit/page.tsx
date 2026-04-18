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

type NetProfitRow = {
  period: string;

  saleItemsCount: number;
  refundItemsCount: number;

  grossRevenue: number;
  grossCogs: number;
  grossProfit: number;

  refundedRevenue: number;
  refundedCogsRestocked: number;

  netRevenue: number;
  netCogs: number;
  netProfit: number;

  grossMarginPercent: number | null;
  netMarginPercent: number | null;

  refundsCount: number;
  refundedOrdersCount: number;

  restockedRefundItemsCount: number;
  nonRestockedRefundItemsCount: number;
};

type NetProfitResponse = {
  filters: {
    from: string | null;
    to: string | null;
    townId: string | null;
    bucket: "day" | "week" | "month";
  };
  rows: NetProfitRow[];
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

function fmtPct(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return `${n.toFixed(2)}%`;
}

export default function NetProfitTimeseriesPage() {
  const [admin, setAdmin] = useState<CurrentAdmin | null>(null);
  const [bootstrapping, setBootstrapping] = useState<boolean>(true);
  const [accessDenied, setAccessDenied] = useState<boolean>(false);

  const [bucket, setBucket] = useState<"day" | "week" | "month">("day");
  const [townId, setTownId] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const [data, setData] = useState<NetProfitResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  const isGlobal = admin?.role === "GLOBAL_SUPER_ADMIN";
  const isTownSuper = admin?.role === "TOWN_SUPER_ADMIN";
  const isWarehouse = admin?.role === "WAREHOUSE_ADMIN";

  async function load(args?: {
    bucket?: "day" | "week" | "month";
    townId?: string;
    from?: string;
    to?: string;
    admin?: CurrentAdmin | null;
  }) {
    const effectiveAdmin = args?.admin ?? admin;
    if (!effectiveAdmin) return;

    setLoading(true);
    setErr(null);

    const qs = new URLSearchParams();
    qs.set("bucket", args?.bucket ?? bucket);

    const requestedTownId = (args?.townId ?? townId).trim();
    const f = (args?.from ?? from).trim();
    const t = (args?.to ?? to).trim();

    if (effectiveAdmin.role === "GLOBAL_SUPER_ADMIN") {
      if (requestedTownId) qs.set("townId", requestedTownId);
    } else if (effectiveAdmin.townId) {
      qs.set("townId", effectiveAdmin.townId);
    }

    if (f) qs.set("from", f);
    if (t) qs.set("to", t);

    try {
      const res = await apiFetch<NetProfitResponse>(
        `/reports/net-profit-timeseries?${qs.toString()}`,
      );
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

        await load({
          bucket: "day",
          townId: initialTownId,
          from: "",
          to: "",
          admin: me,
        });
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

  const totals = useMemo(() => {
    if (!data?.rows?.length) return null;

    const sum = (k: keyof NetProfitRow) =>
      data.rows.reduce((acc, r) => acc + (Number(r[k]) || 0), 0);

    const grossRevenue = sum("grossRevenue");
    const grossCogs = sum("grossCogs");
    const grossProfit = sum("grossProfit");

    const refundedRevenue = sum("refundedRevenue");
    const refundedCogsRestocked = sum("refundedCogsRestocked");

    const netRevenue = sum("netRevenue");
    const netCogs = sum("netCogs");
    const netProfit = sum("netProfit");

    const grossMarginPercent =
      grossRevenue === 0 ? null : (grossProfit / grossRevenue) * 100;
    const netMarginPercent =
      netRevenue === 0 ? null : (netProfit / netRevenue) * 100;

    const refundsCount = sum("refundsCount");
    const refundedOrdersCount = sum("refundedOrdersCount");

    return {
      grossRevenue,
      grossCogs,
      grossProfit,
      refundedRevenue,
      refundedCogsRestocked,
      netRevenue,
      netCogs,
      netProfit,
      grossMarginPercent,
      netMarginPercent,
      refundsCount,
      refundedOrdersCount,
    };
  }, [data]);

  function onApply() {
    const effectiveTownId = isGlobal ? townId : admin?.townId ?? "";
    void load({
      bucket,
      townId: effectiveTownId,
      from,
      to,
    });
  }

  function onDownloadCsv() {
    const effectiveTownId = isGlobal ? townId.trim() : admin?.townId ?? "";

    const qs = new URLSearchParams();
    qs.set("bucket", bucket);
    if (effectiveTownId) qs.set("townId", effectiveTownId);
    if (from.trim()) qs.set("from", from.trim());
    if (to.trim()) qs.set("to", to.trim());

    const base =
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_BASE ||
      "http://localhost:3000/api/v1";

    const adminKey =
      typeof window !== "undefined"
        ? localStorage.getItem("ops_admin_key") || process.env.NEXT_PUBLIC_ADMIN_KEY
        : process.env.NEXT_PUBLIC_ADMIN_KEY;

    if (adminKey) qs.set("adminKey", adminKey);

    const url = `${base}/admin/exports/net-profit-timeseries.csv?${qs.toString()}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

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
          <span>Net Profit Timeseries</span>
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
            <span>Net Profit Timeseries</span>
          </div>
          <h1 className="text-xl font-semibold mt-1">Net Profit Timeseries</h1>
          <div className="text-sm text-gray-600 mt-1">
            Gross vs net profit over time, including refunds/restocks.
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
          <button
            onClick={onDownloadCsv}
            className="px-3 py-2 rounded border bg-white hover:bg-gray-50"
          >
            Download CSV
          </button>
        </div>
      </div>

      <div className="rounded border bg-white p-3 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Bucket</label>
          <select
            value={bucket}
            onChange={(e) => setBucket(e.target.value as "day" | "week" | "month")}
            className="w-full rounded border px-3 py-2 text-sm"
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Town</label>
          {isGlobal ? (
            <input
              value={townId}
              onChange={(e) => setTownId(e.target.value)}
              placeholder="e.g. cmkjwc7b00000x0dbnesilkaz"
              className="w-full rounded border px-3 py-2 text-sm"
            />
          ) : (
            <div className="w-full rounded border bg-gray-50 px-3 py-2 text-sm text-gray-700">
              {admin?.town?.name ?? "Assigned town"}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">From (optional)</label>
          <input
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="YYYY-MM-DD"
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">To (optional)</label>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="YYYY-MM-DD"
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <div className="md:col-span-4 flex items-center gap-2">
          <button
            onClick={onApply}
            disabled={loading}
            className="px-3 py-2 rounded border bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
          >
            Apply
          </button>
          {data?.filters ? (
            <div className="text-xs text-gray-500">
              Filters: bucket={data.filters.bucket}
              {data.filters.townId ? `, townId=${data.filters.townId}` : ""}
              {data.filters.from ? `, from=${data.filters.from}` : ""}
              {data.filters.to ? `, to=${data.filters.to}` : ""}
            </div>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : err ? (
        <div className="text-sm text-red-600">{err}</div>
      ) : !data || data.rows.length === 0 ? (
        <div className="text-sm text-gray-500">No data.</div>
      ) : (
        <>
          {totals ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="rounded border bg-white p-3">
                <div className="text-xs text-gray-500">Net revenue</div>
                <div className="text-2xl font-semibold mt-1">
                  {fmtMoney(totals.netRevenue)}
                </div>
              </div>
              <div className="rounded border bg-white p-3">
                <div className="text-xs text-gray-500">Net profit</div>
                <div className="text-2xl font-semibold mt-1">
                  {fmtMoney(totals.netProfit)}
                </div>
              </div>
              <div className="rounded border bg-white p-3">
                <div className="text-xs text-gray-500">Net margin</div>
                <div className="text-2xl font-semibold mt-1">
                  {fmtPct(totals.netMarginPercent)}
                </div>
              </div>
              <div className="rounded border bg-white p-3">
                <div className="text-xs text-gray-500">Refunds</div>
                <div className="text-2xl font-semibold mt-1">{totals.refundsCount}</div>
              </div>
            </div>
          ) : null}

          <div className="rounded border bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500">
                <tr className="border-b">
                  <th className="text-left p-2">Period</th>
                  <th className="text-left p-2">Gross rev</th>
                  <th className="text-left p-2">Gross profit</th>
                  <th className="text-left p-2">Refunded rev</th>
                  <th className="text-left p-2">Net rev</th>
                  <th className="text-left p-2">Net profit</th>
                  <th className="text-left p-2">Net margin</th>
                  <th className="text-left p-2">Refunds</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.period} className="border-b">
                    <td className="p-2 font-mono text-xs">{r.period}</td>
                    <td className="p-2 font-mono text-xs">{fmtMoney(r.grossRevenue)}</td>
                    <td className="p-2 font-mono text-xs">{fmtMoney(r.grossProfit)}</td>
                    <td className="p-2 font-mono text-xs">{fmtMoney(r.refundedRevenue)}</td>
                    <td className="p-2 font-mono text-xs">{fmtMoney(r.netRevenue)}</td>
                    <td className="p-2 font-mono text-xs">{fmtMoney(r.netProfit)}</td>
                    <td className="p-2 font-mono text-xs">{fmtPct(r.netMarginPercent)}</td>
                    <td className="p-2 font-mono text-xs">{r.refundsCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-gray-500">
            CSV download button will work after we add backend:{" "}
            <span className="font-mono">/admin/exports/net-profit-timeseries.csv</span>
          </div>
        </>
      )}
    </div>
  );
}