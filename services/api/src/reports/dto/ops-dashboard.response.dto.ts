export type OpsDashboardItemLinkDto = {
  id: string;
  label: string;
  href: string;
};

export class OpsDashboardResponseDto {
  generatedAt!: string;
  townId!: string | null;

  totalTownProducts!: number;
  productsMissingImages!: number;
  lowStockCount!: number;

  ordersToday!: number;
  revenueToday!: number;
  refundsToday!: number;

  confirmedStaleCount!: number;

  // Top lists for Health Alerts + drill-down links
  missingImagesTop!: OpsDashboardItemLinkDto[];
  lowStockTop!: OpsDashboardItemLinkDto[];
  confirmedStaleTop!: OpsDashboardItemLinkDto[];
}
