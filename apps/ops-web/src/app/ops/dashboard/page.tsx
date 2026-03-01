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

  missingImagesTop: OpsDashboardItemLink[];
  lowStockTop: OpsDashboardItemLink[];
  confirmedStaleTop: OpsDashboardItemLink[];
};

type RevenueTrendPoint = { day: string; revenue: number };
type RevenueTrendResponse = {
  generatedAt: string;
  townId: string | null;
  days: number;
  points: RevenueTrendPoint[];
};

export default async function OpsDashboardPage({
  searchParams,
}: {
  searchParams?: { townId?: string };
}) {
  const townId = searchParams?.townId ?? "";

  const [towns, snapshot, trend] = await Promise.all([
    apiFetch<TownOption[]>(`/admin/reports/towns`, { method: "GET" }),
    apiFetch<OpsDashboardResponse>(
      `/admin/reports/ops-dashboard${townId ? `?townId=${encodeURIComponent(townId)}` : ""}`,
      { method: "GET" }
    ),
    apiFetch<RevenueTrendResponse>(
      `/admin/reports/revenue-trend?days=7${townId ? `&townId=${encodeURIComponent(townId)}` : ""}`,
      { method: "GET" }
    ),
  ]);

  return (
    <DashboardClient
      towns={towns}
      selectedTownId={townId || null}
      snapshot={snapshot}
      trend={trend}
    />
  );
}