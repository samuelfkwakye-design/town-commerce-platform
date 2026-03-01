export type OpsDashboardTopRow =
  | {
      kind: 'TOWN_PRODUCT';
      townProductId: string;
      townId: string;
      townName: string | null;
      townSlug: string | null;
      productId: string;
      productName: string | null;
      pricingModel: 'UNIT' | 'WEIGHT' | string;
      stockQty: number | null;
      stockWeightGrams: number | null;
      imagesCount?: number;
    }
  | {
      kind: 'ORDER';
      orderId: string;
      townId: string;
      townName: string | null;
      townSlug: string | null;
      status: string;
      updatedAt: string;
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

  // NEW: top lists for quick action UI
  missingImagesTop!: OpsDashboardTopRow[];
  lowStockTop!: OpsDashboardTopRow[];
  confirmedStaleTop!: OpsDashboardTopRow[];
}
