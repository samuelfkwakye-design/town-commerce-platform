import DashboardClient from './dashboard-client';
import { apiFetch } from '@/lib/api';
import { getCurrentAdmin } from '@/lib/getCurrentAdmin';
import RequireAdminRole from '@/components/RequireAdminRole';

export const dynamic = 'force-dynamic';

type TownOption = {
  id: string;
  name: string;
  slug: string;
};

type OpsDashboardItemLink = {
  id: string;
  label: string;
  href: string;
};

type OpsDashboardSnapshot = {
  generatedAt: string;
  townId: string | null;
  totalTownProducts: number;
  productsMissingImages: number;
  lowStockCount: number;
  ordersToday: number;
  revenueToday: number;
  refundsToday: number;
  confirmedStaleCount: number;
  missingImagesTop: OpsDashboardItemLink[];
  lowStockTop: OpsDashboardItemLink[];
  confirmedStaleTop: OpsDashboardItemLink[];
};

type OpsDashboardResponse = {
  generatedAt: string;
  townId: string | null;
  totalTownProducts: number;
  productsMissingImages: number;
  lowStockCount: number;
  ordersToday: number;
  revenueToday: number;
  refundsToday: number;
  confirmedStaleCount: number;
  missingImagesTop?: OpsDashboardItemLink[];
  lowStockTop?: OpsDashboardItemLink[];
  confirmedStaleTop?: OpsDashboardItemLink[];
};

type TownsResponse = {
  rows: TownOption[];
};

type RevenueTrendRow = {
  period: string;
  revenue: number;
};

type RevenueTrendResponse = {
  filters?: {
    townId?: string | null;
    from?: string;
    to?: string;
    bucket?: string;
  };
  rows: RevenueTrendRow[];
};

export default async function OpsDashboardPage(props: {
  searchParams?: Promise<{ townId?: string }>;
}) {
  const admin = await getCurrentAdmin();
  const searchParams = (await props.searchParams) ?? {};

  const requestedTownId = searchParams.townId ?? '';
  const isGlobalAdmin = admin?.role === 'GLOBAL_SUPER_ADMIN';
  const enforcedTownId = isGlobalAdmin ? requestedTownId : admin?.townId ?? '';
  const dashboardTownId = enforcedTownId || '';

  let towns: TownOption[] = [];

  let snapshot: OpsDashboardSnapshot = {
    generatedAt: new Date().toISOString(),
    townId: dashboardTownId || null,
    totalTownProducts: 0,
    productsMissingImages: 0,
    lowStockCount: 0,
    ordersToday: 0,
    revenueToday: 0,
    refundsToday: 0,
    confirmedStaleCount: 0,
    missingImagesTop: [],
    lowStockTop: [],
    confirmedStaleTop: [],
  };

  let trendPoints: { day: string; revenue: number }[] = [];

  try {
    const townsPromise: Promise<TownsResponse | TownOption[] | null> = isGlobalAdmin
      ? apiFetch<TownsResponse>('/admin/reports/towns', { method: 'GET' })
      : Promise.resolve(null);

    const snapshotPromise = apiFetch<OpsDashboardResponse>(
      `/admin/reports/ops-dashboard${
        dashboardTownId ? `?townId=${encodeURIComponent(dashboardTownId)}` : ''
      }`,
      { method: 'GET' },
    );

    const trendPromise = apiFetch<RevenueTrendResponse>(
      `/admin/reports/revenue-trend?days=7${
        dashboardTownId ? `&townId=${encodeURIComponent(dashboardTownId)}` : ''
      }`,
      { method: 'GET' },
    );

    const [townsResp, snapshotResp, trendResp] = await Promise.all([
      townsPromise,
      snapshotPromise,
      trendPromise,
    ]);

    if (isGlobalAdmin) {
      towns = Array.isArray(townsResp)
        ? townsResp
        : Array.isArray(townsResp?.rows)
          ? townsResp.rows
          : [];
    }

    snapshot = {
      generatedAt: snapshotResp?.generatedAt ?? snapshot.generatedAt,
      townId: snapshotResp?.townId ?? snapshot.townId,
      totalTownProducts: Number(snapshotResp?.totalTownProducts ?? 0),
      productsMissingImages: Number(snapshotResp?.productsMissingImages ?? 0),
      lowStockCount: Number(snapshotResp?.lowStockCount ?? 0),
      ordersToday: Number(snapshotResp?.ordersToday ?? 0),
      revenueToday: Number(snapshotResp?.revenueToday ?? 0),
      refundsToday: Number(snapshotResp?.refundsToday ?? 0),
      confirmedStaleCount: Number(snapshotResp?.confirmedStaleCount ?? 0),
      missingImagesTop: snapshotResp?.missingImagesTop ?? [],
      lowStockTop: snapshotResp?.lowStockTop ?? [],
      confirmedStaleTop: snapshotResp?.confirmedStaleTop ?? [],
    };

    trendPoints = (trendResp?.rows ?? []).map((row: RevenueTrendRow) => ({
      day: row.period,
      revenue: Number(row.revenue ?? 0),
    }));
  } catch {
    // Keep safe fallback values so dashboard still renders.
  }

  return (
    <RequireAdminRole
      allowedRoles={['GLOBAL_SUPER_ADMIN', 'TOWN_SUPER_ADMIN', 'WAREHOUSE_ADMIN']}
      requireTownScope={false}
    >
      <DashboardClient
        towns={towns}
        selectedTownId={dashboardTownId || null}
        snapshot={snapshot}
        trend={{ days: 7, points: trendPoints }}
      />
    </RequireAdminRole>
  );
}