import DashboardClient from "./dashboard-client";
import { apiFetch } from "@/lib/api";

export const dynamic = "force-dynamic";

type TownOption = { id: string; name: string; slug: string };

type OpsDashboardItemLink = { id: string; label: string; href: string };

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

type TownsResponse = { rows: TownOption[] };

type RevenueTrendRow = { period: string; revenue: number };
type RevenueTrendResponse = {
  filters?: { townId?: string | null; from?: string; to?: string; bucket?: string };
  rows: RevenueTrendRow[];
};

export default async function OpsDashboardPage(props: {
  searchParams?: Promise<{ townId?: string }>;
}) {
  const sp = (await props.searchParams) ?? {};
  const townId = sp.townId ?? "";

  const [townsResp, snapshot, trendResp] = await Promise.all([
    apiFetch<TownsResponse>(`/admin/reports/towns`, { method: "GET" }),
    apiFetch<OpsDashboardResponse>(
      `/admin/reports/ops-dashboard${townId ? `?townId=${encodeURIComponent(townId)}` : ""}`,
      { method: "GET" }
    ),
    apiFetch<RevenueTrendResponse>(
      `/admin/reports/revenue-trend?days=7${townId ? `&townId=${encodeURIComponent(townId)}` : ""}`,
      { method: "GET" }
    ),
  ]);

  const towns = Array.isArray((townsResp as any)) ? ((townsResp as any) as TownOption[]) : townsResp.rows ?? [];

  const trendPoints = (trendResp.rows ?? []).map((r) => ({
    day: r.period,
    revenue: Number(r.revenue ?? 0),
  }));

  return (
    <DashboardClient
      towns={towns}
      selectedTownId={townId || null}
      snapshot={{
        ...snapshot,
        missingImagesTop: snapshot.missingImagesTop ?? [],
        lowStockTop: snapshot.lowStockTop ?? [],
        confirmedStaleTop: snapshot.confirmedStaleTop ?? [],
      }}
      trend={{ days: 7, points: trendPoints }}
    />
  );
}