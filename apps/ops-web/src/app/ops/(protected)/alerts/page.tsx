'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

type Alert = {
  id: string;
  type: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  message: string;
  amount?: number;
  count?: number;
  href?: string;
};

type AlertsResponse = {
  generatedAt: string;
  alerts: Alert[];
  totals: {
    alerts: number;
    high: number;
    medium: number;
    low: number;
  };
};

export default function AlertsPage() {
  const [data, setData] = useState<AlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);

  async function load(showLoading = false) {
    if (showLoading) setLoading(true);

    try {
      const res = await apiFetch<AlertsResponse>('/admin/alerts', {
        auth: true,
      });
      setData(res);
      setLastRefreshed(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(true);

    const interval = window.setInterval(() => {
      load(false);
    }, 10000);

    return () => window.clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="p-6 text-slate-600">Loading alerts...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-red-600 to-red-800 p-6 text-white shadow-lg shadow-red-900/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide">
              Live monitoring
            </div>
            <h1 className="mt-3 text-3xl font-black">Smart Alerts</h1>
            <p className="mt-2 text-sm text-red-100">
              Real-time issues that need attention.
            </p>
            <p className="mt-1 text-xs text-red-100">
              Auto-refreshes every 10 seconds · Last refresh: {lastRefreshed || '—'}
            </p>
          </div>

          <button
            onClick={() => load(true)}
            className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-red-700"
          >
            Refresh now
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Metric label="Total" value={data?.totals.alerts} />
        <Metric label="High" value={data?.totals.high} tone="red" />
        <Metric label="Medium" value={data?.totals.medium} tone="amber" />
        <Metric label="Low" value={data?.totals.low} tone="slate" />
      </div>

      {!data?.alerts?.length ? (
        <div className="rounded-3xl bg-emerald-50 p-8 text-center text-emerald-800 ring-1 ring-emerald-100">
          <div className="text-4xl">✅</div>
          <div className="mt-3 text-xl font-black">No active alerts</div>
          <p className="mt-1 text-sm font-semibold">
            Everything looks healthy right now.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.alerts.map((a) => (
            <div
              key={a.id}
              className={`rounded-2xl p-4 shadow-sm ring-1 ${
                a.severity === 'HIGH'
                  ? 'bg-red-50 ring-red-200'
                  : a.severity === 'MEDIUM'
                    ? 'bg-amber-50 ring-amber-200'
                    : 'bg-slate-50 ring-slate-200'
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-black ${
                        a.severity === 'HIGH'
                          ? 'bg-red-600 text-white'
                          : a.severity === 'MEDIUM'
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-600 text-white'
                      }`}
                    >
                      {a.severity}
                    </span>
                    <div className="font-black text-slate-900">{a.title}</div>
                  </div>
                  <div className="mt-1 text-sm text-slate-600">{a.message}</div>
                </div>

                {a.href ? (
                  <Link
                    href={a.href}
                    className="rounded-xl bg-slate-950 px-4 py-2 text-center text-xs font-bold text-white"
                  >
                    View
                  </Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value?: number;
  tone?: 'red' | 'amber' | 'slate';
}) {
  const toneClass =
    tone === 'red'
      ? 'bg-red-50 text-red-800 ring-red-100'
      : tone === 'amber'
        ? 'bg-amber-50 text-amber-800 ring-amber-100'
        : 'bg-white text-slate-900 ring-slate-200';

  return (
    <div className={`rounded-3xl p-5 text-center font-bold shadow-sm ring-1 ${toneClass}`}>
      <div className="text-xs uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-2 text-3xl font-black">{value ?? 0}</div>
    </div>
  );
}