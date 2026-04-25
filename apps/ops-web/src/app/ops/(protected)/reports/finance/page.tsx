'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

type FinanceSummary = {
  generatedAt: string;
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

function money(value: number | null | undefined) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GHS',
  }).format(Number(value ?? 0));
}

function number(value: number | null | undefined) {
  return new Intl.NumberFormat('en-GB').format(Number(value ?? 0));
}

export default function FinanceReportsPage() {
  const [data, setData] = useState<FinanceSummary | null>(null);
  const [profit, setProfit] = useState<ProfitIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const [summaryRes, profitRes] = await Promise.all([
        apiFetch<FinanceSummary>('/admin/reports/finance-summary', {
          auth: true,
        }),
        apiFetch<ProfitIntelligence>('/admin/reports/profit-intelligence', {
          auth: true,
        }),
      ]);

      setData(summaryRes);
      setProfit(profitRes);
    } catch (err: any) {
      setError(err?.message || 'Failed to load finance report');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

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

  if (loading) {
    return <div className="p-6 text-slate-600">Loading finance dashboard...</div>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-emerald-700 to-emerald-900 p-6 text-white shadow-lg shadow-emerald-900/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide">
              Finance
            </div>
            <h1 className="mt-3 text-3xl font-black">Finance Dashboard</h1>
            <p className="mt-2 text-sm text-emerald-50">
              Revenue, profit, COD collection and settlement visibility.
            </p>
            <p className="mt-1 text-xs text-emerald-100">
              Last updated:{' '}
              {data?.generatedAt
                ? new Date(data.generatedAt).toLocaleString()
                : '—'}
            </p>
          </div>

          <button
            onClick={load}
            className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-emerald-800"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Metric title="Revenue today" value={money(profit?.today?.revenue)} tone="emerald" />
        <Metric title="Profit today" value={money(profit?.today?.profit)} tone="emerald" />
        <Metric title="Profit margin" value={`${Number(profit?.today?.margin ?? 0).toFixed(1)}%`} tone={profitTone} />
        <Metric title="Profit health" value={profit?.health || '—'} tone={profitTone} />
      </div>

      {profit?.health === 'CRITICAL' || profit?.health === 'WARNING' ? (
        <div
          className={`rounded-3xl p-5 text-sm font-bold ring-1 ${
            profit.health === 'CRITICAL'
              ? 'bg-red-50 text-red-800 ring-red-200'
              : 'bg-amber-50 text-amber-800 ring-amber-200'
          }`}
        >
          {profit.health === 'CRITICAL'
            ? '⚠ Profit margin is critically low today. Review pricing, delivery fees, product costs, or refunds.'
            : '⚠ Profit margin is below the preferred range today. Keep an eye on costs and pricing.'}
        </div>
      ) : (
        <div className="rounded-3xl bg-emerald-50 p-5 text-sm font-bold text-emerald-800 ring-1 ring-emerald-100">
          ✅ Profit margin looks healthy today.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-4">
        <Metric title="Today revenue" value={money(totals?.todayRevenue)} tone="emerald" />
        <Metric title="This week revenue" value={money(totals?.weekRevenue)} tone="slate" />
        <Metric title="Today profit" value={money(totals?.todayProfit)} tone="emerald" />
        <Metric title="This week profit" value={money(totals?.weekProfit)} tone="slate" />
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Metric title="COD collected today" value={money(totals?.todayCodCollected)} tone="emerald" />
        <Metric title="COD outstanding" value={money(totals?.codOutstandingAmount)} tone="amber" />
        <Metric title="Outstanding COD orders" value={number(totals?.codOutstandingOrders)} tone="amber" />
        <Metric
          title="COD risk"
          value={codRiskLevel}
          tone={
            codRiskLevel === 'High'
              ? 'red'
              : codRiskLevel === 'Medium'
                ? 'amber'
                : 'emerald'
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Metric title="Delivered today" value={number(totals?.todayDeliveredOrders)} tone="slate" />
        <Metric title="Settled today" value={number(totals?.todaySettledOrders)} tone="slate" />
        <Metric title="Today COGS" value={money(totals?.todayCogs)} tone="slate" />
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-emerald-100">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Outstanding COD by driver
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Drivers holding cash that still needs to be collected.
            </p>
          </div>

          <Link
            href="/ops/cod"
            className="rounded-2xl bg-emerald-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-emerald-700"
          >
            Open COD Cash
          </Link>
        </div>

        {!data?.codOutstandingByDriver?.length ? (
          <div className="rounded-2xl bg-emerald-50 p-5 text-sm font-semibold text-emerald-800">
            No outstanding COD cash. Everything is settled.
          </div>
        ) : (
          <div className="space-y-3">
            {data.codOutstandingByDriver.map((driver) => (
              <div
                key={driver.driverId || 'unassigned'}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-bold text-slate-900">
                    {driver.driverName || 'Unassigned'}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {driver.driverPhone || 'No phone'} · {driver.ordersCount}{' '}
                    orders
                  </div>
                </div>

                <div className="text-lg font-black text-amber-700">
                  {money(driver.totalOutstanding)}
                </div>
              </div>
            ))}
          </div>
        )}
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
  tone: 'emerald' | 'amber' | 'red' | 'slate';
}) {
  const toneClass =
    tone === 'emerald'
      ? 'bg-emerald-50 text-emerald-800 ring-emerald-100'
      : tone === 'amber'
        ? 'bg-amber-50 text-amber-800 ring-amber-100'
        : tone === 'red'
          ? 'bg-red-50 text-red-800 ring-red-100'
          : 'bg-white text-slate-900 ring-slate-200';

  return (
    <div className={`rounded-3xl p-5 shadow-sm ring-1 ${toneClass}`}>
      <div className="text-xs font-black uppercase tracking-wide opacity-70">
        {title}
      </div>
      <div className="mt-3 text-2xl font-black">{value}</div>
    </div>
  );
}