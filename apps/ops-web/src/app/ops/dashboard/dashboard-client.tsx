'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

type TownOption = {
  id: string;
  name: string;
  slug: string;
};

type ItemLink = {
  id: string;
  label: string;
  href: string;
};

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

type TrendPoint = {
  day: string;
  revenue: number;
};

type Trend = {
  days: number;
  points: TrendPoint[];
};

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href?: string;
}) {
  const clickable = typeof href === 'string' && href.length > 0;

  const inner = (
    <div
      className={[
        'rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition',
        clickable ? 'cursor-pointer hover:border-slate-400 hover:shadow-md' : '',
      ].join(' ')}
    >
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
      {clickable ? <div className="mt-2 text-sm text-blue-600">View</div> : null}
    </div>
  );

  return clickable ? <Link href={href}>{inner}</Link> : inner;
}

function ActionCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-400 hover:shadow-md"
    >
      <div className="font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-sm text-slate-500">{description}</div>
      <div className="mt-3 text-sm text-blue-600">Open</div>
    </Link>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-base font-semibold text-slate-900">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Sparkline({ points }: { points: TrendPoint[] }) {
  const width = 520;
  const height = 120;
  const pad = 10;

  const safePoints = Array.isArray(points) ? points : [];
  const values = safePoints.map((p) => Number(p.revenue ?? 0));
  const max = Math.max(1, ...values);
  const min = values.length ? Math.min(...values) : 0;

  const coords = safePoints.map((p, i) => {
    const x = pad + (i * (width - pad * 2)) / Math.max(1, safePoints.length - 1);
    const v = Number(p.revenue ?? 0);
    const t = max === min ? 0.5 : (v - min) / (max - min);
    const y = height - pad - t * (height - pad * 2);
    return { x, y, v, day: p.day };
  });

  const d = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`)
    .join(' ');

  const last = coords[coords.length - 1];

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} role="img" aria-label="Revenue trend">
        <path d={d} fill="none" stroke="black" strokeWidth="2" />
        {last ? <circle cx={last.x} cy={last.y} r="3.5" fill="black" /> : null}
      </svg>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>{safePoints[0]?.day ?? ''}</span>
        <span>
          Latest: {last?.day ?? ''} • {Number(last?.v ?? 0)}
        </span>
      </div>
    </div>
  );
}

function SafeLinksList({ items }: { items: ItemLink[] }) {
  const list = Array.isArray(items) ? items : [];

  if (!list.length) {
    return <div className="mt-2 text-sm text-slate-500">None 🎉</div>;
  }

  return (
    <ul className="mt-2 space-y-1 text-sm">
      {list.map((x, i) => {
        const href = typeof x?.href === 'string' ? x.href : '';
        const label = typeof x?.label === 'string' ? x.label : 'View';
        const key = `${x?.id ?? 'item'}-${i}`;

        return (
          <li key={key}>
            {href ? (
              <Link className="text-blue-600 hover:underline" href={href}>
                {label}
              </Link>
            ) : (
              <span className="text-slate-600">{label}</span>
            )}
          </li>
        );
      })}
    </ul>
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

  const safeTowns = Array.isArray(towns) ? towns : [];
  const canChooseTown = safeTowns.length > 0;
  const isTownScopedView = !canChooseTown && !!selectedTownId;

  const selectedTown = useMemo(() => {
    if (!selectedTownId) return null;
    return safeTowns.find((t) => t.id === selectedTownId) ?? null;
  }, [safeTowns, selectedTownId]);

  function setTown(townId: string) {
    const params = new URLSearchParams(sp?.toString() ?? '');
    if (!townId) {
      params.delete('townId');
    } else {
      params.set('townId', townId);
    }

    const qs = params.toString();
    router.push(qs ? `/ops/dashboard?${qs}` : '/ops/dashboard');
  }

  const missingImagesHref =
    snapshot.productsMissingImages > 0
      ? `/ops/town-products?missingImages=true${
          selectedTownId ? `&townId=${encodeURIComponent(selectedTownId)}` : ''
        }`
      : undefined;

  const lowStockHref =
    snapshot.lowStockCount > 0
      ? `/ops/stock?lowStock=true${
          selectedTownId ? `&townId=${encodeURIComponent(selectedTownId)}` : ''
        }`
      : undefined;

  const confirmedStaleHref =
    snapshot.confirmedStaleCount > 0
      ? `/ops/orders?status=CONFIRMED&stale=true${
          selectedTownId ? `&townId=${encodeURIComponent(selectedTownId)}` : ''
        }`
      : undefined;

  const safeSnapshot: Snapshot = {
    ...snapshot,
    missingImagesTop: Array.isArray(snapshot?.missingImagesTop) ? snapshot.missingImagesTop : [],
    lowStockTop: Array.isArray(snapshot?.lowStockTop) ? snapshot.lowStockTop : [],
    confirmedStaleTop: Array.isArray(snapshot?.confirmedStaleTop)
      ? snapshot.confirmedStaleTop
      : [],
  };

  const safeTrendPoints = Array.isArray(trend?.points) ? trend.points : [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Ops Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Snapshot generated{' '}
            {snapshot?.generatedAt ? new Date(snapshot.generatedAt).toLocaleString('en-GB') : ''}
          </p>
        </div>

        {canChooseTown ? (
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Town</label>
            <select
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              value={selectedTownId ?? ''}
              onChange={(e) => setTown(e.target.value)}
            >
              <option value="">All towns</option>
              {safeTowns.map((town) => (
                <option key={town.id} value={town.id}>
                  {town.name} ({town.slug})
                </option>
              ))}
            </select>
          </div>
        ) : isTownScopedView ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
            Town-scoped dashboard view
          </div>
        ) : null}
      </div>

      <SectionCard title="Quick Actions">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ActionCard
            title="Products"
            description="Create, edit, and manage town products."
            href={selectedTownId ? `/ops/town-products?townId=${encodeURIComponent(selectedTownId)}` : '/ops/town-products'}
          />
          <ActionCard
            title="Categories"
            description="Create, delete, and organise product categories."
            href="/ops/categories"
          />
          <ActionCard
            title="Stock"
            description="Review stock levels, movements, and reconciliation."
            href={selectedTownId ? `/ops/stock?townId=${encodeURIComponent(selectedTownId)}` : '/ops/stock'}
          />
          <ActionCard
            title="Orders"
            description="Track orders, payments, and refunds."
            href={selectedTownId ? `/ops/orders?townId=${encodeURIComponent(selectedTownId)}` : '/ops/orders'}
          />
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Town Products" value={snapshot.totalTownProducts} />
        <StatCard
          label="Missing Images"
          value={snapshot.productsMissingImages}
          href={missingImagesHref}
        />
        <StatCard label="Low Stock" value={snapshot.lowStockCount} href={lowStockHref} />
        <StatCard
          label="CONFIRMED Stale"
          value={snapshot.confirmedStaleCount}
          href={confirmedStaleHref}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Orders Today" value={snapshot.ordersToday} />
        <StatCard label="Revenue Today" value={snapshot.revenueToday} />
        <StatCard label="Refunds Today" value={snapshot.refundsToday} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title={`Revenue Trend (Last ${trend.days} days)${
            selectedTown ? ` • ${selectedTown.name}` : ''
          }`}
        >
          <Sparkline points={safeTrendPoints} />
        </SectionCard>

        <SectionCard title="Health Alerts">
          <div className="space-y-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Stale CONFIRMED orders
              </div>
              <SafeLinksList items={safeSnapshot.confirmedStaleTop} />
            </div>

            <div>
              <div className="text-sm font-semibold text-slate-900">
                Products missing images
              </div>
              <SafeLinksList items={safeSnapshot.missingImagesTop} />
            </div>

            <div>
              <div className="text-sm font-semibold text-slate-900">Low stock</div>
              <SafeLinksList items={safeSnapshot.lowStockTop} />
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}