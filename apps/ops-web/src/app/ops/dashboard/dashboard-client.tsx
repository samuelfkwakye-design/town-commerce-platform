"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

type TownOption = { id: string; name: string; slug: string };
type ItemLink = { id: string; label: string; href: string };

type Snapshot = {
  generatedAt: string;
  townId: string | null;
  totalTownProducts: number;
  productsMissingImages: number;
  lowStockCount: number;
  ordersToday: number;
  revenueToday: number;
  refundsToday: number;
  confirmedStaleCount: number;

  missingImagesTop: ItemLink[];
  lowStockTop: ItemLink[];
  confirmedStaleTop: ItemLink[];
};

type TrendPoint = { day: string; revenue: number };
type Trend = { days: number; points: TrendPoint[] };

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href?: string;
}) {
  const inner = (
    <div className="rounded-lg border bg-white p-4 shadow-sm hover:shadow transition">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {href ? <div className="mt-2 text-sm text-blue-600">View</div> : null}
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

function SectionCard({ title, children }: { title: string; children: any }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="text-base font-semibold">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Sparkline({ points }: { points: TrendPoint[] }) {
  const width = 520;
  const height = 120;
  const pad = 10;

  const values = points.map((p) => Number(p.revenue ?? 0));
  const max = Math.max(1, ...values);
  const min = Math.min(...values);

  const coords = points.map((p, i) => {
    const x = pad + (i * (width - pad * 2)) / Math.max(1, points.length - 1);
    const v = Number(p.revenue ?? 0);
    const t = max === min ? 0.5 : (v - min) / (max - min);
    const y = height - pad - t * (height - pad * 2);
    return { x, y, v, day: p.day };
  });

  const d = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`)
    .join(" ");

  const last = coords[coords.length - 1];

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} role="img" aria-label="Revenue trend">
        <path d={d} fill="none" stroke="black" strokeWidth="2" />
        {last ? <circle cx={last.x} cy={last.y} r="3.5" fill="black" /> : null}
      </svg>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>{points[0]?.day ?? ""}</span>
        <span>
          Latest: {last?.day ?? ""} • {Number(last?.v ?? 0)}
        </span>
      </div>
    </div>
  );
}

export default function DashboardClient({
  towns,
  selectedTownId,
  snapshot,
  trend,
}: {
  towns: TownOption[];
  selectedTownId: string | null;
  snapshot: Snapshot;
  trend: Trend;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const selectedTown = useMemo(() => {
    return towns.find((t) => t.id === selectedTownId) ?? null;
  }, [towns, selectedTownId]);

  function setTown(townId: string) {
    const params = new URLSearchParams(sp?.toString() ?? "");
    if (!townId) params.delete("townId");
    else params.set("townId", townId);
    router.push(`/ops/dashboard?${params.toString()}`);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ops Dashboard</h1>
          <p className="text-sm text-gray-500">
            Snapshot generated {new Date(snapshot.generatedAt).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Town</label>
          <select
            className="border rounded-md px-3 py-2 bg-white"
            value={selectedTownId ?? ""}
            onChange={(e) => setTown(e.target.value)}
          >
            <option value="">All towns</option>
            {towns.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.slug})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Town Products" value={snapshot.totalTownProducts} />
        <StatCard
          label="Missing Images"
          value={snapshot.productsMissingImages}
          href={snapshot.missingImagesTop?.[0]?.href}
        />
        <StatCard
          label="Low Stock"
          value={snapshot.lowStockCount}
          href={snapshot.lowStockTop?.[0]?.href}
        />
        <StatCard
          label="CONFIRMED Stale"
          value={snapshot.confirmedStaleCount}
          href={snapshot.confirmedStaleTop?.[0]?.href}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Orders Today" value={snapshot.ordersToday} />
        <StatCard label="Revenue Today" value={snapshot.revenueToday} />
        <StatCard label="Refunds Today" value={snapshot.refundsToday} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title={`Revenue Trend (Last ${trend.days} days)${selectedTown ? ` • ${selectedTown.name}` : ""}`}>
          <Sparkline points={trend.points ?? []} />
        </SectionCard>

        <SectionCard title="Health Alerts">
          <div className="space-y-4">
            <div>
              <div className="text-sm font-semibold">Stale CONFIRMED orders</div>
              {snapshot.confirmedStaleTop?.length ? (
                <ul className="mt-2 space-y-1 text-sm">
                  {snapshot.confirmedStaleTop.map((x) => (
                    <li key={x.id}>
                      <Link className="text-blue-600 hover:underline" href={x.href}>
                        {x.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-2 text-sm text-gray-500">None 🎉</div>
              )}
            </div>

            <div>
              <div className="text-sm font-semibold">Products missing images</div>
              {snapshot.missingImagesTop?.length ? (
                <ul className="mt-2 space-y-1 text-sm">
                  {snapshot.missingImagesTop.map((x) => (
                    <li key={x.id}>
                      <Link className="text-blue-600 hover:underline" href={x.href}>
                        {x.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-2 text-sm text-gray-500">None 🎉</div>
              )}
            </div>

            <div>
              <div className="text-sm font-semibold">Low stock</div>
              {snapshot.lowStockTop?.length ? (
                <ul className="mt-2 space-y-1 text-sm">
                  {snapshot.lowStockTop.map((x) => (
                    <li key={x.id}>
                      <Link className="text-blue-600 hover:underline" href={x.href}>
                        {x.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-2 text-sm text-gray-500">None 🎉</div>
              )}
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}