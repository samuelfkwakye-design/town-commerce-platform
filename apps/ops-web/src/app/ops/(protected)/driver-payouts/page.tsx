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

  const [selectedDriver, setSelectedDriver] = useState<PayoutRow | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

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

  function openPaymentModal(row: PayoutRow) {
    if (row.outstandingAmount <= 0) return;

    setSelectedDriver(row);
    setPaymentAmount(String(row.outstandingAmount));
    setPaymentNote(`Weekly payout for ${row.deliveries} deliveries`);
    setError(null);
    setSuccess(null);
  }

  function closePaymentModal() {
    setSelectedDriver(null);
    setPaymentAmount('');
    setPaymentNote('');
  }

  async function submitPayment() {
    if (!selectedDriver) return;

    const amount = Number(paymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid payment amount greater than 0.');
      return;
    }

    if (amount > selectedDriver.outstandingAmount) {
      setError('Payment amount cannot be greater than the outstanding amount.');
      return;
    }

    setPayingDriverId(selectedDriver.driverId);
    setError(null);
    setSuccess(null);

    try {
      await apiFetch('/admin/driver-payouts/pay', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({
          driverId: selectedDriver.driverId,
          amount,
          note: paymentNote.trim() || `Driver payout for ${selectedDriver.driverName}`,
        }),
      });

      setSuccess(
        `Payment of ${money(amount)} recorded for ${selectedDriver.driverName}.`,
      );

      closePaymentModal();
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
                      onClick={() => openPaymentModal(row)}
                      disabled={busy || row.outstandingAmount <= 0}
                      className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busy
                        ? 'Recording...'
                        : row.outstandingAmount > 0
                          ? 'Record payment'
                          : 'Paid'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedDriver ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  Record driver payment
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedDriver.driverName} · Outstanding:{' '}
                  <span className="font-bold text-amber-700">
                    {money(selectedDriver.outstandingAmount)}
                  </span>
                </p>
              </div>

              <button
                onClick={closePaymentModal}
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700">
                  Amount paid
                </label>
                <input
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setPaymentAmount(String(selectedDriver.outstandingAmount))}
                    className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                  >
                    Full amount
                  </button>
                  <button
                    onClick={() =>
                      setPaymentAmount(String(Math.round((selectedDriver.outstandingAmount / 2) * 100) / 100))
                    }
                    className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
                  >
                    Half
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">Note</label>
                <textarea
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                Remaining after payment:{' '}
                {money(
                  Math.max(
                    selectedDriver.outstandingAmount - Number(paymentAmount || 0),
                    0,
                  ),
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={closePaymentModal}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={submitPayment}
                disabled={payingDriverId === selectedDriver.driverId}
                className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {payingDriverId === selectedDriver.driverId
                  ? 'Recording...'
                  : 'Record payment'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
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