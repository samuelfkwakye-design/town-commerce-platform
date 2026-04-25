'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

type FinanceSummary = {
  generatedAt: string;
  scope?: {
    role: string;
    townId: string | null;
  };
  totals: {
    todayRevenue: number;
    weekRevenue: number;
    todayCodCollected: number;
    codOutstandingAmount: number;
    codOutstandingOrders: number;
    todaySettledOrders: number;
    todayDeliveredOrders: number;
    todayProfit: number;
    weekProfit: number;
    todayCogs: number;
    weekCogs: number;
    todaySalesRevenue: number;
    weekSalesRevenue: number;
  };
  codOutstandingByDriver: Array<{
    driverId: string | null;
    driverName: string | null;
    driverPhone: string | null;
    totalOutstanding: number;
    ordersCount: number;
  }>;
};

type ProfitIntelligence = {
  today: {
    revenue: number;
    refunds: number;
    profit: number;
    cogs: number;
    margin: number;
  };
  health: 'GOOD' | 'WARNING' | 'CRITICAL';
};

type Town = {
  id: string;
  name: string;
  slug: string;
};

type RevenueTrendPoint = {
  period: string;
  revenue: number;
};

type RevenueTrendResponse = {
  rows: RevenueTrendPoint[];
};

type TownLeaderboardRow = {
  townId: string;
  townName?: string;
  town?: string;
  name?: string;
  revenue?: number;
  profit?: number;
  orders?: number;
  totalRevenue?: number;
  totalProfit?: number;
  orderCount?: number;
};

type TownLeaderboardResponse = {
  rows: TownLeaderboardRow[];
};

type TownsResponse = {
  rows: Town[];
};

function money(v: number | null | undefined) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GHS',
  }).format(Number(v ?? 0));
}

function number(v: number | null | undefined) {
  return new Intl.NumberFormat('en-GB').format(Number(v ?? 0));
}

export default function FinanceReportsPage() {
  const [data, setData] = useState<FinanceSummary | null>(null);
  const [profit, setProfit] = useState<ProfitIntelligence | null>(null);
  const [towns, setTowns] = useState<Town[]>([]);
  const [selectedTownId, setSelectedTownId] = useState('');
  const [isGlobal, setIsGlobal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trend, setTrend] = useState<RevenueTrendPoint[]>([]);
  const [leaderboard, setLeaderboard] = useState<TownLeaderboardRow[]>([]);
  
  async function load() {
    setLoading(true);
    setError(null);

    try {
      const me = await apiFetch<any>('/admin-auth/me', { auth: true });

      const global = me?.role === 'GLOBAL_SUPER_ADMIN';
      setIsGlobal(global);

      if (global) {
        const townsRes = await apiFetch<TownsResponse>('/admin/reports/towns', {
          auth: true,
        });
        setTowns(townsRes?.rows || []);
      }

      const query = selectedTownId ? `?townId=${selectedTownId}` : '';
const trendQuery = selectedTownId
  ? `?townId=${selectedTownId}&days=7`
  : '?days=7';

const [summaryRes, profitRes, trendRes, leaderboardRes] = await Promise.all([
  apiFetch<FinanceSummary>(`/admin/reports/finance-summary${query}`, {
    auth: true,
  }),
  apiFetch<ProfitIntelligence>(
    `/admin/reports/profit-intelligence${query}`,
    { auth: true },
  ),
  apiFetch<RevenueTrendResponse>(
    `/admin/reports/revenue-trend${trendQuery}`,
    { auth: true },
  ),
  isGlobal
    ? apiFetch<TownLeaderboardResponse>('/admin/reports/town-leaderboard', {
        auth: true,
      })
    : Promise.resolve({ rows: [] }),
]);

setData(summaryRes);
setProfit(profitRes);
setTrend(trendRes?.rows || []);
setLeaderboard(leaderboardRes?.rows || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load finance report');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [selectedTownId]);

  const totals = data?.totals;

  const codRiskLevel = useMemo(() => {
    const amount = totals?.codOutstandingAmount || 0;
    if (amount >= 1000) return 'High';
    if (amount >= 300) return 'Medium';
    return 'Low';
  }, [totals?.codOutstandingAmount]);

  const profitTone =
    profit?.health === 'CRITICAL'
      ? 'red'
      : profit?.health === 'WARNING'
        ? 'amber'
        : 'emerald';

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-700 to-emerald-900 p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black">Finance Dashboard</h1>

            {/* 👇 Town badge */}
            {!isGlobal && data?.scope?.townId && (
              <div className="mt-2 text-sm font-bold text-emerald-100">
                📍 Your Town
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {/* 👇 Town selector (GLOBAL ONLY) */}
            {isGlobal && (
              <select
                value={selectedTownId}
                onChange={(e) => setSelectedTownId(e.target.value)}
                className="rounded-xl px-3 py-2 text-black"
              >
                <option value="">All towns</option>
                {towns.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={load}
              className="rounded-xl bg-white px-4 py-2 text-emerald-800 font-bold"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* PROFIT */}
      <div className="grid grid-cols-4 gap-4">
        <Metric title="Revenue today" value={money(profit?.today.revenue)} tone="emerald" />
        <Metric title="Profit today" value={money(profit?.today.profit)} tone="emerald" />
        <Metric title="Margin" value={`${profit?.today.margin?.toFixed(1)}%`} tone={profitTone} />
        <Metric title="Health" value={profit?.health || '-'} tone={profitTone} />
      </div>

      {/* COD */}
      <div className="grid grid-cols-4 gap-4">
        <Metric title="COD outstanding" value={money(totals?.codOutstandingAmount)} tone="amber" />
        <Metric title="COD orders" value={number(totals?.codOutstandingOrders)} tone="amber" />
        <Metric title="COD risk" value={codRiskLevel} tone="amber" />
        <Metric title="Collected today" value={money(totals?.todayCodCollected)} tone="emerald" />
      </div>
<div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-emerald-100">
  <div className="mb-5 flex items-center justify-between">
    <div>
      <h2 className="text-xl font-black text-slate-900">7-day revenue trend</h2>
      <p className="mt-1 text-sm text-slate-600">
        Daily successful payment revenue for the selected scope.
      </p>
    </div>
  </div>

  {trend.length === 0 ? (
    <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
      No revenue trend data yet.
    </div>
  ) : (
    <div className="space-y-3">
      {trend.map((point) => {
        const max = Math.max(...trend.map((x) => Number(x.revenue || 0)), 1);
        const width = Math.max((Number(point.revenue || 0) / max) * 100, 4);

        return (
          <div key={point.period}>
            <div className="mb-1 flex justify-between text-xs font-bold text-slate-600">
              <span>{point.period}</span>
              <span>{money(point.revenue)}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-emerald-50">
              <div
                className="h-full rounded-full bg-emerald-600"
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  )}
</div>

{isGlobal ? (
  <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-emerald-100">
    <div className="mb-5">
      <h2 className="text-xl font-black text-slate-900">Town comparison</h2>
      <p className="mt-1 text-sm text-slate-600">
        Compare town performance across revenue, profit and orders.
      </p>
    </div>

    {leaderboard.length === 0 ? (
      <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
        No town leaderboard data yet.
      </div>
    ) : (
      <div className="space-y-3">
        {leaderboard.slice(0, 10).map((row, index) => {
          const revenue =
            row.revenue ?? row.totalRevenue ?? 0;
          const profit =
            row.profit ?? row.totalProfit ?? 0;
          const orders =
            row.orders ?? row.orderCount ?? 0;
          const townName =
            row.townName ?? row.town ?? row.name ?? `Town ${index + 1}`;

          return (
            <div
              key={row.townId || townName}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="font-black text-slate-900">
                  #{index + 1} {townName}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {number(orders)} orders
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-right">
                <div>
                  <div className="text-xs font-bold text-slate-500">Revenue</div>
                  <div className="font-black text-emerald-700">
                    {money(revenue)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500">Profit</div>
                  <div className="font-black text-slate-900">
                    {money(profit)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
) : null}
      {/* DRIVERS */}
      <div className="bg-white p-6 rounded-3xl shadow-sm">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold">COD by Driver</h2>

          <Link
            href="/ops/cod"
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl"
          >
            Open COD
          </Link>
        </div>

        {data?.codOutstandingByDriver.map((d) => (
          <div
            key={d.driverId || 'x'}
            className="flex justify-between border p-3 rounded-xl mb-2"
          >
            <div>
              <div className="font-bold">{d.driverName}</div>
              <div className="text-sm text-gray-500">
                {d.ordersCount} orders
              </div>
            </div>
            <div className="font-bold text-amber-700">
              {money(d.totalOutstanding)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}