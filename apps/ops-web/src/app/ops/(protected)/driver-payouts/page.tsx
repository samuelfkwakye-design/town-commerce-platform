'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';

type PayoutRow = {
  driverId: string;
  driverName: string;
  driverPhone: string;
  townId: string;
  town: {
    id: string;
    name: string;
    slug: string;
  } | null;
  deliveries: number;
  earningPerDelivery: number;
  estimatedEarnings: number;
  paidAmount: number;
  outstandingAmount: number;
};

type PayoutSummary = {
  periodFrom: string;
  periodTo: string;
  currency: string;
  rows: PayoutRow[];
  totals: {
    deliveries: number;
    estimatedEarnings: number;
    paidAmount: number;
    outstandingAmount: number;
  };
};

function money(value: number | null | undefined) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GHS',
  }).format(Number(value ?? 0));
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

export default function DriverPayoutsPage() {
  const [data, setData] = useState<PayoutSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [payingDriverId, setPayingDriverId] = useState<string | null>(null);

  const rows = data?.rows || [];

  const driversWithOutstanding = useMemo(
    () => rows.filter((row) => row.outstandingAmount > 0),
    [rows],
  );

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch<PayoutSummary>('/admin/driver-payouts/summary', {
        auth: true,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load driver payouts');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function markPaid(row: PayoutRow) {
    if (row.outstandingAmount <= 0) return;

    const ok = confirm(
      `Confirm payout of ${money(row.outstandingAmount)} to ${row.driverName}?`,
    );

    if (!ok) return;

    setPayingDriverId(row.driverId);
    setError(null);
    setSuccess(null);

    try {
      await apiFetch('/admin/driver-payouts/pay', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({
          driverId: row.driverId,
          amount: row.outstandingAmount,
          note: `Weekly payout for ${row.deliveries} deliveries`,
        }),
      });

      setSuccess(`Payout recorded for ${row.driverName}.`);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Failed to record payout');
    } finally {
      setPayingDriverId(null);
    }
  }

  if (loading) {
    return <div className="p-6 text-slate-600">Loading driver payouts...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-emerald-700 to-emerald-900 p-6 text-white shadow-lg shadow-emerald-900/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide">
              Driver Finance
            </div>
            <h1 className="mt-3 text-3xl font-black">Driver Payouts</h1>
            <p className="mt-2 text-sm text-emerald-50">
              Track estimated driver earnings, paid amounts and outstanding payouts.
            </p>
            <p className="mt-1 text-xs text-emerald-100">
              Period: {formatDate(data?.periodFrom)} → {formatDate(data?.periodTo)}
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

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
          ✅ {success}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-4">
        <Metric title="Deliveries" value={String(data?.totals.deliveries ?? 0)} tone="slate" />
        <Metric title="Estimated earnings" value={money(data?.totals.estimatedEarnings)} tone="emerald" />
        <Metric title="Paid" value={money(data?.totals.paidAmount)} tone="slate" />
        <Metric title="Outstanding" value={money(data?.totals.outstandingAmount)} tone="amber" />
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-emerald-100">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Payout summary by driver
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {driversWithOutstanding.length} driver(s) currently have outstanding payouts.
            </p>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
            No active drivers found.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="grid grid-cols-7 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
              <div className="col-span-2">Driver</div>
              <div>Deliveries</div>
              <div>Earned</div>
              <div>Paid</div>
              <div>Outstanding</div>
              <div className="text-right">Action</div>
            </div>

            {rows.map((row) => {
              const busy = payingDriverId === row.driverId;

              return (
                <div
                  key={row.driverId}
                  className="grid grid-cols-7 items-center border-t border-slate-200 px-4 py-4 text-sm"
                >
                  <div className="col-span-2">
                    <div className="font-bold text-slate-900">{row.driverName}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {row.driverPhone || 'No phone'}
                      {row.town?.name ? ` · ${row.town.name}` : ''}
                    </div>
                  </div>

                  <div className="font-semibold text-slate-700">{row.deliveries}</div>
                  <div className="font-semibold text-emerald-700">
                    {money(row.estimatedEarnings)}
                  </div>
                  <div className="font-semibold text-slate-700">
                    {money(row.paidAmount)}
                  </div>
                  <div className="font-black text-amber-700">
                    {money(row.outstandingAmount)}
                  </div>

                  <div className="text-right">
                    <button
                      onClick={() => markPaid(row)}
                      disabled={busy || row.outstandingAmount <= 0}
                      className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busy
                        ? 'Recording...'
                        : row.outstandingAmount > 0
                          ? 'Mark paid'
                          : 'Paid'}
                    </button>
                  </div>
                </div>
              );
            })}
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
  tone: 'emerald' | 'amber' | 'slate';
}) {
  const toneClass =
    tone === 'emerald'
      ? 'bg-emerald-50 text-emerald-800 ring-emerald-100'
      : tone === 'amber'
        ? 'bg-amber-50 text-amber-800 ring-amber-100'
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
